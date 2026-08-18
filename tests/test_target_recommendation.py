"""Target recommendation: the step where a wrong choice wastes the whole run.

Picking an identifier or a date column as the prediction target produces a model
that trains happily and means nothing. These tests pin what must be rejected,
what must be offered, and that a user's stated goal actually influences the
ordering.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.target_recommendation import recommend_targets


def profile(columns, *, rows=1000, unique=None, numeric=None, categorical=None,
            datetime_like=None, id_like=None):
    return {
        "columns": list(columns),
        "row_count": rows,
        "unique_count": dict(unique or {}),
        "numeric_columns": list(numeric or []),
        "categorical_columns": list(categorical or []),
        "datetime_like_columns": list(datetime_like or []),
        "possible_id_like_columns": list(id_like or []),
        "missing_value_ratio": {},
        "constant_columns": [],
    }


CHURN = profile(
    ["customer_id", "signup_date", "age", "monthly_fee", "region", "churn"],
    rows=1000,
    unique={"customer_id": 1000, "signup_date": 300, "age": 60,
            "monthly_fee": 90, "region": 12, "churn": 2},
    numeric=["age", "monthly_fee"],
    categorical=["region", "churn"],
    datetime_like=["signup_date"],
    id_like=["customer_id"],
)


def names(items):
    return [item["column_name"] for item in items]


def top_choice(result):
    """The single column the tool would actually hand to training."""
    chosen = result.get("recommended_target")
    return chosen.get("column_name") if isinstance(chosen, dict) else chosen


class TestUnsuitableColumns:
    def test_an_identifier_is_not_recommended(self):
        result = recommend_targets(CHURN)
        assert "customer_id" not in names(result["candidate_targets"])

    def test_a_date_column_is_not_recommended(self):
        result = recommend_targets(CHURN)
        assert "signup_date" not in names(result["candidate_targets"])

    def test_rejected_columns_carry_a_reason(self):
        result = recommend_targets(CHURN)
        for item in result["rejected_targets"]:
            assert item["reason"], item["column_name"]

    def test_nothing_is_both_recommended_and_rejected(self):
        result = recommend_targets(CHURN)
        assert not set(names(result["candidate_targets"])) & set(names(result["rejected_targets"]))


class TestPlausibleTargets:
    def test_a_binary_outcome_column_is_offered(self):
        result = recommend_targets(CHURN)
        assert "churn" in names(result["candidate_targets"])

    def test_the_single_recommendation_is_the_outcome_column(self):
        assert top_choice(recommend_targets(CHURN)) == "churn"

    def test_recommendations_are_ordered_by_confidence(self):
        result = recommend_targets(CHURN)
        rank = {"high": 3, "medium": 2, "low": 1}
        scores = [rank.get(item.get("confidence_level"), 0)
                  for item in result["candidate_targets"]]
        assert scores == sorted(scores, reverse=True)

    def test_every_recommendation_states_an_inferred_task_type(self):
        for item in recommend_targets(CHURN)["candidate_targets"]:
            assert item["inferred_task_type"] in {"classification", "regression"}


class TestExclusions:
    def test_an_excluded_column_never_appears(self):
        """Leakage check output feeds in here; its exclusions must be honoured."""
        result = recommend_targets(CHURN, excluded_columns=["churn"])
        assert "churn" not in names(result["candidate_targets"])
        assert "churn" not in names(result["rejected_targets"])
        assert top_choice(result) != "churn"

    def test_excluding_everything_leaves_no_recommendation(self):
        result = recommend_targets(CHURN, excluded_columns=list(CHURN["columns"]))
        assert result["candidate_targets"] == []
        assert not result["has_meaningful_target"]


class TestUserGoal:
    def test_a_matching_goal_is_recorded_on_the_candidate(self):
        result = recommend_targets(CHURN, user_goal="고객 이탈을 예측하고 싶어요")
        churn = next((item for item in result["candidate_targets"]
                      if item["column_name"] == "churn"), None)
        assert churn is not None
        assert "goal_match" in churn

    def test_an_empty_goal_still_produces_recommendations(self):
        assert recommend_targets(CHURN, user_goal="")["candidate_targets"]


class TestRegressionTargets:
    def test_a_continuous_outcome_is_treated_as_regression(self):
        data = profile(
            ["house_id", "area", "rooms", "price"],
            rows=800,
            unique={"house_id": 800, "area": 400, "rooms": 8, "price": 600},
            numeric=["area", "rooms", "price"],
            id_like=["house_id"],
        )
        result = recommend_targets(data)
        price = next((item for item in result["candidate_targets"]
                      if item["column_name"] == "price"), None)
        assert price is not None
        assert price["inferred_task_type"] == "regression"


class TestDegenerateInput:
    def test_an_empty_profile_does_not_crash(self):
        result = recommend_targets(profile([]))
        assert result["candidate_targets"] == []

    def test_a_single_column_yields_no_usable_target(self):
        """One column cannot be both the features and the answer."""
        data = profile(["value"], rows=100, unique={"value": 50}, numeric=["value"])
        result = recommend_targets(data)
        assert len(result["candidate_targets"]) <= 1

    def test_an_empty_profile_reports_no_meaningful_target(self):
        assert not recommend_targets(profile([]))["has_meaningful_target"]
