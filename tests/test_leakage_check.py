"""Leakage detection: the check that decides whether a model is worth trusting.

Target leakage is the failure that makes an AutoML result look excellent and be
worthless — a column that encodes the answer produces a model with a great score
and no predictive value. These tests pin the behaviour that matters: obvious
leaks are excluded, ordinary features survive, and the tool never silently drops
the caller's data.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.leakage_check import check_leakage, leakage_check_tool


def profile(columns, *, rows=1000, unique=None, id_like=None, datetime_like=None):
    return {
        "columns": list(columns),
        "row_count": rows,
        "unique_count": dict(unique or {}),
        "possible_id_like_columns": list(id_like or []),
        "datetime_like_columns": list(datetime_like or []),
    }


class TestObviousLeaks:
    def test_a_column_named_like_the_target_is_flagged(self):
        result = check_leakage(
            profile(["age", "churn_label"]), target_column="churn"
        )
        flagged = {item["column_name"] for item in result["suspicious_columns"]}
        assert "churn_label" in flagged
        assert result["leakage_risk"] == "high"

    def test_a_high_risk_column_is_excluded_from_the_feature_set(self):
        result = check_leakage(profile(["age", "churn_result"]), target_column="churn")
        assert "churn_result" in result["excluded_feature_candidates"]
        assert "churn_result" not in result["safe_feature_candidates"]
        assert "age" in result["safe_feature_candidates"]

    def test_high_risk_asks_for_human_review(self):
        result = check_leakage(profile(["churn_outcome"]), target_column="churn")
        assert "human review" in result["recommended_next_action"]

    def test_a_near_unique_column_is_suspicious(self):
        result = check_leakage(
            profile(["customer_ref", "age"], rows=1000,
                    unique={"customer_ref": 990, "age": 60}),
            target_column="churn",
        )
        flagged = {item["column_name"] for item in result["suspicious_columns"]}
        assert "customer_ref" in flagged
        assert "age" not in flagged

    def test_unique_ratio_is_ignored_on_tiny_samples(self):
        """Ten distinct values out of ten rows says nothing; it must not trip the check."""
        result = check_leakage(
            profile(["code"], rows=10, unique={"code": 10}), target_column="churn"
        )
        assert result["suspicious_columns"] == []


class TestOrdinaryFeatures:
    def test_plain_features_are_left_alone(self):
        result = check_leakage(
            profile(["age", "region", "monthly_fee"], rows=500,
                    unique={"age": 60, "region": 12, "monthly_fee": 80}),
            target_column="churn",
        )
        assert result["suspicious_columns"] == []
        assert result["leakage_risk"] == "low"
        assert set(result["safe_feature_candidates"]) == {"age", "region", "monthly_fee"}

    def test_the_target_is_never_offered_as_a_feature(self):
        result = check_leakage(profile(["age", "churn"]), target_column="churn")
        assert "churn" not in result["safe_feature_candidates"]
        assert "churn" not in result["excluded_feature_candidates"]

    def test_datetime_columns_are_noted_but_not_condemned(self):
        result = check_leakage(
            profile(["signup_date", "age"], rows=500,
                    unique={"signup_date": 200, "age": 60},
                    datetime_like=["signup_date"]),
            target_column="churn",
        )
        flagged = {item["column_name"]: item for item in result["suspicious_columns"]}
        assert flagged["signup_date"]["severity"] == "low"
        assert "signup_date" in result["safe_feature_candidates"]


class TestExplicitFeatureSelection:
    def test_only_the_requested_features_are_considered(self):
        result = check_leakage(
            profile(["age", "churn_label", "region"]),
            target_column="churn",
            feature_columns=["age", "region"],
        )
        assert result["suspicious_columns"] == []
        assert set(result["safe_feature_candidates"]) == {"age", "region"}


class TestMissingTarget:
    def test_no_target_yields_a_needs_target_status_not_a_crash(self):
        result = check_leakage(profile(["age", "churn"]), target_column=None)
        assert result["status"] == "needs_target"
        assert result["leakage_risk"] == "medium"  # unknown is not the same as safe
        assert "Choose a target" in result["recommended_next_action"]

    def test_an_empty_target_string_is_treated_as_missing(self):
        assert check_leakage(profile(["age"]), target_column="")["status"] == "needs_target"


class TestToolInterface:
    def test_the_tool_wrapper_returns_the_same_decision(self):
        arguments = {
            "profile": profile(["age", "churn_label"]),
            "target_column": "churn",
        }
        assert leakage_check_tool(arguments)["leakage_risk"] == "high"

    def test_severity_and_action_stay_consistent(self):
        """An 'exclude' action must never accompany a low severity, or the UI lies."""
        result = check_leakage(
            profile(["churn_result", "customer_id", "signup_date", "age"], rows=800,
                    unique={"customer_id": 800, "age": 60},
                    id_like=["customer_id"], datetime_like=["signup_date"]),
            target_column="churn",
        )
        for item in result["suspicious_columns"]:
            if item["suggested_action"] == "exclude":
                assert item["severity"] == "high"
            if item["severity"] == "low":
                assert item["suggested_action"] == "keep"

    def test_risk_score_never_exceeds_one(self):
        result = check_leakage(
            profile(["churn_label_result_id"], rows=1000,
                    unique={"churn_label_result_id": 1000},
                    id_like=["churn_label_result_id"]),
            target_column="churn",
        )
        for item in result["suspicious_columns"]:
            assert 0.0 <= item["risk_score"] <= 1.0
        assert result["risk_score"] <= 1.0


class TestDerivedTargetNames:
    """Regression: a column built from the target's name is the textbook leak.

    String similarity alone missed this family - `churn_label` scores 0.63
    against `churn`, below any workable threshold - so these columns were
    classified medium and kept as features.
    """

    @pytest.mark.parametrize("column", [
        "churn_label", "churn_result", "churn_outcome", "churn_status",
        "final_churn", "churn_flag_result",
    ])
    def test_derived_result_columns_are_excluded(self, column):
        result = check_leakage(profile(["age", column]), target_column="churn")
        assert result["leakage_risk"] == "high", column
        assert column in result["excluded_feature_candidates"], column

    def test_a_bare_derived_name_is_flagged_without_being_excluded(self):
        """`churn_rate` is derived but not obviously an outcome; warn, do not drop."""
        result = check_leakage(profile(["age", "churn_rate"]), target_column="churn")
        flagged = {item["column_name"] for item in result["suspicious_columns"]}
        assert "churn_rate" in flagged
        assert "churn_rate" not in result["excluded_feature_candidates"]

    def test_unrelated_columns_sharing_letters_are_not_derived(self):
        result = check_leakage(
            profile(["age", "region", "monthly_fee"], rows=500,
                    unique={"age": 60, "region": 12, "monthly_fee": 80}),
            target_column="churn",
        )
        assert result["suspicious_columns"] == []

    def test_very_short_targets_do_not_trigger_containment(self):
        """A two-letter target would match half the schema; it must not be evidence."""
        result = check_leakage(
            profile(["price", "quantity"], rows=500,
                    unique={"price": 100, "quantity": 40}),
            target_column="qt",
        )
        assert result["suspicious_columns"] == []

    def test_the_target_itself_is_not_reported_as_derived(self):
        result = check_leakage(profile(["churn", "age"]), target_column="churn")
        flagged = {item["column_name"] for item in result["suspicious_columns"]}
        assert "churn" not in flagged
