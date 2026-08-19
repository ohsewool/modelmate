"""Training, and the one thing the leakage check is for.

Everything else in this suite tests a gate in isolation: the checker recommends,
the validator refuses, the writer discloses. None of it proves the recommendation
reaches the model. A checker whose advice is ignored downstream is a checker that
produces paperwork.

So the load-bearing test here trains the same dataset twice. With the leaks left
in, the model scores a perfect 1.0 - the textbook tell, and exactly the result a
user would screenshot and believe. With the checker's own recommendation applied,
it drops to ~0.78, which is what the data actually supports.

These run real training, so they take tens of seconds and are marked `slow`.
That is a cost worth paying once: this is the only place the chain is checked
end to end rather than gate by gate.

    python3 -m pytest tests/test_training_pipeline.py -m slow
"""

import sys
import warnings
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

warnings.filterwarnings("ignore")

CLEAN = ROOT / "sample_data" / "generated" / "customer_churn.csv"
LEAKY = ROOT / "sample_data" / "generated" / "customer_churn_leaky.csv"

pytestmark = pytest.mark.slow


def _require_generated_data():
    if not CLEAN.exists() or not LEAKY.exists():
        pytest.skip("run scripts/make_demo_data.py first")


@pytest.fixture(scope="module")
def train():
    """Train, reusing the result when the same configuration is asked for twice.

    These tests only use three distinct configurations but ask for them eleven
    times, and each run costs about eighteen seconds. Memoising takes the file
    from roughly three and a half minutes to under a minute, which is the
    difference between a suite people run and one they learn to skip.

    A copy is handed out so a test that mutates its result cannot corrupt the
    next test's view of it.
    """
    _require_generated_data()
    pytest.importorskip("google.oauth2", reason="backend.main needs google-auth")
    from backend.tools.automl_training import automl_training_tool

    cache: dict[tuple, dict] = {}

    def run(path, excluded=("customer_id",)):
        key = (str(path), tuple(excluded))
        if key not in cache:
            cache[key] = automl_training_tool({
                "file_path": str(path),
                "target_column": "churn",
                "excluded_columns": list(excluded),
            })
        return dict(cache[key])
    return run


@pytest.fixture(scope="module")
def recommended_exclusions():
    _require_generated_data()
    from backend.tools.leakage_check import leakage_check_tool
    result = leakage_check_tool({"file_path": str(LEAKY), "target_column": "churn"})
    return result["excluded_feature_candidates"]


def auc(result):
    return result["best_model"]["metric"]["value"]


class TestTrainingRuns:
    def test_a_clean_dataset_trains(self, train):
        result = train(CLEAN)
        assert result["success"] is True
        assert result["status"] == "trained"

    def test_the_metric_is_plausible_rather_than_perfect(self, train):
        """A clean dataset with a real but noisy signal must not score 1.0.

        If it does, something is leaking and the rest of these tests are
        measuring the wrong thing.
        """
        assert 0.6 < auc(train(CLEAN)) < 0.95

    def test_the_task_type_is_inferred(self, train):
        assert train(CLEAN)["task_type"] == "classification"

    def test_a_leaderboard_is_returned(self, train):
        assert train(CLEAN)["leaderboard"]


class TestExclusionsReachTheModel:
    def test_an_excluded_column_is_not_used(self, train):
        assert "customer_id" not in train(CLEAN)["used_features"]

    def test_the_used_features_are_reported(self, train):
        """A user cannot audit a decision they cannot see."""
        used = train(CLEAN)["used_features"]
        assert "tenure_months" in used and "monthly_fee" in used


class TestLeakageChangesTheOutcome:
    """The point of the whole safety chain, measured rather than asserted."""

    def test_leakage_left_in_produces_a_suspiciously_perfect_score(self, train):
        assert auc(train(LEAKY)) > 0.99

    def test_applying_the_recommendation_restores_an_honest_score(
        self, train, recommended_exclusions
    ):
        result = train(LEAKY, ["customer_id"] + recommended_exclusions)
        assert auc(result) < 0.95

    def test_the_recommendation_actually_changes_the_result(
        self, train, recommended_exclusions
    ):
        """Advice that does not move the number is advice nobody needs to take."""
        unfiltered = auc(train(LEAKY))
        filtered = auc(train(LEAKY, ["customer_id"] + recommended_exclusions))
        assert unfiltered - filtered > 0.15

    def test_the_filtered_leaky_run_matches_the_clean_run(
        self, train, recommended_exclusions
    ):
        """Removing the planted leaks should recover the underlying dataset.

        The leaky file is the clean one plus three columns, so once those are
        gone the two runs are the same problem and should score alike.
        """
        filtered = auc(train(LEAKY, ["customer_id"] + recommended_exclusions))
        assert filtered == pytest.approx(auc(train(CLEAN)), abs=0.02)

    def test_no_leaky_column_survives_into_the_model(self, train, recommended_exclusions):
        used = train(LEAKY, ["customer_id"] + recommended_exclusions)["used_features"]
        assert not set(used) & set(recommended_exclusions)


