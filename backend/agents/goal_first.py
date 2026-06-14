"""Deterministic goal-first planning for Agent Mode.

PR-27 creates persisted Agent Runs and Plans only. It does not execute tools.
"""

from __future__ import annotations

import uuid
from typing import Any


CLASSIFICATION_METRICS = ["ROC-AUC", "F1", "precision", "recall"]
REGRESSION_METRICS = ["MAE", "RMSE", "R2"]


def interpret_goal(goal_text: str, target_preference: str | None = None) -> dict[str, Any]:
    text = (goal_text or "").strip()
    lower = text.lower()
    flags: list[str] = []
    warnings: list[str] = []
    target_candidates: list[str] = []

    unsupported = _contains_any(lower, ["rag", "document", "문서", "챗봇", "chatbot", "클러스터", "clustering", "군집", "anomaly", "이상탐지"])
    multi_target = _contains_any(lower, ["multi-target", "다중 타깃", "여러 타깃"])
    causal = _contains_any(lower, ["cause", "causal", "원인", "인과", "영향"])
    time_series = _contains_any(lower, ["time series", "시계열", "날짜", "월별", "일별", "예측 기간", "horizon"])

    if causal:
        flags.append("causal_claim_warning")
        warnings.append("중요 변수의 기여도는 설명할 수 있지만 인과관계를 단정하지 않습니다.")

    if unsupported or multi_target:
        task_family = "unsupported"
        task_type = "unsupported"
        supported_status = "unsupported"
        unsupported_reason = "현재 Agent Mode는 CSV 기반 분류/회귀 예측 문제를 우선 지원합니다."
        if multi_target:
            unsupported_reason = "현재 Agent Mode는 한 번에 하나의 예측 타깃을 다루는 흐름을 우선 지원합니다."
        flags.append("unsupported_goal")
        metrics: list[str] = []
        report_framing = "지원 범위 밖의 분석 요청"
    elif time_series:
        task_family = "time_series"
        task_type = "limited_time_series"
        supported_status = "limited"
        unsupported_reason = "시계열 예측은 날짜 컬럼과 예측 기간 확인이 필요해 제한적으로 지원됩니다."
        flags.append("limited_time_series")
        metrics = REGRESSION_METRICS
        report_framing = "제한적 시계열 예측 검토"
        target_candidates = ["date", "timestamp", "demand", "sales", "날짜", "수요", "매출"]
    elif _contains_any(lower, ["price", "revenue", "demand", "score", "amount", "sales", "가격", "매출", "수요", "점수", "금액"]):
        task_family = "regression"
        task_type = "regression"
        supported_status = "supported"
        unsupported_reason = None
        metrics = REGRESSION_METRICS
        report_framing = "숫자 결과 예측"
        target_candidates = ["price", "revenue", "demand", "score", "amount", "sales", "가격", "매출", "수요", "점수", "금액"]
    else:
        task_family = "classification"
        task_type = "classification"
        supported_status = "supported"
        unsupported_reason = None
        metrics = CLASSIFICATION_METRICS
        report_framing = _classification_framing(lower)
        target_candidates = _classification_targets(lower)

    if target_preference:
        target_candidates = [target_preference, *[item for item in target_candidates if item != target_preference]]

    if not target_preference:
        flags.append("target_ambiguous")

    return {
        "goal_text": text,
        "task_family": task_family,
        "task_type": task_type,
        "supported_status": supported_status,
        "unsupported_reason": unsupported_reason,
        "report_framing": report_framing,
        "likely_metrics": metrics,
        "target_candidates": target_candidates[:8],
        "review_flags": flags,
        "warnings": warnings,
        "target_preference": target_preference,
    }


