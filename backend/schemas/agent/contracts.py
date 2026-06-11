"""Inert PR-01 contracts for the future tool-calling AutoML agent.

These dataclasses are intentionally not connected to persistence yet. PR-02 can
map the same concepts to analysis_runs, analysis_steps, tool_calls,
observations, and decisions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


StepKind = Literal["plan", "tool_call", "observation", "decision"]
DecisionAction = Literal["continue", "retry", "human_review", "stop", "final_report"]


@dataclass(frozen=True)
class AgentPlanStep:
    step_id: str
    title: str
    tool_name: str | None = None
    reason: str = ""


@dataclass(frozen=True)
class AgentPlan:
    goal: str
    steps: list[AgentPlanStep]


@dataclass(frozen=True)
class AgentToolCall:
    tool_name: str
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AgentObservation:
    source_tool: str
    summary: str
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AgentDecision:
    action: DecisionAction
    reason: str
    next_step_id: str | None = None


@dataclass(frozen=True)
class AgentRunDraft:
    user_goal: str
    plan: AgentPlan
    tool_calls: list[AgentToolCall] = field(default_factory=list)
    observations: list[AgentObservation] = field(default_factory=list)
    decisions: list[AgentDecision] = field(default_factory=list)
