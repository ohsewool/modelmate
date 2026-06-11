"""Inert tool registry for PR-01.

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


def _mock_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "mocked",
        "message": "PR-01 skeleton only. No existing AutoML logic was called.",
        "arguments": arguments,
    }


def build_pr01_mock_registry() -> ToolRegistry:
    registry = ToolRegistry()
    for name, description in [
        ("data_profile_tool", "CSV structure and quality inspection"),
        ("schema_validation_tool", "Malformed or non-predictive file detection"),
        ("target_recommendation_tool", "Target candidate recommendation"),
        ("leakage_check_tool", "Leakage and excluded-column review"),
        ("automl_training_tool", "Existing ModelMate AutoML adapter placeholder"),
        ("evaluation_tool", "Model score and retry decision placeholder"),
        ("shap_explainer_tool", "Feature importance adapter placeholder"),
        ("deployment_check_tool", "Deployment readiness placeholder"),
        ("report_writer_tool", "Evidence-based report placeholder"),
        ("human_review_handoff", "Human review handoff placeholder"),
    ]:
        registry.register(ToolDefinition(name=name, description=description, handler=_mock_handler))
    return registry
