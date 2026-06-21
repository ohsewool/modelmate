"""Deterministic QA cases for Target Recommendation v2."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.tools.target_quality import best_meaningful_target


def load(name: str) -> pd.DataFrame:
    return pd.read_csv(ROOT / "sample_data" / "qa" / name)


def check_case(
    name: str,
    dataframe: pd.DataFrame,
    *,
    expected_target: str | None,
    expected_problem: str | set[str],
    requires_review: bool,
    forbidden_targets: set[str] | None = None,
) -> dict[str, object]:
    target, quality = best_meaningful_target(dataframe)
    forbidden_targets = forbidden_targets or set()
    assert target == expected_target, f"{name}: expected {expected_target!r}, got {target!r}"
    assert target not in forbidden_targets, f"{name}: forbidden target selected: {target}"
    expected_problems = {expected_problem} if isinstance(expected_problem, str) else expected_problem
    assert quality["problem_type"] in expected_problems, quality
    assert quality["requires_review"] is requires_review, quality
    assert quality["confidence"] in {"high", "medium", "low"}, quality
    if requires_review:
        assert quality["confidence"] != "high", quality
        assert quality.get("primary_recommended_action") == "confirm_target", quality
    assert quality.get("reason"), f"{name}: recommendation reason is missing"
    assert isinstance(quality.get("excluded_columns"), list), quality
    return {
        "case": name,
        "target": target,
        "problem_type": quality["problem_type"],
        "confidence": quality["confidence"],
        "requires_review": quality["requires_review"],
    }


def main() -> int:
    cases = [
        check_case(
            "equipment_failure",
            load("equipment_failure.csv"),
            expected_target="Machine failure",
            expected_problem="classification",
            requires_review=False,
            forbidden_targets={"TWF", "HDF", "PWF", "OSF"},
        ),
        check_case(
            "titanic_like",
            load("titanic_like.csv"),
            expected_target="Survived",
            expected_problem="classification",
            requires_review=False,
            forbidden_targets={"Pclass", "PassengerId"},
        ),
        check_case(
            "customer_churn",
            pd.read_csv(ROOT / "sample_data" / "customer_churn_demo.csv"),
            expected_target="churn",
            expected_problem="classification",
            requires_review=False,
        ),
        check_case(
            "student_result",
            pd.read_csv(ROOT / "frontend" / "public" / "samples" / "student_performance_demo.csv"),
            expected_target="passed",
            expected_problem="classification",
            requires_review=False,
        ),
        check_case(
            "sales_demand",
            pd.read_csv(ROOT / "frontend" / "public" / "samples" / "sales_demand_demo.csv"),
            expected_target="demand",
            expected_problem="regression",
            requires_review=False,
        ),
        check_case(
            "public_bike_summary",
            load("public_bike_summary.csv"),
            expected_target=None,
            expected_problem={"classification", "regression", "needs_review"},
            requires_review=True,
            forbidden_targets={"가입년월", "회원구분", "연령대", "성별"},
        ),
        check_case(
            "ambiguous",
            load("ambiguous.csv"),
            expected_target="value_b",
            expected_problem={"regression", "needs_review"},
            requires_review=True,
        ),
    ]
    for result in cases:
        print(
            "PASS {case}: target={target}, problem={problem_type}, "
            "confidence={confidence}, review={requires_review}".format(**result)
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
