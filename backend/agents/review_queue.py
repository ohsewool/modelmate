"""Human review queue skeleton for PR-12.

This module creates JSON-compatible review items only. It does not create a DB
queue, async worker, frontend queue, or blocking workflow.
"""

from __future__ import annotations

from typing import Any

from backend.agents.state import utc_now_iso


REVIEW_ACTIONS = {"needs_review", "hold", "blocked", "retry_recommended"}


def should_create_review_item(decision: dict[str, Any], observation: dict[str, Any] | None = None) -> bool:
    action = str(decision.get("action") or decision.get("deployment_status") or "").lower()
    status = str(decision.get("validation_status") or "").lower()
    severity = str((observation or {}).get("severity") or "").lower()
    if action in REVIEW_ACTIONS or status in {"weak", "invalid"}:
        return True
    if severity in {"warning", "error", "critical"}:
        return True
    return False


def build_review_item(
    *,
    analysis_run_id: str | None,
    step_id: str | None,
    reason_code: str,
    reason_summary: str,
    source_decision: dict[str, Any],
    source_observation: dict[str, Any] | None = None,
    severity: str = "warning",
    recommended_action: str = "Review the issue and choose dismiss or resolve.",
) -> dict[str, Any]:
    created_at = utc_now_iso()
    review_id = f"review-{analysis_run_id or 'draft'}-{step_id or 'step'}-{reason_code}"
    return {
        "review_id": review_id,
        "analysis_run_id": analysis_run_id,
        "step_id": step_id,
        "reason_code": reason_code,
        "reason_summary": reason_summary,
        "severity": severity,
        "source_decision": source_decision,
        "source_observation": source_observation or {},
        "recommended_action": recommended_action,
        "status": "pending",
        "resolution": None,
        "reviewer_note": None,
        "created_at": created_at,
        "resolved_at": None,
    }


def review_item_from_decision(
    decision: dict[str, Any],
    observation: dict[str, Any] | None = None,
    *,
    analysis_run_id: str | None = None,
    step_id: str | None = None,
) -> dict[str, Any] | None:
    if not should_create_review_item(decision, observation):
        return None
    action = decision.get("action") or decision.get("deployment_status") or "needs_review"
    severity = "error" if action in {"blocked", "hold"} else "warning"
    return build_review_item(
        analysis_run_id=analysis_run_id,
        step_id=step_id,
        reason_code=str(action),
        reason_summary=f"Agent decision requires human review: {action}",
        source_decision=decision,
        source_observation=observation,
        severity=severity,
        recommended_action="Resolve the issue, add reviewer note, then request resume recommendation.",
    )
