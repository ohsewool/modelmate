"""Deployment readiness: the last gate before a model reaches real users.

Everything upstream can be right and still produce a model that should not ship —
evidence missing, leakage unresolved, limitations undisclosed. These tests pin
what must block, what must merely warn, and above all that the clean verdict is
hard to reach by accident.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.deployment_check import deployment_check_tool


def ready(**overrides):
    """A submission with every piece of evidence present."""
    base = {
        "validation_result": {"validation_status": "grounded"},
        "report_result": {"success": True},
        "metric_summary": {"best_metric": "roc_auc", "best_metric_value": 0.91},
        "threshold_status": "pass",
        "leakage_risk": "low",
        "explanation_summary": "SHAP values for the top features",
        "limitations": ["학습 데이터는 2024년까지만 포함합니다."],
        "intended_use": "고객 이탈 예측",
        "training_success": True,
        "target_suitability": "good",
    }
    base.update(overrides)
    return base


def checks(result):
    return {item["name"]: item["passed"] for item in result["policy_checks"]}


class TestCleanSubmission:
    def test_a_complete_submission_is_recommended(self):
        result = deployment_check_tool(ready())
        assert result["deployment_status"] == "deploy_recommended"
        assert result["risk_level"] == "low"
        assert result["success"] is True

    def test_every_policy_check_passes(self):
        assert all(checks(deployment_check_tool(ready())).values())

    def test_a_recommendation_still_asks_for_monitoring(self):
        """Shipping is not the end of the operator's obligations."""
        result = deployment_check_tool(ready())
        assert "monitoring" in result["recommended_next_action"].lower()


class TestBlockingConditions:
    @pytest.mark.parametrize("field,value", [
        ("threshold_status", "fail"),
        ("leakage_risk", "high"),
        ("training_success", False),
        ("target_suitability", "poor"),
    ])
    def test_a_disqualifying_condition_stops_deployment(self, field, value):
        result = deployment_check_tool(ready(**{field: value}))
        assert result["deployment_status"] in {"blocked", "hold"}
        assert result["success"] is False
        assert result["blocking_reasons"]

    def test_invalid_validation_blocks(self):
        result = deployment_check_tool(
            ready(validation_result={"validation_status": "invalid"})
        )
        assert result["deployment_status"] in {"blocked", "hold"}

    def test_missing_metric_evidence_blocks(self):
        """A model nobody measured cannot be recommended."""
        result = deployment_check_tool(ready(metric_summary={}))
        assert result["deployment_status"] in {"blocked", "hold"}
        assert any("Metric evidence" in reason for reason in result["blocking_reasons"])

    def test_an_ungrounded_report_blocks(self):
        result = deployment_check_tool(ready(report_result={"success": False}))
        assert result["deployment_status"] in {"blocked", "hold"}

    def test_no_explanation_and_no_limitations_blocks(self):
        """One of the two must exist: users get either reasons or caveats."""
        result = deployment_check_tool(
            ready(explanation_summary=None, explanation_result=None, limitations=[])
        )
        assert result["deployment_status"] in {"blocked", "hold"}

    def test_several_problems_escalate_from_hold_to_blocked(self):
        result = deployment_check_tool(
            ready(threshold_status="fail", leakage_risk="high", training_success=False)
        )
        assert result["deployment_status"] == "blocked"
        assert len(result["blocking_reasons"]) >= 2

    def test_blocking_always_raises_the_risk_level(self):
        result = deployment_check_tool(ready(leakage_risk="high"))
        assert result["risk_level"] == "high"


class TestWarnings:
    def test_medium_leakage_warns_without_blocking(self):
        result = deployment_check_tool(ready(leakage_risk="medium"))
        assert result["deployment_status"] == "needs_review"
        assert result["blocking_reasons"] == []
        assert result["warnings"]

    def test_weak_validation_warns(self):
        result = deployment_check_tool(
            ready(validation_result={"validation_status": "weak"})
        )
        assert result["deployment_status"] == "needs_review"

    def test_an_unclear_intended_use_warns(self):
        """A model with no stated purpose cannot be reviewed for fitness."""
        result = deployment_check_tool(ready(intended_use=None, user_goal=None))
        assert "Intended use is unclear." in result["warnings"]

    def test_data_quality_warnings_are_carried_forward(self):
        result = deployment_check_tool(ready(data_quality_warnings=["결측치 30%"]))
        assert result["deployment_status"] == "needs_review"

    def test_needs_review_asks_for_confirmation_before_deploying(self):
        result = deployment_check_tool(ready(leakage_risk="medium"))
        assert "before deployment" in result["recommended_next_action"]


