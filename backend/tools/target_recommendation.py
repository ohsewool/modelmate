"""Deterministic target recommendation tool.

This tool ranks prediction targets by both technical predictability and
practical usefulness. It does not call an LLM and does not call the existing
ModelMate AutoML training pipeline.
"""

from __future__ import annotations

from typing import Any

from backend.tools.data_profile import data_profile_tool
from backend.tools.schema_validation import schema_validation_tool
from backend.tools.target_quality import COUNT_RE, _is_public_aggregate, infer_domain_from_columns, score_target_stats


def _ratio(unique_count: int, row_count: int) -> float:
    return round(unique_count / row_count, 6) if row_count else 0.0


def _candidate_summary(column: str, profile: dict[str, Any]) -> dict[str, Any]:
    row_count = int(profile.get("row_count") or 0)
    unique_count = int((profile.get("unique_count") or {}).get(column) or 0)
    missing_ratio = float((profile.get("missing_value_ratio") or {}).get(column) or 0.0)
    class_balance = (profile.get("basic_class_balance_candidates") or {}).get(column)
    numeric_distribution = (profile.get("preview_stats") or {}).get(column)
    numeric_columns = set(profile.get("numeric_columns") or [])

    quality = score_target_stats(
        column,
        row_count=row_count,
        unique_count=unique_count,
        missing_ratio=missing_ratio,
        is_numeric=column in numeric_columns,
        columns=[str(col) for col in profile.get("columns", [])],
    )

    reason = (
        f"{column} 컬럼은 {quality['inferred_task_type']} 문제로 해석할 수 있습니다. "
        f"{quality['usefulness_explanation']} "
        f"고유값 {unique_count}개, 결측 {missing_ratio:.1%} 기준으로 평가했습니다."
    )
    return {
        "column_name": column,
        "inferred_task_type": quality["inferred_task_type"],
        "confidence_score": quality["confidence_score"],
        "technical_score": quality["technical_score"],
        "usefulness_score": quality["usefulness_score"],
        "usefulness_label": quality["usefulness_label"],
        "usefulness_explanation": quality["usefulness_explanation"],
        "quality_labels": quality["quality_labels"],
        "confidence_level": quality.get("confidence_level", "low"),
        "reason": reason,
        "warnings": quality["warnings"],
        "excluded_duplicate_targets": quality.get("excluded_duplicate_targets", []),
        "leakage_risk": quality.get("leakage_risk", False),
        "semantic_name_score": quality.get("semantic_name_score"),
        "outcome_keyword_score": quality.get("outcome_keyword_score"),
        "feature_like_penalty": quality.get("feature_like_penalty"),
        "id_name_date_address_penalty": quality.get("id_name_date_address_penalty"),
        "outcome_priority": quality.get("outcome_priority", 0.0),
        "class_balance": class_balance,
        "numeric_distribution": numeric_distribution,
        "high_cardinality": quality["high_cardinality"],
        "missing_ratio": quality["missing_ratio"],
        "unique_ratio": _ratio(unique_count, row_count),
        "suitability": quality["suitability"],
    }


def recommend_targets(
    profile: dict[str, Any],
    validation: dict[str, Any] | None = None,
    *,
    user_goal: str | None = None,
    excluded_columns: list[str] | None = None,
) -> dict[str, Any]:
    excluded = set(excluded_columns or [])
    columns = [str(col) for col in profile.get("columns", []) if str(col) not in excluded]
    domain = infer_domain_from_columns(columns)
    candidates = [_candidate_summary(col, profile) for col in columns]
    public_aggregate = _is_public_aggregate(columns)
    accepted = [
        item for item in candidates
        if item["suitability"] == "good"
        and item["inferred_task_type"] != "unsuitable"
        and item.get("confidence_level") in {"high", "medium"}
    ]
    if public_aggregate:
        accepted = []
    confidence_rank = {"high": 3, "medium": 2, "low": 1}
    accepted.sort(
        key=lambda item: (
            confidence_rank.get(item.get("confidence_level"), 0),
            item["confidence_score"],
            item.get("outcome_priority", 0.0),
            item["usefulness_score"],
        ),
        reverse=True,
    )

    rejected = [
        {
            "column_name": item["column_name"],
            "reason": "; ".join(item["warnings"]) or item["usefulness_explanation"],
            "suitability": item["suitability"],
            "usefulness_label": item["usefulness_label"],
            "quality_labels": item["quality_labels"],
            "warnings": item["warnings"],
            "confidence_level": item.get("confidence_level"),
        }
        for item in candidates
        if item not in accepted
    ]
    weak = [
        item for item in candidates
        if item["suitability"] != "good" and item["inferred_task_type"] != "unsuitable"
    ]
    if public_aggregate:
        weak = [
            item for item in candidates
            if COUNT_RE.search(item["column_name"]) and item["inferred_task_type"] == "regression"
        ] or weak
    recommended = accepted[0] if accepted else None
    suitability = (
        "clear_regression_prediction" if recommended and recommended["inferred_task_type"] == "regression"
        else "clear_classification_prediction" if recommended
        else "ambiguous_prediction_target" if weak
        else "prediction_unsuitable"
    )
    action = (
        f"{recommended['column_name']} 컬럼을 예측값 후보로 검토하고 leakage_check_tool을 실행하세요."
        if recommended
        else "명확한 예측값 후보가 없으므로 요약 보고서를 먼저 보거나 사용자에게 예측 목적을 다시 확인하세요."
    )
    confidence = (
        recommended.get("confidence_level", "medium")
        if recommended
        else "medium" if weak
        else "low"
    )
    excluded_from_recommended = (recommended or {}).get("excluded_duplicate_targets") or []
    return {
        "status": "recommended" if recommended else "needs_human_review",
        "summary": (
            f"Found {len(accepted)} meaningful target candidate(s)."
            if recommended
            else "이 CSV에서는 바로 예측할 만한 명확한 예측값을 찾기 어렵습니다."
        ),
        "analysis_suitability": suitability,
        "confidence": confidence,
        "problem_type": (recommended or {}).get("inferred_task_type") or (weak[0].get("inferred_task_type") if weak else "unsuitable"),
        "dataset_domain": domain.get("dataset_domain"),
        "prediction_purpose": domain.get("prediction_purpose"),
        "user_goal": user_goal,
        "validation_status": (validation or {}).get("validation_status"),
        "candidate_targets": accepted,
        "weak_candidate_targets": weak,
        "rejected_targets": rejected,
        "recommended_target": recommended,
        "recommended_prediction_value": (recommended or {}).get("column_name"),
        "has_meaningful_target": bool(recommended),
        "api_ready": bool(recommended),
        "excluded_columns": excluded_from_recommended,
        "alternative_candidates": [item for item in candidates if not recommended or item["column_name"] != recommended["column_name"]][:5],
        "target_quality_labels": (recommended or {}).get("quality_labels") or ["검토 필요"],
        "recommended_primary_action": "start_analysis" if recommended else "summary_report_first" if weak else "upload_another_csv",
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
