"""Target usefulness scoring for ModelMate target recommendation.

The goal is to avoid recommending columns that are technically predictable but
not useful as product-facing prediction targets.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


MEANINGFUL_RE = re.compile(
    r"(target|label|result|outcome|class|status|approved|pass|fail|churn|converted|default|"
    r"defect|fault|failure|risk|diabetes|disease|diagnosis|demand|price|sales|revenue|"
    r"grade|satisfaction|delay|score|amount|value|결과|상태|위험|고장|불량|진단|수요|"
    r"가격|매출|수익|전환|만족|지연|등급|점수|금액|값|여부|합격|이탈|당뇨)",
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
    r"(age|glucose|bmi|pressure|temperature|vibration|income|gender|month|date|"
    r"나이|연령|혈압|온도|진동|압력|소득|성별|월|날짜)",
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
    if compact in {"outcome", "diabetes", "churn", "failure_risk", "converted", "passed"}:
        usefulness += 0.2
    if any(token in compact for token in ("demand", "revenue", "sales", "매출", "수요", "수익")):
        usefulness += 0.08
    if INPUT_FEATURE_RE.search(name) and not explicit_target:
        usefulness -= 0.18
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

    if explicit_target:
        usefulness += 0.25

    score = max(0.0, min(1.0, 0.45 * technical_score + 0.55 * (0.3 + usefulness)))
    score = round(score, 3)

    if score >= 0.68 and not ADMIN_RE.search(name):
        usefulness_label = "높음"
        suitability = "good"
        explanation = f"{name} 컬럼은 결과나 상태를 나타내는 예측 목표로 사용할 가능성이 높습니다."
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
    out.sort(key=lambda item: item["confidence_score"], reverse=True)
    return out


def best_meaningful_target(df: pd.DataFrame) -> tuple[str | None, dict[str, Any]]:
    ranked = score_dataframe_targets(df)
    good = [item for item in ranked if item["suitability"] == "good" and item["inferred_task_type"] != "unsuitable"]
    if good:
        return good[0]["column_name"], {"has_meaningful_target": True, "candidates": ranked, "recommended": good[0]}
    fallback = ranked[0] if ranked else None
    return (
        (fallback or {}).get("column_name"),
        {
            "has_meaningful_target": False,
            "candidates": ranked,
            "recommended": fallback,
            "message": "이 CSV에서는 바로 예측할 만한 명확한 타깃을 찾기 어렵습니다.",
        },
    )
