"""인증 없이 쓰는 경로 셋이 무엇을 받아들이는가.

CI가 한 줄도 실행하지 않는 라우트 마흔 개를 프런트엔드가 부르는지로 갈랐더니, **스물넷은
프런트가 부르는데 아무 검사도 치지 않는** 것이었다. 그중 셋이 **인증 없이 쓰는 경로**다 —
파일럿 문의, 베타 피드백, 프런트엔드 오류 보고. 로그인 없이 인터넷에서 도달하고, 셋 다
DB에 행을 쓴다.

셋 다 입력을 다듬는 코드를 갖고 있다. 길이를 자르고, 이메일 모양을 보고, 허용 목록 밖의
키를 버린다. **그 코드가 한 번도 돌아본 적이 없었다.**

파일럿 문의의 `_pilot_safe_snapshot`이 특히 그렇다. 프런트엔드가 현재 사용량 스냅숏을
함께 보내는데, 그 딕셔너리는 **브라우저가 만든 것**이다. 허용 목록(`mode`, `plan`,
`limits` …)과 차단 목록(`password`, `token`, `secret`, `session` …) 둘을 다 통과해야
저장된다. 두 겹이 있다는 것은 누군가 그것을 필요하다고 판단했다는 뜻이고, **필요하다고
판단한 것이 도는지는 확인된 적이 없었다.**

`Depends`를 거치지 않고 핸들러를 직접 부른다. 확인하려는 것은 "이 함수가 무엇을 받아
무엇을 버리는가"이지 FastAPI가 의존성을 주입하는가가 아니다.
"""

import asyncio
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402


class FakeRequest:
    """핸들러가 요청에서 읽는 것들. 처음엔 `state.request_id`와 헤더 둘이면
    된다고 봤는데 피드백 쪽이 `url`도 읽는다 — **핸들러를 직접 부르는 검사는
    그 핸들러가 요청에서 무엇을 읽는지 다 알아야 한다.**"""

    def __init__(self, request_id="req_test", path="/api/feedback"):
        self.state = type("State", (), {"request_id": request_id})()
        self.headers = {}
        # `str(request.url.path)`으로 읽힌다 — 문자열을 주면 `.path`가 없다.
        self.url = type("Url", (), {"path": path})()
        self.method = "POST"
        self.client = type("Client", (), {"host": "127.0.0.1"})()


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


def inquiry(**overrides):
    fields = dict(name="테스터", email="tester@example.test", use_case="이탈 예측 파일럿",
                  message="한 달 동안 이탈 예측을 시험해보고 싶습니다.")
    fields.update(overrides)
    return modelmate.PilotInquiryBody(**fields)


@pytest.fixture
def cleanup():
    """이 검사가 만든 행을 지운다. 매 실행마다 남기면 관리자 화면이 시험 문의로
    찬다 — 이 저장소는 그 종류의 뒤처리를 한 번 정리한 적이 있다."""
    made = []
    yield made
    keys = {"pilot_inquiries": "inquiry_id", "beta_feedback": "feedback_id",
            "monitoring_events": "error_id"}
    conn = modelmate.get_db()
    try:
        for table, identifier in made:
            conn.execute(f"DELETE FROM {table} WHERE {keys[table]}=?", (identifier,))
        conn.commit()
    finally:
        conn.close()


