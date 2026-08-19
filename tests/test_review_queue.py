"""The human-review gate, which had no tests and two ways of losing an issue.

Both failures pointed the same direction - toward nobody seeing something.

`should_create_review_item` consulted a set of known-bad actions as a deny-list,
so any action not named in it produced no review. `block_execution`, which the
executor genuinely emits, went past unseen; so did `abort_and_delete_dataset`.
A queue for catching what should not proceed cannot be built from a list of
things that should not proceed, because the dangerous case is always the one
nobody thought to add.

And `review_id` was run + step + reason, so two different problems at the same
step collapsed onto one identifier. A `critical` observation and an `error` one
produced the same id, and anything storing by id kept one of them.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.agents.review_queue import (
    PROCEEDING_ACTIONS,
    build_review_item,
    review_item_from_decision,
    should_create_review_item,
)


def item(action, **decision):
    return review_item_from_decision(
        {"action": action, **decision}, analysis_run_id="run-1", step_id="step-3")


class TestAnUnfamiliarActionIsEscalated:
    """The gate fails toward a person seeing it."""

    @pytest.mark.parametrize("action", [
        "block_execution",              # the executor really emits this one
        "abort_and_delete_dataset",
        "escalate_to_admin",
        "dataset_state_mismatch",
        "something_nobody_has_written_yet",
    ])
    def test_an_action_outside_the_allow_list_creates_a_review(self, action):
        assert should_create_review_item({"action": action}) is True

    def test_a_decision_that_does_not_say_what_it_decided_is_escalated(self):
        assert should_create_review_item({}) is True
        assert should_create_review_item({"action": ""}) is True

    @pytest.mark.parametrize("action", sorted(PROCEEDING_ACTIONS))
    def test_a_listed_proceeding_action_does_not_create_a_review(self, action):
        """The allow-list must not escalate ordinary progress into the queue.

        A queue full of routine items is a queue nobody reads, which loses the
        issue by a slower route.
        """
        assert should_create_review_item({"action": action}) is False

    def test_the_original_review_actions_still_escalate(self):
        for action in ("needs_review", "hold", "blocked", "retry_recommended"):
            assert should_create_review_item({"action": action}) is True


class TestOtherSignalsStillEscalate:
    def test_weak_or_invalid_validation_creates_a_review(self):
        for status in ("weak", "invalid"):
            assert should_create_review_item({"action": "proceed",
                                              "validation_status": status}) is True

    @pytest.mark.parametrize("severity", ["warning", "error", "critical"])
    def test_a_severe_observation_creates_a_review(self, severity):
        assert should_create_review_item({"action": "proceed"},
                                         {"severity": severity}) is True

    def test_an_informational_observation_does_not(self):
        assert should_create_review_item({"action": "proceed"},
                                         {"severity": "info"}) is False


class TestTwoProblemsAreTwoReviews:
    def test_different_problems_at_one_step_get_different_ids(self):
        first = review_item_from_decision({"action": "hold"}, {"severity": "error"},
                                          analysis_run_id="run-1", step_id="step-3")
        second = review_item_from_decision({"action": "hold"}, {"severity": "critical"},
                                           analysis_run_id="run-1", step_id="step-3")
        assert first["review_id"] != second["review_id"]

    def test_the_same_problem_reprocessed_keeps_one_id(self):
        """Idempotent on purpose: a retry must not fill the queue with copies."""
        arguments = ({"action": "hold"}, {"severity": "error"})
        first = review_item_from_decision(*arguments, analysis_run_id="run-1",
                                          step_id="step-3")
        again = review_item_from_decision(*arguments, analysis_run_id="run-1",
                                          step_id="step-3")
        assert first["review_id"] == again["review_id"]

    def test_different_steps_are_different_reviews(self):
        first = item("hold")
        second = review_item_from_decision({"action": "hold"}, analysis_run_id="run-1",
                                           step_id="step-9")
        assert first["review_id"] != second["review_id"]

    def test_the_id_still_names_the_run_step_and_reason(self):
        """A digest that hid where the review came from would trade one problem
        for another."""
        review = item("hold")
        assert review["review_id"].startswith("review-run-1-step-3-hold-")

    def test_korean_content_does_not_break_the_digest(self):
        review = review_item_from_decision(
            {"action": "hold", "reason": "누출 위험이 높습니다"},
            analysis_run_id="run-1", step_id="step-3")
        assert review["review_id"]


class TestWhatAReviewCarries:
    def test_it_starts_pending_and_unresolved(self):
        review = item("hold")
        assert review["status"] == "pending"
        assert review["resolution"] is None
        assert review["resolved_at"] is None

    def test_blocking_actions_are_marked_error(self):
        assert item("blocked")["severity"] == "error"
        assert item("hold")["severity"] == "error"

    def test_the_source_decision_is_kept_whole(self):
        """A reviewer who cannot see what the agent decided cannot review it."""
        decision = {"action": "hold", "reason": "exit_survey_score 하나로 타깃이 재현됨"}
        review = review_item_from_decision(decision, analysis_run_id="run-1",
                                           step_id="step-3")
        assert review["source_decision"] == decision

    def test_a_proceeding_decision_produces_no_item(self):
        assert review_item_from_decision({"action": "proceed"},
                                         analysis_run_id="run-1", step_id="step-3") is None

    def test_build_review_item_requires_a_reason(self):
        review = build_review_item(
            analysis_run_id="run-1", step_id="step-3", reason_code="hold",
            reason_summary="사람이 봐야 합니다", source_decision={"action": "hold"})
        assert review["reason_summary"] == "사람이 봐야 합니다"
