"""남의 자원에 손을 뻗으면 막히는가.

지난 회차에 스위트가 실제로 발동시키는 `HTTPException`이 **101곳 중 3곳**뿐이라는
것을 계측했다. 권한 거부 열여섯 중 관리자 403 아홉과 로그인 401 셋은 그때 넣었고,
남은 것들 가운데 **소유권 404**가 이번 차례다.

`044_access_control.part`의 `_resource_not_found()`는 네 개의 문지기가 공유한다 —
프로젝트·데이터셋·분석 실행·배포 모델. 그 문지기들이 남의 것을 막는지 **한 번도
확인된 적이 없다.**

**404를 쓰는 것은 의도된 선택이다.** 남의 프로젝트에 403을 주면 "그 id는 존재한다"를
알려주는 셈이다. 404는 존재 여부까지 감춘다. 그래서 이 검사는 **없는 자원과 남의
자원이 같은 답을 내는지**까지 본다 — 둘이 갈라지면 그 자체가 누출이다.

관리자는 통과한다. 그것도 함께 고정한다: 전부 거부하는 구현이라면 아래 거부 검사가
모두 통과하면서 아무것도 증명하지 않는다.
"""

import sqlite3
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

OWNER = {"sub": "owner-user", "email": "owner@example.test", "role": "user"}
STRANGER = {"sub": "stranger-user", "email": "stranger@example.test", "role": "user"}
ADMIN = {"sub": "admin-user", "email": "admin@example.test", "role": "admin"}
STAMP = "2026-08-22T00:00:00"


def _has_table(name: str) -> bool:
    conn = modelmate.get_db()
    try:
        return conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
        ).fetchone() is not None
    finally:
        conn.close()


# `analysis_runs`는 **게으르게 만들어진다** — `backend/agents/persistence.py`가 처음
# 쓸 때 `CREATE TABLE IF NOT EXISTS`로 만든다. 갓 설치한 곳에는 없고, CI가 정확히 그
# 상태다. 문지기도 그것을 알고 있어서 `sqlite3.OperationalError`를 잡아 "없는 자원"으로
# 다룬다 — 그 갈래를 아래에서 따로 확인한다.
def _ensure_analysis_runs() -> bool:
    """`analysis_runs`를 **만든다.** 없다고 건너뛰지 않는다.

    예전에는 `skipif`였다. 이 표는 에이전트 경로가 처음 쓸 때 만들어지므로,
    **갓 만든 DB에서는 없다** — 즉 CI에서는 늘 없다. 개발 기계에는 예전 실행이
    남긴 표가 있어서 여기서는 넷이 돌았고, **CI에서는 넷 다 건너뛰었다.**

    건너뛴 것이 무엇인지가 요점이다. 남의 분석 실행에 접근하면 거절하는지를 보는
    검사 넷 — **소유권 관문이 CI에서 한 번도 확인되지 않았다.** 초록불이었고,
    로컬에서 통과했고, 정작 지켜야 할 곳에서는 안 돌았다.

    스키마를 만드는 함수가 이미 있다. 없다고 물러설 이유가 없었다.
    """
    from backend.agents.persistence import ensure_agent_trace_schema

    conn = modelmate.get_db()
    try:
        ensure_agent_trace_schema(conn)
        conn.commit()
    finally:
        conn.close()
    return _has_table("analysis_runs")


# 표를 만들지 **못하면** 그때는 건너뛴다 — 그리고 그 사실이 화면에 남는다.
needs_runs = pytest.mark.skipif(
    not _ensure_analysis_runs(),
    reason="analysis_runs를 만들지 못했다 — 건너뛴 게 아니라 못 만든 것이다")


def _insert(table: str, **columns) -> str:
    identifier = columns.setdefault("id", f"test-{uuid.uuid4().hex[:12]}")
    conn = modelmate.get_db()
    try:
        names = ", ".join(columns)
        marks = ", ".join("?" for _ in columns)
        conn.execute(f"INSERT INTO {table} ({names}) VALUES ({marks})", tuple(columns.values()))
        conn.commit()
    finally:
        conn.close()
    return identifier


