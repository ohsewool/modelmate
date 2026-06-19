"""Target recommendation quality scoring for ModelMate.

This module intentionally stays deterministic. It scores CSV columns as
prediction targets without calling an LLM or changing the AutoML pipeline.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


CLASSIFICATION_KEYWORDS = {
    "target", "label", "class", "result", "outcome", "status", "survived",
    "alive", "churn", "churned", "is_churn", "passed", "pass", "failed",
    "failure", "machine failure", "fault", "defect", "risk", "default",
    "fraud", "cancelled", "canceled", "converted", "conversion", "approved",
    "diabetes", "disease", "diagnosis", "heartdisease",
}

REGRESSION_KEYWORDS = {
    "demand", "sales", "revenue", "amount", "price", "cost", "count",
    "quantity", "qty", "score", "rating", "value", "total", "income",
}

KOREAN_OUTCOME_KEYWORDS = {
    "고장", "불량", "위험", "이탈", "합격", "통과", "결과", "등급", "상태",
    "전환", "승인", "부도", "사기", "진단", "질병", "당뇨", "수요", "매출",
    "가격", "금액", "건수", "수량", "점수", "총액",
}

IDENTIFIER_KEYWORDS = {
    "id", "uuid", "guid", "key", "index", "idx", "serial", "number",
    "name", "email", "phone", "address", "addr", "zip", "postal", "url",
    "link", "code", "ticket", "cabin", "passengerid", "customerid",
    "customer_id", "userid", "user_id", "assetid", "asset_id", "memo",
    "note", "description",
}

KOREAN_IDENTIFIER_KEYWORDS = {
    "아이디", "식별", "번호", "고유", "키", "이름", "성명", "주소", "전화",
    "연락처", "우편", "코드", "티켓", "메모", "비고", "설명",
}

DATE_TIME_KEYWORDS = {
    "date", "time", "timestamp", "created", "updated", "year", "month",
    "day", "period", "일자", "날짜", "시간", "연도", "년도", "월", "기간",
}

FEATURE_LIKE_KEYWORDS = {
    "temperature", "temp", "pressure", "vibration", "torque", "rotational",
    "speed", "sensor", "age", "pclass", "fare", "sex", "gender", "bmi",
    "glucose", "insulin", "skin", "bloodpressure", "pedigree", "pregnancies",
    "tenure", "usage", "discount", "stock", "ad_spend", "competitor_price",
    "온도", "압력", "진동", "속도", "센서", "나이", "연령", "성별", "요금",
    "혈압", "재고", "할인",
}

DIRECT_FAILURE_INDICATORS = {
    "twf", "hdf", "pwf", "osf", "rnf",
    "tool wear failure", "heat dissipation failure", "power failure",
    "overstrain failure", "random failures",
}

SUMMARY_DIMENSION_KEYWORDS = {
    "year", "month", "date", "period", "category", "group", "gender",
    "age", "region", "type", "city", "district", "연도", "년도", "월",
    "기간", "구분", "분류", "성별", "연령", "지역", "시군구", "자치구",
}

COUNT_RE = re.compile(
    r"(^|[^0-9a-zA-Z])(count|cnt|quantity|qty|volume|demand|sales|revenue|price|amount|total)([^0-9a-zA-Z]|$)|"
    r"(건수|수량|수요|매출|가격|금액|총액)",
    re.I,
)


def _compact(value: str) -> str:
    return re.sub(r"[\s_\-()\[\]/]+", "", str(value or "").lower())


def _tokens(column: str) -> set[str]:
    lowered = str(column or "").lower()
    compact = _compact(lowered)
    parts = {part for part in re.split(r"[^0-9a-zA-Z가-힣]+", lowered) if part}
    return parts | {compact}


def _contains_any(column: str, keywords: set[str]) -> bool:
    lowered = str(column or "").lower()
    compact = _compact(column)
    tokens = _tokens(column)
    for keyword in keywords:
        keyword_text = str(keyword).lower()
        keyword_compact = _compact(keyword_text)
        if re.fullmatch(r"[0-9a-z_ ]+", keyword_text):
            if keyword_text in tokens or keyword_compact == compact:
                return True
            fuzzy_roots = {"failure", "fault", "risk", "churn", "passed", "converted", "diabetes", "survived", "demand", "sales", "revenue"}
            if keyword_compact in fuzzy_roots and len(keyword_compact) >= 5 and (compact.startswith(keyword_compact) or compact.endswith(keyword_compact)):
                return True
        elif keyword_text in lowered or keyword_compact in compact:
            return True
    return False


def _unique_ratio(unique_count: int, row_count: int) -> float:
    return round(unique_count / row_count, 6) if row_count else 0.0


def _is_identifier_like(column: str, unique_ratio: float) -> bool:
    tokens = _tokens(column)
    compact = _compact(column)
    exact_identifier = compact in {
        "id", "uuid", "guid", "key", "index", "idx", "passengerid",
        "ticket", "cabin", "name", "email", "phone", "address",
    }
    suffix_identifier = compact.endswith(("id", "uuid", "key", "code", "number", "no"))
    korean_identifier = _contains_any(column, KOREAN_IDENTIFIER_KEYWORDS)
    return exact_identifier or suffix_identifier or bool(tokens & IDENTIFIER_KEYWORDS) or korean_identifier


def _is_date_time_like(column: str) -> bool:
    return _contains_any(column, DATE_TIME_KEYWORDS)


def _is_feature_like(column: str) -> bool:
    return _contains_any(column, FEATURE_LIKE_KEYWORDS)


def _classification_keyword(column: str) -> bool:
    return _contains_any(column, CLASSIFICATION_KEYWORDS) or _contains_any(column, KOREAN_OUTCOME_KEYWORDS)


def _regression_keyword(column: str) -> bool:
    return _contains_any(column, REGRESSION_KEYWORDS) or _contains_any(column, {"수요", "매출", "가격", "금액", "건수", "수량", "점수", "총액"})


def _strong_outcome_keyword(column: str) -> bool:
    compact = _compact(column)
    strong = {
        "survived", "outcome", "target", "label", "result", "churn",
        "ischurn", "churned", "converted", "conversion", "passed", "pass",
        "machinefailure", "failurerisk", "failure", "default", "fraud",
        "diabetes", "demand", "sales", "revenue",
    }
    return compact in strong or _contains_any(column, {"고장", "불량", "이탈", "합격", "결과", "당뇨", "수요", "매출"})


def _outcome_priority(column: str) -> float:
    compact = _compact(column)
    if compact in {"machinefailure", "survived", "outcome", "target", "label", "result", "churn", "converted", "passed", "diabetes"}:
        return 1.0
    if compact in {"failure", "failurerisk", "default", "fraud", "demand", "sales", "revenue"}:
        return 0.92
    if _contains_any(column, {"고장", "불량", "이탈", "합격", "당뇨", "매출", "수요"}):
        return 0.9
    if compact in {"amount", "price", "count", "score", "rating", "total"}:
        return 0.72
    return 0.0


def _infer_problem_type(column: str, unique_count: int, row_count: int, is_numeric: bool) -> str:
    if unique_count <= 1:
        return "needs_review"
    if _classification_keyword(column) and unique_count <= max(30, int(row_count * 0.4)):
        return "classification"
    if _regression_keyword(column) and is_numeric and unique_count >= 5:
        return "regression"
    if is_numeric and unique_count >= max(12, int(row_count * 0.08)):
        return "regression"
    if unique_count <= min(30, max(2, int(row_count * 0.35))):
        return "classification"
    return "needs_review"


def _confidence_from_score(score: float, *, gap_to_next: float = 0.0, public_aggregate: bool = False) -> str:
    if public_aggregate:
        return "medium" if score >= 58 else "low"
    if score >= 78 and gap_to_next >= 8:
        return "high"
    if score >= 58:
        return "medium"
    return "low"


def _confidence_label(confidence: str) -> str:
    return {"high": "높음", "medium": "중간", "low": "낮음"}.get(confidence, "낮음")


def _is_public_aggregate(columns: list[str]) -> bool:
    joined = " ".join(str(col) for col in columns)
    has_count = bool(COUNT_RE.search(joined))
    dimension_count = sum(1 for col in columns if _contains_any(str(col), SUMMARY_DIMENSION_KEYWORDS))
    public_hint = any(token in joined.lower() for token in ("public", "bike", "signup", "member", "공공", "자전거", "회원", "가입", "통계"))
    return has_count and dimension_count >= 2 and (public_hint or len(columns) <= 8)


def _target_group(column: str) -> set[str]:
    compact = _compact(column)
    groups = [
        {"survived", "alive"},
        {"churn", "ischurn", "churned"},
        {"converted", "conversion"},
        {"passed", "pass"},
        {"machinefailure", "failure", "failurerisk"},
    ]
    for group in groups:
        if compact in group:
            return group
    return {compact}


def duplicate_target_columns(column: str, columns: list[str]) -> list[str]:
    group = _target_group(column)
    if len(group) <= 1:
        return []
    return [other for other in columns if other != column and _compact(other) in group]


def infer_domain_from_columns(columns: list[str]) -> dict[str, str]:
    compact_cols = {_compact(col) for col in columns}
    joined = " ".join(compact_cols)
    if {"survived", "pclass", "fare", "ticket"}.intersection(compact_cols):
        return {
            "dataset_domain": "탑승 생존 예측",
            "prediction_purpose": "탑승자 정보를 바탕으로 생존 여부를 예측합니다.",
            "suggested_goal": "이 CSV로 생존 여부를 예측하고 중요한 요인을 보고서로 정리해줘.",
        }
    if any(token in joined for token in ("diabetes", "glucose", "bmi", "insulin", "outcome")):
        return {
            "dataset_domain": "당뇨병 여부 예측",
            "prediction_purpose": "건강 지표를 바탕으로 당뇨병 여부를 예측합니다.",
            "suggested_goal": "이 CSV로 당뇨병 여부를 예측하고 중요한 요인을 보고서로 정리해줘.",
        }
    if any(token in joined for token in ("churn", "customer", "retention")):
        return {
            "dataset_domain": "고객 이탈 예측",
            "prediction_purpose": "고객의 이탈 가능성을 예측합니다.",
            "suggested_goal": "이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.",
        }
    if any(token in joined for token in ("machinefailure", "failure", "fault", "defect", "sensor", "maintenance")):
        return {
            "dataset_domain": "고장/불량 위험 예측",
            "prediction_purpose": "고장 또는 불량 위험을 예측합니다.",
            "suggested_goal": "이 CSV로 고장 또는 불량 위험을 예측하고 중요한 요인을 보고서로 정리해줘.",
        }
    if any(token in joined for token in ("demand", "sales", "revenue", "price", "amount")):
        return {
            "dataset_domain": "수요/매출 예측",
            "prediction_purpose": "수요, 매출, 가격 같은 숫자 값을 예측합니다.",
            "suggested_goal": "이 CSV로 수요 또는 매출 값을 예측하고 중요한 요인을 보고서로 정리해줘.",
        }
    if _is_public_aggregate(columns):
        return {
            "dataset_domain": "공공/집계 데이터 요약",
            "prediction_purpose": "예측보다 요약과 그룹별 현황 확인에 더 적합할 수 있습니다.",
            "suggested_goal": "이 CSV를 먼저 요약하고, 예측할 만한 타깃 후보를 함께 검토해줘.",
        }
    return {
        "dataset_domain": "도메인 확인 필요",
        "prediction_purpose": "예측할 값과 데이터 목적을 먼저 확인해야 합니다.",
        "suggested_goal": "이 CSV에서 예측할 타깃을 추천하고, 중요한 요인을 보고서로 정리해줘.",
    }


def code_name_pair_warnings(column: str, columns: list[str]) -> list[str]:
    compact = _compact(column)
    warnings: list[str] = []
    for other in columns:
        if other == column:
            continue
        other_compact = _compact(other)
        if compact and other_compact and compact != other_compact:
            if compact.endswith("code") and other_compact.endswith("name"):
                warnings.append(f"{column} 컬럼은 코드/이름 쌍으로 보입니다. 예측 타깃보다는 설명 변수일 가능성이 높습니다.")
            if compact.endswith("name") and other_compact.endswith("code"):
                warnings.append(f"{column} 컬럼은 코드/이름 쌍으로 보입니다. 예측 타깃보다는 설명 변수일 가능성이 높습니다.")
    return warnings


def infer_task_type_from_stats(column: str, unique_count: int, row_count: int, is_numeric: bool) -> str:
    return _infer_problem_type(column, unique_count, row_count, is_numeric)


def score_target_stats(
    column: str,
    *,
    row_count: int,
    unique_count: int,
    missing_ratio: float,
    is_numeric: bool,
    columns: list[str],
    explicit_target: bool = False,
) -> dict[str, Any]:
    name = str(column)
    compact = _compact(name)
    unique_ratio = _unique_ratio(unique_count, row_count)
    problem_type = _infer_problem_type(name, unique_count, row_count, is_numeric)
    public_aggregate = _is_public_aggregate(columns)
    meaningful_name = _strong_outcome_keyword(name) or _classification_keyword(name) or _regression_keyword(name)
    id_like = _is_identifier_like(name, unique_ratio)
    date_like = _is_date_time_like(name)
    feature_like = _is_feature_like(name)
    direct_failure_indicator = compact in {_compact(item) for item in DIRECT_FAILURE_INDICATORS}

    score = 25.0
    labels: list[str] = []
    warnings: list[str] = []
    excluded_reason = ""

    if meaningful_name:
        score += 36
        labels.append("업무 결과처럼 보이는 컬럼")
    if _strong_outcome_keyword(name):
        score += 18
        labels.append("강한 예측 타깃 후보")
    if 2 <= unique_count <= 20:
        score += 12
        if problem_type == "classification":
            labels.append("분류에 적합한 값 분포")
    if is_numeric and unique_count >= 8 and problem_type == "regression":
        score += 14
        labels.append("회귀에 적합한 숫자 값")
    if columns and columns[-1] == name and meaningful_name:
        score += 6
        labels.append("데이터 끝부분의 결과 컬럼")
    if explicit_target:
        score += 12
        labels.append("사용자가 직접 선택")

    if missing_ratio >= 0.5:
        score -= 30
        warnings.append("결측치가 많아 타깃으로 쓰기 전에 확인이 필요합니다.")
    elif missing_ratio >= 0.2:
        score -= 12
        warnings.append("일부 결측치가 있어 확인이 필요합니다.")
    if id_like and not explicit_target:
        score -= 70
        excluded_reason = "ID, 이름, 코드, 주소처럼 식별 정보에 가까운 컬럼입니다."
        labels.append("타깃 부적합")
    if date_like and not meaningful_name and not explicit_target:
        score -= 45
        excluded_reason = excluded_reason or "날짜/시간 컬럼은 일반적으로 예측 타깃보다 설명 변수입니다."
        labels.append("날짜/시간 컬럼")
    if feature_like and not _strong_outcome_keyword(name) and not explicit_target:
        score -= 38
        excluded_reason = excluded_reason or "센서값, 나이, 요금처럼 입력 특성에 가까운 컬럼입니다."
        labels.append("입력 특성")
    if direct_failure_indicator and any(_compact(col) == "machinefailure" for col in columns) and not explicit_target:
        score -= 28
        warnings.append("최종 고장 여부와 직접 연결된 세부 실패 지표일 수 있어 leakage 확인이 필요합니다.")
        labels.append("leakage 주의")
    if unique_ratio >= 0.9 and not (_regression_keyword(name) and is_numeric) and not explicit_target:
        score -= 32
        excluded_reason = excluded_reason or "고유값이 너무 많아 예측 타깃보다 식별자일 가능성이 높습니다."
        labels.append("고유값 과다")
    if problem_type == "needs_review":
        score -= 16
    if public_aggregate:
        if COUNT_RE.search(name) and is_numeric:
            score = min(score + 8, 66)
            warnings.append("집계형 공공 데이터로 보이므로 예측 전에 사용자가 타깃을 확인해야 합니다.")
        else:
            score -= 20
            warnings.append("집계형 데이터의 그룹/분류 컬럼은 예측 타깃으로 강하게 추천하지 않습니다.")

    for warning in code_name_pair_warnings(name, columns):
        score -= 10
        warnings.append(warning)

    score = max(0.0, min(100.0, round(score, 1)))
    duplicate_targets = duplicate_target_columns(name, columns)
    if duplicate_targets:
        warnings.extend(
            f"{other} 컬럼은 {name} 컬럼과 같은 결과를 나타낼 수 있어 leakage 여부를 확인해야 합니다."
            for other in duplicate_targets
        )

    if excluded_reason and not explicit_target:
        suitability = "poor"
    elif score >= 58 and problem_type != "needs_review":
        suitability = "good"
    elif score >= 38 and problem_type != "needs_review":
        suitability = "warning"
    else:
        suitability = "poor"

    confidence = _confidence_from_score(score, public_aggregate=public_aggregate)
    if suitability == "poor" and not explicit_target:
        confidence = "low"
    if explicit_target and suitability != "poor" and confidence == "low":
        confidence = "medium"

    if suitability == "good":
        if problem_type == "regression":
            explanation = f"{name} 컬럼은 숫자 결과를 예측하는 타깃 후보로 적합합니다."
        else:
            explanation = f"{name} 컬럼은 분류 결과를 예측하는 타깃 후보로 적합합니다."
    elif suitability == "warning":
        explanation = f"{name} 컬럼은 예측 후보가 될 수 있지만 사용 목적 확인이 필요합니다."
    else:
        explanation = excluded_reason or f"{name} 컬럼은 자동 추천 타깃으로 보기 어렵습니다."

    excluded_duplicate_targets = duplicate_targets
    if any(_compact(target) == "machinefailure" for target in columns) and compact in {_compact(item) for item in DIRECT_FAILURE_INDICATORS}:
        excluded_duplicate_targets = sorted(set(excluded_duplicate_targets + [name]))

    return {
        "column_name": name,
        "column": name,
        "inferred_task_type": problem_type,
        "problem_type": problem_type,
        "confidence_score": score / 100.0,
        "score": score,
        "technical_score": round(min(1.0, max(0.0, (100 - missing_ratio * 100) / 100)), 3),
        "usefulness_score": round(score / 100.0, 3),
        "usefulness_label": "추천" if suitability == "good" else "검토 필요" if suitability == "warning" else "비추천",
        "usefulness_explanation": explanation,
        "reason": explanation,
        "quality_labels": sorted(set(labels)) or ["검토 필요"],
        "warnings": warnings,
        "missing_ratio": round(float(missing_ratio or 0.0), 6),
        "unique_ratio": unique_ratio,
        "unique_count": unique_count,
        "high_cardinality": unique_ratio >= 0.85,
        "suitability": suitability,
        "confidence_level": confidence,
        "confidence": confidence,
        "confidence_label": _confidence_label(confidence),
        "semantic_name_score": 1.0 if meaningful_name else 0.0,
        "outcome_keyword_score": _outcome_priority(name),
        "feature_like_penalty": 0.38 if feature_like and not explicit_target else 0.0,
        "id_name_date_address_penalty": 0.7 if (id_like or date_like) and not explicit_target else 0.0,
        "leakage_risk": bool(duplicate_targets or (direct_failure_indicator and any(_compact(col) == "machinefailure" for col in columns))),
        "excluded_duplicate_targets": excluded_duplicate_targets,
        "excluded_reason": excluded_reason,
        "outcome_priority": _outcome_priority(name),
        "requires_review": confidence != "high" or suitability != "good",
    }


def _excluded_columns(ranked: list[dict[str, Any]], selected: dict[str, Any] | None = None) -> list[dict[str, str]]:
    selected_name = (selected or {}).get("column_name")
    excluded: list[dict[str, str]] = []
    for item in ranked:
        name = item.get("column_name")
        if not name or name == selected_name:
            continue
        reason = item.get("excluded_reason")
        if item.get("leakage_risk") and item.get("excluded_duplicate_targets"):
            reason = reason or "추천 타깃과 직접 연결된 중복/누수 후보입니다."
        if item.get("suitability") == "poor" or reason:
            excluded.append({
                "column": name,
                "column_name": name,
                "reason": reason or item.get("usefulness_explanation") or "예측 타깃으로 적합하지 않습니다.",
            })
    if selected:
        for leaked in selected.get("excluded_duplicate_targets") or []:
            if leaked != selected_name and not any(entry["column"] == leaked for entry in excluded):
                excluded.append({
                    "column": leaked,
                    "column_name": leaked,
                    "reason": "추천 타깃과 같은 결과를 직접 나타낼 수 있어 모델 입력에서는 제외 검토가 필요합니다.",
                })
    return excluded


def score_dataframe_targets(df: pd.DataFrame, explicit_target: str | None = None) -> list[dict[str, Any]]:
    row_count = max(int(len(df)), 1)
    columns = [str(col) for col in df.columns]
    ranked: list[dict[str, Any]] = []
    for col in df.columns:
        series = df[col]
        ranked.append(
            score_target_stats(
                str(col),
                row_count=row_count,
                unique_count=int(series.nunique(dropna=True)),
                missing_ratio=float(series.isna().mean()) if row_count else 0.0,
                is_numeric=bool(pd.api.types.is_numeric_dtype(series)),
                columns=columns,
                explicit_target=bool(explicit_target and str(explicit_target) == str(col)),
            )
        )

    ranked.sort(
        key=lambda item: (
            {"high": 3, "medium": 2, "low": 1}.get(item.get("confidence_level"), 0),
            item.get("score", 0),
            item.get("outcome_priority", 0),
            item.get("usefulness_score", 0),
        ),
        reverse=True,
    )
    if ranked:
        top_score = ranked[0].get("score", 0)
        second_score = ranked[1].get("score", 0) if len(ranked) > 1 else 0
        gap = top_score - second_score
        for idx, item in enumerate(ranked):
            if idx == 0:
                confidence = _confidence_from_score(item.get("score", 0), gap_to_next=gap, public_aggregate=_is_public_aggregate(columns))
                if item.get("suitability") == "poor":
                    confidence = "low"
                item["confidence_level"] = confidence
                item["confidence"] = confidence
                item["confidence_label"] = _confidence_label(confidence)
                item["requires_review"] = confidence != "high" or item.get("suitability") != "good"
            elif item.get("confidence_level") == "high" and item.get("score", 0) < 78:
                item["confidence_level"] = "medium"
                item["confidence"] = "medium"
                item["confidence_label"] = "중간"
                item["requires_review"] = True
    return ranked


def best_meaningful_target(df: pd.DataFrame) -> tuple[str | None, dict[str, Any]]:
    ranked = score_dataframe_targets(df)
    columns = [str(col) for col in df.columns]
    domain = infer_domain_from_columns(columns)
    public_aggregate = _is_public_aggregate(columns)
    top = ranked[0] if ranked else None
    alternatives = [item for item in ranked[1:6]]
    excluded = _excluded_columns(ranked, top)

    if not top:
        return None, {
            "has_meaningful_target": False,
            "recommended_target": None,
            "problem_type": "needs_review",
            "confidence": "low",
            "requires_review": True,
            "reason": "CSV에 추천할 수 있는 컬럼이 없습니다.",
            "candidates": [],
            "alternative_candidates": [],
            "excluded_columns": [],
            **domain,
            "api_ready": False,
            "primary_recommended_action": "upload_another_csv",
            "recommended_primary_action": "upload_another_csv",
            "message": "예측할 타깃을 자동으로 정하기 어렵습니다. 타깃 컬럼을 직접 선택해 주세요.",
        }

    usable = top["suitability"] == "good" and top["inferred_task_type"] in {"classification", "regression"}
    high_or_medium = top["confidence_level"] in {"high", "medium"}
    has_meaningful = bool(usable and high_or_medium and not (public_aggregate and top["confidence_level"] != "high"))
    requires_review = bool(top["confidence_level"] != "high" or public_aggregate or not has_meaningful)
    optional_candidate = top if (not has_meaningful and top["confidence_level"] == "medium") else None

    problem_type = top["inferred_task_type"] if has_meaningful or optional_candidate else "needs_review"
    if not has_meaningful and top["confidence_level"] == "low":
        problem_type = "needs_review"

    message = None
    if requires_review:
        if public_aggregate:
            message = "집계형 데이터로 보여 예측 타깃을 자동 확정하지 않습니다. 추천 후보를 확인하거나 타깃을 직접 선택해 주세요."
        elif top["confidence_level"] == "medium":
            message = "추천 타깃 후보가 있지만 사용자 확인이 필요합니다."
        else:
            message = "예측할 타깃을 자동으로 정하기 어렵습니다. 타깃 컬럼을 직접 선택해 주세요."

    recommended_target = top["column_name"] if has_meaningful else None
    quality = {
        "has_meaningful_target": has_meaningful,
        "recommended_target": recommended_target,
        "recommended_prediction_value": recommended_target,
        "recommended": top if (has_meaningful or optional_candidate) else None,
        "optional_prediction_candidate": optional_candidate,
        "problem_type": problem_type,
        "confidence": top["confidence_level"] if has_meaningful or optional_candidate else "low",
        "confidence_label": _confidence_label(top["confidence_level"] if has_meaningful or optional_candidate else "low"),
        "requires_review": requires_review,
        "reason": top.get("reason"),
        "candidates": ranked[:8],
        "candidate_targets": ranked[:8],
        "alternative_candidates": alternatives,
        "excluded_columns": excluded,
        "columns": columns,
        "analysis_suitability": (
            "clear_regression_prediction" if has_meaningful and problem_type == "regression"
            else "clear_classification_prediction" if has_meaningful and problem_type == "classification"
            else "ambiguous_prediction_target" if top["confidence_level"] in {"medium", "low"}
            else "prediction_unsuitable"
        ),
        **domain,
        "api_ready": bool(has_meaningful and top["confidence_level"] == "high"),
        "primary_recommended_action": "start_analysis" if has_meaningful and top["confidence_level"] == "high" else "confirm_target",
        "recommended_primary_action": "start_analysis" if has_meaningful and top["confidence_level"] == "high" else "confirm_target",
        "recommended_next_action": "추천 타깃으로 분석을 진행하세요." if has_meaningful and top["confidence_level"] == "high" else "추천 결과를 확인하고 타깃을 선택해 주세요.",
        "message": message,
    }
    return recommended_target, quality
