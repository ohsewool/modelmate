"""예상하지 못한 오류가 났을 때 사용자와 운영자가 각각 무엇을 받는가.

앞 회차들에서 거부를 세고 또 셌다 — `raise HTTPException` 108개, 비-HTTP raise 7개.
그런데 **그 밑에 한 겹이 더 있었다.** 미들웨어가 잡지 못한 예외를 전부 받아
응답을 만들고 기록을 남긴다.

    사용자   500 "예상하지 못한 내부 오류가 발생했습니다."
             "잠시 후 다시 시도하거나 관리자에게 error ID를 전달하세요."
    운영자   monitoring_events에 route·method·status·진짜 메시지

**그 겹을 시험하는 것이 하나도 없었다.** 이 저장소의 검사 1,021개는 전부 핸들러를
직접 부른다 — `TestClient`를 쓰는 파일이 **0개**였다. 미들웨어는 요청이 앱을 통과할
때만 도는데, 통과하는 검사가 없었다.

기록도 그 사실을 말하고 있었다. `monitoring_events`에서 `error_code='internal_error'`인
행이 **0건**이다. 앱이 자기 500을 적는 자리인데, 지금까지 한 번도 안 적혔다.

`error_id`를 확인하다 알았다. 응답은 **"관리자에게 error ID를 전달하세요"**라고 한다.
그 사슬이 실제로 이어지는지 — 사용자가 받은 id로 관리자가 조회할 수 있는지 —
아무도 확인한 적이 없었다. **재보니 이어져 있었다.** 설계는 멀쩡했고 확인만 없었다.

*빈손도 결과다. 다만 그 빈손을 확인한 뒤에야 그렇게 말할 수 있다.*

여기서는 `TestClient`로 앱을 통과시킨다 — 이 저장소의 첫 `TestClient` 검사다.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

ADMIN = {"sub": "defence-admin", "email": "admin@defence.test", "role": "admin"}
CALLER = {"sub": "defence-caller", "email": "caller@defence.test", "role": "user"}

BOOM = "이 문장은 사용자에게 가면 안 된다 /home/jovyan/secret.pkl"


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


@pytest.fixture
def exploding_route(monkeypatch):
    """`GET /api/llm/status`가 반드시 터지게 만든다.

    **새 라우트를 만들지 않는다.** 실행 중에 붙인 경로는 SPA 캐치올이 먼저 잡아
    404가 되는 것을 확인했다 — 그러면 500 경로를 시험한 줄 알고 404를 시험하게 된다.
    """
    def explode(*args, **kwargs):
        raise RuntimeError(BOOM)

    monkeypatch.setitem(modelmate.__dict__, "get_llm_status", explode)
    modelmate.app.dependency_overrides[modelmate.get_current_user] = lambda: CALLER
    yield TestClient(modelmate.app, raise_server_exceptions=False)
    modelmate.app.dependency_overrides.clear()


def internal_errors():
    conn = modelmate.get_db()
    try:
        return conn.execute(
            "SELECT COUNT(*) FROM monitoring_events WHERE error_code='internal_error'"
        ).fetchone()[0]
    finally:
        conn.close()


class TestWhatTheUserGets:
    def test_it_is_a_shaped_500_not_a_stack_trace(self, exploding_route):
        response = exploding_route.get("/api/llm/status")
        assert response.status_code == 500
        body = response.json()
        assert body["error"]["code"] == "internal_error"
        assert body["error"]["error_id"].startswith("err_")
        assert body["error"]["request_id"].startswith("req_")

    def test_the_real_message_does_not_reach_them(self, exploding_route):
        """이 저장소는 `run_shap`에서 예외 문자열이 클라이언트로 나가는 것을
        한 번 겪었다. **마지막 겹에서도 같은 것을 확인한다.**"""
        response = exploding_route.get("/api/llm/status")
        rendered = response.text
        assert BOOM not in rendered
        assert "/home/jovyan" not in rendered
        assert "RuntimeError" not in rendered
        assert "Traceback" not in rendered

    def test_it_tells_them_what_to_do_with_the_id(self, exploding_route):
        response = exploding_route.get("/api/llm/status")
        action = response.json()["error"]["action"]
        assert "error ID" in action or "error id" in action.lower()

    def test_the_id_is_also_in_a_header(self, exploding_route):
        """본문을 못 읽는 클라이언트도 id를 집을 수 있어야 한다."""
        response = exploding_route.get("/api/llm/status")
        assert response.headers.get(modelmate.ERROR_ID_HEADER)
        assert response.headers.get(modelmate.REQUEST_ID_HEADER)


class TestWhatTheOperatorGets:
    """**사슬이 이어지는가.** 응답이 시키는 대로 해보는 검사다."""

    def test_the_id_the_user_was_given_can_be_looked_up(self, exploding_route):
        response = exploding_route.get("/api/llm/status")
        error_id = response.json()["error"]["error_id"]

        found = call(modelmate.get_monitoring_error, error_id=error_id, user=ADMIN)
        assert found["error_id"] == error_id
        assert found["route"] == "/api/llm/status"
        assert found["method"] == "GET"
        assert found["status_code"] == 500

    def test_the_operator_sees_the_real_message(self, exploding_route):
        """**가린 것과 잃은 것은 다르다.** 사용자에게 안 준 문장을 운영자는
        볼 수 있어야 한다 — 아니면 error ID를 받아도 할 일이 없다."""
        response = exploding_route.get("/api/llm/status")
        found = call(modelmate.get_monitoring_error,
                     error_id=response.json()["error"]["error_id"], user=ADMIN)
        assert BOOM in str(found["message"])

    def test_a_non_admin_cannot_look_it_up(self, exploding_route):
        response = exploding_route.get("/api/llm/status")
        with pytest.raises(HTTPException) as refused:
            call(modelmate.get_monitoring_error,
                 error_id=response.json()["error"]["error_id"], user=CALLER)
        assert refused.value.status_code == 403

    def test_it_is_actually_written_down(self, exploding_route):
        """**기록이 늘어나는지 센다.** 응답만 보면 `error_id`가 있어도 저장은
        실패했을 수 있다 — 그 둘은 화면에서 같아 보인다."""
        before = internal_errors()
        exploding_route.get("/api/llm/status")
        assert internal_errors() == before + 1


class TestARefusalIsRecordedToo:
    """4xx도 같은 겹을 지난다. **500과 달리 사용자에게 이유를 준다.**"""

    def test_a_refusal_keeps_its_own_detail(self, exploding_route):
        """`404`는 `internal_error`로 뭉개지면 안 된다 — 사용자가 고칠 수 있는
        것과 없는 것이 갈린다.

        **처음엔 `../../etc/passwd`를 보냈다가 200을 받았다.** 취약점이 아니라
        클라이언트가 URL을 정규화해서 `/etc/passwd/download`로 보냈고, SPA
        캐치올이 index.html을 준 것이다. 요청이 이 라우트에 **닿지도 않았다.**

        그렇게 쓴 보안 검사는 통과하면서 아무것도 시험하지 않는다 — 심은 것이
        서버에 도착했는지부터 봐야 한다. 여기서는 정규화되지 않는 평범한 이름을
        쓴다. (인코딩한 `%2e%2e%2f`는 이 라우트까지 가서 404가 된다.)
        """
        response = exploding_route.get("/api/samples/nope.csv/download")
        assert response.status_code == 404
        assert "Sample CSV" in response.json()["detail"]
        body = response.json()
        assert body["error"]["code"] != "internal_error"
        assert body["error"]["error_id"].startswith("err_")

    def test_the_control_route_is_healthy_without_the_patch(self):
        """**대조.** 터뜨리지 않은 상태에서 같은 경로가 200이어야, 위 검사들이
        "무엇이든 500"을 확인한 것이 아니게 된다."""
        modelmate.app.dependency_overrides[modelmate.get_current_user] = lambda: CALLER
        try:
            response = TestClient(modelmate.app).get("/api/llm/status")
            assert response.status_code == 200
        finally:
            modelmate.app.dependency_overrides.clear()
