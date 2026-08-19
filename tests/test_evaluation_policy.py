"""Evaluation policy: the rules that decide whether a trained model may proceed.

These are the gates between "training finished" and "show this to a user", so
the failure that matters most is a weak model being waved through. Every path
that can produce `continue` is pinned here, along with the ones that must not.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.evaluation_policy import (
    DEFAULT_THRESHOLDS,
    best_row,
    decision,
    pick_metric,
    quality,
    threshold_status,
)


def result(*, task="classification", best="rf", leaderboard=None, best_metric=None):
    return {
        "task_type": task,
        "best_model": {"name": best},
        "leaderboard": leaderboard if leaderboard is not None else [
            {"model": "rf", "roc_auc": 0.91, "accuracy": 0.88},
            {"model": "lgbm", "roc_auc": 0.86, "accuracy": 0.84},
        ],
        "best_metric": best_metric or {"label": "ROC-AUC", "value": 0.91},
    }


class TestBestRow:
    def test_the_named_best_model_is_selected(self):
        assert best_row(result())["model"] == "rf"

    def test_a_missing_name_falls_back_to_the_first_row(self):
        assert best_row(result(best="absent"))["model"] == "rf"

    def test_an_empty_leaderboard_yields_an_empty_row(self):
        assert best_row(result(leaderboard=[])) == {}


class TestMetricSelection:
    def test_the_reported_best_metric_is_preferred(self):
        assert pick_metric(result()) == ("roc_auc", 0.91)

    def test_an_explicit_preference_wins(self):
        assert pick_metric(result(), preference="accuracy") == ("accuracy", 0.88)

    def test_selection_falls_back_through_the_task_order(self):
        rows = [{"model": "rf", "f1": 0.77}]
        name, value = pick_metric(result(leaderboard=rows, best_metric={"label": "ROC-AUC"}))
        assert (name, value) == ("f1", 0.77)

    def test_regression_uses_its_own_metric_order(self):
        rows = [{"model": "rf", "rmse": 12.5, "r2": 0.62}]
        name, _ = pick_metric(result(task="regression", leaderboard=rows,
                                     best_metric={"label": "unknown"}))
        assert name == "r2"  # r2 outranks rmse in the regression order

    def test_nothing_measurable_yields_no_metric(self):
        assert pick_metric(result(leaderboard=[{"model": "rf"}],
                                  best_metric={"label": "ROC-AUC"})) == (None, None)


class TestThresholds:
    def test_a_strong_score_passes(self):
        assert threshold_status("roc_auc", 0.91, "classification", {}) == ("pass", 0.80)

    def test_a_middling_score_warns(self):
        status, _ = threshold_status("roc_auc", 0.70, "classification", {})
        assert status == "warning"

    def test_a_weak_score_fails(self):
        status, _ = threshold_status("roc_auc", 0.55, "classification", {})
        assert status == "fail"

    def test_a_missing_metric_is_unknown_not_a_pass(self):
        """The dangerous default: absence of a score must never read as success."""
        assert threshold_status(None, None, "classification", {}) == ("unknown", None)
        assert threshold_status("roc_auc", None, "classification", {}) == ("unknown", None)

    def test_custom_thresholds_override_the_defaults(self):
        strict = {"roc_auc": {"pass": 0.95, "warning": 0.90}}
        assert threshold_status("roc_auc", 0.91, "classification", strict)[0] == "warning"

    def test_lower_is_better_metrics_invert_the_comparison(self):
        loose = {"rmse": {"pass": 10.0, "warning": 20.0}}
        assert threshold_status("rmse", 5.0, "regression", loose)[0] == "pass"
        assert threshold_status("rmse", 15.0, "regression", loose)[0] == "warning"
        assert threshold_status("rmse", 25.0, "regression", loose)[0] == "fail"

    def test_lower_is_better_without_an_explicit_threshold_is_unknown(self):
        """A default meant for 'higher is better' would score rmse backwards."""
        assert threshold_status("rmse", 5.0, "regression", {}) == ("unknown", None)

    def test_regression_defaults_apply_to_r2(self):
        assert threshold_status("r2", 0.75, "regression", {})[0] == "pass"
        assert threshold_status("r2", 0.50, "regression", {})[0] == "warning"

    def test_default_thresholds_are_ordered_sensibly(self):
        for task, values in DEFAULT_THRESHOLDS.items():
            assert values["pass"] > values["warning"], task


class TestDecisions:
    @pytest.mark.parametrize("status,expected", [
        ("pass", "continue"),
        ("warning", "retry_recommended"),
        ("fail", "hold"),
        ("unknown", "needs_review"),
    ])
    def test_each_status_maps_to_its_decision(self, status, expected):
        assert decision(status, success=True)["decision_type"] == expected

    def test_a_failed_run_never_continues_however_good_the_score(self):
        """Training that did not succeed cannot be waved through by a stale metric."""
        assert decision("pass", success=False)["decision_type"] == "needs_review"

    def test_every_decision_names_a_next_action(self):
        for status in ("pass", "warning", "fail", "unknown"):
            assert decision(status, success=True)["next_action"]

    @pytest.mark.parametrize("status,expected", [
        ("pass", "strong"), ("warning", "acceptable"),
        ("fail", "weak"), ("unknown", "unknown"),
    ])
    def test_quality_labels_match_the_status(self, status, expected):
        assert quality(status) == expected


class TestEndToEndGate:
    def test_a_good_classifier_proceeds(self):
        outcome = result()
        metric, value = pick_metric(outcome)
        status, _ = threshold_status(metric, value, outcome["task_type"], {})
        assert decision(status, success=True)["decision_type"] == "continue"

    def test_a_result_without_metrics_is_held_for_review(self):
        outcome = result(leaderboard=[{"model": "rf"}], best_metric={"label": "ROC-AUC"})
        metric, value = pick_metric(outcome)
        status, _ = threshold_status(metric, value, outcome["task_type"], {})
        assert status == "unknown"
        assert decision(status, success=True)["decision_type"] == "needs_review"


class TestAHighScoreOnLeakageIsNotAPass:
    """Two gates in this product used to contradict each other.

    The leakage check tells a user to drop the columns that reproduce the
    target. On the demo dataset that takes AUC from 1.000 to 0.778, which
    crosses from `pass` to `warning` - so following the advice produced a worse
    verdict than ignoring it, and the gate meant to catch bad models was
    rewarding the leak.
    """

    def evaluate(self, auc, **extra):
        from backend.tools.evaluation import evaluation_tool
        return evaluation_tool({
            "automl_training_result": {
                "success": True, "task_type": "classification",
                "leaderboard": [{"model": "m", "roc_auc": auc}],
                "best_model": {"name": "m"},
            },
            "task_type": "classification", **extra,
        })

    def test_a_perfect_score_on_high_leakage_does_not_pass(self):
        assert self.evaluate(1.0, leakage_risk="high")["threshold_status"] == "warning"

    def test_the_reason_says_why_the_score_is_not_evidence(self):
        warnings = self.evaluate(1.0, leakage_risk="high")["warnings"]
        assert any("누수" in text for text in warnings)

    def test_the_same_score_without_leakage_still_passes(self):
        """The check must not punish a genuinely good model."""
        assert self.evaluate(1.0, leakage_risk="low")["threshold_status"] == "pass"

    def test_leakage_findings_can_arrive_nested(self):
        result = self.evaluate(1.0, leakage_result={"leakage_risk": "high"})
        assert result["threshold_status"] == "warning"

    def test_a_low_score_is_unaffected_by_the_rule(self):
        """It was already below the bar; leakage does not change that reading."""
        assert self.evaluate(0.60, leakage_risk="high")["threshold_status"] == \
               self.evaluate(0.60, leakage_risk="low")["threshold_status"]

    def test_no_leakage_information_leaves_the_verdict_alone(self):
        assert self.evaluate(1.0)["threshold_status"] == "pass"


class TestTheDefaultsAreNotFittedToThisProject:
    def test_the_clean_demo_dataset_does_not_pass(self):
        """0.778 is what the honest model scores, and it reads as `warning`.

        Lowering the bar to 0.75 so the project's own example looked better
        would be fitting the standard to the sample.
        """
        from backend.tools.evaluation_policy import DEFAULT_THRESHOLDS, threshold_status
        status, _ = threshold_status("roc_auc", 0.778, "classification", DEFAULT_THRESHOLDS)
        assert status == "warning"

    def test_a_caller_can_state_their_own_bar(self):
        """A deployment that cares should set this rather than inherit it."""
        from backend.tools.evaluation_policy import threshold_status
        status, _ = threshold_status(
            "roc_auc", 0.778, "classification",
            {"classification": {"pass": 0.75, "warning": 0.60}})
        assert status == "pass"
