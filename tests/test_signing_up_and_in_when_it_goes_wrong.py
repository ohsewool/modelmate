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


def code_only(source):
    """주석 줄을 걷어낸다. 규칙을 **설명하는** 문장이 규칙을 **쓰는** 코드로
    읽히면, 옛 규칙을 지운 뒤에도 검사가 남아 있다고 말한다."""
    return "\n".join(line for line in source.splitlines()
                     if not line.lstrip().startswith("#"))


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
    @pytest.mark.parametrize(
        "bad", ["", "   ", "no-at-sign", "@", "이메일", "a@b", "@example.test",
                "a b@c.d"])
    def test_it_is_refused(self, client, bad):
        """**앞선 실행이 남긴 계정 때문에 통과하면 안 된다.**

        이 검사는 처음에 로컬에서 초록불이고 CI에서 빨간불이었다. `"@"`는 그때
        실제로 **통과해 계정이 만들어졌고**, 로컬에서는 앞선 실행이 남긴 `"@"`
        계정 때문에 *중복 검사*에 먼저 걸려 400이 났다. 내가 이름 붙인 이유가
        아니라 옆의 이유로 통과한 것이다.

        그래서 먼저 지우고 두드린다. 이제 400은 **형식 때문에만** 나올 수 있다.
        """
        conn = modelmate.get_db()
        try:
            conn.execute("DELETE FROM users WHERE lower(email)=?",
                         (modelmate.normalize_email(bad),))
            conn.commit()
        finally:
            conn.close()

        clear_attempts()
        response = client.post("/api/auth/signup",
                               json={"email": bad, "password": PASSWORD})
        assert response.status_code in (400, 422), response.text

        conn = modelmate.get_db()
        try:
            row = conn.execute("SELECT id FROM users WHERE lower(email)=?",
                               (modelmate.normalize_email(bad),)).fetchone()
        finally:
            conn.close()
        assert row is None, f"{bad!r}로 계정이 만들어졌다"

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


class TestOneRuleNotTwo:
    """이메일 모양을 묻는 자리가 둘이었고, 답이 달랐다.

        파일럿 문의   정규식으로 제대로 봤다
        가입          `"@" not in email`뿐이었다

    느슨한 쪽이 계정을 만드는 자리였다. 이제 규칙은 `is_email_shaped` 한 곳이고
    양쪽이 그것을 읽는다 — **사본을 만들면 한쪽만 낡는다.**
    """

    def test_the_shared_rule_exists(self):
        assert modelmate.is_email_shaped("user@example.com")
        assert not modelmate.is_email_shaped("@")

    def test_signup_reads_it(self):
        """**주석은 빼고 본다.** 처음엔 파일 전체에서 옛 규칙 문구를 찾았고
        빨간불이었다 — 남아 있던 것은 *그 규칙이 왜 바뀌었는지 설명하는 주석*이지
        규칙이 아니었다. 기록하는 행위가 기록을 뒤집는 모양이고, 이 저장소가 이미
        여러 번 잡았다."""
        source = (ROOT / "backend" / "main_parts"
                  / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert "is_email_shaped" in source
        assert '"@" not in email' not in code_only(source), (
            "느슨한 옛 규칙이 코드에 남아 있다 — 둘이 되면 다시 갈린다")

    def test_the_pilot_form_reads_the_same_one(self):
        source = (ROOT / "backend" / "main_parts"
                  / "097_pilot_inquiries.part").read_text(encoding="utf-8-sig")
        assert "is_email_shaped" in source
        assert "[^@\\s]+@" not in code_only(source), (
            "정규식 사본이 남아 있다. 한 곳만 고치면 두 답이 갈린다 — "
            "이 저장소가 가장 자주 잡은 모양이다")

    @pytest.mark.parametrize("address", ["@", "a@b", "a b@c.d", "@example.test"])
    def test_both_doors_agree_on_the_same_address(self, client, address):
        """**같은 주소, 같은 답.** 한쪽만 받으면 그 문으로 들어온다."""
        clear_attempts()
        signup = client.post("/api/auth/signup",
                             json={"email": address, "password": PASSWORD})
        pilot = client.post("/api/pilot/inquiries",
                            json={"email": address, "name": "이름",
                                  "use_case": "용도",
                                  "message": "열 글자가 넘는 문의 내용입니다."})
        assert signup.status_code != 200
        assert pilot.status_code != 200
