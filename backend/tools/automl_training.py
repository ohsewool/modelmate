"""Thin AutoML training adapter for PR-07.

This tool calls the existing ModelMate target setup and CV training functions.
It does not reimplement training and does not call an LLM.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import contextvars
from typing import Any

from backend.tools.automl_result import training_failure, training_success
from backend.tools.data_profile import dataframe_from_arguments


def _run_async(factory):
    """이미 도는 이벤트 루프 안에서도 코루틴을 돌린다 - **호출자의 문맥을 지고서.**

    `ThreadPoolExecutor`가 만드는 스레드는 빈 문맥에서 시작한다. `ContextVar`는
    스레드 경계를 넘지 않으므로, 문맥을 복사해 넘기지 않으면 이 안에서 도는
    `set_target`/`run_cv`가 **요청의 스코프가 아니라 기본 스코프**에 쓴다.

    실제로 그랬다. 에이전트 실행에서 학습은 "AutoML training completed"로 성공
    관측을 남기고, 바로 다음 설명 도구가 "Run AutoML training before explanation."
    으로 실패했다. 같은 요청 안에서 한쪽은 썼고 한쪽은 못 읽은 것이다.

    조용한 쪽이 더 나쁘다. 학습 결과가 **공유 기본 버킷**에 쌓인다 - 요청별 격리를
    도입한 이유가 정확히 그 버킷을 없애는 것이었고(A가 올린 데이터를 B의 다음
    요청이 분석하던 문제), 이 경로만 그리로 되돌아가 있었다.

    `copy_context()`는 스코프 이름을 읽을 수 있게 해준다. 안에서의 `ContextVar`
    쓰기는 밖으로 나오지 않지만 상관없다 - 여기서 필요한 것은 읽기뿐이고,
    `STATE`는 그 이름으로 버킷을 고른다.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(factory())
    context = contextvars.copy_context()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: context.run(lambda: asyncio.run(factory()))).result()


def automl_training_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        import backend.main as modelmate
    except Exception as exc:
        return training_failure(exc, "import_backend")

    previous_save_history = getattr(modelmate, "save_history", None)
    persist_history = bool(arguments.get("persist_history", False))
    try:
        df = dataframe_from_arguments(arguments)
        if df is not None:
            modelmate.STATE["df"] = df
            modelmate.STATE.pop("X", None)
            modelmate.STATE.pop("y", None)
            modelmate.STATE.pop("cv_results", None)
            modelmate.STATE.pop("best_model", None)
        elif modelmate.STATE.get("df") is None:
            return {
                "success": False,
                "status": "failed",
                "summary": "No dataset is available for AutoML training.",
                "error_type": "NoDataset",
                "error_message": "Provide csv_text, records, file_path, or use an existing uploaded dataset.",
                "failed_stage": "load_dataset",
                "recommended_next_action": "Upload or provide a dataset before calling automl_training_tool.",
                "observation_severity": "error",
            }

        active_df = modelmate.STATE["df"]
        target = arguments.get("target_column") or arguments.get("target_col")
        if not target:
            target = modelmate.infer_default_target(active_df)
        target = str(target)
        excluded = [
            str(col) for col in (
                arguments.get("excluded_columns")
                or arguments.get("drop_cols")
                or []
            )
        ]

        if not persist_history and previous_save_history is not None:
            modelmate.save_history = lambda *args, **kwargs: None

        set_result = _run_async(lambda: modelmate.set_target({
            "target_col": target,
            "drop_cols": excluded,
            "col_labels": arguments.get("column_labels", {}),
        }))
        cv_result = _run_async(lambda: modelmate.run_cv(user=None))
        outcome = training_success(
            cv_result=cv_result,
            set_result=set_result,
            state=modelmate.STATE,
            target=target,
            excluded=excluded,
        )

        # The leakage risk downstream gates read was the one computed over the
        # whole dataset, which describes the file rather than the model. So a
        # user who followed the advice and excluded every flagged column still
        # arrived at `invalid` and `blocked` - the same verdict as ignoring it,
        # which makes the advice unfollowable.
        #
        # Re-checking against the features the model actually used answers the
        # question the gates are really asking: is *this model* resting on a
        # leak. On the demo dataset that is `high` before exclusions and `low`
        # after, which is the difference the whole chain exists to produce.
        try:
            from backend.tools.leakage_check import leakage_check_tool

            used = outcome.get("used_features") or []
            if used:
                recheck = leakage_check_tool({
                    **arguments, "target_column": target, "feature_columns": used,
                })
                outcome["leakage_risk"] = recheck.get("leakage_risk")
                outcome["suspicious_columns"] = recheck.get("suspicious_columns", [])
                outcome["leakage_scope"] = "used_features"
        except Exception:
            # A failed re-check must not read as "no leakage": leaving the field
            # absent makes downstream gates fall back to the dataset-wide
            # figure, which is the cautious direction.
            pass
        return outcome
    except Exception as exc:
        return training_failure(exc, "training")
    finally:
        if previous_save_history is not None:
            modelmate.save_history = previous_save_history
