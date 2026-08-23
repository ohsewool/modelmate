"""인증 이전 경로에 한도가 없었다 — 그리고 내가 그 표면을 넓혔다.

이 앱의 다른 모든 한도는 **계정에** 걸린다. 로그인·가입·구글 로그인은 계정이
정해지기 전이라 아무 한도도 없었다.

그 자체로도 문제지만, 바로 앞 회차에 내가 더 나쁘게 만들었다. 로그인 응답 시간이
계정 존재를 알려주는 것을 고치면서(280ms 대 10ms), **없는 계정에도 pbkdf2 26만 회를
돌게 했다.** 전에는 실재하는 계정을 알아야 비쌌고 이제는 아무 문자열이나 같은 값을
치른다.

2026-08-22에 쟀다:

| | `/api/state` 중앙값 |
|---|---|
| 평시 | 3.1ms |
| 인증 없는 로그인 60건(동시 12) 중 | **1,844.9ms (603배)** |

앱이 사실상 멈춘다. 60건이다.

**시간차를 되돌리지는 않았다** — 그건 진짜 누출이었다. 필요한 것은 애초에 있었어야
할 조임이다. IP당 분당 시도 수를 묶는다. 같은 조건에서 다시: 17.8초 → 3.4초,
603배 → **18.9배**, 응답은 400 열 건과 429 쉰 건.

**남은 18.9배도 적어둔다.** 허용한 10건이 각자 pbkdf2를 도는 동안의 지연이고,
지속 부하는 IP당 분당 CPU 2.8초로 묶인다. 0이 아니라 **경계가 생긴 것**이다.

한계 둘을 코드와 여기 함께 적었다. **한 프로세스 안에서만** 센다 — 워커가 여럿이면
각자 자기 통을 갖는다. 그리고 `X-Forwarded-For`를 **믿지 않는다** — 호출자가 직접
채우는 헤더라 그것으로 세면 헤더만 바꿔가며 무한히 통과한다. 프록시 뒤에서는 여러
사용자가 한 칸을 나눠 쓰는데, 그 방향의 실패는 조이는 쪽이다.
"""

import re
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


def request_from(host):
    return SimpleNamespace(client=SimpleNamespace(host=host), headers={})


@pytest.fixture(autouse=True)
def clean_buckets():
    modelmate._AUTH_ATTEMPTS.clear()
    yield
    modelmate._AUTH_ATTEMPTS.clear()


class TestTheThrottleHolds:
    def test_the_limit_is_the_limit(self):
        limit = modelmate.AUTH_ATTEMPT_LIMIT
        for _ in range(limit):
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.1"))
        with pytest.raises(Exception) as caught:
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.1"))
        assert caught.value.status_code == 429
        assert caught.value.detail["code"] == "auth_attempts_exceeded"

    def test_it_says_when_to_come_back(self):
        """언제 다시 오라는 말이 없으면 클라이언트는 계속 두드린다."""
        for _ in range(modelmate.AUTH_ATTEMPT_LIMIT):
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.2"))
        with pytest.raises(Exception) as caught:
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.2"))
        assert 0 < caught.value.detail["retry_after_seconds"] <= 61

    def test_one_caller_does_not_spend_another_callers_budget(self):
        """전역 카운터면 한 사람이 전부를 막을 수 있다."""
        for _ in range(modelmate.AUTH_ATTEMPT_LIMIT):
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.3"))
        modelmate.enforce_auth_attempt_limit(request_from("10.0.0.4"))

    def test_the_window_slides(self, monkeypatch):
        """창이 지나면 다시 쓸 수 있어야 한다. 아니면 한 번 걸린 사람은 영영 막힌다."""
        for _ in range(modelmate.AUTH_ATTEMPT_LIMIT):
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.5"))
        later = time.time() + modelmate.AUTH_ATTEMPT_WINDOW + 1
        monkeypatch.setattr(modelmate.time, "time", lambda: later)
        modelmate.enforce_auth_attempt_limit(request_from("10.0.0.5"))


