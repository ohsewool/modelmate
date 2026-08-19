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

    # Two safety mechanisms in this product used to contradict each other. The
    # leakage check tells a user to drop the columns that reproduce the target;
    # doing so takes the demo dataset from AUC 1.000 to 0.778, which crosses
    # from `pass` to `warning`. So following the advice produced a worse verdict
    # than ignoring it, and the gate that exists to catch bad models was
    # rewarding the leak.
    #
    # The fix is not a lower number - that would be another figure with nothing
    # behind it. A metric is only as meaningful as the features it was earned
    # on, so a high score sitting on high leakage risk is evidence against the
    # model rather than for it. This reads the severity the leakage check
    # already computed instead of inventing a "suspiciously high" threshold.
    leakage_risk = str(
        arguments.get("leakage_risk")
        or (arguments.get("leakage_result") or {}).get("leakage_risk")
        or ""
    ).lower()
    if leakage_risk == "high" and status == "pass":
        status = "warning"
        warnings.append(
            "높은 누수 위험이 남아 있는 상태의 지표입니다. 점수가 높은 것이 "
            "모델이 좋다는 근거가 되지 못합니다 — 누수 컬럼을 제외한 뒤 다시 평가하세요."
        )

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
