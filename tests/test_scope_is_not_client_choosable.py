"""클라이언트가 자기 버킷을 고를 수 있는가.

`STATE`의 버킷은 `get_current_user`가 돌려주는 `sub`로 정해진다. 계정은 서버가 만든
식별자이고, 데모 게스트는 **클라이언트가 보낸 헤더**(`x-modelmate-guest-session`)에서
나온다. 그래서 "클라이언트는 스코프를 지정하지 않는다"는 말은 절반만 맞다 — 게스트
쪽은 클라이언트가 문자열을 고르고, 서버는 그것을 `guest:` 아래로 밀어넣는다.

지키는 것은 **격리**이지 "클라이언트가 아무것도 못 고른다"가 아니다. 게스트는 다른
게스트 세션 id를 알면 그 상태를 본다 — 세션 식별자란 원래 그런 것이고 쿠키와 다르지
않다. 무너지면 안 되는 것은 다음 둘이다:

  - 게스트가 **계정** 사용자의 버킷에 닿는 것
  - 게스트가 **공유 기본** 버킷에 닿는 것 (요청별 격리를 도입한 이유가 그 버킷을
    없애는 것이었다)

접두사와 문자 정제가 그 둘을 막는다. 계정 스코프는 UUID라 콜론이 없고, 게스트
스코프는 반드시 `guest:`로 시작하며, 정제가 콜론을 지운다 — 그래서 `guest:` 뒤에
무엇이 오든 UUID와 같아질 수 없다.

시험된 적이 없었다. 두 게스트가 서로 다른 스코프를 받는다는 것은 고정돼 있었지만,
**클라이언트가 남의 버킷에 닿을 수 없다**는 쪽은 없었다.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402
from backend.scoped_state import DEFAULT_SCOPE, scope_for_user  # noqa: E402

ACCOUNT = {"sub": "66262d2a-18fe-463b-b289-4050d5e82e35", "email": "a@example.com"}


def guest_scope(header: str) -> str:
    """서버가 그 헤더에 대해 실제로 고르는 스코프."""
    return scope_for_user(modelmate.get_current_user(None, header))


class TestAGuestCannotReachAnAccount:
    @pytest.mark.parametrize("header", [
        "66262d2a-18fe-463b-b289-4050d5e82e35",   # 계정 id 그대로
        "../66262d2a-18fe-463b-b289-4050d5e82e35",  # 경로 흉내
        "guest:66262d2a-18fe-463b-b289-4050d5e82e35",  # 접두사 흉내
        "66262d2a-18fe-463b-b289-4050d5e82e35\x00",    # 널 바이트
        "66262d2a-18fe-463b-b289-4050d5e82e35 ",       # 뒤 공백
    ])
    def test_no_header_lands_in_the_account_bucket(self, header):
        assert guest_scope(header) != scope_for_user(ACCOUNT)

    @pytest.mark.parametrize("header", ["__default__", "", "   ", "guest:__default__"])
    def test_no_header_lands_in_the_shared_default(self, header):
        """기본 버킷은 요청별 격리가 없애려던 바로 그 버킷이다. 빈 헤더는 게스트가
        아니므로 인증되지 않은 요청과 같이 기본으로 가는 것이 맞다 - 그것과
        '게스트라고 주장하면서 기본에 들어가는 것'은 다르다."""
        scope = guest_scope(header)
        if header.strip():
            assert scope != DEFAULT_SCOPE
        assert scope == DEFAULT_SCOPE or scope.startswith("guest:")

    def test_every_guest_scope_is_namespaced(self):
        for header in ("abc", "../x", "guest:y", "A" * 200, "1;drop"):
            assert guest_scope(header).startswith("guest:")

    def test_the_account_scope_has_no_colon_so_the_namespaces_cannot_meet(self):
        """이것이 격리가 성립하는 이유다. 계정 식별자에 콜론이 생기는 날
        `guest:` 접두사만으로는 부족해진다."""
        assert ":" not in scope_for_user(ACCOUNT)


class TestGuestsAreSeparatedFromEachOther:
    def test_two_sessions_get_two_buckets(self):
        assert guest_scope("session-one") != guest_scope("session-two")

    def test_the_same_session_gets_the_same_bucket(self):
        """갈리기만 하고 안정적이지 않으면 게스트는 매 요청 상태를 잃는다."""
        assert guest_scope("session-one") == guest_scope("session-one")

    def test_sanitising_can_make_two_headers_collide(self):
        """정제가 문자를 지우므로 서로 다른 헤더가 같은 스코프가 될 수 있다.
        세션 식별자로서는 받아들일 만하고 - 쿠키를 훔쳐 쓰는 것과 같다 - 계정
        격리와는 무관하다. 감춰두는 것보다 적어두는 편이 낫다."""
        assert guest_scope("abc") == guest_scope("a:b:c")


class TestTheCheckIsNotVacuous:
    def test_a_guest_header_produces_a_scope_at_all(self):
        """`get_current_user`가 게스트를 못 만들면 위 검사들은 전부 기본 스코프를
        비교하며 통과한다."""
        assert guest_scope("abc") == "guest:abc"

    def test_an_account_produces_its_own_scope(self):
        assert scope_for_user(ACCOUNT) == ACCOUNT["sub"]

    def test_a_non_user_falls_to_the_default(self):
        assert scope_for_user(None) == DEFAULT_SCOPE
        assert scope_for_user("not-a-dict") == DEFAULT_SCOPE
