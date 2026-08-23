"""이 저장소에는 시계가 둘이고, 두 시계의 값이 한 목록에서 만난다.

    datetime.now()      32곳   표시자 없음   2026-08-23T19:00:00.123456
    datetime.utcnow()    3곳   "Z" 붙음      2026-08-23T10:00:00Z
    time.time()          1곳   에폭          (한 프로세스 안에서만 쓰이고 저장되지 않는다)

셋 다 나름의 이유가 있다. 문제는 **둘이 같은 목록에서 만나는 자리**다.

`_project_runs`가 `experiments`(로컬 시계)와 `analysis_runs`(UTC 시계)를 합친 뒤
**문자열로** 정렬했다. 목록에는 "최신순"이라고 적혀 있다.

    "2026-08-23T11:00:00"  >  "2026-08-23T10:00:00Z"      ← 문자열 비교
      실험(여덟 시간 전)         에이전트 실행(방금)

`utcnow()`를 쓰는 셋은 나중에 붙은 에이전트 하위 모듈이다. 규칙을 세우고 한 곳에
적용한 뒤 나머지를 세어보지 않은 것의 반대 방향이다 — **새 모듈이 더 나은 규칙을
골랐고, 옛 것과 만나는 자리를 아무도 안 봤다.**

**클라이언트에서는 못 고친다.** 프런트도 같은 문자열 정렬을 두 곳에서 한다. 거기서
`Date.parse`로 바꿔도 낫지 않는다 — 표시자 없는 값을 브라우저는 **보는 사람의
시간대**로 읽고, 그 값을 쓴 것은 서버다. 서버만이 그 값이 무슨 뜻인지 안다.
`localeCompare`를 `Date.parse`로 바꾸는 것은 **오류를 옮기는 것이지 없애는 것이
아니다.** 그래서 프런트는 건드리지 않고 여기에 적어 둔다.
"""

from __future__ import annotations

import ast
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from part_source import assembled  # noqa: E402

BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend" / "src"


@pytest.fixture
def at_offset(monkeypatch):
    """이 검사가 도는 동안 프로세스의 시간대를 정한다.

    **기계가 정하게 두면 검사의 뜻이 기계마다 달라진다.** 이 파일은 그 함정을 한 번
    밟았다: 컨테이너가 UTC라 통과하던 단언이 오프셋 +9에서 빨간불이었고, 틀린 것은
    제품이 아니라 검사였다.

    POSIX `TZ` 문자열의 부호는 **뒤집혀 있다** — `UTC-9`가 UTC보다 9시간 *빠른*
    곳이다. 그 혼동을 부르는 쪽에 넘기지 않으려고 여기서 한 번만 뒤집는다.
    """
    if not hasattr(time, "tzset"):        # Windows
        pytest.skip("time.tzset()이 없는 플랫폼")

    def apply(hours: int):
        monkeypatch.setenv("TZ", f"UTC{-hours:+d}")
        time.tzset()
        actual = datetime.now().astimezone().utcoffset()
        assert actual == timedelta(hours=hours), (
            f"시간대를 {hours:+d}로 못 맞췄다(실제 {actual}) — 맞추지 못한 채 "
            "이어가면 이 검사는 아무 오프셋에 대해 답하는지 모르게 된다")

    yield apply
    time.tzset()          # monkeypatch가 TZ를 되돌린 뒤 프로세스에도 반영한다


