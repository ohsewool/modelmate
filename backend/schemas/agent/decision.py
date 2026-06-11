"""Decision payload helpers for future Agentic AutoML steps."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class DecisionPayload:
    decision_type: str
    rationale: str
    action: str
    confidence: float | None = None
    evidence: dict[str, Any] = field(default_factory=dict)
