"""Planning: an LLM may advise, but it must not overrule the deterministic answer.

The design puts a deterministic planner in front and treats LLM output as an
optional overlay. That is only worth anything if the overlay genuinely cannot
widen the scope — the failure to fear is a model talking the system into
attempting something the deterministic planner had already refused.

These tests pin the boundary in both directions: invalid output falls back
silently and safely, and valid output may narrow but never widen.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.agents.planner_interface import (
    REQUIRED_LLM_KEYS,
    _merge_safe_llm_fields,
    _validate_llm_output,
    create_agent_plan,
)

GOAL = "고객 이탈을 예측하고 싶어요"


def llm_output(**overrides):
    base = {
        "task_family": "classification",
        "task_type": "binary",
        "supported_status": "supported",
        "report_framing": "이탈 위험 보고",
        "review_flags": ["check_class_balance"],
        "plan_steps": ["profile", "train", "explain"],
    }
    base.update(overrides)
    return base


@pytest.fixture
def llm_enabled(monkeypatch):
    def configure(output):
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_ENABLED", "1")
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_RESPONSE", json.dumps(output))
    return configure


class TestDefaultIsDeterministic:
    def test_planning_works_with_no_llm_configured(self, monkeypatch):
        monkeypatch.delenv("MODEL_MATE_LLM_PLANNER_ENABLED", raising=False)
        result = create_agent_plan(GOAL)
        assert result["planner"]["planner_type"] == "deterministic"
        assert result["planner"]["validation_status"] == "not_used"
        assert result["plan"]

    def test_the_llm_is_off_unless_explicitly_enabled(self, monkeypatch):
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_RESPONSE", json.dumps(llm_output()))
        monkeypatch.delenv("MODEL_MATE_LLM_PLANNER_ENABLED", raising=False)
        assert create_agent_plan(GOAL)["planner"]["planner_type"] == "deterministic"

    @pytest.mark.parametrize("flag", ["0", "false", "no", "off", ""])
    def test_falsey_flags_do_not_enable_it(self, monkeypatch, flag):
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_ENABLED", flag)
        assert create_agent_plan(GOAL)["planner"]["planner_type"] == "deterministic"


class TestValidation:
    def test_well_formed_output_is_accepted(self):
        valid, reason = _validate_llm_output(llm_output())
        assert valid and reason is None

    def test_absent_output_is_refused_with_a_reason(self):
        valid, reason = _validate_llm_output(None)
        assert not valid and reason

    @pytest.mark.parametrize("missing", sorted(REQUIRED_LLM_KEYS))
    def test_every_required_key_is_actually_required(self, missing):
        payload = llm_output()
        payload.pop(missing)
        valid, reason = _validate_llm_output(payload)
        assert not valid
        assert missing in reason

    def test_an_unknown_support_status_is_refused(self):
        valid, _ = _validate_llm_output(llm_output(supported_status="probably_fine"))
        assert not valid

    @pytest.mark.parametrize("field", ["review_flags", "plan_steps"])
    def test_list_fields_must_be_lists(self, field):
        valid, _ = _validate_llm_output(llm_output(**{field: "not a list"}))
        assert not valid


class TestFallback:
    def test_malformed_json_falls_back_without_raising(self, monkeypatch):
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_ENABLED", "1")
        monkeypatch.setenv("MODEL_MATE_LLM_PLANNER_RESPONSE", "{not json")
        result = create_agent_plan(GOAL)
        assert result["planner"]["planner_type"] == "deterministic"
        assert result["planner"]["fallback_reason"]

    def test_invalid_output_falls_back_and_says_why(self, llm_enabled):
        llm_enabled(llm_output(supported_status="nonsense"))
        planner = create_agent_plan(GOAL)["planner"]
        assert planner["planner_type"] == "deterministic"
        assert planner["validation_status"] == "invalid"
        assert planner["fallback_reason"]

    def test_a_valid_response_is_marked_as_used(self, llm_enabled):
        llm_enabled(llm_output())
        planner = create_agent_plan(GOAL)["planner"]
        assert planner["planner_type"] == "llm_assisted"
        assert planner["validation_status"] == "valid"

    def test_a_plan_is_produced_either_way(self, llm_enabled):
        llm_enabled(llm_output(plan_steps="broken"))
        assert create_agent_plan(GOAL)["plan"]


class TestScopeCannotBeWidened:
    """The property the whole arrangement exists for."""

    def test_an_unsupported_goal_stays_unsupported(self):
        deterministic = {"supported_status": "unsupported", "unsupported_reason": "범위 밖"}
        merged = _merge_safe_llm_fields(deterministic, llm_output(supported_status="supported"))
        assert merged["supported_status"] == "unsupported"
        assert merged["planner_warning"]

    def test_an_unsupported_goal_ignores_every_llm_field(self):
        deterministic = {"supported_status": "unsupported", "report_framing": "원래 문구"}
        merged = _merge_safe_llm_fields(
            deterministic, llm_output(report_framing="모델이 제안한 문구")
        )
        assert merged["report_framing"] == "원래 문구"

    def test_a_limited_verdict_can_narrow_a_supported_one(self):
        """Narrowing is the safe direction, so it is allowed."""
        deterministic = {"supported_status": "supported"}
        merged = _merge_safe_llm_fields(deterministic, llm_output(supported_status="limited"))
        assert merged["supported_status"] == "limited"

    def test_a_supported_verdict_cannot_widen_a_limited_one(self):
        deterministic = {"supported_status": "limited"}
        merged = _merge_safe_llm_fields(deterministic, llm_output(supported_status="supported"))
        assert merged["supported_status"] == "limited"

    def test_review_flags_accumulate_rather_than_replace(self):
        """A flag raised by either party must survive the merge."""
        deterministic = {"supported_status": "supported", "review_flags": ["deterministic_flag"]}
        merged = _merge_safe_llm_fields(
            deterministic, llm_output(review_flags=["llm_flag"])
        )
        assert set(merged["review_flags"]) == {"deterministic_flag", "llm_flag"}

    def test_only_advisory_fields_are_taken_from_the_model(self):
        deterministic = {"supported_status": "supported", "task_type": "binary"}
        merged = _merge_safe_llm_fields(
            deterministic, llm_output(task_type="regression", report_framing="새 문구")
        )
        assert merged["task_type"] == "binary"       # structural decision kept
        assert merged["report_framing"] == "새 문구"  # presentation may be advised

    def test_empty_llm_hints_do_not_erase_deterministic_values(self):
        deterministic = {"supported_status": "supported",
                         "target_candidates": ["churn"], "likely_metrics": ["roc_auc"]}
        merged = _merge_safe_llm_fields(
            deterministic, llm_output(target_hints=[], metric_hints=[])
        )
        assert merged["target_candidates"] == ["churn"]
        assert merged["likely_metrics"] == ["roc_auc"]
