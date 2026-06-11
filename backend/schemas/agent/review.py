"""Human review queue schemas for PR-12."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


ReviewSeverity = str
ReviewStatus = str


@dataclass(frozen=True)
class ReviewItem:
    review_id: str
    analysis_run_id: str | None
    step_id: str | None
    reason_code: str
    reason_summary: str
    severity: ReviewSeverity
    source_decision: dict[str, Any] = field(default_factory=dict)
    source_observation: dict[str, Any] = field(default_factory=dict)
    recommended_action: str = ""
    status: ReviewStatus = "pending"
    resolution: str | None = None
    reviewer_note: str | None = None
    created_at: str | None = None
    resolved_at: str | None = None


@dataclass(frozen=True)
class ResumeRecommendation:
    resume_id: str
    review_id: str
    status: str
    next_action: str
    resume_plan: list[dict[str, Any]] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
