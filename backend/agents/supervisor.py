"""Mock supervisor planner for PR-01.

The real implementation will interpret user goals and choose tools based on
observations. For now, it only returns a deterministic plan shape that PR-02 can
persist and PR-03 can expose through a mock endpoint.
"""

from __future__ import annotations

from backend.schemas.agent import AgentPlan, AgentPlanStep


class SupervisorPlanner:
    """Builds the first non-runtime plan contract for Agentic AutoML."""

    def create_initial_plan(self, user_goal: str) -> AgentPlan:
        normalized_goal = user_goal.strip() or "CSV 데이터에서 예측 가능한 목표를 찾는다"
        return AgentPlan(
            goal=normalized_goal,
            steps=[
                AgentPlanStep(
                    step_id="profile-data",
                    title="데이터 구조와 품질 확인",
                    tool_name="data_profile_tool",
                    reason="CSV가 예측 문제로 사용할 수 있는 구조인지 먼저 확인합니다.",
                ),
                AgentPlanStep(
                    step_id="recommend-target",
                    title="맞힐 값 후보 판단",
                    tool_name="target_recommendation_tool",
                    reason="사용자 목표와 컬럼 정보를 비교해 타겟 후보를 고릅니다.",
                ),
                AgentPlanStep(
                    step_id="check-leakage",
                    title="예측을 방해하는 컬럼 점검",
                    tool_name="leakage_check_tool",
                    reason="ID, 날짜, 정답 누수 가능 컬럼을 분리합니다.",
                ),
                AgentPlanStep(
                    step_id="train-and-evaluate",
                    title="모델 비교와 성능 판단",
                    tool_name="automl_training_tool",
                    reason="기존 AutoML 기능을 tool adapter로 호출할 예정입니다.",
                ),
                AgentPlanStep(
                    step_id="write-report",
                    title="근거 기반 결과 정리",
                    tool_name="report_writer_tool",
                    reason="관찰값과 결정 근거를 보고서로 연결합니다.",
                ),
            ],
        )
