"""Evidence bundle schema for future grounded reports."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class EvidenceBundle:
    analysis_run_id: str | None = None
    experiment_run_id: str | None = None
    user_goal: str | None = None
    selected_target: str | None = None
    task_type: str | None = None
    model_summary: dict[str, Any] = field(default_factory=dict)
    metric_summary: dict[str, Any] = field(default_factory=dict)
    threshold_status: str | None = None
    top_features: list[dict[str, Any]] = field(default_factory=list)
    explanation_summary: str | None = None
    data_quality_warnings: list[Any] = field(default_factory=list)
    leakage_warnings: list[Any] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    source_tool_calls: list[str] = field(default_factory=list)
    created_at: str | None = None
