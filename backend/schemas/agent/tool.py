"""Tool request/response schema placeholders for Agentic AutoML tools."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ToolExecutionRequest:
    tool_name: str
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ToolExecutionResponse:
    tool_name: str
    status: str
    output: dict[str, Any]
