"""한도가 동시 요청에서도 한도인가.

이 저장소의 사용량 한도는 전부 **읽고-판단하고-쓰기**를 나눠서 한다. `enforce_*`가
현재 값을 읽어 판단하고, 한참 뒤에 `increment_daily_usage`가 센다. 그 사이에 들어온
요청은 같은 값을 읽고 같은 판단을 한다.

**쟀다**(2026-08-22). 한도 10인 무료 계정에 동시 20건을 넣으니 **12건이 통과**하고
기록도 12가 됐다. 보고서 내보내기는 검사와 기록 사이에 보고서 생성이 통째로 들어가서
창이 가장 넓다 — 초 단위다.

이 파일이 고정하는 것은 `claim_daily_usage`다. 세는 것과 판단하는 것을 한 `UPDATE`로
한다: `WHERE ... AND COALESCE(열, 0) < 한도`. SQLite가 한 문장을 원자적으로 처리하므로
스레드 사이에서도 프로세스 사이에서도 초과가 없다. `rowcount`가 0이면 한도가 찬 것이다.

**진 쪽은 보고서를 만들어놓고 429를 받는다.** 일은 버려지지만 한도는 넘지 않는다.
반대로 하면(미리 세어두고 실패하면 되돌리기) 400으로 끝난 호출이 할당량을 먹는 경로가
생기고, 그건 실패를 벌로 만든다.

**나머지 한도는 아직 이 모양이 아니다.** 분석 작업·예측 API 호출은 여전히
`enforce_limit` 뒤에 `increment_daily_usage`를 부른다. 창은 훨씬 좁지만(행 하나
INSERT) 0은 아니다. 작업 쪽은 시작한 뒤에 거절하면 고아 작업이 남아서, 예약-후-실행
으로 바꾸는 것이 맞고 그건 작업 수명주기를 건드리는 별도 작업이다. 상태는
`work/ROADMAP.md`와 아래 `TestTheOtherCountersStillHaveTheGap`에 적어둔다.
"""

import concurrent.futures
import sys
import threading
import uuid
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"
CONCURRENCY = 20


@pytest.fixture
def free_user():
    """무료 요금제 사용자 하나. 요금제 이름을 짐작하지 않고 실제 값을 쓴다 —
    앞 회차에 없는 이름(`enterprise_mock`)을 짐작했다가 틀렸다."""
    user_id = str(uuid.uuid4())
    email = f"race-{user_id[:8]}@example.com"
    conn = modelmate.get_db()
    conn.execute(
        "INSERT INTO users (id, email, name, picture, password_hash, role, plan, created_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (user_id, email, "race", "", modelmate.hash_password("x"), "user", "free",
         "2026-08-22"),
    )
    conn.commit()
    conn.close()
    return {"sub": user_id, "email": email, "role": "user"}


def run_concurrently(action):
    """모든 스레드를 같은 지점에서 출발시킨다.

    처음에는 그냥 20개를 던졌다. 단독 실행에서는 음성 대조가 초과를 봤는데
    **전체 스위트에서는 못 봤다** — 다른 테스트가 돌고 있으면 스케줄링이 달라져
    나눠 읽고 쓰는 방식도 우연히 직렬로 실행된다. 대조가 어떤 날은 통과하고 어떤
    날은 실패하면, 통과한 날의 다른 검사들이 무엇을 확인했는지 알 수 없다.

    `Barrier`로 경합 지점을 고정한다. 타이밍에 기대지 않는다.
    """
    barrier = threading.Barrier(CONCURRENCY, timeout=60)

    def synchronised(index):
        barrier.wait()
        return action(index)

    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        return Counter(pool.map(synchronised, range(CONCURRENCY)))