class TestTheSortComparesInstantsNotStrings:
    def test_the_same_instant_spelled_two_ways_is_equal(self):
        """오프셋에 기대지 않는다. 이 컨테이너는 오프셋이 0이라 KST를 가정한
        예시는 여기서 재현되지 않는다 — 그래서 **실제 오프셋으로** 두 표기를
        만들어 같은 순간인지 묻는다. 어떤 오프셋에서도 참이어야 하는 성질이다."""
        moment = datetime(2026, 8, 23, 19, 0, 0).astimezone()
        local_spelling = moment.replace(tzinfo=None).isoformat()
        utc_spelling = moment.astimezone(timezone.utc).replace(tzinfo=None).isoformat(
            timespec="seconds") + "Z"
        assert modelmate._instant(local_spelling) == modelmate._instant(utc_spelling)

    def test_a_string_sort_inverts_them_at_offset_zero(self, at_offset):
        """오프셋이 0이면 뒤집힌다 — 두 시계는 **자릿수도 다르다.**

        `experiments`는 `datetime.now().isoformat()`이라 마이크로초까지 쓰고,
        `analysis_runs`는 `timespec="seconds"` + `"Z"`다. 같은 초 안에서
        `'.'`(0x2E)가 `'Z'`(0x5A)보다 앞이라, **나중에 쓰인 실험이 먼저 쓰인
        에이전트 실행 아래로 내려간다.**

        **이 검사는 오프셋 0을 스스로 만든다.** 예전에는 컨테이너가 마침 UTC라서
        통과했고, 이름은 "at this offset too"였다 — *이 오프셋*이 무엇인지는
        기계가 정하고 있었다. 오프셋 +9(이 프로젝트를 만드는 사람이 있는 곳)에서는
        아래 두 값이 **같은 순간의 두 표기가 아니게 되어** 빨간불이었다. 표시자 없는
        `10:00:00.5`는 그곳에서 UTC 01:00이고, 그러면 `later`가 이름과 달리 더
        이르다. 무너진 것은 제품이 아니라 **검사가 고른 리터럴**이다.

        오프셋과 무관하게 참이어야 하는 성질은 아래
        `test_the_order_follows_the_instant_at_any_offset`에 따로 있다.
        """
        at_offset(0)
        earlier = {"created_at": "2026-08-23T10:00:00Z"}
        later = {"created_at": "2026-08-23T10:00:00.500000"}

        by_string = sorted([earlier, later],
                           key=lambda row: row["created_at"], reverse=True)
        assert by_string[0] is earlier, "이 대조가 무너지면 아래 단언이 증명하는 게 없다"

        by_instant = sorted([earlier, later], key=modelmate._newest_first, reverse=True)
        assert by_instant[0] is later

    @pytest.mark.parametrize("hours", [-11, -5, 0, 5, 9, 14])
    def test_the_order_follows_the_instant_at_any_offset(self, hours, at_offset):
        """**어떤 오프셋에서도** 참이어야 하는 쪽. 리터럴을 고정하는 대신 두 표기를
        그 오프셋에서 만들어, 나중 순간이 나중으로 정렬되는지만 묻는다.

        위 검사가 기계의 시간대에 기대고 있었다는 것을 알고 나서 추가했다. 하나를
        오프셋 0에 못 박았으면, **오프셋에 기대지 않는 주장도 하나 있어야 한다** —
        아니면 남는 것은 "UTC 기계에서는 맞다"뿐이다.
        """
        at_offset(hours)
        first = datetime(2026, 8, 23, 10, 0, 0, tzinfo=timezone.utc)
        second = first + timedelta(seconds=30)

        older = {"created_at": first.replace(tzinfo=None).isoformat(
            timespec="seconds") + "Z"}
        newer = {"created_at": second.astimezone().replace(tzinfo=None).isoformat()}

        order = sorted([older, newer], key=modelmate._newest_first, reverse=True)
        assert order[0] is newer, (
            f"오프셋 {hours:+d}에서 나중 순간이 위로 오지 않는다: {order}")

    def test_a_nine_hour_offset_inverts_a_whole_afternoon(self):
        """왜 이게 큰지. 시스템 시간대에 기대지 않고 명시적으로 계산한다."""
        kst = timezone(timedelta(hours=9))
        moment = datetime(2026, 8, 23, 19, 0, 0, tzinfo=kst)
        agent_just_now = moment.astimezone(timezone.utc).replace(
            tzinfo=None).isoformat(timespec="seconds") + "Z"
        experiment_eight_hours_ago = (moment - timedelta(hours=8)).replace(
            tzinfo=None).isoformat(timespec="seconds")
        assert experiment_eight_hours_ago > agent_just_now  # 문자열로는 이렇다

    def test_unreadable_stamps_go_last_not_first(self):
        """파싱 실패를 1970년으로 바꿔 놓으면 **"가장 오래된 기록"인 척**한다.
        빈손이 데이터인 척하는 것과 같은 모양이다."""
        rows = [{"created_at": "2026-08-23T10:00:00Z"}, {"created_at": ""},
                {"created_at": "not-a-date"}, {"created_at": None}]
        order = sorted(rows, key=modelmate._newest_first, reverse=True)
        assert order[0]["created_at"] == "2026-08-23T10:00:00Z"
        assert all(not row["created_at"] or row["created_at"] == "not-a-date"
                   for row in order[1:])

    @pytest.mark.parametrize("stamp", ["", None, "not-a-date", "2026-13-45T99:00:00"])
    def test_instant_refuses_rather_than_guesses(self, stamp):
        assert modelmate._instant(stamp) is None

    @pytest.mark.parametrize("stamp, expected", [
        ("2026-08-23T10:00:00Z", datetime(2026, 8, 23, 10, tzinfo=timezone.utc)),
        ("2026-08-23T10:00:00z", datetime(2026, 8, 23, 10, tzinfo=timezone.utc)),
        ("2026-08-23T10:00:00+00:00", datetime(2026, 8, 23, 10, tzinfo=timezone.utc)),
        ("2026-08-23T19:00:00+09:00", datetime(2026, 8, 23, 10, tzinfo=timezone.utc)),
    ])
    def test_marked_stamps_keep_their_meaning(self, stamp, expected):
        assert modelmate._instant(stamp) == expected

    def test_an_unmarked_stamp_is_read_as_the_servers_clock(self):
        """표시자가 없으면 **이 프로세스가 쓴 것**이므로 서버 로컬로 읽는다."""
        parsed = modelmate._instant("2026-08-23T10:00:00")
        assert parsed is not None and parsed.tzinfo is not None
        assert parsed.utcoffset() == datetime.now().astimezone().utcoffset()

    def test_the_merge_actually_uses_it(self):
        """도우미가 있어도 정렬이 안 쓰면 목록은 그대로 뒤집혀 있다."""
        source = (BACKEND / "main_parts" / "052_workspace_projects.part").read_text(
            encoding="utf-8-sig")
        assert "sorted(runs, key=_newest_first, reverse=True)" in source
        assert "sorted(reports, key=_newest_first, reverse=True)" in source
        # 한 곳을 고치고 다른 곳을 잊는 것이 이 항목의 모양이다. 남은 게 있는가.
        assert 'key=lambda row: row.get("created_at")' not in source


