"""구글 로그인이 누구를 관리자로 만드는가.

프런트가 부르는데 CI가 한 줄도 실행하지 않던 라우트 중 하나다. 로그인 **이전**에
도달하는 경로이고, 여기서 역할이 정해진다.

**이 저장소는 관리자 승격에서 이미 한 번 데였다.** 부팅 시 계정 시딩에 경로가 둘
있었는데, 하나는 `ADMIN_EMAILS`(복수)를 보고 다른 하나는 `ADMIN_EMAIL`(단수)을 봤다.
`get_admin_emails()`는 단수를 무시하므로, **문서화된 목록에 없는 주소가 관리자가 되는
두 번째 경로**였다. 그건 지웠다. 구글 로그인은 **세 번째 경로**이고 확인된 적이 없었다.

여기서 검증하는 것은 구글의 서명 검사가 아니다 — 그건 라이브러리의 일이고 네트워크를
쓴다. `verify_oauth2_token`을 우리가 정한 응답으로 바꾸고, **그 응답을 받은 뒤 이 코드가
무엇을 하는지**를 본다: 역할을 어디서 정하는가, 이메일을 어떻게 저장하는가, 승격을
기록에 남기는가.

경계를 그렇게 긋는 이유는 이 저장소가 적어둔 규칙 그대로다 — 검증할 수 없는 것을
검증한 척하지 않는다. 토큰이 진짜인지는 구글이 답하고, **진짜라고 들었을 때 우리가
무엇을 하는지**는 우리가 답한다.
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
    """호출자마다 **다른 IP**를 준다.

    처음엔 전부 `127.0.0.1`이었고, 열 번째 호출부터 429가 나왔다 — 인증 **이전**에
    거는 IP당 분당 시도 제한이다. 그 통제는 이 저장소가 일부러 넣은 것이고 제대로
    돌고 있었다. 여기서 확인하려는 것은 그것이 아니므로, 검사마다 다른 호출자인
    척한다. **통제를 끄지 않고 비켜간다** — 끄면 다음 사람이 그것이 없는 줄 안다.
    """

    def __init__(self, host=None):
        self.state = type("State", (), {"request_id": "req_google"})()
        self.headers = {}
        self.client = type("Client", (), {"host": host or f"10.0.{uuid.uuid4().int % 250}."
                                                          f"{uuid.uuid4().int % 250}"})()
        self.url = type("Url", (), {"path": "/api/auth/google"})()
        self.method = "POST"


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


def login(monkeypatch, *, email, subject=None, name="테스터"):
    """구글이 이 토큰을 진짜라고 답했다고 치고 부른다."""
    subject = subject or f"google-{uuid.uuid4().hex[:10]}"
    monkeypatch.setattr(
        modelmate.id_token, "verify_oauth2_token",
        lambda credential, request, audience: {
            "sub": subject, "email": email, "name": name, "picture": "",
        })
    body = modelmate.GoogleTokenBody(credential="pretend-token")
    return subject, call(modelmate.auth_google, body, FakeRequest())


@pytest.fixture
def accounts():
    made = []
    yield made
    conn = modelmate.get_db()
    try:
        for identifier in made:
            conn.execute("DELETE FROM users WHERE id=?", (identifier,))
        conn.commit()
    finally:
        conn.close()


def stored(identifier: str):
    conn = modelmate.get_db()
    try:
        row = conn.execute("SELECT id, email, role, plan FROM users WHERE id=?",
                           (identifier,)).fetchone()
    finally:
        conn.close()
    return dict(row) if row else None


class TestAnUnverifiableTokenIsRefused:
    def test_a_token_google_rejects_is_a_400(self, monkeypatch):
        def refuse(credential, request, audience):
            raise ValueError("Token expired")

        monkeypatch.setattr(modelmate.id_token, "verify_oauth2_token", refuse)
        with pytest.raises(HTTPException) as raised:
            call(modelmate.auth_google,
                 modelmate.GoogleTokenBody(credential="expired"), FakeRequest())
        assert raised.value.status_code == 400

    def test_the_reason_is_carried_not_swallowed(self, monkeypatch):
        """검증 실패의 이유가 사라지면 운영자가 만료와 잘못된 audience를 구분할 수
        없다. 사용자에게 보이는 문장이므로 **토큰 자체는 담기지 않는다** — 여기서는
        예외 메시지만 붙는다."""
        def refuse(credential, request, audience):
            raise ValueError("Wrong audience")

        monkeypatch.setattr(modelmate.id_token, "verify_oauth2_token", refuse)
        with pytest.raises(HTTPException) as raised:
            call(modelmate.auth_google,
                 modelmate.GoogleTokenBody(credential="secret-token-value"), FakeRequest())
        detail = str(raised.value.detail)
        assert "Wrong audience" in detail
        assert "secret-token-value" not in detail


class TestTheRoleComesFromTheDocumentedListOnly:
    """**세 번째 승격 경로다.** 앞의 둘 중 하나는 문서화된 목록 밖의 주소를 관리자로
    만들었고 그래서 지워졌다. 여기가 같은 일을 하지 않는지 본다."""

    def test_an_ordinary_google_account_is_not_an_admin(self, monkeypatch, accounts):
        subject, _ = login(monkeypatch, email=f"someone-{uuid.uuid4().hex[:6]}@example.test")
        accounts.append(subject)
        assert stored(subject)["role"] == "user"

    def test_an_address_on_the_list_is(self, monkeypatch, accounts):
        """거부만 확인하면 아무도 관리자가 못 되는 구현도 통과한다.

        **부팅이 이미 만들어둔 `admin@modelmate.local`은 쓰지 않는다.** 그 주소로
        새 구글 계정을 만들면 `users_email_ci`에 걸리는데, 그것은 이 검사가 보려는
        것이 아니라 아래 `TestAnEmailThatIsAlreadyTaken`이 보는 것이다."""
        address = f"listed-{uuid.uuid4().hex[:6]}@example.test"
        monkeypatch.setenv("ADMIN_EMAILS", address)
        subject, _ = login(monkeypatch, email=address)
        accounts.append(subject)
        assert stored(subject)["role"] == "admin"

    def test_adding_an_address_to_the_list_is_what_grants_it(self, monkeypatch, accounts):
        """환경 변수 하나가 권한을 준다는 것을 눈에 보이게 둔다 — 이 저장소는 그
        경로가 **문서화된 목록 하나뿐**이어야 한다고 정했다."""
        address = f"granted-{uuid.uuid4().hex[:6]}@example.test"
        monkeypatch.setenv("ADMIN_EMAILS", address)
        subject, _ = login(monkeypatch, email=address)
        accounts.append(subject)
        assert stored(subject)["role"] == "admin"

    def test_an_existing_admin_stays_one(self, monkeypatch, accounts):
        listed = f"stays-{uuid.uuid4().hex[:6]}@example.test"
        monkeypatch.setenv("ADMIN_EMAILS", listed)
        subject, _ = login(monkeypatch, email=listed)
        accounts.append(subject)
        # 목록에서 빠져도 이미 관리자인 계정은 강등되지 않는다 — 강등은 다른 결정이고
        # 로그인 경로가 조용히 할 일이 아니다.
        monkeypatch.setenv("ADMIN_EMAILS", "someone-else@example.test")
        login(monkeypatch, email=listed, subject=subject)
        assert stored(subject)["role"] == "admin"


class TestTheStoredEmailIsNormalised:
    """`users.email`에 대소문자만 다른 두 행이 생기면 **이메일로 찾는 모든 코드가
    갈린다.** 이 저장소는 그 갈림을 한 번 고쳤고, 구글 경로는 원문을 넣을 수 있는
    자리였다."""

    def test_a_mixed_case_address_is_stored_folded(self, monkeypatch, accounts):
        address = f"Mixed-{uuid.uuid4().hex[:6]}@Example.Test"
        subject, _ = login(monkeypatch, email=address)
        accounts.append(subject)
        assert stored(subject)["email"] == modelmate.normalize_email(address)
        assert stored(subject)["email"] != address


class TestThePromotionIsRecorded:
    def test_a_new_admin_leaves_a_security_event(self, monkeypatch, accounts):
        """**통제가 작동한 순간이 어디에도 남지 않는 것**을 이 저장소는 한 번 고쳤다.
        관리자 계정이 생기는 것은 그 순간 중 하나다."""
        address = f"recorded-{uuid.uuid4().hex[:6]}@example.test"
        monkeypatch.setenv("ADMIN_EMAILS", address)
        before = self.events()
        subject, _ = login(monkeypatch, email=address)
        accounts.append(subject)
        assert self.events() > before

    def events(self) -> int:
        conn = modelmate.get_db()
        try:
            row = conn.execute(
                "SELECT COUNT(*) AS n FROM monitoring_events WHERE event_type LIKE 'auth.admin%'"
            ).fetchone()
        finally:
            conn.close()
        return row["n"] if row else 0


class TestTheChecksAreNotVacuous:
    def test_the_admin_list_is_not_empty(self):
        assert modelmate.get_admin_emails()

    def test_the_fake_verifier_is_actually_used(self, monkeypatch, accounts):
        """진짜 구글을 부르고 있었다면 이 테스트들은 네트워크에서 실패했을 것이다.
        바꿔치기가 실제로 걸리는지 확인한다."""
        marker = f"marker-{uuid.uuid4().hex[:6]}@example.test"
        subject, _ = login(monkeypatch, email=marker)
        accounts.append(subject)
        assert stored(subject)["email"] == marker


class TestAnEmailThatIsAlreadyTaken:
    """**여기서 진짜 결함이 나왔다.**

    비밀번호로 가입한 이메일과 같은 주소로 구글 로그인을 하면 `users_email_ci` 유니크
    인덱스가 INSERT를 거절한다. 예전 코드는 그 예외를 그대로 올렸고 — 500 —
    **`conn.close()`가 마지막 줄에 있어 연결이 열린 채 남았다.** sqlite는 그 연결이
    쥔 쓰기 잠금을 놓지 않으므로 **그 뒤 이 프로세스의 모든 쓰기가 `database is
    locked`로 죽는다.** 2026-08-23에 재현했다: 한 번 부딪히면 그 뒤 아무것도 못 썼다.

    `try/finally`는 이 저장소의 관행이었다 — `052_workspace_projects.part`가 아홉 곳,
    `097_pilot_inquiries.part`가 세 곳에서 쓴다. **이 파일에만 없었다.**

    두 계정을 잇는 것은 여기서 결정하지 않는다. 이메일 소유 증명 없이 이으면 계정
    탈취 경로가 되고, 로그인 핸들러가 조용히 내릴 결정이 아니다.
    """

    def taken(self, accounts) -> str:
        address = f"taken-{uuid.uuid4().hex[:6]}@example.test"
        identifier = f"password-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            conn.execute(
                "INSERT INTO users (id, email, name, role, created_at) VALUES (?,?,?,?,?)",
                (identifier, address, "기존", "user", "2026-08-23T00:00:00"))
            conn.commit()
        finally:
            conn.close()
        accounts.append(identifier)
        return address

    def test_it_is_refused_with_a_reason(self, monkeypatch, accounts):
        address = self.taken(accounts)
        with pytest.raises(HTTPException) as raised:
            login(monkeypatch, email=address)
        assert raised.value.status_code == 409
        assert raised.value.detail["code"] == "email_already_registered"

    def test_the_database_is_still_writable_afterwards(self, monkeypatch, accounts):
        """**이것이 진짜 피해다.** 거부 자체보다, 거부한 뒤에 남는 잠금이 문제였다."""
        address = self.taken(accounts)
        with pytest.raises(HTTPException):
            login(monkeypatch, email=address)
        conn = modelmate.get_db()
        try:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("COMMIT")
        finally:
            conn.close()

    def test_no_second_account_was_created(self, monkeypatch, accounts):
        address = self.taken(accounts)
        with pytest.raises(HTTPException):
            login(monkeypatch, email=address)
        conn = modelmate.get_db()
        try:
            rows = conn.execute("SELECT COUNT(*) AS n FROM users WHERE lower(email)=?",
                                (modelmate.normalize_email(address),)).fetchone()
        finally:
            conn.close()
        assert rows["n"] == 1


class TestTheConnectionIsClosedOnEveryPath:
    """`finally`는 **이 검사들이 닿지 못하는 경로**를 위한 것이다. 그렇게 적어둔다.

    재현했던 잠금은 실패한 INSERT가 연 암묵 트랜잭션에서 왔다. 이제 충돌을 먼저
    잡으므로 409 경로는 쓰기를 시작하지 않고, **연결이 남아도 잠그지 않는다** —
    `finally`를 빼고 돌려봐도 위 검사들은 전부 통과한다.

    그래서 여기서는 구조를 본다. 약한 검사인 것을 안다. 대신 **왜 약한지**를 적어두는
    것이 대안이다 — 억지로 도달하는 검사를 만들면 구현 세부를 고정하게 되고, 그건
    이 저장소가 `rank_agreement`에서 한 번 거절한 선택이다.
    """

    def source(self) -> str:
        return (ROOT / "backend" / "main_parts"
                / "050_columns_auth_defs.part").read_text(encoding="utf-8-sig")

    def test_the_handler_closes_in_a_finally(self):
        """**AST로 본다.** 처음엔 함수 시작부터 1,600자 창을 잘라 `try:`·`finally:`·
        `conn.close()`가 다 들어 있는지 봤는데, 창이 옆 함수까지 덮어서 `finally`를
        지워도 통과했다. 텍스트 창은 경계를 모른다 — 이 저장소가 파서를 손으로 만들다
        여섯 번 틀린 것과 같은 자리다."""
        import ast

        tree = ast.parse(self.source())
        handler = next(node for node in ast.walk(tree)
                       if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                       and node.name == "auth_google")
        closed_in_finally = [
            node for node in ast.walk(handler)
            if isinstance(node, ast.Try)
            and any("conn.close()" in ast.unparse(statement) for statement in node.finalbody)
        ]
        assert closed_in_finally, "auth_google이 `finally`에서 연결을 닫지 않는다"

    def test_the_rest_of_the_codebase_already_did_this(self):
        """이 파일에만 없던 관행이다. 그 사실이 이 수정의 근거이므로 함께 고정한다."""
        parts = ROOT / "backend" / "main_parts"
        for name in ("052_workspace_projects.part", "097_pilot_inquiries.part"):
            body = (parts / name).read_text(encoding="utf-8-sig")
            assert body.count("finally:") >= 3, name
