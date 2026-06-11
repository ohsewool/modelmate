"""Base contracts for Agentic AutoML tools."""

from __future__ import annotations

from typing import Any, Protocol


class ToolHandler(Protocol):
    def __call__(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Run a tool with JSON-compatible arguments and return JSON-compatible output."""