class TestTheLimitHoldsUnderConcurrency:
    def test_exactly_the_limit_gets_through(self, free_user):
        limit = modelmate.get_plan_limits(free_user)["max_report_exports_per_day"]
        assert limit < CONCURRENCY, "동시 요청 수가 한도보다 많아야 초과를 볼 수 있다"

        def attempt(_):
            try:
                modelmate.enforce_report_export_limit(free_user)
            except Exception:
                return "선검사에서 거부"
            try:
                modelmate.record_report_export(free_user)
            except Exception:
                return "기록에서 거부"
            return "통과"

        outcomes = run_concurrently(attempt)
        assert outcomes["통과"] == limit, outcomes

    def test_the_recorded_count_never_passes_the_limit(self, free_user):
        limit = modelmate.get_plan_limits(free_user)["max_report_exports_per_day"]
        run_concurrently(lambda _: modelmate.claim_daily_usage(
            free_user["sub"], "report_exports_today", limit))
        usage = modelmate.get_account_usage(free_user)
        assert usage["report_exports_today"] == limit

    def test_a_refused_claim_does_not_count(self, free_user):
        """거절이 값을 올리면, 거절당한 사람이 다음 날까지 더 깊이 막힌다."""
        for _ in range(3):
            assert modelmate.claim_daily_usage(free_user["sub"], "report_exports_today", 3)
        before = modelmate.get_account_usage(free_user)["report_exports_today"]
        assert not modelmate.claim_daily_usage(free_user["sub"], "report_exports_today", 3)
        assert modelmate.get_account_usage(free_user)["report_exports_today"] == before


class TestUnlimitedIsNotZero:
    def test_none_means_unlimited(self, free_user):
        """`None`과 0을 헷갈리면 무제한 요금제가 가장 좁은 요금제가 된다."""
        outcomes = run_concurrently(lambda _: modelmate.claim_daily_usage(
            free_user["sub"], "report_exports_today", None))
        assert outcomes[True] == CONCURRENCY

    def test_zero_means_zero(self, free_user):
        assert not modelmate.claim_daily_usage(free_user["sub"], "report_exports_today", 0)

    def test_an_unknown_key_is_not_silently_counted(self, free_user):
        """세는 열이 없는 키는 통과시킨다 — 조용히 막으면 원인을 찾을 수 없다."""
        assert modelmate.claim_daily_usage(free_user["sub"], "no_such_counter", 0)


class TestTheTestCanActuallySeeAnOverrun:
    """음성 대조. 이 하네스가 초과를 **볼 수 있는지** 먼저 확인한다.

    확인 없이 "정확히 10건 통과"만 보면, 동시성이 실제로 일어나지 않았을 때도 같은
    결과가 나온다. 이 프로젝트가 이미 빠진 함정이다 — 시크릿 스캐너의 정규식 에러가
    빈 출력을 냈고 그게 "깨끗함"으로 읽혔다.
    """

    def test_the_old_check_then_increment_shape_overruns(self, free_user):
        limit = modelmate.get_plan_limits(free_user)["max_report_exports_per_day"]
        # 읽기와 쓰기 **사이**에 장벽을 둔다. 전부 읽은 뒤에 전부 쓰는 상황을
        # 만들어야 초과가 타이밍 운이 아니라 확정이 된다. 실제 엔드포인트에서는
        # 이 자리에 보고서 생성이 통째로 들어간다 - 초 단위 창이다.
        barrier = threading.Barrier(CONCURRENCY, timeout=60)

        def naive(_):
            usage = modelmate.get_account_usage(free_user)
            barrier.wait()
            if usage["report_exports_today"] >= limit:
                return "거부"
            modelmate.increment_daily_usage(free_user["sub"], "report_exports_today")
            return "통과"

        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
            outcomes = Counter(pool.map(naive, range(CONCURRENCY)))
        assert outcomes["통과"] > limit, (
            f"나눠 읽고 쓰는 방식이 초과하지 않았다({outcomes}) — 동시성이 실제로 "
            f"일어나지 않았다는 뜻이고, 그러면 위 검사들도 아무것도 확인하지 않는다."
        )


class TestTheOtherCountersStillHaveTheGap:
    """아직 안 고친 것을 적어둔다. 고치는 날 이 테스트가 실패하고, 그때 위 문서와
    `work/ROADMAP.md`를 함께 고치게 된다."""

    def test_jobs_and_prediction_calls_still_increment_separately(self):
        callers = sorted(
            path.name for path in PARTS.glob("*.part")
            if "increment_daily_usage(" in path.read_text(encoding="utf-8-sig")
            and "def increment_daily_usage" not in path.read_text(encoding="utf-8-sig")
        )
        assert callers == ["045_agent_runs.part", "055_training_jobs.part",
                           "088_prediction_tokens.part"], callers

    def test_report_export_no_longer_does(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        body = source[source.index("def record_report_export"):]
        body = body[:body.index("\ndef ")] if "\ndef " in body else body
        assert "claim_daily_usage" in body
        assert "increment_daily_usage" not in body