def build_goal_first_plan(interpreted_goal: dict[str, Any]) -> dict[str, Any]:
    unsupported = interpreted_goal.get("supported_status") == "unsupported"
    steps = [
        _step(1, "데이터 구조 분석", "data_profile_tool", "데이터 행/열, 결측치, 컬럼 타입과 기본 통계를 확인합니다."),
        _step(2, "스키마 검증", "schema_validation_tool", "분석 가능한 CSV 구조인지 확인하고 품질 경고를 정리합니다."),
        _step(3, "타깃 변수 추천", "target_recommendation_tool", "목표에 맞는 예측 타깃 후보를 추천합니다.", "target_ambiguous"),
        _step(4, "누수 위험 점검", "leakage_check_tool", "예측 시점에 알 수 없는 정보나 타깃 누수 가능성을 점검합니다.", "leakage_review_required"),
        _step(5, "AutoML 학습 계획", "automl_training_tool", "여러 모델을 비교 학습할 준비를 합니다."),
        _step(6, "성능 평가 계획", "evaluation_tool", "문제 유형에 맞는 지표로 모델 성능을 평가할 준비를 합니다.", "metric_review_required"),
        _step(7, "예측 이유 설명 계획", "shap_explainer_tool", "주요 변수의 기여도를 설명할 준비를 합니다."),
        _step(8, "검증 계획", "validation_tool", "성능, 데이터 품질, 위험 요소를 검증할 준비를 합니다."),
        _step(9, "근거 기반 보고서 계획", "report_writer_tool", "분석 결과와 한계를 보고서로 정리할 준비를 합니다."),
        _step(10, "예측 API 준비도 점검 계획", "api_readiness_tool", "예측 API로 제공 가능한 상태인지 확인할 준비를 합니다.", "api_readiness_review_required"),
    ]
    if unsupported:
        for step in steps:
            step["status"] = "blocked"
            step["requires_human_review"] = True
            step["review_reason"] = interpreted_goal.get("unsupported_reason")
    elif interpreted_goal.get("supported_status") == "limited":
        steps[2]["requires_human_review"] = True
        steps[2]["review_reason"] = interpreted_goal.get("unsupported_reason")

    return {
        "plan_id": str(uuid.uuid4()),
        "status": "unsupported" if unsupported else "planned",
        "steps": steps,
    }


def _contains_any(text: str, needles: list[str]) -> bool:
    return any(needle.lower() in text for needle in needles)


def _classification_framing(text: str) -> str:
    if _contains_any(text, ["churn", "cancel", "이탈", "해지"]):
        return "고객 이탈 가능성 예측"
    if _contains_any(text, ["failure", "defect", "fault", "고장", "불량", "장애"]):
        return "설비 고장 또는 불량 위험 예측"
    if _contains_any(text, ["conversion", "purchase", "buy", "전환", "구매"]):
        return "구매 또는 전환 가능성 예측"
    return "분류 예측"


def _classification_targets(text: str) -> list[str]:
    if _contains_any(text, ["churn", "cancel", "이탈", "해지"]):
        return ["churn", "cancelled", "retained", "이탈", "해지"]
    if _contains_any(text, ["failure", "defect", "fault", "고장", "불량", "장애"]):
        return ["failure", "defect", "fault", "failure_risk", "고장", "불량"]
    if _contains_any(text, ["conversion", "purchase", "buy", "전환", "구매"]):
        return ["converted", "conversion", "purchase", "bought", "전환", "구매"]
    return ["target", "label", "status", "result"]


def _step(
    order: int,
    name: str,
    tool_name: str,
    purpose: str,
    review_flag: str | None = None,
) -> dict[str, Any]:
    return {
        "plan_step_id": str(uuid.uuid4()),
        "order": order,
        "name": name,
        "tool_name": tool_name,
        "purpose": purpose,
        "expected_input": "업로드된 CSV 또는 선택된 데이터셋 메타데이터",
        "expected_output": "다음 단계에서 사용할 구조화된 JSON 결과",
        "status": "planned",
        "requires_human_review": bool(review_flag),
        "review_reason": review_flag,
    }