class TestTheClockInventoryIsPinned:
    """시계가 셋째로 늘어나면 여기서 걸린다. 하한선이 아니라 **이름**으로 둔다."""

    UTC_WRITERS = {
        "agents/persistence.py",
        "agents/state.py",
        "tools/evidence_bundle.py",
    }

    def sources(self):
        """`.py`만. 조각은 `assembled()`로 따로 본다 — 하나씩 파싱하면 열둘이 빠진다."""
        return sorted(BACKEND.rglob("*.py"))

    def uncommented(self, path):
        return [line for line in path.read_text(encoding="utf-8-sig").splitlines()
                if not line.strip().startswith("#")]

    def calls(self, tree, name):
        """**부르는 곳**만 센다. 이 파일을 처음 쓸 때는 줄을 훑었고, 그러자
        `052`의 독스트링에 적힌 `datetime.utcnow()` **설명**이 사용으로 잡혔다 —
        이 저장소가 열 번째로 만나는 모양이다: **관례를 설명하는 문장이 그
        관례를 적용받는다.** 독스트링과 문자열은 AST가 알아서 걸러낸다."""
        return any(isinstance(node, ast.Call) and ast.unparse(node.func).endswith(name)
                   for node in ast.walk(tree))

    def part_files_calling(self, name):
        """조각은 조립해서 본다. **처음 쓸 때 여기에도 `except SyntaxError`를
        넣었다** — 이 회차에 찾아낸 바로 그 맹점을, 그것을 찾아낸 파일에서."""
        parts = assembled()
        return {parts.owner(node.lineno) for node in ast.walk(parts.tree)
                if isinstance(node, ast.Call)
                and ast.unparse(node.func).endswith(name)}

    def test_only_these_three_files_use_utcnow(self):
        found = {str(path.relative_to(BACKEND)) for path in self.sources()
                 if self.calls(ast.parse(path.read_text(encoding="utf-8-sig")),
                               "datetime.utcnow")}
        found |= {f"main_parts/{name}"
                  for name in self.part_files_calling("datetime.utcnow")}
        assert found == self.UTC_WRITERS, (
            "UTC 시계를 쓰는 파일이 바뀌었다.\n"
            f"  새로 생김: {sorted(found - self.UTC_WRITERS) or '없음'}\n"
            f"  이제 안 씀: {sorted(self.UTC_WRITERS - found) or '없음'}\n"
            "시계를 하나 더 들이기 전에, 그 값이 어느 목록에서 다른 시계와 만나는지 봐라."
        )

    def test_the_local_clock_is_still_the_majority(self):
        """섞인 상태 자체는 이번에 안 고쳤다 — 이미 저장된 값의 시간대를 나중에
        알아낼 방법이 없어서, 컬럼 하나 안에서 옛 행과 새 행의 뜻이 갈린다.
        **그건 지금보다 나쁘다.** 그래서 만나는 자리만 고치고 수를 적어 둔다."""
        parts = assembled()
        local = sum(1 for node in ast.walk(parts.tree)
                    if isinstance(node, ast.Call) and not node.args and not node.keywords
                    and ast.unparse(node.func).endswith("datetime.now"))
        local += sum(1 for path in self.sources()
                     for node in ast.walk(ast.parse(path.read_text(encoding="utf-8-sig")))
                     if isinstance(node, ast.Call) and not node.args and not node.keywords
                     and ast.unparse(node.func).endswith("datetime.now"))
        # 하한선이 아니라 **정확한 수**다. 하한선은 하나가 빠지는 것을 못 본다 —
        # 이 저장소가 `DECLARED_RECORDS`에서 이미 겪었다.
        assert local == 32, (
            f"로컬 시계 호출이 {local}곳이다(적어둔 값 32). 옮겼거나 늘렸으면 "
            "어느 목록에서 UTC 시계와 만나는지 보고 이 수도 고쳐라.")

    def test_only_the_sort_helper_reinterprets_a_naive_stamp(self):
        """`astimezone`이 여러 곳에 흩어지면 해석이 여러 개가 된다 — 그게 애초에
        이 항목의 모양이다."""
        users = {f"main_parts/{name}" for name in self.part_files_calling("astimezone")}
        users |= {str(path.relative_to(BACKEND)) for path in self.sources()
                  if self.calls(ast.parse(path.read_text(encoding="utf-8-sig")),
                                "astimezone")}
        assert users == {"main_parts/052_workspace_projects.part"}


