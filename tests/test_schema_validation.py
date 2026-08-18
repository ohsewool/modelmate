"""Schema validation: the gate that stops an unusable dataset before training.

The expensive mistake is training on data that could never have worked - too few
rows, one usable column, everything an identifier. These tests pin the cases that
must stop and, just as importantly, the ordinary datasets that must not.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.schema_validation import validate_profile


def profile(**overrides):
    base = {
        "status": "ok",
        "row_count": 500,
        "column_count": 4,
        "missing_value_ratio": {},
        "constant_columns": [],
        "possible_id_like_columns": [],
        "numeric_columns": ["age", "fee"],
        "categorical_columns": ["region", "plan"],
        "datetime_like_columns": [],
    }
    base.update(overrides)
    return base


def severities(result):
    return [violation["severity"] for violation in result["violations"]]


class TestHealthyData:
    def test_an_ordinary_dataset_passes(self):
        result = validate_profile(profile())
        assert result["status"] == "pass"
        assert result["violations"] == []
        assert "target recommendation" in result["recommended_next_action"]

    def test_a_few_missing_values_do_not_block(self):
        result = validate_profile(profile(missing_value_ratio={"age": 0.1, "fee": 0.3}))
        assert result["status"] == "pass"


class TestBlockingProblems:
    def test_an_empty_dataset_fails(self):
        result = validate_profile(profile(row_count=0))
        assert result["status"] == "fail"
        assert "error" in severities(result)

    def test_a_single_column_dataset_fails(self):
        """One column cannot be both the feature set and the target."""
        result = validate_profile(profile(column_count=1, numeric_columns=["age"],
                                          categorical_columns=[]))
        assert result["status"] == "fail"

    def test_too_few_usable_columns_fails(self):
        result = validate_profile(profile(
            constant_columns=["region", "plan"],
            missing_value_ratio={"fee": 0.95},
        ))
        assert result["status"] == "fail"

    def test_an_upstream_profiling_failure_is_propagated(self):
        result = validate_profile(profile(status="fail", summary="could not read the file"))
        assert result["status"] == "fail"
        assert any("could not read" in v["message"] for v in result["violations"])

    def test_failure_tells_the_operator_to_stop(self):
        assert "Stop" in validate_profile(profile(row_count=0))["recommended_next_action"]


class TestWarnings:
    def test_a_tiny_dataset_warns_without_blocking(self):
        result = validate_profile(profile(row_count=20))
        assert result["status"] == "warning"
        assert any("fewer than 30" in v["message"] for v in result["violations"])

    def test_a_mostly_empty_column_warns(self):
        result = validate_profile(profile(missing_value_ratio={"fee": 0.9}))
        assert result["status"] == "warning"
        assert any(v.get("column") == "fee" for v in result["violations"])

    def test_a_constant_column_warns(self):
        result = validate_profile(profile(constant_columns=["plan"]))
        assert any("one unique value" in v["message"] for v in result["violations"])

    def test_a_dataset_of_identifiers_warns(self):
        result = validate_profile(profile(
            column_count=3,
            possible_id_like_columns=["customer_id", "email", "phone"],
        ))
        assert any("identifiers" in v["message"] for v in result["violations"])

    def test_warnings_ask_for_review_before_continuing(self):
        assert "reviewing warnings" in validate_profile(profile(row_count=20))["recommended_next_action"]


class TestSeverityOrdering:
    def test_an_error_outranks_any_number_of_warnings(self):
        result = validate_profile(profile(row_count=0, constant_columns=["plan"]))
        assert result["status"] == "fail"

    def test_identifier_notes_alone_do_not_change_the_status(self):
        """Info-level observations must not silently downgrade a healthy dataset."""
        result = validate_profile(profile(possible_id_like_columns=["customer_id"]))
        assert severities(result) == ["info"]
        assert result["status"] == "pass"

    @pytest.mark.parametrize("field", ["row_count", "column_count"])
    def test_missing_counts_are_treated_as_zero_not_ignored(self, field):
        data = profile()
        data.pop(field)
        assert validate_profile(data)["status"] == "fail"

    def test_the_summary_counts_the_issues_found(self):
        result = validate_profile(profile(row_count=20, constant_columns=["plan"]))
        assert f"{len(result['violations'])} issue" in result["summary"]
