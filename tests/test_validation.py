"""Evidence validation: what licenses the report to sound confident.

This gate decides the tone every downstream sentence is written in. A wrong
`grounded` here means weak evidence gets stated confidently to a user, which is
the failure that does real damage — worse than a model that scores badly and
says so.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.validation import REQUIRED_EVIDENCE, validation_tool

SOURCES = ["data_profile_tool", "schema_validation_tool", "leakage_check_tool"]


def complete(**overrides):
    base = {
        "selected_target": "churn",
        "task_type": "classification",
        "model_summary": {"best_model": "lightgbm"},
        "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 0.91},
        "explanation_summary": "상위 특징: monthly_fee",
        "threshold_status": "pass",
        "training_success": True,
        "leakage_warnings": [],
        "data_quality_warnings": [],
        "limitations": ["학습 데이터는 2024년까지"],
        "source_tool_calls": list(SOURCES),
    }
    base.update(overrides)
    return base


def validate(**overrides):
    return validation_tool({"evidence_bundle": complete(**overrides)})


class TestGroundedRequiresEverything:
    def test_a_complete_bundle_is_grounded(self):
        result = validate()
        assert result["validation_status"] == "grounded"
        assert result["recommended_tone"] == "confident"
        assert result["missing_evidence"] == []

    @pytest.mark.parametrize("field", REQUIRED_EVIDENCE)
    def test_each_required_piece_is_actually_required(self, field):
        result = validate(**{field: None})
        assert result["validation_status"] != "grounded"
        assert field in result["missing_evidence"]

    @pytest.mark.parametrize("tool", SOURCES)
    def test_each_upstream_check_must_have_run(self, tool):
        """Claiming the data was checked requires the check to have happened."""
        remaining = [item for item in SOURCES if item != tool]
        result = validate(source_tool_calls=remaining)
        assert result["validation_status"] == "weak"
        assert any(tool.replace("_tool", "") in item for item in result["missing_evidence"])

    def test_a_metric_field_without_a_value_does_not_count(self):
        result = validate(metric_summary={"note": "measured later"})
        assert "evaluation_metric" in result["missing_evidence"]


class TestBlockingIssues:
    def test_a_failed_threshold_invalidates_the_evidence(self):
        result = validate(threshold_status="fail")
        assert result["validation_status"] == "invalid"
        assert result["success"] is False

    def test_high_leakage_invalidates_the_evidence(self):
        result = validate(leakage_warnings=["Leakage risk: HIGH on churn_label"])
        assert result["validation_status"] == "invalid"

    def test_failed_training_cannot_be_reported_as_success(self):
        result = validate(training_success=False)
        assert result["validation_status"] == "invalid"
        assert any("Training failed" in item for item in result["blocking_issues"])

    def test_invalid_evidence_asks_for_a_fix_not_a_report(self):
        result = validate(threshold_status="fail")
        assert "Fix blocking issues" in result["recommended_next_action"]

    def test_blocking_outranks_completeness(self):
        """A complete bundle that failed its threshold is still invalid."""
        result = validate(threshold_status="fail")
        assert result["missing_evidence"] == []
        assert result["validation_status"] == "invalid"


class TestWeakEvidence:
    def test_missing_evidence_downgrades_the_tone(self):
        result = validate(explanation_summary=None)
        assert result["validation_status"] == "weak"
        assert result["recommended_tone"] == "cautious"

    def test_a_weak_result_still_permits_a_report(self):
        """Weak means say less, not say nothing."""
        result = validate(explanation_summary=None)
        assert result["success"] is True
        assert "cautious report" in result["recommended_next_action"]

    def test_a_missing_explanation_is_also_warned_about(self):
        result = validate(explanation_summary=None)
        assert any("Explanation" in item for item in result["warnings"])

    def test_data_quality_warnings_are_carried_forward(self):
        result = validate(data_quality_warnings=["결측치 30%"])
        assert "결측치 30%" in result["warnings"]


class TestConfidenceOrdering:
    def test_confidence_falls_as_evidence_weakens(self):
        grounded = validate()["confidence"]
        weak = validate(explanation_summary=None)["confidence"]
        invalid = validate(threshold_status="fail")["confidence"]
        assert grounded > weak > invalid

    def test_confidence_stays_within_bounds(self):
        for case in (validate(), validate(explanation_summary=None),
                     validate(threshold_status="fail")):
            assert 0 < case["confidence"] <= 1


class TestInputHandling:
    def test_evidence_may_arrive_flat_rather_than_bundled(self):
        assert validation_tool(complete())["validation_status"] == "grounded"

    def test_an_empty_submission_is_not_grounded(self):
        result = validation_tool({})
        assert result["validation_status"] != "grounded"
        assert len(result["missing_evidence"]) >= len(REQUIRED_EVIDENCE)

    def test_missing_evidence_is_reported_without_duplicates(self):
        result = validation_tool({})
        assert len(result["missing_evidence"]) == len(set(result["missing_evidence"]))

    def test_no_claim_is_marked_unsupported_without_a_basis(self):
        """The field exists; it must not be populated speculatively."""
        assert validate()["unsupported_claims"] == []


class TestHighLeakageIsDetectedBySeverityNotByWording:
    """Reading a severity back out of prose was the mistake.

    The gate was `"high" in str(warning).lower()`, which is wrong twice over: it
    misses a real high-severity finding whose message is written in Korean - as
    the leakage check's are, so a genuinely high-risk column passed this gate in
    the demo - and it fires on "high cardinality", blocking a report over
    something that is not leakage.
    """

    def test_a_structured_high_severity_column_blocks(self):
        result = validation_tool({"evidence_bundle": complete(
            suspicious_columns=[{"column_name": "exit_survey_score", "severity": "high"}],
        )})
        assert result["validation_status"] == "invalid"

    def test_a_korean_reason_at_high_severity_blocks(self):
        """The reason the checker actually writes contains no English."""
        result = validation_tool({"evidence_bundle": complete(
            leakage_warnings=[{"severity": "high",
                               "reason": "이 컬럼 하나만으로 타깃이 거의 그대로 재현됩니다."}],
        )})
        assert result["validation_status"] == "invalid"

    def test_a_leakage_risk_field_of_high_blocks(self):
        result = validation_tool({"evidence_bundle": complete(leakage_risk="high")})
        assert result["validation_status"] == "invalid"

    def test_high_cardinality_is_not_leakage(self):
        """The word appearing somewhere is not a finding."""
        result = validation_tool({"evidence_bundle": complete(
            leakage_warnings=["customer_id has high cardinality"],
        )})
        assert result["validation_status"] != "invalid"

    def test_medium_severity_does_not_block(self):
        result = validation_tool({"evidence_bundle": complete(
            suspicious_columns=[{"column_name": "customer_id", "severity": "medium"}],
        )})
        assert result["validation_status"] != "invalid"

    def test_the_original_english_phrasing_still_blocks(self):
        """Callers passing plain messages must not silently lose the gate."""
        result = validation_tool({"evidence_bundle": complete(
            leakage_warnings=["Leakage risk: HIGH on churn_label"],
        )})
        assert result["validation_status"] == "invalid"


class TestTheActionAgreesWithTheTone:
    """Two fields of one answer must not contradict each other.

    The action said "cautious" for every non-invalid status, so a fully grounded
    result was told to hedge while recommended_tone said confident.
    """

    def test_grounded_evidence_is_not_told_to_hedge(self):
        result = validate()
        assert result["recommended_tone"] == "confident"
        assert "cautious" not in result["recommended_next_action"]
        assert "grounded evidence" in result["recommended_next_action"]

    def test_weak_evidence_is_told_to_be_cautious(self):
        result = validate(explanation_summary=None)
        assert result["recommended_tone"] == "cautious"
        assert "cautious report" in result["recommended_next_action"]

    def test_invalid_evidence_is_told_to_fix_rather_than_report(self):
        result = validate(threshold_status="fail")
        assert "Fix blocking issues" in result["recommended_next_action"]