@pytest.fixture
def empty_state():
    """Start from no analysis state, and put back whatever was there.

    Without this the result depends on which test ran first, because the state
    these tools operate on is one module-level dict - see TestSharedGlobalState.
    """
    import backend.main as backend
    saved = dict(backend.STATE)
    backend.STATE.clear()
    yield backend.STATE
    backend.STATE.clear()
    backend.STATE.update(saved)


class TestFailureIsReportedAsFailure:
    def test_a_missing_dataset_does_not_report_success(self, empty_state):
        from backend.tools.automl_training import automl_training_tool
        result = automl_training_tool({"target_column": "churn"})
        assert result["success"] is False
        assert result["status"] == "failed"

    def test_a_missing_dataset_says_what_to_do(self, empty_state):
        from backend.tools.automl_training import automl_training_tool
        result = automl_training_tool({"target_column": "churn"})
        assert result["failed_stage"] == "load_dataset"
        assert result["recommended_next_action"]


class TestRequestIsolation:
    """One person's upload must not become the next person's analysis.

    It used to. `STATE` was a single module-level dict written by the upload
    endpoint with no user, session or workspace key, so a request arriving
    without a dataset analysed whatever the previous request had left behind.
    Behind a login that is a data isolation failure.

    Reusing the last upload within a session stays deliberate - the error for a
    missing dataset tells the caller to upload one "or use an existing uploaded
    dataset". The defect was the scope of "existing", not the reuse.
    """

    def _train_in(self, scope, **arguments):
        from backend.scoped_state import reset_scope, scope_for_user, set_scope
        from backend.tools.automl_training import automl_training_tool

        token = set_scope(scope_for_user({"sub": scope}))
        try:
            return automl_training_tool({"target_column": "churn", **arguments})
        finally:
            reset_scope(token)

    def test_one_caller_cannot_reach_anothers_upload(self):
        """The original reproduction, now asserting the opposite outcome."""
        self._train_in("user-A", file_path=str(CLEAN), excluded_columns=["customer_id"])
        result = self._train_in("user-B")
        assert result["success"] is False
        assert result["failed_stage"] == "load_dataset"

    def test_a_caller_still_reuses_their_own_upload(self):
        """Isolation must not cost the behaviour the reuse exists for."""
        self._train_in("user-C", file_path=str(CLEAN), excluded_columns=["customer_id"])
        result = self._train_in("user-C")
        assert result["success"] is True
        assert "tenure_months" in result["used_features"]

    def test_a_guest_session_is_its_own_scope(self):
        from backend.scoped_state import scope_for_user
        first = scope_for_user({"sub": "guest:abc", "is_guest": True})
        second = scope_for_user({"sub": "guest:xyz", "is_guest": True})
        assert first != second

    def test_an_unidentified_request_falls_back_rather_than_failing(self):
        """Installing scoping must not break a path that has no identity."""
        from backend.scoped_state import DEFAULT_SCOPE, scope_for_user
        assert scope_for_user(None) == DEFAULT_SCOPE
        assert scope_for_user({}) == DEFAULT_SCOPE

    def test_the_scope_is_not_something_a_caller_names(self):
        """A client that could choose its scope could choose someone else's.

        The key comes from `sub`, which the server resolves from a signed token
        or the guest header; there is no parameter for it.
        """
        from backend.scoped_state import scope_for_user
        assert scope_for_user({"sub": "user-A", "scope": "user-B"}) == "user-A"

    def test_an_unknown_target_fails_rather_than_guessing(self, train):
        from backend.tools.automl_training import automl_training_tool
        result = automl_training_tool({
            "file_path": str(CLEAN), "target_column": "no_such_column",
        })
        assert result["success"] is False
