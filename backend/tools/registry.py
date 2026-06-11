"""Mock tool registry for PR-04.

Future PRs will wrap existing ModelMate functions as tool adapters here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.tools.base import ToolHandler
from backend.tools.data_profile import data_profile_tool
from backend.tools.leakage_check import leakage_check_tool
from backend.tools.schema_validation import schema_validation_tool
from backend.tools.target_recommendation import target_recommendation_tool


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    mock_response: dict[str, Any]
    handler: ToolHandler


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> ToolDefinition:
        return self._tools[name]

    def names(self) -> list[str]:
        return sorted(self._tools)

    def describe(self) -> list[dict[str, Any]]:
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.input_schema,
                "output_schema": tool.output_schema,
                "mock_response": tool.mock_response,
            }
            for tool in sorted(self._tools.values(), key=lambda item: item.name)
        ]


def _mock_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "mocked",
        "message": "PR-04 mock tool only. No existing AutoML logic was called.",
        "arguments": arguments,
    }


def build_pr01_mock_registry() -> ToolRegistry:
    registry = ToolRegistry()
    for name, description, mock_response, handler in [
        (
            "data_profile_tool",
            "Deterministic CSV structure and quality inspection",
            {"summary": "Dataset shape and column types are inspected when data is provided.", "risk": "deterministic"},
            data_profile_tool,
        ),
        (
            "schema_validation_tool",
            "Deterministic malformed or non-predictive file detection",
            {"summary": "Schema validation checks safety gates when data is provided.", "risk": "deterministic"},
            schema_validation_tool,
        ),
        (
            "target_recommendation_tool",
            "Deterministic prediction target candidate ranking",
            {"summary": "Target candidates are ranked from profile metadata.", "risk": "deterministic"},
            target_recommendation_tool,
        ),
        (
            "leakage_check_tool",
            "Deterministic leakage and excluded-column review",
            {"summary": "Suspicious features are flagged from names and profile metadata.", "risk": "deterministic"},
            leakage_check_tool,
        ),
        (
            "automl_training_tool",
            "Mock existing ModelMate AutoML adapter placeholder",
            {"summary": "Training is intentionally not executed in PR-04.", "risk": "not_executed"},
            _mock_handler,
        ),
    ]:
        registry.register(
            ToolDefinition(
                name=name,
                description=description,
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_goal": {"type": "string"},
                        "profile": {"type": "object"},
                        "validation": {"type": "object"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "status": {"type": "string"},
                        "recommended_next_action": {"type": "string"},
                    },
                },
                mock_response=mock_response,
                handler=handler,
            )
        )
    return registry


def build_pr04_mock_registry() -> ToolRegistry:
    return build_pr01_mock_registry()