class TestEvidenceBundleInput:
    def test_evidence_can_arrive_as_a_bundle(self):
        """Upstream tools pass one bundle; the checker must read it the same way."""
        result = deployment_check_tool({
            "evidence_bundle": ready(),
            "validation_result": {"validation_status": "grounded"},
            "report_result": {"success": True},
        })
        assert result["deployment_status"] == "deploy_recommended"

    def test_an_empty_submission_is_not_recommended(self):
        result = deployment_check_tool({})
        assert result["deployment_status"] in {"blocked", "hold"}
        assert result["success"] is False


class TestReportedShape:
    def test_the_decision_carries_a_rationale_and_confidence(self):
        decision = deployment_check_tool(ready())["decision"]
        assert decision["rationale"]
        assert 0 < decision["confidence"] <= 1

    def test_confidence_falls_as_the_verdict_worsens(self):
        clean = deployment_check_tool(ready())["decision"]["confidence"]
        review = deployment_check_tool(ready(leakage_risk="medium"))["decision"]["confidence"]
        blocked = deployment_check_tool(ready(leakage_risk="high"))["decision"]["confidence"]
        assert clean > review > blocked

    def test_severity_matches_the_verdict(self):
        assert deployment_check_tool(ready())["observation"]["severity"] == "info"
        assert deployment_check_tool(
            ready(leakage_risk="medium"))["observation"]["severity"] == "warning"
        assert deployment_check_tool(
            ready(leakage_risk="high"))["observation"]["severity"] == "error"

    def test_a_failing_check_names_itself(self):
        result = deployment_check_tool(ready(leakage_risk="high"))
        assert checks(result)["leakage_not_high"] is False

    def test_the_advice_is_identifiable(self):
        assert deployment_check_tool(ready())["deployment_advice_id"]


class TestLeakageRiskComesFromSeverityNotProse:
    """The last gate before a model is exposed as an API.

    `_risk_from_warnings` scanned the warning text for the word "high". The
    leakage check writes its reasons in Korean, so a column it had rated high
    came back `medium` here; and "customer_id has high cardinality" - not
    leakage at all - came back `high`.

    The same defect was fixed in validation.py earlier. The sweep afterwards
    searched for `"literal" in variable` and missed this line, which reads
    `word in text` with the variable first. A pattern narrow enough to miss the
    second instance of a bug has not finished running.
    """

    def test_a_structured_high_severity_sets_high_risk(self):
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings(
            ["이 컬럼 하나만으로 타깃이 재현됩니다."],
            {"suspicious_columns": [{"column_name": "exit_survey_score",
                                     "severity": "high"}]},
        ) == "high"

    def test_a_leakage_risk_field_is_used_when_present(self):
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings(["한국어 사유"], {"leakage_risk": "high"}) == "high"

    def test_high_cardinality_is_not_high_leakage(self):
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings(["customer_id has high cardinality"], {}) != "high"

    def test_the_english_phrasing_still_reads_as_high(self):
        """Callers passing plain messages must not lose the gate."""
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings(["Leakage risk: HIGH on churn_label"], {}) == "high"

    def test_no_warnings_is_low(self):
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings([], {}) == "low"

    def test_medium_severity_does_not_escalate_to_high(self):
        from backend.tools.deployment_check import _risk_from_warnings
        assert _risk_from_warnings(
            [], {"suspicious_columns": [{"severity": "medium"}]}) == "medium"

    def test_the_real_checker_output_flows_through(self):
        """End to end rather than on a hand-built bundle: what the leakage check
        actually produces must reach this gate as high."""
        from pathlib import Path

        leaky = Path(__file__).resolve().parents[1] / "sample_data" / "generated" / "customer_churn_leaky.csv"
        if not leaky.exists():
            pytest.skip("run scripts/make_demo_data.py first")

        from backend.tools.deployment_check import _risk_from_warnings
        from backend.tools.leakage_check import leakage_check_tool

        found = leakage_check_tool({"file_path": str(leaky), "target_column": "churn"})
        assert _risk_from_warnings([], found) == "high"
