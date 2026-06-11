"""Deterministic target recommendation tool for PR-06.

This tool ranks likely prediction targets from profile metadata only. It does
not call an LLM and does not call the existing ModelMate AutoML pipeline.
"""

from __future__ import annotations

import re
from typing import Any

from backend.tools.data_profile import data_profile_tool
from backend.tools.schema_validation import schema_validation_tool


TARGET_NAME_RE = re.compile(
    r"(target|label|result|outcome|class|status|approved|pass|fail|churn|converted|score|grade|amount|price|sales|value|수|값|결과|상태|등급|점수|합격|불량|고장|가입|매출|금액)",
    re.I,
)
IDENTIFIER_RE = re.compile(r"(^id$|_id$|uuid|guid|name|email|phone|address|addr|이름|주소|전화|메일)", re.I)


def _ratio(unique_count: int, row_count: int) -> float:
    return round(unique_count / row_count, 6) if row_count else 0.0


def _infer_task_type(column: str, profile: dict[str, Any]) -> str:
    numeric_cols = set(profile.get("numeric_columns") or [])
    unique_count = int((profile.get("unique_count") or {}).get(column) or 0)
    row_count = int(profile.get("row_count") or 0)
    if unique_count <= 1:
        return "unsuitable"
    if column in numeric_cols and unique_count > max(10, int(row_count * 0.08)):
        return "regression"
    if unique_count <= min(30, max(2, int(row_count * 0.4))):
        return "classification"
    return "unsuitable"


def _candidate_summary(column: str, profile: dict[str, Any]) -> dict[str, Any]:
    row_count = int(profile.get("row_count") or 0)
    unique_count = int((profile.get("unique_count") or {}).get(column) or 0)
    missing_ratio = float((profile.get("missing_value_ratio") or {}).get(column) or 0.0)
    unique_ratio = _ratio(unique_count, row_count)
    class_balance = (profile.get("basic_class_balance_candidates") or {}).get(column)
    numeric_distribution = (profile.get("preview_stats") or {}).get(column)
    high_cardinality = column in set(profile.get("high_cardinality_columns") or [])
    id_like = column in set(profile.get("possible_id_like_columns") or []) or bool(IDENTIFIER_RE.search(column))
    constant = column in set(profile.get("constant_columns") or [])
    task_type = _infer_task_type(column, profile)
    warnings: list[str] = []
    score = 0.35

    if TARGET_NAME_RE.search(column):
        score += 0.28
    if class_balance:
        score += 0.18
    if numeric_distribution and task_type == "regression":
        score += 0.14
    if high_cardinality:
        score -= 0.22
        warnings.append("고유값 비율이 높아 타깃으로 부적합할 수 있습니다.")
    if id_like:
        score -= 0.45
        warnings.append("식별자 성격이 강해 타깃으로 추천하지 않습니다.")
    if constant:
        score -= 0.6
        warnings.append("값이 하나뿐이라 예측할 대상이 아닙니다.")
    if missing_ratio >= 0.5:
        score -= 0.25
        warnings.append("결측치가 많아 타깃 품질이 낮습니다.")
    if task_type == "unsuitable":
        score -= 0.25
        warnings.append("분류/회귀 타깃으로 쓰기 어려운 분포입니다.")

    score = round(max(0.0, min(1.0, score)), 3)
    suitability = "good" if score >= 0.65 else "warning" if score >= 0.38 else "poor"
    reason = (
        f"{column} 컬럼은 {task_type} 문제로 해석 가능하며 "
        f"고유값 {unique_count}개, 결측률 {missing_ratio:.1%} 기준으로 평가했습니다."
    )
    return {
        "column_name": column,
        "inferred_task_type": task_type,
        "confidence_score": score,
        "reason": reason,
        "warnings": warnings,
        "class_balance": class_balance,
        "numeric_distribution": numeric_distribution,
        "high_cardinality": high_cardinality,
        "missing_ratio": round(missing_ratio, 6),
        "unique_ratio": unique_ratio,
        "suitability": suitability,
    }


def recommend_targets(
    profile: dict[str, Any],
    validation: dict[str, Any] | None = None,
    *,
    user_goal: str | None = None,
    excluded_columns: list[str] | None = None,
) -> dict[str, Any]:
    excluded = set(excluded_columns or [])
    columns = [col for col in profile.get("columns", []) if col not in excluded]
    candidates = [_candidate_summary(str(col), profile) for col in columns]
    accepted = [
        item for item in candidates
        if item["suitability"] != "poor" and item["inferred_task_type"] != "unsuitable"
    ]
    accepted.sort(key=lambda item: item["confidence_score"], reverse=True)
    rejected = [
        {
            "column_name": item["column_name"],
            "reason": "; ".join(item["warnings"]) or "타깃 적합도가 낮습니다.",
            "suitability": item["suitability"],
        }
        for item in candidates
        if item not in accepted
    ]
    recommended = accepted[0] if accepted else None
    action = (
        f"{recommended['column_name']} 컬럼을 타깃 후보로 검토하고 leakage_check_tool을 실행하세요."
        if recommended
        else "좋은 타깃 후보가 없으므로 사용자에게 예측 목적을 다시 확인하세요."
    )
    return {
        "status": "recommended" if recommended else "needs_human_review",
        "summary": f"Found {len(accepted)} usable target candidate(s).",
        "user_goal": user_goal,
        "validation_status": (validation or {}).get("validation_status"),
        "candidate_targets": accepted,
        "rejected_targets": rejected,
        "recommended_target": recommended,
        "recommended_next_action": action,
    }


def target_recommendation_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    profile = arguments.get("profile")
    if not isinstance(profile, dict):
        profile = data_profile_tool(arguments)
    validation = arguments.get("validation")
    if not isinstance(validation, dict):
        validation = schema_validation_tool({"profile": profile})
    excluded = arguments.get("excluded_columns")
    if not isinstance(excluded, list):
        excluded = []
    return recommend_targets(
        profile,
        validation,
        user_goal=arguments.get("user_goal"),
        excluded_columns=[str(col) for col in excluded],
    )
