"""Mock agent runner for the Agentic AutoML skeleton.

This runner proves the shape of plan -> tool call -> observation -> decision
without calling an LLM or the real ModelMate AutoML pipeline.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from backend.agents.persistence import (
    create_analysis_run,
    create_analysis_steps_from_plan,
    create_decision,
    create_observation,
    create_tool_call,
    get_analysis_timeline,
)
from backend.agents.supervisor import SupervisorPlanner
from backend.tools import build_pr04_mock_registry


def select_mock_tools(user_goal: str) -> list[str]:
    goal = user_goal.lower()
    selected = ["data_profile_tool", "schema_validation_tool"]
    if any(word in goal for word in ("target", "predict", "prediction", "classify", "forecast")):
        selected.append("target_recommendation_tool")
        selected.append("leakage_check_tool")
    elif any(word in goal for word in ("leak", "exclude", "id", "date")):
        selected.append("target_recommendation_tool")
        selected.append("leakage_check_tool")
    else:
        selected.append("target_recommendation_tool")
        selected.append("leakage_check_tool")
    return selected[:4]


def run_mock_agent_timeline(
    conn: sqlite3.Connection,
    user_goal: str,
    *,
    user_id: str | None = None,
    project_id: str | None = None,
    dataset_id: str | None = None,
    tool_arguments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    planner = SupervisorPlanner()
    registry = build_pr04_mock_registry()
    plan = planner.create_initial_plan(user_goal)
    run_id = create_analysis_run(
        conn,
        plan.goal,
        user_id=user_id,
        project_id=project_id,
        dataset_id=dataset_id,
        status="running",
    )
    steps = create_analysis_steps_from_plan(conn, run_id, plan)
    step_by_tool = {step["payload"].get("tool_name"): step["id"] for step in steps}

    tool_results = []
    shared_tool_arguments = tool_arguments or {}
    latest_profile: dict[str, Any] | None = None
    latest_validation: dict[str, Any] | None = None
    latest_target: dict[str, Any] | None = None
    for tool_name in select_mock_tools(plan.goal):
        tool = registry.get(tool_name)
        arguments = {"user_goal": plan.goal, "mode": "deterministic_pr06", **shared_tool_arguments}
        if tool_name == "schema_validation_tool" and latest_profile is not None:
            arguments["profile"] = latest_profile
        if tool_name == "target_recommendation_tool" and latest_profile is not None:
            arguments["profile"] = latest_profile
            if latest_validation is not None:
                arguments["validation"] = latest_validation
        if tool_name == "leakage_check_tool" and latest_profile is not None:
            arguments["profile"] = latest_profile
            if latest_target is not None:
                arguments["recommended_target"] = latest_target
        call = create_tool_call(
            conn,
            run_id,
            tool_name,
            analysis_step_id=step_by_tool.get(tool_name),
            arguments=arguments,
            status="succeeded",
        )
        result = {**tool.mock_response, **tool.handler(arguments)}
        if tool_name == "data_profile_tool":
            latest_profile = result
        if tool_name == "schema_validation_tool":
            latest_validation = result
        if tool_name == "target_recommendation_tool":
            latest_target = result.get("recommended_target")
        observation = create_observation(
            conn,
            run_id,
            result["summary"],
            tool_call_id=call["id"],
            evidence={
                "tool_name": tool_name,
                "mock_response": result,
                "schema": {
                    "input": tool.input_schema,
                    "output": tool.output_schema,
                },
            },
        )
        decision = create_decision(
            conn,
            run_id,
            "continue",
            f"Mock observation from {tool_name} is sufficient for the next planning step.",
            observation_id=observation["id"],
        )
        tool_results.append({"tool_call": call, "observation": observation, "decision": decision})

    final_decision = create_decision(
        conn,
        run_id,
        "human_review",
        "PR-06 stops before real AutoML execution. A human should confirm before PR-07 wraps training.",
    )
    timeline = get_analysis_timeline(conn, run_id)
    return {
        "analysis_run_id": run_id,
        "goal": plan.goal,
        "selected_tools": select_mock_tools(plan.goal),
        "tool_results": tool_results,
        "final_decision": final_decision,
        "timeline": timeline,
        "agent_status": "mock_timeline_only",
        "message": "PR-06 uses deterministic profile, validation, target, and leakage tools when data is provided. No LLM or real AutoML pipeline was called.",
    }
