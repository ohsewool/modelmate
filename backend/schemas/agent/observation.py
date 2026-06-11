"""Observation schema for future persisted agent tool outputs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ObservationPayload:
    source_tool: str
    summary: str
    evidence: dict[str, Any] = field(default_factory=dict)
