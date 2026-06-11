"""Deterministic leakage check tool for PR-06.

This is a safety gate for human review and feature exclusion decisions. It does
not run statistical training and does not call the existing AutoML pipeline.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from backend.tools.data_profile import data_profile_tool


RESULT_NAME_RE = re.compile(
    r"(target|label|result|outcome|score|grade|status|approved|pass|fail|churned|converted|prediction|정답|결과|상태|등급|점수|합격|불량|고장)",
    re.I,
)
ID_NAME_RE = re.compile(r"(^id$|_id$|uuid|guid|name|email|phone|address|addr|이름|주소|전화|메일)", re.I)
FUTURE_NAME_RE = re.compile(r"(after|post|final|completed|closed|resolved|paid|delivered|완료|최종|확정|처리|납부|배송)", re.I)


def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _suspicion(column: str, target: str, profile: dict[str, Any]) -> dict[str, Any] | None:
    reasons: list[str] = []
    score = 0.0
    unique_count = int((profile.get("unique_count") or {}).get(column) or 0)
    row_count = int(profile.get("row_count") or 0)
    unique_ratio = round(unique_count / row_count, 6) if row_count else 0.0

    if _name_similarity(column, target) >= 0.72:
        score += 0.45
        reasons.append("타깃 컬럼명과 매우 비슷합니다.")
    if RESULT_NAME_RE.search(column):
        score += 0.4
        reasons.append("결과나 라벨을 뜻하는 이름입니다.")
    if FUTURE_NAME_RE.search(column):
        score += 0.25
        reasons.append("예측 시점 이후에 알 수 있는 정보일 수 있습니다.")
    if column in set(profile.get("possible_id_like_columns") or []) or ID_NAME_RE.search(column):
        score += 0.22
        reasons.append("식별자 또는 개인 식별 정보 성격이 있습니다.")
    if unique_ratio >= 0.85 and row_count >= 20:
        score += 0.2
        reasons.append("고유값 비율이 지나치게 높습니다.")
    if column in set(profile.get("datetime_like_columns") or []):
        score += 0.08
        reasons.append("날짜/시간 컬럼은 시점 누수를 확인해야 합니다.")

    if not reasons:
        return None
    severity = "high" if score >= 0.65 else "medium" if score >= 0.35 else "low"
    action = "exclude" if severity == "high" else "warn" if severity == "medium" else "keep"
    return {
        "column_name": column,
        "reason": " ".join(reasons),
        "severity": severity,
        "risk_score": round(min(1.0, score), 3),
        "suggested_action": action,
    }


def check_leakage(
    profile: dict[str, Any],
    *,
    target_column: str | None,
    feature_columns: list[str] | None = None,
    user_goal: str | None = None,
) -> dict[str, Any]:
    columns = [str(col) for col in profile.get("columns", [])]
    target = str(target_column or "")
    if not target:
        return {
            "status": "needs_target",
            "summary": "No target column was provided for leakage check.",
            "leakage_risk": "medium",
            "risk_score": 0.5,
            "suspicious_columns": [],
            "safe_feature_candidates": [col for col in columns],
            "excluded_feature_candidates": [],
            "recommended_next_action": "Choose a target before reviewing leakage.",
        }
    features = [str(col) for col in (feature_columns or columns) if str(col) != target]
    suspicious = [item for col in features if (item := _suspicion(col, target, profile))]
    excluded = [item["column_name"] for item in suspicious if item["suggested_action"] == "exclude"]
    safe = [col for col in features if col not in excluded]
    max_score = max((item["risk_score"] for item in suspicious), default=0.0)
    leakage_risk = "high" if max_score >= 0.65 else "medium" if max_score >= 0.35 else "low"
    action = (
        "Exclude high-risk columns and request human review before training."
        if leakage_risk == "high"
        else "Review warnings, then continue to AutoML adapter in a later PR."
        if leakage_risk == "medium"
        else "Continue with the safe feature candidates."
    )
    return {
        "status": "checked",
        "summary": f"Leakage risk is {leakage_risk}; {len(suspicious)} suspicious column(s) found.",
        "user_goal": user_goal,
        "target_column": target,
        "leakage_risk": leakage_risk,
        "risk_score": round(max_score, 3),
        "suspicious_columns": suspicious,
        "safe_feature_candidates": safe,
        "excluded_feature_candidates": excluded,
        "recommended_next_action": action,
    }


def leakage_check_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    profile = arguments.get("profile")
    if not isinstance(profile, dict):
        profile = data_profile_tool(arguments)
    target_column = arguments.get("target_column")
    if not target_column and isinstance(arguments.get("recommended_target"), dict):
        target_column = arguments["recommended_target"].get("column_name")
    features = arguments.get("feature_columns")
    if not isinstance(features, list):
        features = None
    return check_leakage(
        profile,
        target_column=str(target_column) if target_column else None,
        feature_columns=features,
        user_goal=arguments.get("user_goal"),
    )
