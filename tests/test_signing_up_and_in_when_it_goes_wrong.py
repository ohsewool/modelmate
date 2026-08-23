"""가입과 로그인의 거절 네 갈래 — **한 번도 지나간 적이 없었다.**

거부 지점 112개 중 검사가 닿는 것은 58개였고, 닿지 않는 54개에 이 넷이 있었다.

    051_auth_history_debug.part:15   auth_signup   이메일 형식이 올바르지 않습니다
    051_auth_history_debug.part:29   auth_signup   이미 사용 중인 이메일입니다
    051_auth_history_debug.part:77   auth_login    계정이 없다
    051_auth_history_debug.part:79   auth_login    비밀번호가 틀렸다

**성공 경로에는 검사가 있었다.** 사람이 실수했을 때 무슨 일이 일어나는지는 아무도
확인한 적이 없다 — 그리고 로그인 실패는 이 제품에서 가장 자주 밟히는 갈래다.

### 두 갈래가 구별되면 안 된다

`auth_login`의 두 거절은 **같은 메시지**를 낸다. 계정이 없는 것과 비밀번호가 틀린
것을 가르면 이메일 목록이 새어 나간다.

메시지만 같게 두는 것으로는 모자란다. 그 함수에는 이렇게 적혀 있다.

    중앙값 10ms 대 280ms, **27배**. 메시지를 같게 해두고 응답 시간이 답을
    알려주는 상태였고, 270ms는 네트워크 잡음에 묻히지 않는다.

그래서 계정이 없을 때도 **가짜 해시로 같은 계산을 돌린다.** 버리는 계산이지만,
버리지 않으면 계정 목록이 새어 나간다. *그 방어를 확인하는 검사는 없었다* — 지우면
메시지는 그대로고 스위트는 초록불이다. 아래 `TestTheTwoFailuresLookAlike`가 그
계산이 실제로 일어나는지 본다.

시간 자체는 재지 않는다. 공유 러너에서 밀리초를 재면 **재는 것이 잡음뿐**이고,
그런 검사는 무작위로 빨간불이 되어 결국 꺼진다 — 이 포트폴리오가 앞 회차에 적은
그대로다. 대신 **방어가 호출되는지**를 본다.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

PASSWORD = "ModelMate-signup-12345"


@pytest.fixture(autouse=True)
def a_fresh_attempt_bucket():
    """인증 시도 조이개의 통을 비우고 시작한다.

    비우지 않으면 이 파일이 자기 자신을 막는다 — 거절 갈래를 확인하려면 일부러
    여러 번 실패해야 하고, `enforce_auth_attempt_limit`은 그것을 무차별 대입으로
    본다(맞는 판단이다). 처음 돌렸을 때 실제로 429가 나왔다.

    **조이개를 끄지 않는다.** 끄면 이 파일이 도는 동안 그 방어가 없는 것이고,
    그 상태를 눈치채지 못한 채 다른 것을 확인하게 된다. 통만 비운다 —
    조이개 자체의 검사는 따로 있다.
    """
    with modelmate._AUTH_ATTEMPTS_LOCK:
        modelmate._AUTH_ATTEMPTS.clear()
    yield
    with modelmate._AUTH_ATTEMPTS_LOCK:
        modelmate._AUTH_ATTEMPTS.clear()


@pytest.fixture
def client():
    return TestClient(modelmate.app, raise_server_exceptions=False)


def without_request_ids(body):
    """요청마다 새로 생기는 식별자를 뺀다. 그 둘은 두 실패를 가르지 않는다."""
    trimmed = dict(body)
    if isinstance(trimmed.get("error"), dict):
        trimmed["error"] = {k: v for k, v in trimmed["error"].items()
                            if k not in ("request_id", "error_id")}
    return trimmed


def clear_attempts():
    """한 검사 안에서 여러 번 실패해야 할 때 중간에 부른다."""
    with modelmate._AUTH_ATTEMPTS_LOCK:
        modelmate._AUTH_ATTEMPTS.clear()


@pytest.fixture
def registered(client):
    """실재하는 계정 하나. 끝나면 지운다."""
    email = f"signup-{uuid.uuid4().hex[:10]}@example.test"
    response = client.post("/api/auth/signup",
                           json={"email": email, "password": PASSWORD, "name": "가입"})
    assert response.status_code == 200, response.text

    yield email

    conn = modelmate.get_db()
    try:
        conn.execute("DELETE FROM users WHERE email=?", (email,))
        conn.commit()
    finally:
        conn.close()


class TestSigningUpWithSomethingThatIsNotAnEmail:
    @pytest.mark.parametrize("bad", ["", "   ", "no-at-sign", "@", "이메일"])
    def test_it_is_refused(self, client, bad):
        clear_attempts()
        response = client.post("/api/auth/signup",
                               json={"email": bad, "password": PASSWORD})
        assert response.status_code in (400, 422), response.text

    def test_the_reason_says_it_is_the_format(self, client):
        """400이 왔다는 것과 **왜 왔는지**는 다르다. 화면에 뭘 띄울지가 여기서 갈린다."""
        response = client.post("/api/auth/signup",
                               json={"email": "no-at-sign", "password": PASSWORD})
        assert response.status_code == 400
        assert "형식" in response.json()["detail"]

    def test_no_account_is_created(self, client):
        """거절했는데 행이 생기면 그건 거절이 아니다."""
        conn = modelmate.get_db()
        try:
            before = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        finally:
            conn.close()
        client.post("/api/auth/signup",
                    json={"email": "no-at-sign", "password": PASSWORD})
        conn = modelmate.get_db()
        try:
            assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == before
        finally:
            conn.close()


class TestSigningUpTwiceWithTheSameEmail:
    def test_the_second_one_is_refused(self, client, registered):
        response = client.post("/api/auth/signup",
                               json={"email": registered, "password": PASSWORD})
        assert response.status_code == 400
        assert "이미" in response.json()["detail"]

    def test_case_does_not_get_you_a_second_account(self, client, registered):
        """**이것이 이 갈래가 있는 이유다.** 예전에는 중복 검사가 대소문자를
        구분했고 역할 판정은 소문자로 했다 — `ADMIN@…`으로 가입하면 중복에 안
        걸리면서 관리자 역할을 받았다. 경위는 `normalize_email`에 있다."""
        response = client.post("/api/auth/signup",
                               json={"email": registered.upper(), "password": PASSWORD})
        assert response.status_code == 400, (
            "대문자로 쓴 같은 이메일이 통과했다 — 계정이 둘 생긴다")

    def test_the_original_password_still_works(self, client, registered):
        """되돌림 방향. 거절이 기존 계정을 건드리면 안 된다."""
        response = client.post("/api/auth/login",
                               json={"email": registered, "password": PASSWORD})
        assert response.status_code == 200


class TestTheTwoFailuresLookAlike:
    """**계정이 없다**와 **비밀번호가 틀렸다**를 구별할 수 있으면 목록이 샌다."""

    def test_a_missing_account_is_refused(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": f"nobody-{uuid.uuid4().hex[:8]}@example.test",
                  "password": PASSWORD})
        assert response.status_code == 400

    def test_a_wrong_password_is_refused(self, client, registered):
        response = client.post("/api/auth/login",
                               json={"email": registered, "password": "wrong-" + PASSWORD})
        assert response.status_code == 400

    def test_the_two_answers_are_identical(self, client, registered):
        missing = client.post(
            "/api/auth/login",
            json={"email": f"nobody-{uuid.uuid4().hex[:8]}@example.test",
                  "password": PASSWORD})
        clear_attempts()
        wrong = client.post("/api/auth/login",
                            json={"email": registered, "password": "wrong-" + PASSWORD})
        assert missing.status_code == wrong.status_code
        assert without_request_ids(missing.json()) == without_request_ids(wrong.json()), (
            "두 실패의 답이 다르다 — 어느 이메일이 가입돼 있는지 물어볼 수 있다")

    def test_the_comparison_would_notice_a_difference(self, client, registered):
        """**대조.** 위 검사는 몸통 전체가 아니라 `request_id`/`error_id`를 뺀
        것을 비교한다. 그 둘을 빼는 순간 비교가 무엇도 붙잡지 않게 될 수 있으므로,
        진짜로 다른 몸통을 넣어 여전히 갈라내는지 확인한다.

        처음엔 몸통 전체를 비교했고 빨간불이었다. 달랐던 것은 그 둘뿐이었다 —
        요청마다 새로 생기는 식별자이고 **어느 이메일이 있는지 말해주지 않는다.**
        누출이 아니라 내 단언이 너무 좁았다.
        """
        body = client.post("/api/auth/login",
                           json={"email": registered, "password": "wrong-" + PASSWORD}).json()
        leaky = {**body, "detail": "그런 계정이 없습니다"}
        assert without_request_ids(body) != without_request_ids(leaky)

    def test_no_token_comes_back_either_way(self, client, registered):
        for payload in ({"email": f"nobody-{uuid.uuid4().hex[:8]}@example.test",
                         "password": PASSWORD},
                        {"email": registered, "password": "wrong-" + PASSWORD}):
            clear_attempts()
            body = client.post("/api/auth/login", json=payload).text
            assert "token" not in body.lower()

    def test_the_missing_account_path_still_hashes(self, client, monkeypatch):
        """**시간으로 새는 것을 막는 그 계산.** 지우면 메시지는 그대로고 스위트는
        초록불이 된다 — 그래서 여기서 붙잡는다.

        밀리초를 재지 않는다. 공유 러너에서 재면 재는 것이 잡음이고, 무작위로
        빨간불이 되는 검사는 결국 꺼진다. **호출되는지**만 본다.
        """
        calls = []
        real = modelmate.verify_password
        monkeypatch.setattr(modelmate, "verify_password",
                            lambda password, digest: calls.append(digest) or real(password, digest))

        client.post("/api/auth/login",
                    json={"email": f"nobody-{uuid.uuid4().hex[:8]}@example.test",
                          "password": PASSWORD})
        assert calls, (
            "계정이 없을 때 비밀번호 확인을 아예 건너뛴다 — 응답이 빨라지고, "
            "그 차이가 '이 이메일은 가입돼 있지 않다'를 알려준다")
        assert calls[0] == modelmate.DUMMY_PASSWORD_HASH
