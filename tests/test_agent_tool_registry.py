"""The registry the agent executor dispatches through, and what it really holds.

`tests/README.md` recorded the agent execution path as mock-based and therefore
unverified. The roadmap carried it as an open gap. Both were reading the name:
`build_pr04_mock_registry`, from the scaffolding phase.

It is not a mock. Every entry binds a real handler and the executor calls
`handler`, not `mock_response` - so an agent run has been exercising the same
leakage check, training adapter and validation gate as the direct path all
along. Nobody had checked, and the name was doing the asserting.

These tests exist so the name cannot assert anything again: they call the real
handlers through the registry and check the safety behaviour survives the
indirection.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.tools import build_registry

LEAKY = ROOT / "sample_data" / "generated" / "customer_churn_leaky.csv"
CLEAN = ROOT / "sample_data" / "generated" / "customer_churn.csv"


@pytest.fixture(scope="module")
def registry():
    return build_registry()


class TestTheRegistryBindsRealTools:
    @pytest.mark.parametrize("name, module", [
        ("data_profile_tool", "backend.tools.data_profile"),
        ("leakage_check_tool", "backend.tools.leakage_check"),
        ("validation_tool", "backend.tools.validation"),
        ("report_writer_tool", "backend.tools.report_writer"),
        ("schema_validation_tool", "backend.tools.schema_validation"),
    ])
    def test_the_handler_is_the_real_function(self, registry, name, module):
        assert registry.get(name).handler.__module__ == module

    def test_the_executor_dispatches_through_handlers(self):
        """Reading `handler` rather than `mock_response` is the whole question."""
        source = (ROOT / "backend" / "agents" / "executor.py").read_text(encoding="utf-8")
        assert "registry.get(tool_name).handler(" in source
        assert "mock_response" not in source

    def test_the_old_names_still_resolve(self, registry):
        """Renaming must not break callers written before the correction."""
        from backend.tools import build_pr01_mock_registry, build_pr04_mock_registry
        assert set(build_pr01_mock_registry().names()) == set(registry.names())
        assert set(build_pr04_mock_registry().names()) == set(registry.names())


class TestSafetyBehaviourSurvivesTheIndirection:
    """Calling through the registry must not soften what the tools decide."""

    def _skip_without_data(self):
        if not LEAKY.exists():
            pytest.skip("run scripts/make_demo_data.py first")

    def test_leakage_is_still_caught_through_the_registry(self, registry):
        self._skip_without_data()
        result = registry.get("leakage_check_tool").handler(
            {"file_path": str(LEAKY), "target_column": "churn"})
        assert result["leakage_risk"] == "high"
        assert set(result["excluded_feature_candidates"]) == {
            "churn_reason", "account_closed_date", "exit_survey_score"}

    def test_clean_data_still_produces_no_exclusions(self, registry):
        self._skip_without_data()
        result = registry.get("leakage_check_tool").handler(
            {"file_path": str(CLEAN), "target_column": "churn"})
        assert result["excluded_feature_candidates"] == []

    def test_validation_still_blocks_on_high_leakage(self, registry):
        """The gate that the demo found was being bypassed by prose."""
        leakage = registry.get("leakage_check_tool").handler(
            {"file_path": str(LEAKY), "target_column": "churn"}) if LEAKY.exists() else None
        if leakage is None:
            pytest.skip("run scripts/make_demo_data.py first")

        result = registry.get("validation_tool").handler({"evidence_bundle": {
            "selected_target": "churn",
            "task_type": "classification",
            "model_summary": {"best_model": "rf"},
            "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 1.0},
            "explanation_summary": "…",
            "threshold_status": "pass",
            "training_success": True,
            "suspicious_columns": leakage["suspicious_columns"],
            "leakage_risk": leakage["leakage_risk"],
            "limitations": ["…"],
            "source_tool_calls": ["data_profile_tool", "schema_validation_tool",
                                  "leakage_check_tool"],
        }})
        assert result["validation_status"] == "invalid"
        assert "Fix blocking issues" in result["recommended_next_action"]

    def test_the_report_writer_still_refuses_to_sound_confident(self, registry):
        result = registry.get("report_writer_tool").handler({
            "evidence_bundle": {"selected_target": "churn", "task_type": "classification"},
            "validation_result": {"validation_status": "invalid"},
        })
        assert result["success"] is False


class TestTheRegistryIsComplete:
    def test_every_registered_tool_has_a_callable_handler(self, registry):
        for name in registry.names():
            assert callable(registry.get(name).handler), name

    def test_the_whole_safety_chain_is_reachable(self, registry):
        """A chain missing a link is not a chain."""
        registered = set(registry.names())
        chain = {
            "data_profile_tool", "schema_validation_tool", "target_recommendation_tool",
            "leakage_check_tool", "automl_training_tool", "evaluation_tool",
            "validation_tool", "report_writer_tool", "deployment_check_tool",
        }
        assert chain <= registered, f"missing: {sorted(chain - registered)}"


class TestNoMockTextReachesAResult:
    """mock_runner merges these entries under real output.

    `{**mock_response, **handler(...)}` means any key the handler does not
    produce survives into the result. That is fine while the surviving keys are
    accurate descriptions, and a disaster the moment one of them asserts
    something about what did or did not run - a `_mock_handler` here used to
    return "No existing AutoML logic was called", which would have been false
    attached to any of these tools.
    """

    def test_no_entry_claims_nothing_was_computed(self, registry):
        forbidden = ("mock tool only", "no existing automl", "not called", "mocked")
        for name in registry.names():
            text = str(registry.get(name).mock_response).lower()
            for phrase in forbidden:
                assert phrase not in text, f"{name} carries {phrase!r}"

    def test_surviving_keys_are_descriptive_only(self, registry):
        """Whatever outlives a real call must be a description, not a claim.

        Checked by name rather than by content: `risk` and `summary` describe
        the tool, and a new key appearing here should force someone to think
        about whether it can be true alongside a real result.
        """
        allowed = {"risk", "summary", "status"}
        for name in registry.names():
            assert set(registry.get(name).mock_response) <= allowed, name

    def test_a_real_result_wins_every_shared_key(self, registry):
        if not LEAKY.exists():
            pytest.skip("run scripts/make_demo_data.py first")
        tool = registry.get("leakage_check_tool")
        real = tool.handler({"file_path": str(LEAKY), "target_column": "churn"})
        merged = {**tool.mock_response, **real}
        for key in real:
            assert merged[key] == real[key]
        assert merged["leakage_risk"] == "high"
