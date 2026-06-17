"""Target usefulness scoring for ModelMate target recommendation.

The goal is to avoid recommending columns that are technically predictable but
not useful as product-facing prediction targets.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


MEANINGFUL_RE = re.compile(
    r"(target|label|result|outcome|status|approved|pass|fail|churn|converted|default|"
    r"defect|fault|failure|risk|diabetes|disease|diagnosis|demand|price|sales|revenue|"
    r"grade|satisfaction|delay|score|amount|value|결과|상태|위험|고장|불량|진단|수요|"
    r"가격|매출|수익|전환|만족|지연|등급|점수|금액|값|여부|합격|이탈|당뇨)",
    re.I,
)

CLASSIFICATION_OUTCOME_RE = re.compile(
    r"^(survived|alive|churn|ischurned|churned|converted|conversion|passed|failurerisk|failed|"
    r"default|isfraud|fraud|label|target|outcome|result|approved|diabetes)$",
    re.I,
)

REGRESSION_OUTCOME_RE = re.compile(
    r"^(demand|sales|revenue|price|amount|cost|score|rating|count|"
    r"가입건수|매출|수요|판매량|가격|점수)$",
    re.I,
)

EQUIVALENT_TARGET_GROUPS = [
    {"survived", "alive"},
    {"churn", "is_churned", "churned"},
    {"converted", "conversion"},
    {"passed", "pass"},
]

COUNT_RE = re.compile(
    r"(count|cnt|quantity|volume|demand|sales|revenue|price|amount|"
    r"건수|수량|인원|승객|가입건수|대여건수|이용건수|매출|수요|가격|금액)",
    re.I,
)

AGGREGATE_DIMENSION_RE = re.compile(
    r"(year|month|date|period|category|group|gender|age|region|type|"
    r"년월|연월|월|기간|구분|분류|성별|연령|연령대|지역|회원)",
    re.I,
)

ADMIN_RE = re.compile(
    r"(^id$|_id$|uuid|guid|idx|index|serial|row|key|code|code_name|codename|name|"
    r"email|phone|address|addr|zip|postal|url|link|memo|note|description|"
    r"번호|일련번호|코드|코드명|이름|주소|전화|전화번호|우편번호|일자|날짜|시간|"
    r"등록|수정|비고|설명|메모|시설명|구분코드|구분코드명|지역명|지점명|시군구명|"
    r"관리기관|법정동|행정동)",
    re.I,
)

INPUT_FEATURE_RE = re.compile(
    r"(^pclass$|^class$|^sex$|^gender$|^age$|^fare$|^fee$|^usage$|^tenure$|"
    r"last_login_days|support_tickets|maintenance_days|temperature|vibration|pressure|"
    r"glucose|bmi|income|month|date|sensor|deck|embarked|embark_town|sibsp|parch|"
    r"competitor_price|ad_spend|discount|stock|available|"
    r"등급|성별|연령|연령대|요금|사용|기간|월|날짜|온도|진동|압력|소득|회원구분)",
    re.I,
)


def _compact(value: str) -> str:
    return re.sub(r"[\s_\-()\[\]/]+", "", str(value or "").lower())


def _unique_ratio(unique_count: int, row_count: int) -> float:
    return round(unique_count / row_count, 6) if row_count else 0.0


def _base_name(column: str) -> str:
    name = _compact(column)
    for suffix in ("코드명", "codename", "code_name", "labelname", "name", "코드", "code", "명", "label"):
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def _confidence_level(score: float, suitability: str, *, meaningful_name: bool, task_type: str) -> str:
    if suitability == "good" and meaningful_name and task_type != "unsuitable" and score >= 0.72:
        return "high"
    if suitability == "good" and task_type != "unsuitable":
        return "medium"
    if suitability == "warning" and task_type != "unsuitable":
        return "needs_review"
    return "low"


def _target_group(column: str) -> set[str]:
    compact = _compact(column)
    for group in EQUIVALENT_TARGET_GROUPS:
        if compact in group:
            return group
    return {compact}


def _outcome_priority(compact: str) -> float:
    if compact in {
        "survived", "outcome", "target", "label", "result", "churn", "ischurned",
        "converted", "conversion", "passed", "failurerisk", "failed", "default",
        "isfraud", "fraud", "diabetes", "demand", "sales", "revenue",
    }:
        return 1.0
    if compact in {"count", "amount", "score", "rating", "가입건수", "매출", "수요", "판매량", "점수"}:
        return 0.85
    if compact in {"price", "cost", "가격"}:
        return 0.65
    return 0.0


def duplicate_target_columns(column: str, columns: list[str]) -> list[str]:
    group = _target_group(column)
    if len(group) <= 1:
        return []
    return [other for other in columns if other != column and _compact(other) in group]


def infer_domain_from_columns(columns: list[str]) -> dict[str, str]:
    compact_cols = {_compact(col) for col in columns}
    joined = " ".join(compact_cols)
    if {"survived", "pclass", "sex", "age", "fare"}.intersection(compact_cols) and (
        "survived" in compact_cols or "alive" in compact_cols
    ):
        return {
            "dataset_domain": "승객 생존 예측",
            "prediction_purpose": "승객 정보로 생존 여부를 예측합니다.",
            "suggested_goal": "승객 정보로 생존 여부를 예측합니다.",
        }
    if any(token in joined for token in ("churn", "customer", "retention")):
        return {
            "dataset_domain": "고객 이탈 예측",
            "prediction_purpose": "고객의 이탈 가능성을 예측합니다.",
            "suggested_goal": "고객 이탈 가능성을 예측합니다.",
        }
    if any(token in joined for token in ("failure", "fault", "defect", "sensor", "maintenance")):
        return {
            "dataset_domain": "고장/불량 위험 예측",
            "prediction_purpose": "고장 또는 불량 위험을 예측합니다.",
            "suggested_goal": "고장 또는 불량 위험을 예측합니다.",
        }
    if any(token in joined for token in ("demand", "sales", "revenue", "price")):
        return {
            "dataset_domain": "수요/매출 예측",
            "prediction_purpose": "수요나 매출 같은 숫자 값을 예측합니다.",
            "suggested_goal": "수요나 매출 값을 예측합니다.",
        }
    if _is_public_aggregate(columns):
        return {
            "dataset_domain": "공공/이용 현황 데이터",
            "prediction_purpose": "예측보다 월별/그룹별 현황 요약을 먼저 확인하는 것이 좋습니다.",
            "suggested_goal": "이 CSV를 먼저 요약하고 예측할 만한 값을 검토합니다.",
        }
    return {
        "dataset_domain": "도메인 확인 필요",
        "prediction_purpose": "예측할 값과 데이터 목적을 먼저 확인해야 합니다.",
        "suggested_goal": "이 CSV에서 예측할 값을 검토합니다.",
    }


def _is_public_aggregate(columns: list[str]) -> bool:
    joined = " ".join(str(col) for col in columns)
    has_count = bool(COUNT_RE.search(joined))
    dimension_count = sum(1 for col in columns if AGGREGATE_DIMENSION_RE.search(str(col)))
    public_hint = any(token in joined for token in ("공공", "자전거", "따릉이", "회원", "가입", "통계"))
    return has_count and dimension_count >= 2 and public_hint


def code_name_pair_warnings(column: str, columns: list[str]) -> list[str]:
    base = _base_name(column)
    if not base:
        return []
    warnings: list[str] = []
    for other in columns:
        if other == column:
            continue
        other_base = _base_name(other)
        if other_base and other_base == base:
            warnings.append(
                f"{column} 컬럼은 {other} 컬럼과 코드/코드명 쌍처럼 보입니다. "
                "서로 직접 연결되어 있을 수 있어 예측 필수 항목으로 쓰기 전 확인이 필요합니다."
            )
    return warnings


def infer_task_type_from_stats(column: str, unique_count: int, row_count: int, is_numeric: bool) -> str:
    if unique_count <= 1:
        return "unsuitable"
    if is_numeric and unique_count >= max(5, int(row_count * 0.08)):
        return "regression"
    if unique_count <= min(30, max(2, int(row_count * 0.4))):
        return "classification"
    return "unsuitable"


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
    task_type = infer_task_type_from_stats(name, unique_count, row_count, is_numeric)
    meaningful_name = bool(MEANINGFUL_RE.search(name))
    strong_classification = bool(CLASSIFICATION_OUTCOME_RE.search(compact))
    strong_regression = bool(REGRESSION_OUTCOME_RE.search(compact))
    if compact == "alive" and any(_compact(col) == "survived" for col in columns):
        strong_classification = False
        meaningful_name = False
    if strong_classification or strong_regression:
        meaningful_name = True
    if COUNT_RE.search(name) and is_numeric and unique_count > 1 and task_type == "unsuitable":
        task_type = "regression"
    if strong_classification:
        task_type = "classification"
    if strong_regression and is_numeric:
        task_type = "regression"
    technical_score = 0.35
    usefulness = 0.0
    labels: list[str] = []
    warnings: list[str] = []

    if 2 <= unique_count <= 30:
        technical_score += 0.25
    if is_numeric and unique_count > 10:
        technical_score += 0.15
    if missing_ratio >= 0.5:
        technical_score -= 0.25
        warnings.append("결측치가 많아 타깃으로 쓰기 전에 검토가 필요합니다.")
    high_cardinality_penalty = unique_ratio >= 0.85 and not (is_numeric and meaningful_name)
    if high_cardinality_penalty:
        technical_score -= 0.35
        warnings.append("고유값이 너무 많아 타깃으로 부적합할 수 있습니다.")
        labels.append("고유값이 너무 많음")
    if task_type == "unsuitable":
        technical_score -= 0.25

    if meaningful_name:
        usefulness += 0.55
        labels.append("추천")
    if strong_classification or strong_regression:
        usefulness += 0.35
        labels.append("결과 컬럼")
    if any(token in compact for token in ("demand", "revenue", "sales", "매출", "수요", "수익")):
        usefulness += 0.08
    if COUNT_RE.search(name) and is_numeric:
        usefulness += 0.22
        labels.append("숫자 예측 후보")
    if INPUT_FEATURE_RE.search(name) and not explicit_target:
        usefulness -= 0.45
        labels.append("입력 변수")
        warnings.append("일반 입력 변수처럼 보이므로 사용자가 직접 원하지 않으면 타깃 우선순위를 낮춥니다.")
    if ADMIN_RE.search(name):
        usefulness -= 0.65
        labels.append("ID/코드성 컬럼")
        warnings.append("ID, 코드, 이름, 주소 또는 행정 메타데이터 성격이 강해 자동 추천 타깃으로 적합하지 않습니다.")

    pair_warnings = code_name_pair_warnings(name, columns)
    if pair_warnings:
        usefulness -= 0.25
        labels.append("누수 위험")
        warnings.extend(pair_warnings)

    duplicate_targets = duplicate_target_columns(name, columns)
    if duplicate_targets:
        labels.append("중복 타깃 주의")
        warnings.extend(
            f"{other} 컬럼은 {name} 컬럼과 같은 의미일 수 있어 입력값에서는 제외하는 것이 안전합니다."
            for other in duplicate_targets
        )

    if explicit_target:
        usefulness += 0.25

    score = max(0.0, min(1.0, 0.45 * technical_score + 0.55 * (0.3 + usefulness)))
    score = round(score, 3)

    if score >= 0.68 and not ADMIN_RE.search(name) and not (INPUT_FEATURE_RE.search(name) and not explicit_target):
        usefulness_label = "높음"
        suitability = "good"
        if task_type == "regression":
            explanation = f"{name} 컬럼은 숫자 값을 예측하는 후보로 사용할 가능성이 높습니다."
        else:
            explanation = f"{name} 컬럼은 결과나 상태를 나타내는 예측값으로 사용할 가능성이 높습니다."
    elif score >= 0.42:
        usefulness_label = "보통"
        suitability = "warning"
        explanation = f"{name} 컬럼은 예측 후보가 될 수 있지만 사용 목적 확인이 필요합니다."
        labels.append("검토 필요")
    else:
        usefulness_label = "낮음"
        suitability = "poor"
        explanation = f"{name} 컬럼은 예측은 가능할 수 있지만 실제 사용 목적이 불명확합니다."
        labels.append("사용 목적 불명확")

    if ADMIN_RE.search(name) and not explicit_target:
        suitability = "poor"
        usefulness_label = "낮음"
    if INPUT_FEATURE_RE.search(name) and not meaningful_name and not explicit_target:
        suitability = "poor"
        usefulness_label = "낮음"

    confidence = _confidence_level(score, suitability, meaningful_name=meaningful_name, task_type=task_type)

    return {
        "column_name": name,
        "inferred_task_type": task_type,
        "confidence_score": score,
        "technical_score": round(max(0.0, min(1.0, technical_score)), 3),
        "usefulness_score": round(max(0.0, min(1.0, 0.3 + usefulness)), 3),
        "usefulness_label": usefulness_label,
        "usefulness_explanation": explanation,
        "quality_labels": sorted(set(labels)),
        "warnings": warnings,
        "missing_ratio": round(float(missing_ratio or 0.0), 6),
        "unique_ratio": unique_ratio,
        "high_cardinality": unique_ratio >= 0.85,
        "suitability": suitability,
        "confidence_level": confidence,
        "semantic_name_score": 1.0 if meaningful_name else 0.25,
        "outcome_keyword_score": 1.0 if (strong_classification or strong_regression) else 0.0,
        "feature_like_penalty": 0.45 if INPUT_FEATURE_RE.search(name) and not explicit_target else 0.0,
        "id_name_date_address_penalty": 0.65 if ADMIN_RE.search(name) else 0.0,
        "leakage_risk": bool(duplicate_targets),
        "excluded_duplicate_targets": duplicate_targets,
        "outcome_priority": _outcome_priority(compact),
    }


def score_dataframe_targets(df: pd.DataFrame, explicit_target: str | None = None) -> list[dict[str, Any]]:
    row_count = max(int(len(df)), 1)
    columns = [str(col) for col in df.columns]
    out: list[dict[str, Any]] = []
    for col in df.columns:
        series = df[col]
        missing_ratio = float(series.isna().mean()) if row_count else 0.0
        unique_count = int(series.nunique(dropna=True))
        out.append(
            score_target_stats(
                str(col),
                row_count=row_count,
                unique_count=unique_count,
                missing_ratio=missing_ratio,
                is_numeric=bool(pd.api.types.is_numeric_dtype(series)),
                columns=columns,
                explicit_target=bool(explicit_target and str(explicit_target) == str(col)),
            )
        )
    confidence_rank = {"high": 3, "medium": 2, "needs_review": 1, "low": 0}
    out.sort(
        key=lambda item: (
            confidence_rank.get(item.get("confidence_level"), 0),
            item["confidence_score"],
            item.get("outcome_priority", 0.0),
            item["usefulness_score"],
        ),
        reverse=True,
    )
    return out


def best_meaningful_target(df: pd.DataFrame) -> tuple[str | None, dict[str, Any]]:
    ranked = score_dataframe_targets(df)
    columns = [str(col) for col in df.columns]
    domain = infer_domain_from_columns(columns)
    public_aggregate = _is_public_aggregate(columns)
    if public_aggregate:
        numeric_candidates = [
            item for item in ranked
            if COUNT_RE.search(item["column_name"])
            and item["inferred_task_type"] == "regression"
            and item["suitability"] != "poor"
        ]
        fallback = numeric_candidates[0] if numeric_candidates else (ranked[0] if ranked else None)
        return (
            None,
            {
                "has_meaningful_target": False,
                "analysis_suitability": "ambiguous_prediction_target",
                "problem_type": (fallback or {}).get("inferred_task_type") or "unknown",
                "confidence": "needs_review",
                "candidates": ranked,
                "recommended": fallback,
                "recommended_prediction_value": None,
                "optional_prediction_candidate": fallback,
                "alternative_candidates": ranked[:5],
                "excluded_columns": [],
                "dataset_domain": domain["dataset_domain"],
                "prediction_purpose": domain["prediction_purpose"],
                "api_ready": False,
                "primary_recommended_action": "summary_report_first",
                "recommended_primary_action": "summary_report_first",
                "message": (
                    "이 CSV는 바로 예측 모델을 만들기보다 월별/그룹별 현황을 요약하는 데 더 적합합니다. "
                    "예측을 진행하려면 가입건수처럼 숫자로 된 값을 직접 선택하는 것이 좋습니다."
                ),
            },
        )
    good = [item for item in ranked if item["suitability"] == "good" and item["inferred_task_type"] != "unsuitable"]
    if good:
        selected = good[0]
        problem_type = selected["inferred_task_type"]
        excluded = selected.get("excluded_duplicate_targets") or []
        return selected["column_name"], {
            "has_meaningful_target": True,
            "analysis_suitability": "clear_regression_prediction" if problem_type == "regression" else "clear_classification_prediction",
            "problem_type": problem_type,
            "confidence": selected.get("confidence_level") or "medium",
            "candidates": ranked,
            "recommended": selected,
            "recommended_prediction_value": selected["column_name"],
            "alternative_candidates": [item for item in ranked if item["column_name"] != selected["column_name"]][:5],
            "excluded_columns": excluded,
            "dataset_domain": domain["dataset_domain"],
            "prediction_purpose": domain["prediction_purpose"],
            "api_ready": True,
            "primary_recommended_action": "start_analysis",
            "recommended_primary_action": "start_analysis",
            "reason": selected.get("usefulness_explanation"),
            "warnings": selected.get("warnings") or [],
        }
    fallback = ranked[0] if ranked else None
    any_usable = any(item["inferred_task_type"] != "unsuitable" and item["suitability"] != "poor" for item in ranked)
    recommended = fallback if any_usable else None
    return (
        (recommended or {}).get("column_name"),
        {
            "has_meaningful_target": False,
            "analysis_suitability": "ambiguous_prediction_target" if any_usable else "prediction_unsuitable",
            "problem_type": (recommended or {}).get("inferred_task_type") or "unsuitable",
            "confidence": "needs_review" if any_usable else "low",
            "candidates": ranked,
            "recommended": recommended,
            "recommended_prediction_value": None,
            "alternative_candidates": ranked[:5],
            "excluded_columns": [],
            "dataset_domain": domain["dataset_domain"],
            "prediction_purpose": domain["prediction_purpose"],
            "api_ready": False,
            "primary_recommended_action": "summary_report_first" if any_usable else "upload_another_csv",
            "recommended_primary_action": "summary_report_first" if any_usable else "upload_another_csv",
            "message": "이 CSV에서는 바로 예측할 만한 명확한 예측값을 찾기 어렵습니다.",
        },
    )
