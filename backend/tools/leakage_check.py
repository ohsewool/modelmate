"""Leakage check: a safety gate for human review and feature exclusion.

Two kinds of evidence, deliberately kept apart.

Names are cheap to read and often right - `churn_label` beside a `churn` target
needs no computation to be suspicious. But a name is a hint about a column, and
the hint disappears the moment someone renames it. `exit_survey_score` was
caught here only because "score" is in a pattern list; the identical column
called `wellbeing_index` went through untouched with its leak intact.

So the second kind measures what a column *does*: how much of the target one
column alone reproduces (`_separation_power`). That survives renaming, because
it never looks at the name.

Still no training and no call into the AutoML pipeline - the measurement is a
rank statistic over the column that was handed in.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

import pandas as pd

from backend.tools.data_profile import data_profile_tool, dataframe_from_arguments


RESULT_NAME_RE = re.compile(
    r"(target|label|result|outcome|score|grade|status|approved|pass|fail|churned|converted|prediction|정답|결과|상태|등급|점수|합격|불량|고장)",
    re.I,
)
ID_NAME_RE = re.compile(r"(^id$|_id$|uuid|guid|name|email|phone|address|addr|이름|주소|전화|메일)", re.I)
FUTURE_NAME_RE = re.compile(r"(after|post|final|completed|closed|resolved|paid|delivered|완료|최종|확정|처리|납부|배송)", re.I)


def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _name_tokens(value: str) -> set[str]:
    return {token for token in re.split(r"[^0-9a-zA-Z가-힣]+", value.lower()) if token}


def _derived_from_target(column: str, target: str) -> bool:
    """Does this column's name look like it was built from the target's name?

    ``churn_label`` beside a ``churn`` target is the textbook leak, but string
    similarity misses it: the extra token drags the ratio below any useful
    threshold (``churn_label`` scores 0.63 against ``churn``). Token containment
    catches the family - churn_label, churn_result, final_churn - that similarity
    alone does not.
    """
    if len(target) < 3:
        return False  # two-letter targets match too much to be evidence
    column_tokens = _name_tokens(column)
    target_tokens = _name_tokens(target)
    if not target_tokens or not column_tokens:
        return False
    if target_tokens <= column_tokens and column_tokens != target_tokens:
        return True
    # Unsplittable names: churnlabel, churnflag
    compact_target = "".join(sorted(target_tokens))
    return any(
        token != compact_target and compact_target in token for token in column_tokens
    )


def _separation_power(feature: "pd.Series", target: "pd.Series") -> float | None:
    """How well this one column alone reproduces the target, from 0.5 to 1.0.

    Every other signal here is a guess about a *name*. That is defeated by
    renaming: `exit_survey_score` is caught because "score" is in the pattern
    list, and the identical column called `wellbeing_index` sails through with
    its leak untouched. A name is a hint about a column; this is a measurement
    of one.

    0.5 means the column says nothing about the target. 1.0 means it is the
    target wearing a different name. Returns None when the question is not
    answerable - a constant column, one value per row, or a target that is not
    a comparison this simple check can make.
    """
    paired = pd.DataFrame({"x": feature, "y": target})
    paired = paired[paired["y"].notna()]
    if len(paired) < 20 or paired["y"].nunique() != 2:
        return None  # regression and multiclass need a different measure

    # Whether a value exists at all can be the whole leak, and it is the most
    # common shape of one in practice: `cancellation_reason` is filled in for
    # exactly the customers who cancelled. Dropping the empties first would
    # discard precisely the evidence - and leave only the churners, whose single
    # remaining class then looks unmeasurable.
    presence = paired["x"].notna() & (paired["x"].astype(str).str.strip() != "")
    if 0 < presence.sum() < len(paired):
        first = paired["y"].iloc[0]
        agreement = (presence == (paired["y"] == first)).mean()
        by_presence = float(max(agreement, 1 - agreement))
        if by_presence >= 0.90:
            return by_presence

    frame = paired[presence].dropna()
    if len(frame) < 20 or frame["y"].nunique() != 2:
        return None

    values = frame["x"]
    numeric = pd.api.types.is_numeric_dtype(values)
    if values.nunique() < 2:
        return None  # constant: says nothing about anything
    if not numeric and values.nunique() >= len(frame) * 0.95:
        # A near-unique *label* is an identifier, and the unique-ratio rule
        # already owns that case. A near-unique *measurement* is just a
        # continuous variable - skipping those would exempt most real numeric
        # columns from being measured at all, which is where a numeric leak
        # would hide.
        return None

    positive = frame["y"] == frame["y"].unique()[0]
    if not numeric:
        # Categories: how much of the data sits in cells that are nearly pure.
        purity = frame.groupby("x", observed=True)["y"].apply(
            lambda group: max((group == group.iloc[0]).mean(), 1 - (group == group.iloc[0]).mean())
        )
        weights = frame["x"].value_counts(normalize=True)
        return float((purity * weights).reindex(purity.index).sum())

    # Numeric: rank-based AUC, which is Mann-Whitney U normalised. Cheap, and
    # indifferent to scale or monotone transformation.
    ranks = values.rank()
    n_pos, n_neg = int(positive.sum()), int((~positive).sum())
    if n_pos == 0 or n_neg == 0:
        return None
    auc = (ranks[positive].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)
    return float(max(auc, 1 - auc))  # direction does not matter for leakage


def _suspicion(column: str, target: str, profile: dict[str, Any],
               separation: float | None = None) -> dict[str, Any] | None:
    reasons: list[str] = []
    score = 0.0
    unique_count = int((profile.get("unique_count") or {}).get(column) or 0)
    row_count = int(profile.get("row_count") or 0)
    unique_ratio = round(unique_count / row_count, 6) if row_count else 0.0

    derived = _derived_from_target(column, target)
    if _name_similarity(column, target) >= 0.72:
        score += 0.45
        reasons.append("타깃 컬럼명과 매우 비슷합니다.")
    elif derived:
        score += 0.45
        reasons.append("타깃 컬럼명을 그대로 포함하는 파생 이름입니다.")
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

    # Measured, not guessed. Weighted to stand on its own: a column that alone
    # reproduces the target is a leak whatever it is called, and a name-based
    # score of 0 must not keep it below the exclusion threshold.
    if separation is not None and separation >= 0.90:
        score += 0.75 if separation >= 0.97 else 0.5
        reasons.append(
            f"이 컬럼 하나만으로 타깃이 거의 그대로 재현됩니다(분리도 {separation:.2f}). "
            "이름과 무관하게 누수 가능성이 매우 높습니다."
        )

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
    frame: "pd.DataFrame | None" = None,
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

    def measured(column: str) -> float | None:
        """Separation power, or None if the values are not available.

        Failure here must not sound like an all-clear, so a column that cannot
        be measured falls back to the name-based signals rather than scoring 0.
        """
        if frame is None or column not in frame.columns or target not in frame.columns:
            return None
        try:
            return _separation_power(frame[column], frame[target])
        except Exception:
            return None

    suspicious = [
        item for col in features
        if (item := _suspicion(col, target, profile, measured(col)))
    ]
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
    try:
        frame = dataframe_from_arguments(arguments)
    except Exception:
        frame = None  # unparseable input still gets the name-based check
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
        frame=frame,
    )
