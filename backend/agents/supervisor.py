"""Mock supervisor planner for PR-03.

The real implementation will interpret user goals and choose tools based on
observations. For now, it returns a deterministic plan that can be stored as an
agent trace without calling an LLM or the real AutoML pipeline.
"""

from __future__ import annotations

from backend.schemas.agent import AgentPlan, AgentPlanStep


class SupervisorPlanner:
    """Builds the first runtime-safe plan contract for Agentic AutoML."""

    def create_initial_plan(self, user_goal: str) -> AgentPlan:
        normalized_goal = user_goal.strip() or "Find a useful prediction goal from the uploaded CSV"
        return AgentPlan(
            goal=normalized_goal,
            steps=[
                AgentPlanStep(
                    step_id="profile-data",
                    title="Inspect dataset structure and quality",
                    tool_name="data_profile_tool",
                    reason="Check whether the CSV can support a prediction workflow.",
                ),
                AgentPlanStep(
                    step_id="recommend-target",
                    title="Recommend target candidates",
                    tool_name="target_recommendation_tool",
                    reason="Compare the user goal with available columns to choose target candidates.",
                ),
                AgentPlanStep(
                    step_id="check-leakage",
                    title="Check leakage and excluded columns",
                    tool_name="leakage_check_tool",
                    reason="Separate IDs, timestamps, direct-answer columns, and leakage risks.",
                ),
                AgentPlanStep(
                    step_id="train-and-evaluate",
                    title="Compare models and evaluate performance",
                    tool_name="automl_training_tool",
                    reason="Later PRs will wrap existing AutoML behavior as this tool adapter.",
                ),
                AgentPlanStep(
                    step_id="write-report",
                    title="Prepare evidence-based report",
                    tool_name="report_writer_tool",
                    reason="Connect observations and decisions to a final report structure.",
                ),
            ],
        )
