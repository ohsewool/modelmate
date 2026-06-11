"""Evidence bundle builder for PR-09."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def build_evidence_bundle(arguments: dict[str, Any], explanation: dict[str, Any]) -> dict[str, Any]:
    evaluation = arguments.get("evaluation_result") or {}
    training = arguments.get("automl_training_result") or {}
    top_features = explanation.get("top_features") or []
    return {
        "analysis_run_id": arguments.get("analysis_run_id"),
        "experiment_run_id": arguments.get("experiment_run_id") or training.get("experiment_run_id"),
        "user_goal": arguments.get("user_goal"),
        "selected_target": arguments.get("target_column") or training.get("target_column"),
        "task_type": arguments.get("task_type") or training.get("task_type"),
        "model_summary": training.get("best_model") or arguments.get("best_model") or {},
        "metric_summary": {
            "best_metric": training.get("best_metric"),
            "evaluated_metric": evaluation.get("evaluated_metric"),
            "best_metric_value": evaluation.get("best_metric_value"),
        },
        "threshold_status": evaluation.get("threshold_status"),
        "top_features": top_features,
        "explanation_summary": explanation.get("summary"),
        "data_quality_warnings": arguments.get("data_quality_warnings") or [],
        "leakage_warnings": arguments.get("leakage_warnings") or [],
        "limitations": explanation.get("limitations") or [],
        "source_tool_calls": ["automl_training_tool", "evaluation_tool", "shap_explainer_tool"],
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