class TestTheHeaderIsNotTrusted:
    def test_a_forwarded_header_does_not_create_a_new_bucket(self):
        """`X-Forwarded-For`로 세면 헤더만 바꿔가며 무한히 통과한다."""
        for _ in range(modelmate.AUTH_ATTEMPT_LIMIT):
            modelmate.enforce_auth_attempt_limit(request_from("10.0.0.6"))
        spoofed = SimpleNamespace(client=SimpleNamespace(host="10.0.0.6"),
                                  headers={"X-Forwarded-For": "1.2.3.4"})
        with pytest.raises(Exception) as caught:
            modelmate.enforce_auth_attempt_limit(spoofed)
        assert caught.value.status_code == 429

    def test_the_source_reads_the_peer_address(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        body = source[source.index("def _auth_client_key"):]
        body = body[:body.index("\ndef ", 1)]
        assert "request.client" in body or 'getattr(client, "host"' in body
        assert "X-Forwarded-For" not in body.replace("`X-Forwarded-For`", "")


class TestItIsWiredWhereItMatters:
    @pytest.mark.parametrize("part_name,route", [
        ("051_auth_history_debug.part", "/api/auth/login"),
        ("051_auth_history_debug.part", "/api/auth/signup"),
        ("050_columns_auth_defs.part", "/api/auth/google"),
    ])
    def test_the_handler_calls_it(self, part_name, route):
        text = (PARTS / part_name).read_text(encoding="utf-8-sig")
        start = text.index(f'@app.post("{route}")')
        rest = text[start + 1:]
        end = rest.find("\n@app.")
        body = text[start:] if end == -1 else text[start:start + 1 + end]
        assert "enforce_auth_attempt_limit" in body, route

    def test_login_throttles_before_it_hashes(self):
        """해싱 뒤에 두면 조임이 막으려던 계산이 이미 끝나 있다.

        **주석을 걷어내고 본다.** 처음엔 원문에서 위치를 비교했는데 조임 바로 위에
        내가 쓴 주석이 `verify_password`를 인용하고 있어서 실패했다 — 인용과 사용을
        구분하지 못한 것이다. 이 저장소들에서 세 번째로 같은 함정에 빠졌다
        (`AGENTS.md`의 "HotpotQA", 공개된 기본 비밀값 검사).
        """
        text = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        body = text[text.index('@app.post("/api/auth/login")'):]
        body = body[:body.index("\n@app.")]
        executable = "\n".join(re.sub(r"#.*$", "", line) for line in body.splitlines())
        assert "verify_password" in executable, "주석을 걷어내니 코드가 남지 않았다"
        assert executable.index("enforce_auth_attempt_limit") < executable.index("verify_password")


class TestTheBucketsDoNotGrowForever:
    def test_stale_callers_are_dropped(self, monkeypatch):
        """IP 하나당 항목 하나가 영원히 쌓이면 조임이 메모리 누수가 된다."""
        for index in range(50):
            modelmate.enforce_auth_attempt_limit(request_from(f"10.1.0.{index}"))
        assert len(modelmate._AUTH_ATTEMPTS) == 50
        later = time.time() + modelmate.AUTH_ATTEMPT_WINDOW + 1
        monkeypatch.setattr(modelmate.time, "time", lambda: later)
        modelmate.enforce_auth_attempt_limit(request_from("10.2.0.1"))
        assert len(modelmate._AUTH_ATTEMPTS) == 1


class TestTheChecksAreNotVacuous:
    def test_a_first_attempt_is_allowed(self):
        """전부 거절하는 조임으로도 위 검사 대부분이 통과한다."""
        modelmate.enforce_auth_attempt_limit(request_from("10.3.0.1"))

    def test_the_limit_is_a_real_number(self):
        """0이나 음수면 조임이 꺼진 것이고, 위 검사들은 그때 실패한다 —
        그 사실을 여기서 분명히 해둔다."""
        assert modelmate.AUTH_ATTEMPT_LIMIT > 0

    def test_setting_it_to_zero_turns_it_off(self, monkeypatch):
        """끄는 방법이 있어야 한다. 다만 끄면 꺼진다는 것을 알고 끄게 한다."""
        monkeypatch.setattr(modelmate, "AUTH_ATTEMPT_LIMIT", 0)
        for _ in range(100):
            modelmate.enforce_auth_attempt_limit(request_from("10.4.0.1"))

    def test_an_unknown_peer_still_gets_counted(self):
        """`request.client`가 없을 때 통과시키면 그 경로가 우회로가 된다."""
        anonymous = SimpleNamespace(client=None, headers={})
        for _ in range(modelmate.AUTH_ATTEMPT_LIMIT):
            modelmate.enforce_auth_attempt_limit(anonymous)
        # 같은 파일의 다른 셋은 `caught.value.status_code`까지 본다. 여기만
        # **무엇이 왔는지 안 묻고** 있었다 — 한 파일 안에서 규칙이 갈렸다.
        with pytest.raises(Exception) as caught:
            modelmate.enforce_auth_attempt_limit(anonymous)
        assert caught.value.status_code == 429
