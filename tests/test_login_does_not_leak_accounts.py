"""거절이 필요 이상을 말하는가.

`/api/auth/login`은 두 갈래 모두에 같은 메시지를 준다 — "이메일 또는 비밀번호가
올바르지 않습니다". 메시지는 같았고 **시간이 달랐다.**

계정이 없으면 즉시 400. 있으면 pbkdf2 26만 회를 돌고 400. 2026-08-22에 HTTP로 쟀다
(각 25회 중앙값):

    존재하는 계정 · 틀린 비밀번호   280.3ms
    없는 계정                     10.3ms
    차이                        +270.0ms  (27배)

**270ms는 네트워크 잡음에 묻히지 않는다.** 메시지를 같게 맞춰놓고 응답 시간이 답을
알려주는 상태였다 — 계정 목록을 확인하는 데 필요한 것은 스톱워치뿐이었다.

계정이 없을 때도 가짜 해시로 같은 계산을 돌린다. 버리는 계산이지만, 버리지 않으면
계정 목록이 새어 나간다. 고친 뒤 같은 측정: 293.3ms 대 284.4ms, **1.03배.**

**남은 차이는 인정한다.** 8.9ms는 DB 행을 읽는 비용이고 이 방식으로는 0이 되지
않는다. 27배와 1.03배는 다른 이야기이고, 여기서 멈추는 이유를 적어두는 것이 0이라고
말하는 것보다 낫다.

**가입은 다르다.** `/api/auth/signup`은 "이미 사용 중인 이메일입니다"로 계정 존재를
**명시적으로** 알려준다. 그것은 새는 것이 아니라 고른 것이다 — 감추려면 가입을 항상
200으로 끝내고 메일로 알려야 하는데, 이 앱에는 메일 발송이 없다. 감출 수 없는 것을
감춘 척하면 사용자만 혼란스럽다. `docs/security-notes.md`에 그렇게 적었다.

이 파일은 **기전**을 고정한다. 시간 측정 자체를 CI에 넣으면 부하에 따라 들쭉날쭉해
사람들이 꺼버리는 검사가 된다. 위 수치는 기록이고, 여기서 지키는 것은 "두 갈래가
같은 계산을 한다"는 성질이다.
"""

import statistics
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"
LOGIN_SOURCE = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
LOGIN_BODY = LOGIN_SOURCE[LOGIN_SOURCE.index('@app.post("/api/auth/login")'):]
LOGIN_BODY = LOGIN_BODY[:LOGIN_BODY.index("\n@app.")]


class TestBothBranchesDoTheSameWork:
    def test_the_dummy_hash_exists(self):
        assert isinstance(modelmate.DUMMY_PASSWORD_HASH, str)
        assert "$" in modelmate.DUMMY_PASSWORD_HASH

    def test_verifying_against_it_fails(self):
        """통과해버리면 아무 비밀번호로나 로그인된다 — 고치려던 것보다 훨씬 나쁘다."""
        assert not modelmate.verify_password("anything", modelmate.DUMMY_PASSWORD_HASH)
        assert not modelmate.verify_password("", modelmate.DUMMY_PASSWORD_HASH)

    def test_the_missing_account_branch_still_verifies(self):
        assert "verify_password(body.password, DUMMY_PASSWORD_HASH)" in LOGIN_BODY

    def test_it_happens_before_the_refusal(self):
        """거절 뒤에 두면 실행되지 않는다 — 있는데 안 도는 계산."""
        branch = LOGIN_BODY[LOGIN_BODY.index('if not row or not row["password_hash"]:'):]
        assert branch.index("DUMMY_PASSWORD_HASH") < branch.index("raise HTTPException")

    def test_both_branches_give_the_same_message(self):
        """시간을 맞춰놓고 메시지가 다르면 아무 의미가 없다."""
        assert LOGIN_BODY.count("이메일 또는 비밀번호가 올바르지 않습니다") == 2


class TestTheCostsAreComparable:
    """기전이 실제로 같은 값을 치르는지. 원장이 아니라 함수 층에서 잰다 —
    HTTP로 재면 부하에 따라 흔들린다."""

    def elapsed(self, stored, rounds=5):
        times = []
        for _ in range(rounds):
            started = time.perf_counter()
            modelmate.verify_password("wrong-password", stored)
            times.append(time.perf_counter() - started)
        return statistics.median(times)

    def test_the_dummy_costs_about_the_same_as_a_real_hash(self):
        real = modelmate.hash_password("correct-horse")
        ratio = self.elapsed(modelmate.DUMMY_PASSWORD_HASH) / self.elapsed(real)
        assert 0.5 < ratio < 2.0, ratio

    def test_the_harness_would_notice_a_free_branch(self):
        """음성 대조. 계산을 건너뛰는 갈래가 어떤 모습인지 여기 남긴다 — 이 비율이
        1 근처로 나오면 위 검사는 아무것도 확인하지 않는다."""
        real = self.elapsed(modelmate.hash_password("correct-horse"))
        skipped = []
        for _ in range(5):
            started = time.perf_counter()
            pass  # 예전의 "계정 없음" 갈래
            skipped.append(time.perf_counter() - started)
        assert statistics.median(skipped) < real / 10


class TestTheDisclosuresThatRemainAreDeliberate:
    def test_signup_still_says_the_email_is_taken(self):
        """감추려면 메일 발송이 필요하고 이 앱에는 없다. 감출 수 없는 것을 감춘
        척하면 사용자만 혼란스럽다 — 고른 것이지 새는 것이 아니다."""
        assert "이미 사용 중인 이메일입니다" in LOGIN_SOURCE

    def test_that_choice_is_written_down(self):
        notes = (ROOT / "docs" / "security-notes.md").read_text(encoding="utf-8")
        assert "signup" in notes and "enumerat" in notes.lower()

    def test_the_login_message_does_not_name_which_half_failed(self):
        for phrase in ("등록되지 않은", "비밀번호가 틀렸", "존재하지 않는 계정"):
            assert phrase not in LOGIN_BODY


class TestTheChecksAreNotVacuous:
    def test_the_handler_source_was_actually_read(self):
        assert len(LOGIN_BODY) > 400
        assert "auth_login" in LOGIN_BODY

    def test_the_slice_stops_at_the_next_route(self):
        assert LOGIN_BODY.count("@app.post(") == 1

    def test_a_correct_password_still_verifies(self):
        """전부 거절하는 검증으로도 위 검사 대부분이 통과한다."""
        stored = modelmate.hash_password("correct-horse")
        assert modelmate.verify_password("correct-horse", stored)

    def test_the_dummy_is_not_a_real_password_hash_of_something_guessable(self):
        """누군가 `hash_password("")`로 만들어두면 빈 비밀번호로 로그인된다."""
        assert not modelmate.verify_password("", modelmate.DUMMY_PASSWORD_HASH)
        assert not modelmate.verify_password("password", modelmate.DUMMY_PASSWORD_HASH)
        assert not modelmate.verify_password("admin1234", modelmate.DUMMY_PASSWORD_HASH)
