"""PR-28 tool-calling executor for persisted Agent Runs."""

from __future__ import annotations

from typing import Any

from backend.agents.persistence import (
    create_artifact,
    create_decision,
    create_human_review_request,
    create_observation,
    create_tool_call,
    create_validation_result,
    get_analysis_timeline,
    get_goal_first_agent_run,
    update_analysis_run_status,
    update_plan_step_status,
    update_tool_call,
)
from backend.tools import build_pr04_mock_registry


BLOCKING_TOOL_STATUSES = {"fail", "failed", "no_input"}


def execute_agent_run(conn, analysis_run_id: str) -> dict[str, Any]:
    stored = get_goal_first_agent_run(conn, analysis_run_id)
    if not stored or not stored.get("plan"):
        raise ValueError("Agent Run or Plan was not found.")
    run = stored["agent_run"]
    plan = stored["plan"]
    context: dict[str, Any] = {
        "analysis_run_id": run["id"],
        "project_id": run.get("project_id"),
        "dataset_id": run.get("dataset_id"),
        "user_goal": run.get("user_goal"),
        "task_type": run.get("task_type"),
        "task_family": run.get("task_family"),
        "target_column": (run.get("interpreted_goal") or {}).get("target_preference"),
    }
    registry = build_pr04_mock_registry()

    if run.get("supported_status") == "unsupported":
        create_validation_result(
            conn,
            run["id"],
            plan_step_id=None,
            severity="blocking",
            validation_type="unsupported_goal",
            message=run.get("unsupported_reason") or "지원 범위 밖의 목표입니다.",
            passed=False,
        )
        update_analysis_run_status(conn, run["id"], "blocked")
        return get_analysis_timeline(conn, run["id"])

    if not run.get("dataset_id"):
        create_validation_result(
            conn,
            run["id"],
            plan_step_id=None,
            severity="blocking",
            validation_type="dataset_required",
            message="Agent 실행 전에 CSV 데이터셋을 선택하거나 업로드해야 합니다.",
            passed=False,
        )
        create_decision(
            conn,
            run["id"],
            "select_dataset_before_execution",
            "실제 tool 실행은 업로드된 CSV 데이터셋을 기준으로 수행되어야 하므로 데이터셋이 없는 Run은 실행하지 않습니다.",
            decision_type="dataset_gate",
            summary="CSV 데이터셋 연결 후 Agent Run을 다시 생성하거나 실행하세요.",
            selected_value={"dataset_id": None},
        )
        update_analysis_run_status(conn, run["id"], "blocked")
        return get_analysis_timeline(conn, run["id"])

    update_analysis_run_status(conn, run["id"], "running")
    final_status = "completed"
    for step in plan.get("steps") or []:
        if step.get("status") in ("completed", "blocked", "skipped"):
            continue
        plan_step_id = step["plan_step_id"]
        tool_name = step["tool_name"]
        if tool_name not in registry.names():
            _persist_blocked_step(conn, run, plan, step, f"{tool_name} is not registered.")
            final_status = "blocked"
            break

        update_plan_step_status(conn, run["id"], plan_step_id, "running")
        safe_arguments = _tool_arguments(tool_name, context)
        runtime_arguments = _runtime_tool_arguments(tool_name, safe_arguments)
        tool_call = create_tool_call(
            conn,
            run["id"],
            tool_name,
            analysis_step_id=plan_step_id,
            arguments=safe_arguments,
            status="running",
            plan_id=plan.get("id"),
            plan_step_id=plan_step_id,
            project_id=run.get("project_id"),
            dataset_id=run.get("dataset_id"),
            input_summary=_input_summary(tool_name, context),
        )
        try:
            output = registry.get(tool_name).handler(runtime_arguments)
            status = "completed" if _tool_success(output) else "failed"
            update_tool_call(
                conn,
                tool_call["id"],
                status=status,
                output_summary=str(output.get("summary") or output.get("status") or status)[:500],
                error_message=output.get("error_message"),
            )
            observation = create_observation(
                conn,
                run["id"],
                str(output.get("summary") or f"{tool_name} 실행 결과가 저장되었습니다."),
                tool_call_id=tool_call["id"],
                evidence=output,
                plan_step_id=plan_step_id,
                observation_type=tool_name,
                payload=_safe_payload(output),
            )
            _apply_output_to_context(tool_name, output, context)
            _persist_validation(conn, run["id"], plan_step_id, tool_name, output)
            _persist_decision_if_needed(conn, run["id"], step, tool_name, output, observation["id"])
            _persist_artifact_if_needed(conn, run, tool_name, output)
            review_created = _create_review_if_needed(conn, run, step, tool_name, output, tool_call["id"])
            if status == "failed":
                _persist_block_decision(conn, run["id"], tool_name, output, observation["id"])
                update_plan_step_status(conn, run["id"], plan_step_id, "failed")
                final_status = "failed"
                break
            if review_created or _requires_stop(tool_name, output):
                _persist_block_decision(conn, run["id"], tool_name, output, observation["id"])
                update_plan_step_status(conn, run["id"], plan_step_id, "blocked")
                final_status = "waiting_for_review"
                break
            update_plan_step_status(conn, run["id"], plan_step_id, "completed")
        except Exception as exc:
            update_tool_call(conn, tool_call["id"], status="failed", error_message=str(exc), output_summary="Tool execution failed.")
            create_validation_result(
                conn,
                run["id"],
                plan_step_id=plan_step_id,
                severity="blocking",
                validation_type=f"{tool_name}_exception",
                message=str(exc),
                passed=False,
            )
            update_plan_step_status(conn, run["id"], plan_step_id, "failed")
            final_status = "failed"
            break

    update_analysis_run_status(conn, run["id"], final_status)
    return get_analysis_timeline(conn, run["id"])


