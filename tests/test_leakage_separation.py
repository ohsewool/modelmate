"""Leakage detection that survives a rename.

Every other signal in the checker is a guess about a column's *name*. That is
worth having - names carry real information - but it is defeated by the least
sophisticated evasion there is, and the evasion is usually accidental. Nobody
names the column that ruins their model `churn_label`; they name it
`wellbeing_index` and never find out.

These tests pin the part that looks at what a column does. The load-bearing
case is `test_a_rename_does_not_hide_the_leak`: identical values, innocent name,
still excluded. If that ever goes green-by-accident the whole addition is
decorative.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.leakage_check import _separation_power, leakage_check_tool

ROWS = 400
SEED = 7


@pytest.fixture
def frame():
    rng = np.random.default_rng(SEED)
    churned = rng.random(ROWS) < 0.3
    return pd.DataFrame({
        "tenure_months": rng.integers(1, 72, ROWS),
        "monthly_fee": rng.normal(45, 15, ROWS).round(2),
        "region": rng.choice(("seoul", "busan", "daegu"), ROWS),
        "churn": np.where(churned, "yes", "no"),
    })


def check(frame, target="churn"):
    return leakage_check_tool({"dataframe": frame, "target_column": target})


def verdict(result, column):
    for item in result["suspicious_columns"]:
        if item["column_name"] == column:
            return item
    return None


class TestASeparatingColumnIsCaughtByAnyName:
    def test_an_innocent_name_does_not_protect_a_leak(self, frame):
        """The whole point: same values, harmless name, still excluded."""
        churned = frame["churn"] == "yes"
        rng = np.random.default_rng(SEED)
        frame["wellbeing_index"] = np.where(
            churned, rng.normal(2.1, 0.5, ROWS), rng.normal(8.4, 0.5, ROWS)
        ).round(2)

        result = check(frame)
        assert verdict(result, "wellbeing_index")["suggested_action"] == "exclude"
        assert "wellbeing_index" in result["excluded_feature_candidates"]

    def test_a_rename_does_not_hide_the_leak(self, frame):
        """Rename the column, change nothing else, get the same verdict."""
        churned = frame["churn"] == "yes"
        rng = np.random.default_rng(SEED)
        values = np.where(churned, rng.normal(2.1, 0.5, ROWS), rng.normal(8.4, 0.5, ROWS))

        named = frame.assign(exit_survey_score=values)
        renamed = frame.assign(harmless_metric=values)

        assert verdict(check(named), "exit_survey_score")["suggested_action"] == "exclude"
        assert verdict(check(renamed), "harmless_metric")["suggested_action"] == "exclude"

    def test_an_ordinary_predictor_is_not_excluded(self, frame):
        """A column that helps must not be treated like one that cheats.

        A check that flags real features is a check people switch off.
        """
        result = check(frame)
        assert "monthly_fee" not in result["excluded_feature_candidates"]
        assert "tenure_months" not in result["excluded_feature_candidates"]

    def test_a_perfect_copy_of_the_target_is_excluded(self, frame):
        frame["outcome_copy"] = (frame["churn"] == "yes").astype(int)
        assert verdict(check(frame), "outcome_copy")["severity"] == "high"


class TestMissingnessIsItselfTheLeak:
    """Fields filled in only after the event are the commonest real leak."""

    def test_a_column_present_only_for_one_class_is_excluded(self, frame):
        frame["cancellation_reason"] = np.where(frame["churn"] == "yes", "price", None)
        assert verdict(check(frame), "cancellation_reason")["suggested_action"] == "exclude"

    def test_blank_strings_count_as_absent(self, frame):
        """CSV round-trips turn missing into "", which must not launder the leak."""
        frame["closed_on"] = np.where(frame["churn"] == "yes", "2025-03-01", "")
        assert verdict(check(frame), "closed_on")["suggested_action"] == "exclude"

    def test_ordinary_missingness_is_not_a_leak(self, frame):
        """Data is often incomplete for reasons unrelated to the outcome."""
        rng = np.random.default_rng(SEED)
        frame["survey_reply"] = np.where(rng.random(ROWS) < 0.4, None, "ok")
        assert "survey_reply" not in check(frame)["excluded_feature_candidates"]


class TestSeparationPower:
    def test_an_unrelated_column_scores_near_chance(self):
        rng = np.random.default_rng(SEED)
        power = _separation_power(
            pd.Series(rng.normal(0, 1, ROWS)),
            pd.Series(rng.choice(["a", "b"], ROWS)),
        )
        assert power is not None and power < 0.65

    def test_a_target_copy_scores_at_the_ceiling(self):
        target = pd.Series(["yes", "no"] * (ROWS // 2))
        assert _separation_power((target == "yes").astype(int), target) == pytest.approx(1.0)

    def test_direction_does_not_matter(self):
        """Inverted evidence is evidence. Both orderings must score alike."""
        target = pd.Series(["yes", "no"] * (ROWS // 2))
        rising = (target == "yes").astype(int)
        assert _separation_power(rising, target) == _separation_power(1 - rising, target)

    def test_a_constant_column_is_unmeasurable(self):
        target = pd.Series(["yes", "no"] * (ROWS // 2))
        assert _separation_power(pd.Series([1] * ROWS), target) is None

    def test_a_unique_label_column_is_left_to_the_identifier_rule(self):
        target = pd.Series(["yes", "no"] * (ROWS // 2))
        ids = pd.Series([f"CUST{i}" for i in range(ROWS)])
        assert _separation_power(ids, target) is None

    def test_a_continuous_column_is_measured_despite_being_all_distinct(self):
        """Distinct floats are the normal case for a measurement, not a red flag.

        Skipping them - as an earlier version did - exempted most real numeric
        columns from being measured at all, which is exactly where a numeric
        leak hides. It is measured, and an uninformative one simply scores
        near chance.
        """
        target = pd.Series(["yes", "no"] * (ROWS // 2))
        power = _separation_power(pd.Series(np.linspace(0, 1, ROWS)), target)
        assert power is not None
        assert power < 0.65

    def test_too_few_rows_to_conclude_anything(self):
        target = pd.Series(["yes", "no"] * 4)
        assert _separation_power(pd.Series(range(8)), target) is None

    def test_a_non_binary_target_is_out_of_scope(self):
        """Regression and multiclass need a different measure, not a wrong one."""
        target = pd.Series([1.5, 2.5, 3.5] * 40)
        assert _separation_power(pd.Series(range(120)), target) is None


class TestFailureIsNotAnAllClear:
    def test_unmeasurable_data_still_gets_the_name_check(self, frame):
        """No values to measure must not read as nothing to worry about."""
        result = leakage_check_tool({
            "profile": {"columns": ["customer_id", "churn_label", "churn"], "row_count": 0},
            "target_column": "churn",
        })
        assert verdict(result, "churn_label") is not None

    def test_a_categorical_leak_is_caught(self, frame):
        frame["exit_bucket"] = np.where(frame["churn"] == "yes", "left", "stayed")
        assert verdict(check(frame), "exit_bucket")["severity"] == "high"
