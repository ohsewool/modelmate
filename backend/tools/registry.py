"""Mock tool registry for PR-04.

Future PRs will wrap existing ModelMate functions as tool adapters here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


ToolHandler = Callable[[dict[str, Any]], dict[str, Any]]


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
    for name, description, mock_response in [
        (
            "data_profile_tool",
            "Mock CSV structure and quality inspection",
            {"summary": "Dataset shape and column types would be inspected.", "risk": "none"},
        ),
        (
            "schema_validation_tool",
            "Mock malformed or non-predictive file detection",
            {"summary": "Schema appears usable for a prediction workflow.", "risk": "low"},
        ),
        (
            "target_recommendation_tool",
            "Mock target candidate recommendation",
            {"summary": "A likely target column would be ranked from goal and column names.", "risk": "medium"},
        ),
        (
            "leakage_check_tool",
            "Mock leakage and excluded-column review",
            {"summary": "Potential ID/date/direct-answer columns would be reviewed.", "risk": "medium"},
        ),
        (
            "automl_training_tool",
            "Mock existing ModelMate AutoML adapter placeholder",
            {"summary": "Training is intentionally not executed in PR-04.", "risk": "not_executed"},
        ),
    ]:
        registry.register(
            ToolDefinition(
                name=name,
                description=description,
                input_schema={"type": "object", "properties": {"user_goal": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"summary": {"type": "string"}, "risk": {"type": "string"}}},
                mock_response=mock_response,
                handler=_mock_handler,
            )
        )
    return registry


def build_pr04_mock_registry() -> ToolRegistry:
    return build_pr01_mock_registry()
