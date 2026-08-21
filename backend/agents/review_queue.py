"""Human review queue skeleton for PR-12.

This module creates JSON-compatible review items only. It does not create a DB
queue, async worker, frontend queue, or blocking workflow.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from backend.agents.state import utc_now_iso


REVIEW_ACTIONS = {"needs_review", "hold", "blocked", "retry_recommended"}

# Actions that carry on with the analysis and need nobody's attention. This is
# an allow-list on purpose. It used to be the other way round - REVIEW_ACTIONS
# was consulted as a deny-list, so anything not named in it produced no review
# at all, and `block_execution` (which the executor really emits) and
# `abort_and_delete_dataset` both went past unseen.
#
# A queue whose job is to catch what should not proceed cannot be built from a
# list of things that should not proceed, because the dangerous case is always
# the one nobody thought to add. An unfamiliar action is exactly what a person
# should look at, so anything not listed here escalates.
#
# The cost of being wrong in this direction is a reviewer seeing an item that
# turned out to be routine. The cost in the other direction is a destructive
# action passing unseen.
PROCEEDING_ACTIONS = {
    "proceed", "continue", "start", "started", "complete", "completed",
    "next_action", "next_step", "ok", "success", "succeeded", "pass", "passed",
    "continue_with_reviewer_context", "clarify_resolution", "collect_resolution",
    # 위 셋과 함께 `resume.build_resume_recommendation`이 내는 계획 동작이다. 넷 중
    # 셋만 여기 있었고 `prepare_replan_placeholder`가 빠져 있었다.
    #
    # 빠진 채로 두면 고리가 생긴다: 검토자가 `fix_required`로 해결한 항목에 대해
    # 재개 계획이 "다시 계획하라"를 내놓고, 그 동작이 허용 목록에 없으니 검토
    # 대기열이 **또 검토 항목을 만든다.** 해결된 것을 다시 검토하게 만드는 것은
    # 검토를 무의미하게 만드는 가장 빠른 길이다.
    #
    # 오늘은 아무 영향이 없다 - `resume.py`는 아직 배선되지 않았고, 그래서 이
    # 불일치가 조용히 남아 있었다. 배선하는 날 드러날 것을 지금 맞춰둔다.
    "prepare_replan_placeholder",
}


def should_create_review_item(decision: dict[str, Any], observation: dict[str, Any] | None = None) -> bool:
    action = str(decision.get("action") or decision.get("deployment_status") or "").lower()
    status = str(decision.get("validation_status") or "").lower()
    severity = str((observation or {}).get("severity") or "").lower()
    if status in {"weak", "invalid"}:
        return True
    if severity in {"warning", "error", "critical"}:
        return True
    if not action:
        # A decision that does not say what it decided is not a decision that
        # can be waved through.
        return True
    return action not in PROCEEDING_ACTIONS


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
    # The id used to be run+step+reason alone, so two different problems at the
    # same step collapsed onto one identifier: a `critical` observation and an
    # `error` one produced the same review_id, and anything keyed by id would
    # keep one of them.
    #
    # A digest of what the review is actually about separates them, while
    # keeping the property that re-processing the same decision produces the
    # same id - so a retry does not fill the queue with duplicates of one issue.
    fingerprint = hashlib.sha256(
        json.dumps({"decision": source_decision, "observation": source_observation or {}},
                   ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()[:8]
    review_id = (f"review-{analysis_run_id or 'draft'}-{step_id or 'step'}"
                 f"-{reason_code}-{fingerprint}")
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
