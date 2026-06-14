"""Mock tool registry for PR-04.

Future PRs will wrap existing ModelMate functions as tool adapters here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.tools.automl_training import automl_training_tool
from backend.tools.base import ToolHandler
from backend.tools.data_profile import data_profile_tool
from backend.tools.deployment_check import deployment_check_tool
from backend.tools.evaluation import evaluation_tool
from backend.tools.leakage_check import leakage_check_tool
from backend.tools.report_writer import report_writer_tool
from backend.tools.schema_validation import schema_validation_tool
from backend.tools.shap_explainer import shap_explainer_tool
from backend.tools.target_recommendation import target_recommendation_tool
from backend.tools.validation import validation_tool


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
            "Thin adapter around the existing ModelMate AutoML training flow",
            {"summary": "Calls existing target setup and CV training when dataset input is provided.", "risk": "adapter"},
            automl_training_tool,
        ),
        (
            "evaluation_tool",
            "Deterministic metric threshold evaluator for AutoML results",
            {"summary": "Evaluates training metrics and returns a decision placeholder.", "risk": "deterministic"},
            evaluation_tool,
        ),
        (
            "shap_explainer_tool",
            "XAI adapter that returns explanation evidence for the trained model",
            {"summary": "Returns SHAP, feature importance, coefficient, or unavailable evidence.", "risk": "adapter"},
            shap_explainer_tool,
        ),
        (
            "validation_tool",
            "Deterministic evidence validator for grounded reports",
            {"summary": "Checks whether an evidence bundle can support a grounded report.", "risk": "deterministic"},
            validation_tool,
        ),
        (
            "report_writer_tool",
            "Deterministic grounded Markdown report writer",
            {"summary": "Creates a report draft only from available evidence.", "risk": "deterministic"},
            report_writer_tool,
        ),
        (
            "deployment_check_tool",
            "Deterministic deployment readiness advice checker",
            {"summary": "Returns deploy, hold, review, or blocked advice without deploying.", "risk": "deterministic"},
            deployment_check_tool,
        ),
        (
            "api_readiness_tool",
            "Deterministic prediction API readiness advice checker",
            {"summary": "Checks whether the result is safe enough to expose as a reusable prediction API.", "risk": "deterministic"},
            deployment_check_tool,
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
                        "target_column": {"type": "string"},
                        "excluded_columns": {"type": "array"},
                        "task_type": {"type": "string"},
                        "metric_preference": {"type": "string"},
                        "training_budget": {"type": "object"},
                        "automl_training_result": {"type": "object"},
                        "threshold_config": {"type": "object"},
                        "evaluation_result": {"type": "object"},
                        "evidence_bundle": {"type": "object"},
                        "validation_result": {"type": "object"},
                        "report_result": {"type": "object"},
                        "intended_use": {"type": "string"},
                        "deployment_policy": {"type": "object"},
                        "max_sample_size": {"type": "integer"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "status": {"type": "string"},
                        "success": {"type": "boolean"},
                        "best_model": {"type": "object"},
                        "leaderboard_summary": {"type": "array"},
                        "threshold_status": {"type": "string"},
                        "decision": {"type": "object"},
                        "explanation_type": {"type": "string"},
                        "evidence_bundle": {"type": "object"},
                        "validation_status": {"type": "string"},
                        "report_format": {"type": "string"},
                        "markdown": {"type": "string"},
                        "deployment_status": {"type": "string"},
                        "risk_level": {"type": "string"},
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
