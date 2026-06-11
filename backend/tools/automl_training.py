"""Thin AutoML training adapter for PR-07.

This tool calls the existing ModelMate target setup and CV training functions.
It does not reimplement training and does not call an LLM.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
from typing import Any

from backend.tools.automl_result import training_failure, training_success
from backend.tools.data_profile import dataframe_from_arguments


def _run_async(factory):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(factory())
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: asyncio.run(factory())).result()


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
        return training_success(
            cv_result=cv_result,
            set_result=set_result,
            state=modelmate.STATE,
            target=target,
            excluded=excluded,
        )
    except Exception as exc:
        return training_failure(exc, "training")
    finally:
        if previous_save_history is not None:
            modelmate.save_history = previous_save_history
