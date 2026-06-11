"""Result formatting helpers for the PR-07 AutoML adapter."""

from __future__ import annotations

from typing import Any


def metric_from_result(result: dict[str, Any], task_type: str) -> dict[str, Any]:
    if task_type == "regression":
        return {"label": "R2", "value": result.get("r2")}
    return {"label": "ROC-AUC", "value": result.get("roc_auc", result.get("accuracy"))}


def training_failure(exc: Exception, stage: str) -> dict[str, Any]:
    detail = getattr(exc, "detail", None)
    message = str(detail or exc)
    return {
        "success": False,
        "status": "failed",
        "summary": f"AutoML training adapter failed at {stage}.",
        "error_type": type(exc).__name__,
        "error_message": message,
        "failed_stage": stage,
        "recommended_next_action": "Review dataset, target, excluded columns, and training configuration.",
        "observation_severity": "error",
    }


def training_success(
    *,
    cv_result: dict[str, Any],
    set_result: dict[str, Any],
    state: dict[str, Any],
    target: str,
    excluded: list[str],
) -> dict[str, Any]:
    leaderboard = cv_result.get("results") or []
    task_type = cv_result.get("task_type") or set_result.get("task_type")
    best = next(
        (row for row in leaderboard if row.get("model") == cv_result.get("best_model")),
        leaderboard[0] if leaderboard else {},
    )
    best_metric = metric_from_result(best, task_type)
    failures = [row for row in leaderboard if row.get("status") != "ok"]
    return {
        "success": True,
        "status": "trained",
        "summary": f"AutoML training completed with {cv_result.get('best_model')} as best model.",
        "experiment_run_id": None,
        "task_type": task_type,
        "target_column": target,
        "used_features": set_result.get("features") or [],
        "excluded_features": {
            "manual": set_result.get("dropped_cols", excluded),
            "auto": state.get("auto_drop_cols", []),
        },
        "leaderboard": leaderboard,
        "leaderboard_summary": [
            {
                "model": row.get("model"),
                "status": row.get("status"),
                "metric": metric_from_result(row, task_type),
            }
            for row in leaderboard
        ],
        "best_model": {"name": cv_result.get("best_model"), "metric": best_metric},
        "best_metric": best_metric,
        "training_warnings": set_result.get("explanations", []),
        "training_failures": failures,
        "artifact": {
            "model_identifier": cv_result.get("best_model"),
            "storage": "existing ModelMate in-memory STATE",
        },
        "raw_result_keys": sorted(cv_result.keys()),
        "recommended_next_action": "Continue to PR-08 evaluation policy before retry or report generation.",
        "observation_severity": "info" if not failures else "warning",
    }
