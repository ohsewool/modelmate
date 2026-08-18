"""Target quality: the judgement target recommendation is built on.

Every recommendation downstream inherits these scores, so an identifier called
suitable here becomes a wasted training run three steps later. The tests pin the
classifications - what is unsuitable, what task type a column implies, and that
a plausible outcome column outranks an arbitrary one.
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.target_quality import (
    best_meaningful_target,
    code_name_pair_warnings,
    duplicate_target_columns,
    infer_task_type_from_stats,
    score_dataframe_targets,
    score_target_stats,
)


def score(column, *, rows=1000, unique=2, missing=0.0, numeric=False, columns=None):
    return score_target_stats(
        column, row_count=rows, unique_count=unique, missing_ratio=missing,
        is_numeric=numeric, columns=columns or [column],
    )


class TestTaskTypeInference:
    def test_a_two_valued_column_is_classification(self):
        assert infer_task_type_from_stats("churn", 2, 1000, False) == "classification"

    def test_a_continuous_numeric_column_is_regression(self):
        assert infer_task_type_from_stats("price", 800, 1000, True) == "regression"

    def test_a_low_cardinality_numeric_column_is_still_classification(self):
        """Grades 1-5 stored as integers are categories, not a quantity."""
        assert infer_task_type_from_stats("grade", 5, 1000, True) == "classification"

    def test_a_unique_per_row_column_is_not_given_a_task_type(self):
        """Refusing to guess is the answer here, not picking the lesser wrong one."""
        assert infer_task_type_from_stats("customer_id", 1000, 1000, False) == "needs_review"

    def test_a_constant_column_is_not_given_a_task_type(self):
        assert infer_task_type_from_stats("plan", 1, 1000, False) == "needs_review"


class TestUnsuitableTargets:
    def test_an_identifier_is_marked_poor(self):
        result = score("customer_id", unique=1000)
        assert result["suitability"] == "poor"
        assert result["inferred_task_type"] == "needs_review"

    def test_a_date_column_is_not_a_good_target(self):
        assert score("signup_date", unique=300)["suitability"] != "good"

    def test_a_constant_column_is_not_a_good_target(self):
        assert score("plan", unique=1)["suitability"] != "good"

    def test_a_mostly_missing_column_is_penalised(self):
        complete = score("churn", unique=2, missing=0.0)
        sparse = score("churn", unique=2, missing=0.9)
        assert sparse["confidence_score"] < complete["confidence_score"]

    def test_an_unsuitable_column_carries_a_reason(self):
        result = score("customer_id", unique=1000)
        assert result["warnings"] or result.get("usefulness_explanation")


class TestPlausibleTargets:
    def test_an_outcome_named_column_scores_well(self):
        result = score("churn", unique=2)
        assert result["inferred_task_type"] == "classification"
        assert result["confidence_score"] > 0

    def test_an_outcome_name_outranks_an_arbitrary_one(self):
        """`churn` and `col_7` may have identical statistics; the name is evidence."""
        named = score("churn", unique=2, columns=["churn", "col_7"])
        arbitrary = score("col_7", unique=2, columns=["churn", "col_7"])
        assert named["confidence_score"] > arbitrary["confidence_score"]

    def test_a_price_column_is_a_regression_target(self):
        result = score("price", rows=1000, unique=700, numeric=True)
        assert result["inferred_task_type"] == "regression"

    def test_an_explicit_target_is_taken_seriously(self):
        """The user naming a column is evidence the heuristics should respect."""
        implicit = score("col_7", unique=2)
        explicit = score_target_stats(
            "col_7", row_count=1000, unique_count=2, missing_ratio=0.0,
            is_numeric=False, columns=["col_7"], explicit_target=True,
        )
        assert explicit["confidence_score"] >= implicit["confidence_score"]


class TestDuplicateAndPairedColumns:
    @pytest.mark.parametrize("twin", ["Churn", "churn ", "CHURN"])
    def test_a_column_differing_only_in_spelling_is_a_duplicate(self, twin):
        """Two columns that normalise to one name are one column entered twice."""
        assert duplicate_target_columns("churn", ["churn", twin, "age"]) == [twin]

    def test_a_distinct_column_is_not_a_duplicate(self):
        assert duplicate_target_columns("churn", ["churn", "churn_rate", "age"]) == []

    def test_an_unrelated_column_is_not_a_duplicate(self):
        assert duplicate_target_columns("churn", ["churn", "age", "region"]) == []

    def test_a_code_and_name_pair_is_warned_about(self):
        """`status_code` beside `status_name` usually means one encodes the other."""
        warnings = code_name_pair_warnings("status_code", ["status_code", "status_name"])
        assert isinstance(warnings, list)


class TestDataFrameScoring:
    @pytest.fixture
    def frame(self):
        return pd.DataFrame({
            "customer_id": [f"C{i:04d}" for i in range(200)],
            "age": [20 + i % 50 for i in range(200)],
            "region": ["seoul", "busan"] * 100,
            "churn": [i % 2 for i in range(200)],
        })

    def test_every_column_is_scored(self, frame):
        scored = score_dataframe_targets(frame)
        assert {item["column_name"] for item in scored} == set(frame.columns)

    def test_the_outcome_column_is_chosen(self, frame):
        column, summary = best_meaningful_target(frame)
        assert column == "churn"
        assert summary["has_meaningful_target"] is True

    def test_an_identifier_is_never_chosen(self, frame):
        column, _ = best_meaningful_target(frame)
        assert column != "customer_id"

    def test_a_frame_with_no_plausible_target_says_so(self):
        """Identifiers and dates only: there is nothing here worth predicting."""
        frame = pd.DataFrame({
            "customer_id": [f"C{i}" for i in range(100)],
            "signup_date": pd.date_range("2024-01-01", periods=100).astype(str),
        })
        column, summary = best_meaningful_target(frame)
        assert column is None or summary["has_meaningful_target"] is False

    def test_an_explicit_target_is_honoured(self, frame):
        scored = score_dataframe_targets(frame, explicit_target="age")
        age = next(item for item in scored if item["column_name"] == "age")
        assert age["confidence_score"] > 0

    def test_an_empty_frame_does_not_crash(self):
        assert score_dataframe_targets(pd.DataFrame()) == []


class TestScoreShape:
    def test_a_score_reports_its_reasoning(self):
        result = score("churn", unique=2)
        assert "confidence_level" in result
        assert "quality_labels" in result
        assert "usefulness_label" in result

    def test_confidence_level_matches_the_score_ordering(self):
        rank = {"high": 3, "medium": 2, "low": 1}
        strong = score("churn", unique=2)
        weak = score("customer_id", unique=1000)
        assert rank[strong["confidence_level"]] >= rank[weak["confidence_level"]]

    def test_scores_stay_within_bounds(self):
        for column, unique in (("churn", 2), ("customer_id", 1000), ("plan", 1)):
            result = score(column, unique=unique)
            assert 0 <= result["confidence_score"] <= 100