def _tool_arguments(tool_name: str, context: dict[str, Any]) -> dict[str, Any]:
    args = {
        "analysis_run_id": context.get("analysis_run_id"),
        "project_id": context.get("project_id"),
        "dataset_id": context.get("dataset_id"),
        "user_goal": context.get("user_goal"),
        "task_type": context.get("task_type"),
        "target_column": context.get("target_column"),
        "profile": context.get("profile"),
        "validation": context.get("schema_validation"),
        "recommended_target": context.get("recommended_target"),
        "automl_training_result": context.get("automl_training_result"),
        "evaluation_result": context.get("evaluation_result"),
        "evidence_bundle": context.get("evidence_bundle"),
        "validation_result": context.get("validation_result"),
        "report_result": context.get("report_result"),
        "leakage_warnings": context.get("leakage_warnings"),
        "data_quality_warnings": context.get("data_quality_warnings"),
    }
    if tool_name == "schema_validation_tool":
        args["profile"] = context.get("profile")
    if tool_name == "target_recommendation_tool":
        args["validation"] = context.get("schema_validation")
    if tool_name == "leakage_check_tool":
        args["target_column"] = context.get("target_column")
    return {key: value for key, value in args.items() if value is not None}


def _runtime_tool_arguments(tool_name: str, safe_arguments: dict[str, Any]) -> dict[str, Any]:
    runtime = dict(safe_arguments)
    if any(key in runtime for key in ("csv_text", "records", "file_path", "dataframe")):
        return runtime
    if tool_name in ("data_profile_tool", "schema_validation_tool", "automl_training_tool"):
        try:
            import backend.main as modelmate
            df = modelmate.STATE.get("df")
            if df is not None:
                runtime["dataframe"] = df
        except Exception:
            pass
    return runtime


def _tool_success(output: dict[str, Any]) -> bool:
    if output.get("deployment_status") in ("deploy_recommended", "needs_review", "hold", "blocked"):
        return True
    if output.get("validation_status") in ("grounded", "weak", "invalid"):
        return True
    if output.get("success") is False:
        return False
    return output.get("status") not in BLOCKING_TOOL_STATUSES


def _requires_stop(tool_name: str, output: dict[str, Any]) -> bool:
    if tool_name == "schema_validation_tool" and output.get("validation_status") == "fail":
        return True
    if tool_name == "leakage_check_tool" and output.get("leakage_risk") == "high":
        return True
    if tool_name == "evaluation_tool" and output.get("threshold_status") == "fail":
        return True
    if tool_name == "api_readiness_tool" and output.get("deployment_status") in ("blocked", "hold"):
        return True
    return False


def _apply_output_to_context(tool_name: str, output: dict[str, Any], context: dict[str, Any]) -> None:
    if tool_name == "data_profile_tool":
        context["profile"] = output
        context["data_quality_warnings"] = output.get("profiling_warnings") or []
    elif tool_name == "schema_validation_tool":
        context["schema_validation"] = output
    elif tool_name == "target_recommendation_tool":
        target = output.get("recommended_target") or {}
        context["recommended_target"] = target
        context["target_column"] = target.get("column_name") or context.get("target_column")
        context["task_type"] = target.get("inferred_task_type") or context.get("task_type")
    elif tool_name == "leakage_check_tool":
        context["leakage_result"] = output
        context["leakage_warnings"] = output.get("suspicious_columns") or []
    elif tool_name == "automl_training_tool":
        context["automl_training_result"] = output
        context["task_type"] = output.get("task_type") or context.get("task_type")
        context["target_column"] = output.get("target_column") or context.get("target_column")
    elif tool_name == "evaluation_tool":
        context["evaluation_result"] = output
    elif tool_name == "shap_explainer_tool":
        context["explanation_result"] = output
        context["evidence_bundle"] = output.get("evidence_bundle")
    elif tool_name == "validation_tool":
        context["validation_result"] = output
    elif tool_name == "report_writer_tool":
        context["report_result"] = output


