"""Feature importance, checked against a generating process we know.

The explainer had no tests, which is how it kept doing something wrong in
public. For a model without `feature_importances_` it ranked features by raw
coefficient magnitude - and a coefficient is "effect per one unit of this
column", with units that are not comparable between columns. Ranking by it ranks
features by what they happen to be measured in.

This is checkable rather than arguable because the demo data comes from a
generator in `scripts/make_demo_data.py` whose coefficients are written down:

    logit = -2.9 - 0.045*tenure + 0.022*fee + 0.30*tickets + 0.028*last_login + …

Per unit, `support_tickets` has the largest coefficient. Across the range each
column actually occupies, `tenure_months` moves the outcome about three times as
much - it spans 1 to 71 while tickets spans 0 to 6. The model learned
coefficients matching the generator to two decimal places. The explanation was
reading them wrong, and told the user support_tickets mattered most while
putting tenure third.
"""

import sys
import warnings
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
warnings.filterwarnings("ignore")

CLEAN = ROOT / "sample_data" / "generated" / "customer_churn.csv"

pytestmark = pytest.mark.slow


@pytest.fixture(scope="module")
def explained():
    if not CLEAN.exists():
        pytest.skip("run scripts/make_demo_data.py first")
    pytest.importorskip("google.oauth2", reason="backend.main needs google-auth")
    from backend.tools.automl_training import automl_training_tool
    from backend.tools.shap_explainer import shap_explainer_tool

    trained = automl_training_tool({
        "file_path": str(CLEAN), "target_column": "churn",
        "excluded_columns": ["customer_id"],
    })
    if trained["best_model"]["name"] != "Logistic Regression":
        pytest.skip("this checks the coefficient path; a tree model won here")
    return shap_explainer_tool({})


def ranking(result):
    return [item["feature"] for item in result["global_explanations"]]


class TestImportanceMatchesTheGeneratingProcess:
    def test_tenure_outranks_support_tickets(self, explained):
        """The reversal the old ranking produced.

        tickets has the larger per-unit coefficient; tenure has the larger
        influence across the range it occupies, and that is what "most
        important" means to someone reading a report.
        """
        order = ranking(explained)
        assert order.index("tenure_months") < order.index("support_tickets")

    def test_the_two_widest_ranging_drivers_come_first(self, explained):
        assert set(ranking(explained)[:2]) == {"tenure_months", "last_login_days"}

    def test_region_is_not_mistaken_for_a_driver(self, explained):
        """The generator gives region no coefficient at all."""
        order = ranking(explained)
        assert order.index("region") >= len(order) - 2

    def test_importances_are_normalised(self, explained):
        total = sum(item["importance"] for item in explained["global_explanations"])
        assert total == pytest.approx(1.0, abs=0.01)

    def test_the_raw_coefficient_is_still_reported(self, explained):
        """The standardised number is for ranking; the raw one is what the model
        actually holds, and dropping it would hide the transformation."""
        assert all("raw_importance" in item for item in explained["global_explanations"])


class TestTheSourceIsNamedHonestly:
    def test_a_standardised_coefficient_says_so(self, explained):
        assert explained["explanation_type"] == "standardized_coefficient"
        assert all(item["source"] == "standardized_coefficient"
                   for item in explained["global_explanations"])

    def test_nothing_claims_to_be_shap_unless_it_is(self, explained):
        """The name is what a reader uses to decide how much weight to give
        this, so a fallback must not borrow SHAP's."""
        assert "shap" not in explained["explanation_type"]

    def test_the_transformation_is_disclosed(self, explained):
        assert any("표준편차" in text for text in explained["limitations"])


class TestStandardisationItself:
    """The arithmetic, without needing a trained model."""

    def _source(self):
        import backend.main as backend
        return backend.global_explanation_source

    def test_scaling_reorders_by_influence_rather_than_units(self):
        import pandas as pd

        class Linear:
            coef_ = np.array([[0.30, 0.045]])       # per-unit: first is larger

        frame = pd.DataFrame({
            "narrow": np.random.default_rng(0).normal(3, 1.2, 500),   # small spread
            "wide": np.random.default_rng(1).normal(35, 20.0, 500),   # large spread
        })
        source, values = self._source()(Linear(), frame, None)
        assert source == "standardized_coefficient"
        assert values[1] > values[0], "the wider-ranging column should now lead"

    def test_a_constant_column_does_not_divide_by_zero(self):
        import pandas as pd

        class Linear:
            coef_ = np.array([[0.5, 0.5]])

        frame = pd.DataFrame({"constant": [7.0] * 50, "varying": range(50)})
        _, values = self._source()(Linear(), frame, None)
        assert all(np.isfinite(values))

    def test_tree_models_keep_their_own_importances(self):
        """feature_importances_ is already unit-free; scaling it would be wrong."""
        import pandas as pd

        class Tree:
            feature_importances_ = np.array([0.7, 0.3])

        source, values = self._source()(
            Tree(), pd.DataFrame({"a": range(10), "b": range(0, 100, 10)}), None)
        assert source == "feature_importance"
        assert list(values) == [0.7, 0.3]
