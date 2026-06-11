"""Deployment advice schema for PR-11."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class DeploymentDecision:
    deployment_status: str
    risk_level: str
    rationale: str
    required_actions: list[str] = field(default_factory=list)
    policy_checks: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True)
class DeploymentRecordPlaceholder:
    deployment_id: str
    model_alias: str | None = None
    stage: str = "advice_only"
    decision: DeploymentDecision | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
