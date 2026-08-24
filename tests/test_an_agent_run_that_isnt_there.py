"""Agent Mode의 "없습니다" 다섯 갈래는 **닿을 수 없다** — 안 쓴 것과 못 쓰는 것은 다르다.

거부 지점 112개 중 47개가 검사에 닿지 않는다. 그 47개에 이 다섯이 있었고, 전부
README가 앞세우는 기능(Agent Mode)의 것이라 먼저 닫으려고 했다.

    045:202  get_goal_first_agent_run_api      Agent Run을 찾을 수 없습니다
    045:237  execute_goal_first_agent_run_api  Agent Run trace를 찾을 수 없습니다
    045:256  get_goal_first_agent_trace_api    Agent Run trace를 찾을 수 없습니다
    045:396  get_agent_mock_run                Agent analysis run not found
    045:442  get_agent_mock_timeline           Agent analysis run timeline not found

**검사를 쓰기 전에 재봤고, 다섯 다 닿지 않았다.** 내 것인데 안이 빈 분석 실행으로
다섯 라우트를 두드리니 404가 하나도 안 나온다.

    045:202  -> 200      045:396  -> 200
    045:237  -> 409      045:442  -> 200
    045:256  -> 200

### 왜 못 닿는가

다섯 다 같은 모양이다.

    assert_analysis_run_owner(user, analysis_run_id)   ← 행이 없으면 여기서 404
    ...
    thing = <헬퍼>(conn, analysis_run_id)
    if not thing:
        raise HTTPException(404, "...")                ← 여기

헬퍼들(`get_goal_first_agent_run`·`get_analysis_run_trace`·`get_analysis_timeline`)은
**행이 있기만 하면 truthy한 봉투를 낸다** — 안이 비어 있어도 `steps: []`,
`tool_calls: []`가 담긴 딕셔너리다. 그리고 행이 없는 경우는 바로 위 소유권 검사가
이미 404로 끝낸다.

**두 조건이 서로를 배제한다.** `if not thing`이 참이 되려면 행이 없어야 하는데,
행이 없으면 그 줄까지 오지 못한다.

### 그래서 무엇을 하는가

지우지 않는다. 값이 없는 것이 아니라 **위층이 무너졌을 때만 값이 생기는** 방어다.
`delete_deployed`의 403을 남겨둔 것과 같은 판단이고, 같은 이유로 여기 적어둔다 —
*적어두지 않으면 다음 사람이 "검사 없음"을 "확인 안 됨"으로 읽는다.*

**닿을 수 없는 가지 대신 닿을 수 없게 만드는 성질을 고정한다.** 아래 두 묶음이
그것이다: 소유권 검사가 없는 실행을 404로 끝낸다는 것, 그리고 헬퍼들이 실재하는
실행에 대해 truthy를 낸다는 것. **둘 중 하나가 바뀌면 저 다섯은 살아 있는 가지가
되고, 그때 이 파일이 말해준다.**

### 남겨두는 것이 값이 있다는 증거

주장으로 두지 않고 재봤다. 소유권 검사가 없는 실행을 통과시키도록 바꾼 뒤 없는
ID로 두드리면 —

    /api/agent-runs/{없는id}            -> 404
    /api/agent-runs/{없는id}/trace      -> 404
    /api/agent/runs/{없는id}            -> 404
    /api/agent/runs/{없는id}/timeline   -> 404

**답은 그대로 404다.** 위층이 무너진 그 순간 저 다섯이 살아나서 대신 답한다.
이중 방어가 하는 일이 정확히 이것이고, 그래서 지우지 않는다.

*"검사가 없다"에는 두 가지가 있다 — 안 쓴 것과 못 쓰는 것. 세는 도구는 그 둘을
구별하지 못한다.*
"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from backend.agents.persistence import (  # noqa: E402
    get_analysis_run_trace, get_analysis_timeline, get_goal_first_agent_run)
from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# (메서드, 경로 틀, 그 라우트가 가진 닿지 않는 404의 자리)
AGENT_ROUTES = [
    ("GET", "/api/agent-runs/{run}", "045:202"),
    ("POST", "/api/agent-runs/{run}/execute", "045:237"),
    ("GET", "/api/agent-runs/{run}/trace", "045:256"),
    ("GET", "/api/agent/runs/{run}", "045:396"),
    ("GET", "/api/agent/runs/{run}/timeline", "045:442"),
]


@pytest.fixture
def client():
    return TestClient(modelmate.app, raise_server_exceptions=False)


@pytest.fixture
def owner():
    user_id = f"agent-{uuid.uuid4().hex[:10]}"
    email = f"{user_id}@agentrun.test"
    conn = modelmate.get_db()
    try:
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, role, plan, created_at) "
            "VALUES (?,?,?,?,?,?,datetime('now'))",
            (user_id, email, "에이전트", "x", "user", "free"))
        conn.commit()
    finally:
        conn.close()

    yield {"id": user_id, "token": modelmate.make_token(user_id, email, "에이전트")}

    conn = modelmate.get_db()
    try:
        conn.execute("DELETE FROM analysis_runs WHERE user_id=?", (user_id,))
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
    finally:
        conn.close()


@pytest.fixture
def empty_run(owner):
    """**내 것인데 안이 비어 있는** 분석 실행 — 사람이 매일 만드는 상태."""
    run_id = str(uuid.uuid4())
    now = datetime.now().isoformat(timespec="seconds")
    conn = modelmate.get_db()
    try:
        conn.execute(
            "INSERT INTO analysis_runs (id, user_id, user_goal, status, created_at) "
            "VALUES (?,?,?,?,?)",
            (run_id, owner["id"], "이탈할 고객을 맞히고 싶다", "created", now))
        conn.commit()
    finally:
        conn.close()
    return run_id


class TestTheOwnerCheckIsWhatAnswersForMissingRuns:
    """**저 다섯을 막고 있는 위층.** 이것이 바뀌면 다섯은 살아 있는 가지가 된다."""

    def test_a_missing_run_is_refused_before_the_body_runs(self):
        with pytest.raises(HTTPException) as refused:
            modelmate.assert_analysis_run_owner(
                {"sub": "nobody"}, str(uuid.uuid4()))
        assert refused.value.status_code == 404

    @pytest.mark.parametrize("method, template, _site", AGENT_ROUTES)
    def test_every_agent_route_asks_first(self, client, owner, method, template,
                                          _site):
        """없는 실행이면 다섯 다 404 — 본문은 시작도 안 한다."""
        response = client.request(
            method, template.format(run=str(uuid.uuid4())),
            headers={"Authorization": f"Bearer {owner['token']}"})
        assert response.status_code == 404


class TestTheHelpersAreTruthyForARunThatExists:
    """**저 다섯의 조건이 거짓이 되는 이유.** 안이 비어도 봉투는 온다."""

    def test_the_goal_first_run_comes_back(self, empty_run):
        conn = modelmate.get_db()
        try:
            assert get_goal_first_agent_run(conn, empty_run)
        finally:
            conn.close()

    def test_the_trace_comes_back(self, empty_run):
        conn = modelmate.get_db()
        try:
            assert get_analysis_run_trace(conn, empty_run)
        finally:
            conn.close()

    def test_the_timeline_comes_back(self, empty_run):
        conn = modelmate.get_db()
        try:
            timeline = get_analysis_timeline(conn, empty_run)
        finally:
            conn.close()
        assert timeline
        assert timeline.get("steps") == [], (
            "비어 있음을 **빈 목록으로** 말한다 — None이 아니다. 그 차이가 저 "
            "다섯을 닿지 않게 만든다")

    def test_only_a_missing_row_makes_them_falsy(self):
        """되돌림 방향. 헬퍼가 falsy를 내는 조건은 **행이 없을 때뿐**이고, 그
        경우는 위 묶음이 이미 404로 끝낸다."""
        conn = modelmate.get_db()
        try:
            gone = str(uuid.uuid4())
            assert not get_goal_first_agent_run(conn, gone)
            assert not get_analysis_run_trace(conn, gone)
            assert not get_analysis_timeline(conn, gone)
        finally:
            conn.close()


class TestSoTheRoutesAnswerInsteadOfRefusing:
    """지금 실제로 무슨 답이 오는가. **닿지 않는다는 주장의 증거다.**"""

    @pytest.mark.parametrize("method, template, site", AGENT_ROUTES)
    def test_an_empty_run_is_not_a_not_found(self, client, owner, empty_run,
                                             method, template, site):
        response = client.request(
            method, template.format(run=empty_run),
            headers={"Authorization": f"Bearer {owner['token']}"})
        assert response.status_code != 404, (
            f"{site}가 닿는 가지가 됐다. 이 파일의 설명이 더 이상 맞지 않으니 "
            f"검사를 붙이고 여기를 고쳐라: {method} {template} -> "
            f"{response.status_code}")