class TestThePilotFormRefusesWhatItShould:
    @pytest.mark.parametrize("email", ["", "not-an-email", "a@b", "a b@c.d", "@example.test"])
    def test_a_malformed_email_is_refused(self, email):
        with pytest.raises(HTTPException) as raised:
            call(modelmate.submit_pilot_inquiry, inquiry(email=email), FakeRequest(), user=None)
        assert raised.value.status_code == 400
        assert raised.value.detail["code"] == "validation_failed"

    @pytest.mark.parametrize("missing", [{"name": ""}, {"use_case": ""}, {"message": "짧다"}])
    def test_an_empty_required_field_is_refused(self, missing):
        with pytest.raises(HTTPException) as raised:
            call(modelmate.submit_pilot_inquiry, inquiry(**missing), FakeRequest(), user=None)
        assert raised.value.status_code == 400

    def test_a_well_formed_inquiry_is_accepted(self, cleanup):
        """거부만 확인하면 전부 거부하는 구현도 통과한다."""
        marker = uuid.uuid4().hex[:10]
        accepted = call(modelmate.submit_pilot_inquiry,
                        inquiry(message=f"파일럿 문의 {marker} 입니다. 시험 목적입니다."),
                        FakeRequest(), user=None)
        assert accepted.get("inquiry_id")
        cleanup.append(("pilot_inquiries", accepted["inquiry_id"]))


class TestTheBrowserSuppliedSnapshotIsFiltered:
    """스냅숏은 **브라우저가 만든 딕셔너리**다. 허용 목록과 차단 목록 두 겹이 있고,
    둘 다 한 번도 돌아본 적이 없었다."""

    def test_a_key_outside_the_allowlist_is_dropped(self):
        filtered = modelmate._pilot_safe_snapshot({"plan": "free", "internal_notes": "x"})
        assert filtered == {"plan": "free"}

    @pytest.mark.parametrize("key", ["password", "token", "authorization", "secret", "session"])
    def test_a_secret_looking_key_never_survives(self, key):
        assert modelmate._pilot_safe_snapshot({key: "value"}) == {}

    def test_the_blocklist_cannot_fire_and_here_is_why(self):
        """**차단 목록은 도달할 수 없다.** 허용 목록이 먼저 `continue`로 걸러내고,
        허용 목록 열 개 중 차단 낱말을 품은 이름이 하나도 없다.

        처음 쓴 검사가 이것을 놓쳤다. `{"password": ...}`가 버려지는 것을 보고
        차단 목록이 일한다고 읽었는데, `password`는 **허용 목록에도 없어서** 첫
        겹에서 이미 걸린다 — 차단 목록을 통째로 꺼도 그 검사는 통과했다. 대조를
        걸어보고서야 알았다.

        지우지 않는다. 허용 목록에 `session_plan` 같은 이름이 추가되는 날 안쪽이
        일한다. 대신 **그 전제가 바뀌면 여기가 말한다** — 그때 차단 목록은 살아
        있는 검사가 되고, 그 사실을 아는 채로 두는 것이 이 검사의 일이다.
        """
        # **소스에서 읽는다.** 처음엔 여기 옮겨 적었고, 그래서 소스의 허용 목록에
        # 낱말을 추가해도 이 검사가 조용했다 — 사본은 소스가 바뀌어도 그대로다.
        # 대조를 걸어보고 알았고, 그 김에 허용 목록을 차단 목록과 같은 자리(모듈
        # 상수)로 올렸다. 짝인 두 목록이 서로 다른 자리에 있던 것이 원인이다.
        allowed = modelmate.PILOT_ALLOWED_CONTEXT_KEYS
        assert len(allowed) >= 5
        for name in allowed:
            assert modelmate._pilot_safe_snapshot({name: "v"}) == {name: "v"}, name

        live = [(name, word) for name in allowed
                for word in modelmate.PILOT_BLOCKED_CONTEXT_KEYS if word in name.lower()]
        assert live == [], (
            f"허용 키가 차단 낱말을 품게 됐다: {live}. 차단 목록이 이제 살아 있는 "
            "검사이므로, 그것이 실제로 막는지 확인하는 검사를 여기 추가하라."
        )

    def test_a_value_that_cannot_be_json_is_stringified_not_dropped(self):
        """직렬화되지 않는 값이 왔다고 스냅숏 전체를 버리면, 무엇이 왔는지가
        사라진다. 문자열로 접어 500자로 자른다."""
        filtered = modelmate._pilot_safe_snapshot({"limits": {1, 2, 3}})
        assert isinstance(filtered["limits"], str)
        assert len(filtered["limits"]) <= 500

    def test_something_that_is_not_a_mapping_is_ignored(self):
        for value in ("string", 5, None, ["a"]):
            assert modelmate._pilot_safe_snapshot(value) == {}

    def test_the_allowlist_and_the_blocklist_are_both_non_empty(self):
        """둘 중 하나가 비면 위 검사들이 통과하면서 아무것도 막지 않는다."""
        assert len(modelmate.PILOT_BLOCKED_CONTEXT_KEYS) >= 4


