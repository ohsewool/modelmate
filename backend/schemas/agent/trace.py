"""PR-02 agent trace schemas.

These are storage-facing contracts for the future analysis_runs,
analysis_steps, tool_calls, observations, and decisions tables.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


RunStatus = Literal["draft", "running", "waiting_for_human", "completed", "failed"]
StepStatus = Literal["pending", "running", "completed", "skipped", "failed"]
ToolCallStatus = Literal["planned", "running", "succeeded", "failed"]


@dataclass(frozen=True)
class AnalysisRunSchema:
    id: str
    user_goal: str
    status: RunStatus = "draft"
    user_id: str | None = None
    project_id: str | None = None
    dataset_id: str | None = None


@dataclass(frozen=True)
class AnalysisStepSchema:
    id: str
    analysis_run_id: str
    step_index: int
    step_kind: str
    title: str
    status: StepStatus = "pending"
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ToolCallSchema:
    id: str
    analysis_run_id: str
    tool_name: str
    status: ToolCallStatus = "planned"
    analysis_step_id: str | None = None
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ObservationSchema:
    id: str
    analysis_run_id: str
    summary: str
    tool_call_id: str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class DecisionSchema:
    id: str
    analysis_run_id: str
    action: str
    reason: str
    observation_id: str | None = None
    next_step_id: str | None = None
