"""요금제에 걸린 한도가 실제로 걸리는가.

`PLAN_LIMITS`의 모든 요금제가 `max_report_exports_per_day`를 갖고 있고(free 10,
pro 100, team 500), 사용량 테이블에 `report_exports_count` 열이 있고, `checkQuota`가
`report_export` 액션을 그 한도에 매핑하고, `docs/pricing.md`가 보고서 내보내기를
요금제 항목으로 싣는다.

**그런데 세는 곳도 막는 곳도 없었다.** `increment_daily_usage`는 `jobs_today`와
`prediction_api_calls_today`로만 불렸고, `enforce_limit`은 이 키로 한 번도 불린 적이
없다. `/api/report/html`은 사용자 인자조차 받지 않았다 - 누가 부르는지도 모르는데
그 사람의 한도를 볼 수는 없다.

한도 표·DB 열·요금제 문서까지 갖춰두고 **강제만 빠진** 상태였다. 이 프로젝트가
처음 만난 결함과 같은 모양이다: `access.py`에 권한 헬퍼가 전부 있었고 `ledger.py`가
하나도 import하지 않았다.

찾은 경로도 그 모양이었다. `checkQuota` 자체를 **아무도 부르지 않는다** — 같은
질문("이 사용자가 이 행동을 해도 되는가")에 답하는 구현이 둘인데 하나만 배선돼
있고, 배선된 `enforce_*` 쪽이 `report_export`를 몰랐다. 둘이 아는 한도 키가 서로
다르다는 것이 단서였다.

신원이 없으면 통과시킨다. 게스트·미인증 경로는 계정 사용량이라는 개념이 없고,
거기서 막으면 데모가 깨진다 — 다른 `enforce_*`와 같은 규칙이다.
"""

import sys
from pathlib import Path

import pytest

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


def part_source(name: str) -> str:
    """`.part` 파일 원문.

    `backend.main`은 import 시점에 조각을 이어 붙여 만들어지므로
    `inspect.getsource`가 통하지 않는다 - 함수에 대응하는 실제 파일이 없다.
    처음에 그걸로 썼다가 `OSError: could not get source code`로 세 개가 깨졌다.
    """
    found = [path for path in sorted(PARTS.glob("*.part")) if name in path.name]
    assert found, f"{name}에 해당하는 조각을 찾지 못했다"
    return found[0].read_text(encoding="utf-8-sig")


@pytest.fixture
def limits():
    return modelmate.PLAN_LIMITS


class TestTheLimitIsDeclaredEverywhere:
    def test_every_plan_names_it(self, limits):
        for plan, values in limits.items():
            assert "max_report_exports_per_day" in values, plan

    def test_the_free_plan_is_the_tightest(self, limits):
        """무제한 요금제는 `None`이다. 그것과 0을 헷갈리면 유료 사용자가 막힌다."""
        free = limits["free"]["max_report_exports_per_day"]
        assert isinstance(free, int) and free > 0
        assert limits["admin"]["max_report_exports_per_day"] is None

    def test_the_usage_table_has_a_column_for_it(self):
        assert "report_exports_count" in part_source("008_usage_limits")


class TestTheEnforcementExistsAndIsWired:
    """고친 것. 예전에는 함수 자체가 없었다."""

    def test_the_enforcement_function_exists(self):
        assert callable(modelmate.enforce_report_export_limit)
        assert callable(modelmate.record_report_export)

    def test_the_endpoint_takes_a_user(self):
        """사용자를 받지 않으면 누구의 한도인지 알 수 없다. 예전 서명에는
        `autoprint` 하나뿐이었다."""
        import inspect

        assert "user" in inspect.signature(modelmate.html_report).parameters

    def test_the_endpoint_calls_the_enforcement(self):
        source = part_source("060_state_report_a") + part_source("061_report_b")
        assert "enforce_report_export_limit" in source
        assert "record_report_export" in source

    def test_nothing_is_counted_for_an_anonymous_caller(self):
        """게스트·미인증은 계정 사용량이라는 개념이 없다. 여기서 막으면 데모가
        깨지고, 세면 아무 계정에도 속하지 않는 숫자가 쌓인다."""
        modelmate.enforce_report_export_limit(None)      # 예외가 나지 않아야 한다
        modelmate.record_report_export(None)


