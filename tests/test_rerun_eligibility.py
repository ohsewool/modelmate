"""`can_rerun` must mean the rerun will be accepted.

It did not. `can_rerun` was a status check - failed, succeeded, cancelled,
needs_review - while `POST /api/training/jobs/{id}/rerun` separately required
the job to carry a dataset reference and answered 409 without one. So the API
reported `can_rerun: true` on a job it would then refuse: the screen showed the
button, the user pressed it, and got an error.

Two rules answering one question with nothing comparing them - the shape this
project keeps finding. The leakage checker and the evaluation gate contradicted
each other; the export verifier and the ledger did; here it is again between a
flag and the endpoint that flag is about.

`_rerun_blocker` now answers it once and both read that. These tests pin the
agreement rather than either side separately, because either side alone was
already self-consistent.

Found by running the repository's own smoke scripts, which nothing in CI had
ever done - `scripts/run_failure_recovery_smoke.py` asserted the rerun worked
and had been failing three checks.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.main import _rerun_blocker, _job_row_to_dict, RERUN_READY_STATUSES  # noqa: E402


def job(**overrides):
    row = {"job_id": "j1", "status": "failed", "dataset_id": "d1",
           "result_summary": None, "artifact_refs": None}
    row.update(overrides)
    return row


class TestTheFlagAndTheEndpointReadTheSameRule:
    def test_a_rerunnable_job_is_advertised_as_one(self):
        assert _job_row_to_dict(job())["can_rerun"] is True
        assert _rerun_blocker(job()) is None

    def test_a_job_without_a_dataset_is_not(self):
        """The case that was wrong: the flag said yes, the endpoint said 409."""
        item = _job_row_to_dict(job(dataset_id=None))
        assert item["can_rerun"] is False
        assert _rerun_blocker(job(dataset_id=None)) is not None

    @pytest.mark.parametrize("status", RERUN_READY_STATUSES)
    def test_every_terminal_status_agrees(self, status):
        item = _job_row_to_dict(job(status=status))
        assert item["can_rerun"] is (_rerun_blocker(job(status=status)) is None)

    @pytest.mark.parametrize("status", ["queued", "running", "pending"])
    def test_a_job_still_in_flight_agrees_too(self, status):
        item = _job_row_to_dict(job(status=status))
        assert item["can_rerun"] is False
        assert _rerun_blocker(job(status=status))["error_type"] == "job_not_in_a_rerunnable_state"

    def test_the_two_never_disagree_across_the_combinations(self):
        """The property, stated directly. A future condition added to one side
        and not the other fails here rather than in front of a user."""
        for status in (*RERUN_READY_STATUSES, "queued", "running", None):
            for dataset in ("d1", None, ""):
                row = job(status=status, dataset_id=dataset)
                assert _job_row_to_dict(row)["can_rerun"] is (_rerun_blocker(row) is None), row


class TestTheReasonTravelsWithTheFlag:
    """"You cannot rerun this" is only actionable with "and here is why", and
    the why used to exist solely inside the 409 nobody sees until they click."""

    def test_a_blocked_job_names_its_blocker(self):
        assert _job_row_to_dict(job(dataset_id=None))["rerun_blocked_reason"] == (
            "job_dataset_reference_missing")

    def test_an_in_flight_job_names_a_different_one(self):
        assert _job_row_to_dict(job(status="running"))["rerun_blocked_reason"] == (
            "job_not_in_a_rerunnable_state")

    def test_a_rerunnable_job_names_none(self):
        assert _job_row_to_dict(job())["rerun_blocked_reason"] is None

    def test_every_blocker_carries_something_a_person_can_read(self):
        """An error_type alone is for the code. The screen needs a sentence and
        a next step, and a blocker missing either is a dead end."""
        for row in (job(dataset_id=None), job(status="running")):
            blocker = _rerun_blocker(row)
            assert blocker["user_friendly_message"]
            assert blocker["recommended_next_action"]


class TestTheHelperIsNotVacuous:
    def test_it_can_return_none(self):
        """Guards the tests above: a `_rerun_blocker` that always returned a
        blocker would satisfy every "cannot rerun" assertion here."""
        assert _rerun_blocker(job()) is None

    def test_it_can_return_a_blocker(self):
        assert _rerun_blocker(job(dataset_id=None)) is not None

    def test_the_terminal_statuses_are_not_empty(self):
        """`RERUN_READY_STATUSES = ()` would make every job unrerunnable and
        every agreement test still pass."""
        assert len(RERUN_READY_STATUSES) >= 4
        assert "failed" in RERUN_READY_STATUSES
