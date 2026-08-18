"""Data profiling: everything downstream believes what this reports.

Leakage detection, schema validation, and target recommendation all read the
profile rather than the data. A column mistyped here becomes a wrong decision
three steps later, so these tests pin the classifications rather than the
formatting.
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.data_profile import profile_dataframe


@pytest.fixture
def customers():
    return pd.DataFrame({
        "customer_id": [f"C{index:04d}" for index in range(100)],
        "age": [20 + index % 50 for index in range(100)],
        "monthly_fee": [10.5 + index % 30 for index in range(100)],
        "region": ["seoul", "busan", "daegu", "incheon"] * 25,
        "signup_date": pd.date_range("2024-01-01", periods=100).astype(str),
        "plan": ["basic"] * 100,
        "churn": [index % 2 for index in range(100)],
    })


class TestShape:
    def test_row_and_column_counts_are_reported(self, customers):
        result = profile_dataframe(customers)
        assert result["row_count"] == 100
        assert result["column_count"] == 7

    def test_every_column_appears_exactly_once(self, customers):
        columns = profile_dataframe(customers)["columns"]
        assert len(columns) == len(set(columns)) == 7


class TestTypeClassification:
    def test_numeric_columns_are_identified(self, customers):
        numeric = set(profile_dataframe(customers)["numeric_columns"])
        assert {"age", "monthly_fee"} <= numeric

    def test_text_columns_are_not_called_numeric(self, customers):
        numeric = set(profile_dataframe(customers)["numeric_columns"])
        assert "region" not in numeric
        assert "customer_id" not in numeric

    def test_date_columns_are_recognised(self, customers):
        assert "signup_date" in profile_dataframe(customers)["datetime_like_columns"]

    def test_a_numeric_column_is_not_mistaken_for_a_date(self, customers):
        assert "age" not in profile_dataframe(customers)["datetime_like_columns"]


class TestDegenerateColumns:
    def test_a_constant_column_is_flagged(self, customers):
        assert "plan" in profile_dataframe(customers)["constant_columns"]

    def test_a_varying_column_is_not_flagged_as_constant(self, customers):
        assert "age" not in profile_dataframe(customers)["constant_columns"]

    def test_a_unique_key_is_flagged_as_identifier_like(self, customers):
        assert "customer_id" in profile_dataframe(customers)["possible_id_like_columns"]

    def test_a_low_cardinality_column_is_not_identifier_like(self, customers):
        assert "region" not in profile_dataframe(customers)["possible_id_like_columns"]


class TestMissingValues:
    def test_a_complete_column_reports_no_missing(self, customers):
        assert profile_dataframe(customers)["missing_value_ratio"]["age"] == 0

    def test_missing_values_are_measured_as_a_ratio(self):
        frame = pd.DataFrame({"value": [1.0, None, None, 4.0], "other": [1, 2, 3, 4]})
        ratios = profile_dataframe(frame)["missing_value_ratio"]
        assert ratios["value"] == pytest.approx(0.5)
        assert ratios["other"] == 0

    def test_an_entirely_missing_column_reports_one(self):
        frame = pd.DataFrame({"empty": [None] * 5, "other": [1, 2, 3, 4, 5]})
        assert profile_dataframe(frame)["missing_value_ratio"]["empty"] == pytest.approx(1.0)


class TestUniqueCounts:
    def test_unique_counts_match_the_data(self, customers):
        unique = profile_dataframe(customers)["unique_count"]
        assert unique["customer_id"] == 100
        assert unique["region"] == 4
        assert unique["plan"] == 1

    def test_a_binary_target_reports_two_values(self, customers):
        assert profile_dataframe(customers)["unique_count"]["churn"] == 2


class TestJsonSafety:
    def test_the_profile_survives_json_serialisation(self, customers):
        """Downstream tools receive this over an API boundary."""
        import json

        json.dumps(profile_dataframe(customers))

    def test_infinite_values_do_not_leak_into_the_profile(self):
        """NaN and inf are not JSON, and would break every consumer."""
        import json
        import numpy as np

        frame = pd.DataFrame({"value": [1.0, np.inf, -np.inf, np.nan], "other": [1, 2, 3, 4]})
        json.dumps(profile_dataframe(frame))


class TestEdgeCases:
    def test_an_empty_frame_does_not_crash(self):
        result = profile_dataframe(pd.DataFrame())
        assert result["row_count"] == 0
        assert result["column_count"] == 0

    def test_a_single_row_frame_is_profiled(self):
        result = profile_dataframe(pd.DataFrame({"a": [1], "b": ["x"]}))
        assert result["row_count"] == 1
        assert result["column_count"] == 2

    def test_a_single_column_frame_is_profiled(self):
        result = profile_dataframe(pd.DataFrame({"only": [1, 2, 3]}))
        assert result["column_count"] == 1