def _delete(table: str, identifier: str) -> None:
    conn = modelmate.get_db()
    try:
        conn.execute(f"DELETE FROM {table} WHERE id=?", (identifier,))
        conn.commit()
    finally:
        conn.close()


@pytest.fixture
def owned():
    """소유자가 분명한 자원 넷. 테스트가 끝나면 지운다 — 이 저장소는 매 실행마다
    바뀌는 파일을 추적하다 한 번 정리했고, 그 이후 규칙이다."""
    made = []

    def make(table, **columns):
        identifier = _insert(table, **columns)
        made.append((table, identifier))
        return identifier

    yield make
    for table, identifier in reversed(made):
        _delete(table, identifier)


class TestAStrangerIsRefused:
    def test_a_project(self, owned):
        project = owned("projects", user_id=OWNER["sub"], name="p")
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_project_owner(STRANGER, project)
        assert raised.value.status_code == 404

    def test_a_dataset(self, owned):
        dataset = owned("datasets", user_id=OWNER["sub"], filename="d.csv", project_id="p-1")
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_dataset_owner(STRANGER, dataset)
        assert raised.value.status_code == 404

    @needs_runs
    def test_an_analysis_run(self, owned):
        run = owned("analysis_runs", user_id=OWNER["sub"], user_goal="g", created_at=STAMP)
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_analysis_run_owner(STRANGER, run)
        assert raised.value.status_code == 404

    def test_a_deployed_model(self, owned):
        model = owned("deployed_models", user_id=OWNER["sub"], name="m", task_type="classification")
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_deployed_model_owner(STRANGER, model)
        assert raised.value.status_code == 404


class TestTheOwnerAndTheAdminGetThrough:
    """전부 거부하는 구현이라면 위 넷이 전부 통과하면서 아무것도 증명하지 않는다."""

    def test_the_owner_reads_their_project(self, owned):
        project = owned("projects", user_id=OWNER["sub"], name="p")
        assert modelmate.assert_project_owner(OWNER, project)["id"] == project

    def test_an_admin_reads_someone_elses_project(self, owned):
        project = owned("projects", user_id=OWNER["sub"], name="p")
        assert modelmate.assert_project_owner(ADMIN, project)["id"] == project

    def test_the_owner_reads_their_dataset(self, owned):
        dataset = owned("datasets", user_id=OWNER["sub"], filename="d.csv", project_id="p-1")
        assert modelmate.assert_dataset_owner(OWNER, dataset)["id"] == dataset

    @needs_runs
    def test_the_owner_reads_their_run(self, owned):
        run = owned("analysis_runs", user_id=OWNER["sub"], user_goal="g", created_at=STAMP)
        assert modelmate.assert_analysis_run_owner(OWNER, run)["id"] == run


class TestAbsenceAndRefusalLookTheSame:
    """**404를 쓰는 것이 요점이다.** 남의 프로젝트에 403을 주면 "그 id는 존재한다"를
    알려주는 셈이고, 그것은 이 저장소가 로그인에서 이미 한 번 막은 종류의 누출이다
    (계정 존재 여부를 응답 시간으로도 알 수 없게 만들었다).

    그래서 **없는 자원과 남의 자원이 같은 답**을 내야 한다. 상태 코드와 문구를 둘 다
    비교한다 — 문구가 갈리면 코드가 같아도 갈라진다."""

    @pytest.mark.parametrize("gate,table,columns", [
        ("assert_project_owner", "projects", {"name": "p"}),
        ("assert_dataset_owner", "datasets", {"filename": "d.csv", "project_id": "p-1"}),
        ("assert_deployed_model_owner", "deployed_models", {"name": "m", "task_type": "classification"}),
    ])
    def test_a_missing_resource_answers_exactly_like_a_stranger_s(self, owned, gate, table, columns):
        guard = getattr(modelmate, gate)
        existing = owned(table, user_id=OWNER["sub"], **columns)

        with pytest.raises(HTTPException) as refused:
            guard(STRANGER, existing)
        with pytest.raises(HTTPException) as absent:
            guard(STRANGER, "no-such-identifier")

        assert refused.value.status_code == absent.value.status_code
        assert refused.value.detail == absent.value.detail


