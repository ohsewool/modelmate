"""Metric policy helpers for PR-08 evaluation."""

from __future__ import annotations

from typing import Any


DEFAULT_THRESHOLDS = {
    "classification": {"pass": 0.80, "warning": 0.65},
    "regression": {"pass": 0.70, "warning": 0.40},
}
CLASSIFICATION_ORDER = ["roc_auc", "accuracy", "f1", "precision", "recall"]
REGRESSION_ORDER = ["r2", "rmse", "mae"]
LOWER_IS_BETTER = {"rmse", "mae"}


def best_row(result: dict[str, Any]) -> dict[str, Any]:
    leaderboard = result.get("leaderboard") or []
    best_name = (result.get("best_model") or {}).get("name")
    return next((row for row in leaderboard if row.get("model") == best_name), leaderboard[0] if leaderboard else {})


def pick_metric(result: dict[str, Any], preference: str | None = None) -> tuple[str | None, float | None]:
    best_metric = result.get("best_metric") or {}
    metric_name = preference or str(best_metric.get("label") or "").lower().replace("-", "_")
    row = best_row(result)
    order = REGRESSION_ORDER if result.get("task_type") == "regression" else CLASSIFICATION_ORDER
    for name in [metric_name, *order]:
        if name and row.get(name) is not None:
            return name, float(row[name])
    if best_metric.get("value") is not None and metric_name:
        return metric_name, float(best_metric["value"])
    return None, None


def threshold_status(metric: str | None, value: float | None, task_type: str, thresholds: dict[str, Any]) -> tuple[str, float | None]:
    if metric is None or value is None:
        return "unknown", None
    task_thresholds = thresholds.get(metric) or thresholds.get(task_type) or DEFAULT_THRESHOLDS.get(task_type, {})
    warn = task_thresholds.get("warning")
    passed = task_thresholds.get("pass")
    if warn is None or passed is None:
        return "unknown", None
    if metric in LOWER_IS_BETTER:
        if metric not in thresholds:
            return "unknown", None
        return ("pass" if value <= passed else "warning" if value <= warn else "fail"), float(passed)
    return ("pass" if value >= passed else "warning" if value >= warn else "fail"), float(passed)


def quality(status: str) -> str:
    return {"pass": "strong", "warning": "acceptable", "fail": "weak"}.get(status, "unknown")


def decision(status: str, success: bool) -> dict[str, Any]:
    if not success or status == "unknown":
        return {"decision_type": "needs_review", "next_action": "inspect_training_result"}
    if status == "pass":
        return {"decision_type": "continue", "next_action": "proceed_to_explanation_or_report"}
    if status == "warning":
        return {"decision_type": "retry_recommended", "next_action": "retry_with_adjusted_budget_or_features"}
    return {"decision_type": "hold", "next_action": "explain_limitations_or_request_human_review"}