class TestTheClientSortsAreNamedNotFixed:
    """프런트의 문자열 정렬 두 곳. **여기서는 못 고친다.**

    표시자 없는 값을 브라우저는 보는 사람의 시간대로 읽는다. 서버가 UTC로 돌고
    보는 사람이 한국에 있으면, `Date.parse`로 바꿔도 아홉 시간 틀린 채로 정렬한다 —
    방향만 바뀐다. 고칠 수 있는 곳은 그 값을 쓴 서버뿐이다.

    그래서 **늘어나지 않는 것만** 지킨다.
    """

    # 처음에 둘로 적었다. 잘라낸 `grep | head`를 보고 세었기 때문이다 — 셋이다.
    # `workspaceData.js`의 셋 중 둘(실행 목록, 보고서 목록)이 섞인 값을 만지고,
    # 하나(작업 목록)는 `training_jobs`만 봐서 시계가 하나다. 그래도 함께 둔다:
    # **지금 안전한 것과 앞으로 안전한 것은 다르다.**
    KNOWN = {
        "pages/workspace/workspaceData.js": 3,
        "pages/workspace/WorkspaceJobs.jsx": 1,
    }

    def test_the_string_sorts_have_not_multiplied(self):
        pattern = re.compile(r"localeCompare\(String\(a\.(?:updated_at|created_at)")
        found = {}
        for path in sorted(FRONTEND.rglob("*.js")) + sorted(FRONTEND.rglob("*.jsx")):
            hits = len(pattern.findall(path.read_text(encoding="utf-8")))
            if hits:
                found[str(path.relative_to(FRONTEND))] = hits
        assert found == self.KNOWN, (
            "시각 문자열을 그대로 비교하는 자리가 바뀌었다.\n"
            f"  실제: {found}\n"
            "서버가 시간대를 붙여 내보내기 전까지 이 정렬은 클라이언트에서 고칠 수 없다."
        )

    def test_the_pattern_would_match_something_planted(self):
        """대조: 정규식이 깨져 있으면 `found`가 비고, 그러면 이 검사는 늘 빨간불이
        되어야 한다 — 위 단언이 `{}` == KNOWN이 되므로 실패한다. 그 방향을 확인한다."""
        pattern = re.compile(r"localeCompare\(String\(a\.(?:updated_at|created_at)")
        assert pattern.search("x.sort((a,b)=>b.localeCompare(String(a.created_at || '')))")