def _persist_validation(conn, analysis_run_id: str, plan_step_id: str, tool_name: str, output: dict[str, Any]) -> None:
    severity = output.get("observation", {}).get("severity")
    if not severity:
        severity = "error" if not _tool_success(output) else "warning" if output.get("status") == "warning" else "info"
    create_validation_result(
        conn,
        analysis_run_id,
        plan_step_id=plan_step_id,
        severity="blocking" if severity == "error" else severity,
        validation_type=tool_name,
        message=str(output.get("summary") or output.get("recommended_next_action") or "Tool validation recorded."),
        passed=_tool_success(output) and severity != "error",
    )


def _persist_decision_if_needed(conn, analysis_run_id: str, step: dict[str, Any], tool_name: str, output: dict[str, Any], observation_id: str) -> None:
    decision = output.get("decision") or {}
    action = decision.get("action") or output.get("recommended_next_action")
    selected = {}
    decision_type = "next_action"
    if tool_name == "target_recommendation_tool":
        selected = output.get("recommended_target") or {}
        action = f"selected_target:{selected.get('column_name')}" if selected else "needs_human_review"
        decision_type = "target_selection"
    elif tool_name == "automl_training_tool":
        selected = output.get("best_model") or {}
        action = f"selected_best_model:{selected.get('name')}" if selected else output.get("status")
        decision_type = "best_model_selection"
    elif tool_name == "evaluation_tool":
        decision_type = "metric_gate"
    elif tool_name == "api_readiness_tool":
        decision_type = "api_readiness"
    if not action:
        return
    create_decision(
        conn,
        analysis_run_id,
        str(action),
        str(decision.get("rationale") or output.get("summary") or step.get("purpose") or "Tool result informed the next action."),
        observation_id=observation_id,
        based_on_observation_ids=[observation_id],
        decision_type=decision_type,
        summary=str(output.get("recommended_next_action") or action),
        selected_value=selected,
    )


def _persist_block_decision(conn, analysis_run_id: str, tool_name: str, output: dict[str, Any], observation_id: str) -> None:
    create_decision(
        conn,
        analysis_run_id,
        "block_execution",
        str(output.get("error_message") or output.get("summary") or "Tool result requires execution to stop."),
        observation_id=observation_id,
        based_on_observation_ids=[observation_id],
        decision_type=f"{tool_name}_block",
        summary=str(output.get("recommended_next_action") or "문제를 해결한 뒤 다시 실행하세요."),
        selected_value={"tool_name": tool_name, "status": output.get("status")},
    )