class TestTheFeedbackFormRefusesWhatItShould:
    @pytest.mark.parametrize("body,reason", [
        ({"category": "made-up"}, "지원하지 않는 피드백 유형"),
        ({"severity": "catastrophic"}, "지원하지 않는 중요도"),
        ({"title": ""}, "제목과 자세한 내용"),
        ({"message": ""}, "제목과 자세한 내용"),
    ])
    def test_it_is_refused(self, body, reason):
        payload = {"category": "bug", "severity": "medium",
                   "title": "제목", "message": "내용"}
        payload.update(body)
        with pytest.raises(HTTPException) as raised:
            call(modelmate.submit_beta_feedback, payload, FakeRequest(), user=None)
        assert raised.value.status_code == 400
        assert reason in raised.value.detail["message"]

    def test_a_well_formed_report_is_accepted(self, cleanup):
        marker = uuid.uuid4().hex[:10]
        accepted = call(modelmate.submit_beta_feedback,
                        {"category": "bug", "severity": "medium",
                         "title": f"시험 {marker}", "message": "재현 절차입니다."},
                        FakeRequest(), user=None)
        identifier = accepted.get("feedback_id") or accepted.get("id")
        assert identifier
        cleanup.append(("beta_feedback", identifier))


class TestTheErrorReportEndpointTruncates:
    """브라우저가 보내는 오류 보고다. 길이 제한이 없으면 **누구나 로그에 원하는
    만큼 쓸 수 있다.**"""

    def test_a_long_message_is_cut(self, cleanup):
        accepted = call(modelmate.report_frontend_error,
                        {"message": "x" * 5000, "route": "/y" * 500}, FakeRequest())
        assert accepted.get("error_id")
        assert self.stored(accepted["error_id"]) is not None
        assert len(self.stored(accepted["error_id"])) <= 500
        cleanup.append(("monitoring_events", accepted["error_id"]))

    def test_the_limit_that_actually_holds_is_in_the_writer(self, cleanup):
        """핸들러의 `[:500]`은 **지워도 아무 차이가 없다.** 실제로 자르는 것은
        `persist_monitoring_event`이고, 그것이 이 보장을 제공하는 층이다.

        처음 쓴 검사는 그 구분을 못 했다 — 핸들러의 자르기를 지우고 돌렸는데
        통과했다. 저장된 값만 봤으니 어느 겹이 잘랐는지 알 수 없었다. 보장은
        제공하는 층에서 시험해야 한다.
        """
        error_id = modelmate.persist_monitoring_event(
            event_type="test.truncation", request_id="req_test", user_id=None,
            project_id=None, run_id=None, error_code="test",
            message="z" * 5000, safe_details={})
        cleanup.append(("monitoring_events", error_id))
        assert len(self.stored(error_id)) == 500

    def stored(self, error_id):
        conn = modelmate.get_db()
        try:
            row = conn.execute("SELECT message FROM monitoring_events WHERE error_id=?",
                               (error_id,)).fetchone()
        finally:
            conn.close()
        return row["message"] if row else None

    def test_a_missing_message_gets_a_default(self, cleanup):
        accepted = call(modelmate.report_frontend_error, {}, FakeRequest())
        assert accepted.get("error_id")
        cleanup.append(("monitoring_events", accepted["error_id"]))
