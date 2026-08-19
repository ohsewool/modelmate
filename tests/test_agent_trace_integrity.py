"""The agent's audit trail, and whether its citations can point at nothing.

`persistence.py` is 977 lines recording what the agent saw and why it acted -
observations, decisions, validations, artifacts - and it had no tests at all.

Every table declares FOREIGN KEY references. SQLite ignores them unless
`PRAGMA foreign_keys` is on, and it defaults to off, so none of them were
enforced. A decision could cite an observation that had never been created, and
could hang off an analysis run that did not exist. The schema read as though it
guaranteed referential integrity and guaranteed nothing - a constraint written
down and never switched on.

That is worse in a trace than in an ordinary database. These rows are the
evidence for an automated decision, and evidence whose references resolve to
nothing is not evidence.
"""

import sqlite3
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.agents.persistence import (
    create_analysis_run,
    create_decision,
    create_observation,
    create_tool_call,
    ensure_agent_trace_schema,
)


@pytest.fixture
def conn(tmp_path):
    connection = sqlite3.connect(tmp_path / "trace.db")
    connection.row_factory = sqlite3.Row
    ensure_agent_trace_schema(connection)
    yield connection
    connection.close()


@pytest.fixture
def run(conn):
    return create_analysis_run(conn, "고객 이탈을 예측하고 싶어요", dataset_id="dataset-1")


class TestReferencesAreEnforced:
    def test_the_pragma_is_actually_on(self, conn):
        """The whole finding in one line: declaring is not enforcing."""
        assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1

    def test_a_decision_cannot_cite_an_observation_that_does_not_exist(self, conn, run):
        with pytest.raises(sqlite3.IntegrityError):
            create_decision(conn, run, "proceed", "근거 충분",
                            observation_id="never-created")

    def test_a_decision_cannot_belong_to_a_run_that_does_not_exist(self, conn):
        with pytest.raises(sqlite3.IntegrityError):
            create_decision(conn, "no-such-run", "proceed", "근거 충분")

    def test_an_observation_cannot_belong_to_a_run_that_does_not_exist(self, conn):
        with pytest.raises(sqlite3.IntegrityError):
            create_observation(conn, "no-such-run", "요약", payload={})

    def test_a_new_connection_gets_the_same_enforcement(self, tmp_path):
        """The pragma is per connection, not stored in the file.

        A caller that opens its own connection and calls the schema function
        must not silently get the unenforced behaviour back.
        """
        path = tmp_path / "trace.db"
        first = sqlite3.connect(path)
        ensure_agent_trace_schema(first)
        run = create_analysis_run(first, "goal")
        first.close()

        second = sqlite3.connect(path)
        second.row_factory = sqlite3.Row
        ensure_agent_trace_schema(second)
        with pytest.raises(sqlite3.IntegrityError):
            create_decision(second, run, "proceed", "근거", observation_id="ghost")
        second.close()


class TestValidTracesStillRecord:
    """Enforcement must not cost the recording it exists to protect."""

    def test_a_decision_citing_a_real_observation_is_stored(self, conn, run):
        observation = create_observation(conn, run, "누출 3건", payload={"risk": "high"})
        decision = create_decision(conn, run, "block", "누출 위험이 높음",
                                   observation_id=observation["id"])
        stored = conn.execute("SELECT * FROM decisions WHERE id=?",
                              (decision["id"],)).fetchone()
        assert stored["observation_id"] == observation["id"]
        assert stored["reason"] == "누출 위험이 높음"

    def test_a_decision_without_an_observation_is_allowed(self, conn, run):
        """Not every decision follows an observation; the column is nullable."""
        assert create_decision(conn, run, "start", "실행 시작")

    def test_an_observation_can_be_traced_back_to_its_run(self, conn, run):
        observation = create_observation(conn, run, "요약", payload={})
        row = conn.execute("SELECT analysis_run_id FROM observations WHERE id=?",
                           (observation["id"],)).fetchone()
        assert row["analysis_run_id"] == run


class TestWhatTheTraceRecords:
    def test_the_reason_is_stored_verbatim(self, conn, run):
        """A reason paraphrased on the way in cannot be quoted later."""
        reason = "exit_survey_score 하나로 타깃이 재현되어 학습에서 제외했습니다"
        decision = create_decision(conn, run, "exclude", reason)
        stored = conn.execute("SELECT reason FROM decisions WHERE id=?",
                              (decision["id"],)).fetchone()["reason"]
        assert stored == reason

    def test_supporting_observations_round_trip(self, conn, run):
        first = create_observation(conn, run, "a", payload={})
        second = create_observation(conn, run, "b", payload={})
        decision = create_decision(conn, run, "proceed", "둘 다 통과",
                                   observation_id=first["id"],
                                   based_on_observation_ids=[first["id"], second["id"]])
        assert decision["based_on_observation_ids"] == [first["id"], second["id"]]

    def test_a_payload_survives_korean_text(self, conn, run):
        observation = create_observation(
            conn, run, "한글 요약", payload={"사유": "타깃 파생 컬럼"})
        assert observation["summary"] == "한글 요약"

    def test_identifiers_are_issued_here_not_supplied(self, conn, run):
        """Two decisions made with identical arguments are still two rows."""
        first = create_decision(conn, run, "proceed", "같은 근거")
        second = create_decision(conn, run, "proceed", "같은 근거")
        assert first["id"] != second["id"]