def _create_review_if_needed(conn, run: dict[str, Any], step: dict[str, Any], tool_name: str, output: dict[str, Any], tool_call_id: str) -> bool:
    flags = set((run.get("interpreted_goal") or {}).get("review_flags") or [])
    plan_step_id = step["plan_step_id"]
    if tool_name == "target_recommendation_tool" and (step.get("requires_human_review") or "target_ambiguous" in flags):
        candidates = (output.get("candidate_targets") or []) + (output.get("weak_candidate_targets") or [])
        options = [
            {"id": "continue", "label": "추천 타깃으로 계속 진행", "value": (output.get("recommended_target") or {}).get("column_name")},
            {"id": "stop", "label": "분석 중단"},
        ]
        if candidates:
            options = [
                {
                    "id": f"select:{item.get('column_name')}",
                    "label": f"{item.get('column_name')}로 예측",
                    "value": item.get("column_name"),
                    "reason": item.get("usefulness_explanation") or item.get("reason"),
                    "description": f"유용성: {item.get('usefulness_label', '검토 필요')} · {', '.join(item.get('quality_labels') or ['검토 필요'])}",
                    "recommended": item.get("suitability") == "good",
                }
                for item in candidates[:5]
            ] + options
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="target_ambiguity",
            severity="warning",
            title="예측할 목표를 선택하세요",
            message="Agent가 여러 후보를 찾았지만 자동으로 정하기에는 사용 목적이 중요합니다. 어떤 값을 예측하고 싶은지 선택해 주세요.",
            options=options,
        )
        return True
    if tool_name == "leakage_check_tool" and output.get("leakage_risk") in ("high", "medium"):
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="leakage_risk",
            severity="blocking" if output.get("leakage_risk") == "high" else "warning",
            title="누수 가능성 검토 필요",
            message="타깃 누수 가능성이 있는 컬럼이 발견되었습니다. 제외하거나 경고를 확인한 뒤 진행하세요.",
            options=[
                {"id": "exclude", "label": "의심 컬럼 제외 후 진행"},
                {"id": "continue", "label": "경고 확인 후 계속"},
                {"id": "stop", "label": "분석 중단"},
            ],
        )
        return output.get("leakage_risk") == "high"
    if tool_name == "evaluation_tool" and output.get("threshold_status") in ("warning", "fail"):
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="low_model_performance",
            severity="blocking" if output.get("threshold_status") == "fail" else "warning",
            title="모델 성능 검토 필요",
            message="모델 성능이 낮거나 기준에 가깝습니다. API 제공 전 보고서 한계를 확인하세요.",
            options=[
                {"id": "continue", "label": "한계를 포함해 계속"},
                {"id": "retry", "label": "이 단계 다시 시도"},
                {"id": "stop", "label": "분석 중단"},
            ],
        )
        return output.get("threshold_status") == "fail"
    if tool_name == "api_readiness_tool" and output.get("deployment_status") in ("needs_review", "hold", "blocked"):
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="api_readiness_risk",
            severity="blocking" if output.get("deployment_status") in ("hold", "blocked") else "warning",
            title="예측 API 제공 전 확인 필요",
            message="현재 결과는 API로 바로 제공하기 전에 추가 확인이 필요합니다.",
            options=[
                {"id": "continue", "label": "검토 후 계속"},
                {"id": "stop", "label": "API 준비 중단"},
            ],
        )
        return output.get("deployment_status") in ("hold", "blocked")
    if not _tool_success(output):
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="failed_tool_recovery",
            severity="blocking",
            title="도구 실행 복구 필요",
            message="도구 실행 중 문제가 발생했습니다. 이전 trace는 보존되며, 안전한 경우 재시도할 수 있습니다.",
            options=[
                {"id": "retry", "label": "이 단계 다시 시도"},
                {"id": "stop", "label": "실행 중단"},
            ],
        )
        return True
    if "limited_time_series" in flags and tool_name == "schema_validation_tool":
        create_human_review_request(
            conn,
            run["id"],
            plan_step_id=plan_step_id,
            tool_call_id=tool_call_id,
            review_type="time_series_uncertainty",
            severity="warning",
            title="시계열 설정 확인 필요",
            message="시계열 예측은 날짜 컬럼과 예측 기간 확인이 필요합니다.",
            options=[
                {"id": "continue", "label": "일반 예측으로 계속"},
                {"id": "stop", "label": "분석 중단"},
            ],
        )
        return True
    return False


def _persist_artifact_if_needed(conn, run: dict[str, Any], tool_name: str, output: dict[str, Any]) -> None:
    mapping = {
        "data_profile_tool": ("dataset_profile", "데이터 프로파일"),
        "automl_training_tool": ("trained_model", "학습 모델 요약"),
        "evaluation_tool": ("evaluation_summary", "성능 평가 요약"),
        "shap_explainer_tool": ("explanation_summary", "설명 가능성 요약"),
        "report_writer_tool": ("report", "근거 기반 보고서"),
        "api_readiness_tool": ("api_readiness", "예측 API 준비도"),
    }
    if tool_name not in mapping:
        return
    artifact_type, title = mapping[tool_name]
    create_artifact(
        conn,
        run["id"],
        artifact_type=artifact_type,
        title=title,
        status="available" if _tool_success(output) else "unavailable",
        project_id=run.get("project_id"),
        run_id=output.get("experiment_run_id"),
        route=_artifact_route(tool_name, run.get("project_id")),
    )


def _persist_blocked_step(conn, run: dict[str, Any], plan: dict[str, Any], step: dict[str, Any], message: str) -> None:
    update_plan_step_status(conn, run["id"], step["plan_step_id"], "blocked")
    create_validation_result(
        conn,
        run["id"],
        plan_step_id=step["plan_step_id"],
        severity="blocking",
        validation_type="tool_not_registered",
        message=message,
        passed=False,
    )
    update_analysis_run_status(conn, run["id"], "blocked")


def _artifact_route(tool_name: str, project_id: str | None) -> str | None:
    if not project_id:
        return None
    if tool_name == "report_writer_tool":
        return f"/projects/{project_id}?tab=report"
    if tool_name == "api_readiness_tool":
        return f"/projects/{project_id}?tab=api"
    return f"/projects/{project_id}"


def _input_summary(tool_name: str, context: dict[str, Any]) -> str:
    pieces = [f"tool={tool_name}"]
    if context.get("dataset_id"):
        pieces.append(f"dataset_id={context['dataset_id']}")
    if context.get("project_id"):
        pieces.append(f"project_id={context['project_id']}")
    if context.get("target_column"):
        pieces.append(f"target={context['target_column']}")
    return ", ".join(pieces)


def _safe_payload(output: dict[str, Any]) -> dict[str, Any]:
    payload = dict(output)
    payload.pop("markdown", None)
    return payload