class TestTheGuestPathsAreDeliberate:
    """둘은 소유자가 없는 자원을 일부러 통과시킨다. 그 문이 **열려 있다는 사실**도
    고정해둔다 — 조용히 닫히면 옛 게스트 실행이 안 열리고, 조용히 넓어지면
    남의 자원이 열린다."""

    @needs_runs
    def test_a_legacy_guest_run_is_readable_without_a_user_when_asked(self, owned):
        run = owned("analysis_runs", user_id=None, user_goal="g", created_at=STAMP)
        assert modelmate.assert_analysis_run_owner(None, run, allow_guest_legacy=True)["id"] == run

    @needs_runs
    def test_a_legacy_guest_run_is_not_readable_when_it_is_not_asked(self, owned):
        run = owned("analysis_runs", user_id=None, user_goal="g", created_at=STAMP)
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_analysis_run_owner(None, run)
        assert raised.value.status_code == 401

    def test_a_public_model_exposes_metadata_when_asked(self, owned):
        model = owned("deployed_models", user_id=None, name="m", task_type="classification")
        assert modelmate.assert_deployed_model_owner(None, model,
                                                     allow_public_metadata=True)["id"] == model

    def test_a_public_model_is_not_readable_when_it_is_not_asked(self, owned):
        # 이 둘은 처음에 **같은 이름**이었다. 파이썬은 뒤엣것으로 앞엣것을 덮고
        # pytest는 아무 말도 하지 않는다 - 통과 개수만 하나 줄고 그것을 보는 것이
        # 없었다. 2026-08-22에 다섯 저장소를 훑는 검사를 함께 넣었다.
        model = owned("deployed_models", user_id=None, name="m", task_type="classification")
        with pytest.raises(HTTPException) as raised:
            modelmate.assert_deployed_model_owner(None, model)
        assert raised.value.status_code == 401


class TestAMissingTableIsAMissingResource:
    """`analysis_runs`가 아예 없는 설치. 갓 만든 DB가 그 상태이고 **CI가 정확히
    그렇게 돈다** — 이 표는 에이전트 경로가 처음 쓸 때 만들어진다.

    문지기는 그것을 알고 `sqlite3.OperationalError`를 잡아 "없는 자원"으로 다룬다.
    그 갈래도 한 번도 발동된 적이 없었고, **여기서 처음 확인한다.** 잡지 않으면
    갓 설치한 서버에서 어떤 실행을 조회하든 500이 난다 — 그리고 500은 "당신 것이
    아니다"가 아니라 "우리가 고장났다"이다.

    표가 있는 기계에서도 돌게 하려고 임시 DB를 가리킨다. `DB_PATH`는 모듈이
    읽어 `DB_PATH` 전역에 담고 `get_db()`가 그것을 쓰므로, 그 전역만 바꾸면 된다.
    """

    def test_the_guard_reports_it_as_not_found(self, tmp_path, monkeypatch):
        fresh = tmp_path / "empty.db"
        monkeypatch.setattr(modelmate, "DB_PATH", str(fresh))
        conn = modelmate.get_db()          # 빈 파일이 생기고, 표는 하나도 없다
        conn.close()
        assert not _has_table("analysis_runs")

        with pytest.raises(HTTPException) as raised:
            modelmate.assert_analysis_run_owner(OWNER, "any-run")
        assert raised.value.status_code == 404
