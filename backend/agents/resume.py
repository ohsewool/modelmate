"""Resume flow skeleton for PR-12.

The helper recommends the next action after human review. It does not rerun
AutoML, deploy models, call an LLM, or start background workers.
"""

from __future__ import annotations

from typing import Any

from backend.agents.state import utc_now_iso


def resolve_review_item(review_item: dict[str, Any], resolution: str, reviewer_note: str | None = None) -> dict[str, Any]:
    resolved = dict(review_item)
    resolved["status"] = "resolved"
    resolved["resolution"] = resolution
    resolved["reviewer_note"] = reviewer_note
    resolved["resolved_at"] = utc_now_iso()
    return resolved


def build_resume_recommendation(review_item: dict[str, Any]) -> dict[str, Any]:
    resolution = str(review_item.get("resolution") or "").lower()
    review_id = review_item.get("review_id") or "review-draft"
    if review_item.get("status") != "resolved":
        next_action = "Wait for reviewer resolution before resuming."
        status = "pending_review"
        plan = [{"step": "human_review", "action": "collect_resolution"}]
    elif resolution in {"dismissed", "accept_risk", "approved"}:
        next_action = "Resume from the next planned agent step with the reviewer note attached."
        status = "ready_to_resume"
        plan = [{"step": "resume", "action": "continue_with_reviewer_context"}]
    elif resolution in {"fix_required", "rerun_needed", "change_target"}:
        next_action = "Create a new plan proposal before rerunning any tool."
        status = "needs_replan"
        plan = [{"step": "planner", "action": "prepare_replan_placeholder"}]
    else:
        next_action = "Clarify the reviewer resolution before resuming."
        status = "needs_clarification"
        plan = [{"step": "human_review", "action": "clarify_resolution"}]
    return {
        "resume_id": f"resume-{review_id}",
        "review_id": review_id,
        "status": status,
        "next_action": next_action,
        "resume_plan": plan,
        "limitations": [
            "PR-12 only recommends resume actions.",
            "No automatic retraining, deployment, LLM planning, or async execution is performed.",
        ],
        "created_at": utc_now_iso(),
    }