class TestTheTwoImplementationsDisagreed:
    """이 결함을 찾은 단서를 그대로 남긴다.

    `checkQuota`는 아무도 부르지 않는 두 번째 구현이고, 배선된 `enforce_*`와 아는
    한도 키가 다르다. 둘 다 "이 사용자가 이 행동을 해도 되는가"에 답한다.
    """

    def test_the_unused_implementation_knows_this_action(self):
        assert "report_export" in part_source("008_usage_limits")

    def test_and_it_is_still_called_by_nothing(self):
        """배선하는 날 이 테스트가 실패하고, 그때 두 구현 중 하나를 고르게 된다.
        같은 질문에 답하는 장치를 둘 두는 것이 이 프로젝트의 단골 결함이다."""
        backend = ROOT / "backend"
        callers = [
            path.name
            for path in sorted(backend.rglob("*"))
            if path.suffix in {".py", ".part"}
            and "checkQuota" in path.read_text(encoding="utf-8-sig", errors="replace")
            and "def checkQuota" not in path.read_text(encoding="utf-8-sig", errors="replace")
        ]
        assert not callers, f"{callers}가 이제 checkQuota를 쓴다 — 어느 쪽이 권위인지 정하라"


class TestTheCheckIsNotVacuous:
    def test_the_limit_is_a_real_number_not_none_for_free(self, limits):
        """free가 `None`이면 위 검사들이 전부 통과하면서 아무도 막히지 않는다."""
        assert limits["free"]["max_report_exports_per_day"] is not None

    def test_enforce_limit_raises_when_over(self):
        """강제 함수가 **무엇을** 내는지까지 묻는다.

        원래는 `pytest.raises(Exception)`이었다. 그건 `TypeError`도, 오타로 생긴
        `NameError`도 통과시킨다 — **예외판 `!= `이고, 무엇이 왔는지 묻지 않는다.**
        도구로 재보니 이 검사가 지나는 `raise`를 599로 바꿔도 초록불이었다:
        이름은 "raises when over"인데 무엇을 raise하는지는 확인한 적이 없다.
        """
        with pytest.raises(HTTPException) as caught:
            modelmate.enforce_limit({"sub": "u1", "role": "user"},
                                    "max_report_exports_per_day", 999,
                                    "테스트")
        assert caught.value.status_code == 429
        assert caught.value.detail["code"] == "usage_limit_exceeded"
        assert caught.value.detail["limit_key"] == "max_report_exports_per_day"

    def test_enforce_limit_is_quiet_when_under(self):
        modelmate.enforce_limit({"sub": "u1", "role": "user"},
                                "max_report_exports_per_day", 0, "테스트")

class TestTheExportItselfRefusesWhenTheDayIsSpent:
    """`record_report_export`의 429. **도구가 찾아낸 두 번째 자리다.**

    이 줄을 지나는 검사는 하나 있었는데(`test_exactly_the_limit_gets_through`),
    그 검사가 보는 것은 **정확히 한도만큼 통과하는가**이지 그다음 하나가 어떻게
    거절되는가가 아니다. 지나가는 것과 확인하는 것은 다르다.

    `enforce_limit`과 이것은 다른 자리다. 앞의 것은 세어보고 미리 막고, 이것은
    **실제로 하루치를 집어 든 다음** 실패하면 막는다 — 그 순서가
    `record_report_export`의 독스트링이 설명하는 설계다(미리 세고 되돌리면
    400으로 끝난 호출이 할당량을 먹는다).
    """

    @pytest.fixture
    def spent_user(self):
        import uuid
        user = {"sub": f"export-{uuid.uuid4().hex[:8]}",
                "email": f"{uuid.uuid4().hex[:6]}@export.test", "role": "user"}
        limit = modelmate.get_plan_limits(user)["max_report_exports_per_day"]
        assert limit and limit > 0, "한도가 없으면 이 검사는 아무것도 확인하지 않는다"
        for _ in range(limit):
            modelmate.record_report_export(user)
        return user, limit

    def test_the_next_export_is_refused(self, spent_user):
        user, limit = spent_user
        with pytest.raises(HTTPException) as refused:
            modelmate.record_report_export(user)
        assert refused.value.status_code == 429
        assert refused.value.detail["limit_key"] == "max_report_exports_per_day"
        assert refused.value.detail["limit"] == limit

    def test_it_says_what_the_plan_allows(self, spent_user):
        """거절만 하고 한도를 안 알려주면 사용자가 요금제를 고를 수 없다."""
        user, limit = spent_user
        with pytest.raises(HTTPException) as refused:
            modelmate.record_report_export(user)
        assert refused.value.detail["current"] >= limit
        assert refused.value.detail["plan"]

    def test_exactly_the_limit_got_through(self, spent_user):
        """**되돌림 방향.** 처음부터 막는 구현이면 위 검사는 통과하지만 제품은
        망가진다. 픽스처가 한도만큼 성공했다는 것 자체가 그 확인이다."""
        user, limit = spent_user
        usage = modelmate.get_account_usage(user)
        assert usage["report_exports_today"] == limit

    def test_an_anonymous_caller_is_not_metered(self, spent_user):
        """로그인하지 않은 호출은 이 함수가 세지 않는다 — 셀 사람이 없다.
        조용히 통과하는 것이 여기서는 맞고, 그 사실을 적어둔다."""
        modelmate.record_report_export(None)
