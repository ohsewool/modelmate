"""Deterministic evaluation tool for PR-08.

This tool evaluates an AutoML training result and returns an observation plus a
decision placeholder. It does not retry training, call an LLM, or create reports.
"""

from __future__ import annotations

from typing import Any

from backend.tools.evaluation_policy import DEFAULT_THRESHOLDS, decision, pick_metric, quality, threshold_status


def evaluation_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    result = arguments.get("automl_training_result") or arguments.get("training_result") or arguments
    task_type = arguments.get("task_type") or result.get("task_type") or "unknown"
    preference = arguments.get("metric_preference")
    thresholds = {**DEFAULT_THRESHOLDS, **(arguments.get("threshold_config") or {})}
    success = bool(result.get("success"))
    failures = result.get("training_failures") or []
    warnings: list[str] = []
    failure_reasons = [str(item.get("error", item)) for item in failures]
    metric, value = pick_metric(result, preference)
    status, threshold = threshold_status(metric, value, task_type, thresholds)
    if not success:
        failure_reasons.append(result.get("error_message", "Training did not complete successfully."))
    if metric is None:
        warnings.append("No usable metric was found in the training result.")
    if status == "warning":
        warnings.append("Metric is usable but below the pass threshold.")
    if status == "fail":
        warnings.append("Metric is below the minimum acceptable threshold.")
    decision_payload = decision(status, success)
    observation = {
        "severity": "error" if not success or status == "fail" else "warning" if status in ("warning", "unknown") else "info",
        "message": f"Evaluation status is {status} for {metric or 'unknown metric'}.",
        "metric": metric,
        "value": value,
        "threshold_status": status,
    }
    return {
        "success": success,
        "status": "evaluated" if success else "failed",
        "summary": observation["message"],
        "task_type": task_type,
        "evaluated_metric": metric,
        "best_metric_value": value,
        "threshold": threshold,
        "threshold_status": status,
        "model_quality": "invalid" if not success else quality(status),
        "leaderboard_summary": result.get("leaderboard_summary") or [],
        "failure_reasons": failure_reasons,
        "warnings": warnings,
        "observation": observation,
        "decision": decision_payload,
        "retry_plan_placeholder": {
            "enabled": status in ("warning", "fail"),
            "will_execute_in_pr08": False,
            "suggested_change": "Adjust features, metric threshold, or training budget in a later PR.",
        },
        "recommended_next_action": decision_payload["next_action"],
    }
