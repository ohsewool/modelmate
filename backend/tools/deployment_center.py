"""Minimal Deployment Center placeholders for PR-11.

This module does not deploy models or change prediction APIs.
"""

from __future__ import annotations

from typing import Any


def build_deployment_advice_id(arguments: dict[str, Any]) -> str:
    evidence = arguments.get("evidence_bundle") or {}
    run_id = evidence.get("analysis_run_id") or evidence.get("experiment_run_id") or "draft"
    return f"deployment-advice-{run_id}"


def get_deployment_center_placeholder() -> dict[str, Any]:
    return {
        "status": "placeholder",
        "stage": "advice_only",
        "message": "PR-11 defines deployment advice only. No production deployment is executed.",
        "future_fields": ["model_alias", "stage", "policy", "review_status", "deployment_history"],
    }
