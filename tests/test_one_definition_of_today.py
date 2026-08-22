"""일일 한도의 "오늘"이 하나뿐인가, 그리고 그것이 누구의 하루인가.

이 회차는 `agent-safety-core`에서 **한 판단에 시계가 둘**인 것을 찾은 데서 이어진다.
여기서도 같은 질문을 던졌다: 일일 카운터가 "오늘"을 어디서 정하는가.

**출처는 하나다.** `_usage_today()`가 유일한 정의이고, `ensure_usage_day`·
`get_daily_usage`·`claim_daily_usage`가 전부 그것을 쓴다. 프런트엔드는 "오늘 분석"을
표시하지만 숫자를 서버에서 받는다 — 자기 날짜를 계산하지 않는다. 빈손이고, 그것이
확인해서 얻은 결과다.

**적혀 있지 않던 것은 그 하루가 누구의 하루인가다.** `datetime.now()`는 **서버의
지역 시각**이다. 한도는 서버 자정에 리셋된다 — UTC 자정도, 사용자의 자정도 아니다.
사용자가 다른 시간대에 있으면 "오늘"이 자기 하루와 어긋난다.

**배포의 시간대를 바꾸면 경계가 움직인다.** UTC에서 KST로 옮기면 9시간 당겨지고,
그 한 번의 전환에서 사용자는 하루치 할당량을 일찍 새로 받는다. 시간대를 바꾸는 것이
한도를 리셋하는 일이 될 수 있다는 것을 아는 편이 낫다.

시간대 기능을 만들지 않았다. 사용자별 시간대는 사용자에게 시간대를 묻는 것에서
시작하고 이 앱은 묻지 않는다. **동작을 바꾸지 않고 사실을 적는다** — 이 회차에
`modelmate`의 보존 문구에서 한 것과 같은 판단이다.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PARTS = ROOT / "backend" / "main_parts"


def executable(text: str) -> str:
    return "\n".join(re.sub(r"#.*$", "", line) for line in text.splitlines())


class TestThereIsExactlyOneToday:
    def test_only_one_function_defines_it(self):
        """두 번째 정의가 생기면 두 곳이 서로 다른 자정에 리셋한다."""
        definitions = []
        for path in sorted(PARTS.glob("*.part")):
            for number, line in enumerate(executable(path.read_text(encoding="utf-8-sig")).splitlines(), 1):
                if re.match(r"\s*def _usage_today\b", line):
                    definitions.append(f"{path.name}:{number}")
        assert definitions == ["008_usage_limits.part:82"], definitions

    def test_every_daily_read_goes_through_it(self):
        """`datetime.now().date()`를 직접 부르는 곳이 생기면 정의가 둘이 된다.

        **정의 자신의 본문은 빼고 본다.** 처음엔 def 줄만 건너뛰고 나머지를 봤는데,
        `_usage_today`가 `datetime.now().date()`를 쓰는 것은 당연하다 — 그것이 정의다.
        이 파일들에서 여섯 번째 파싱 실수였다.
        """
        source = executable((PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig"))
        start = source.index("def _usage_today")
        rest = source[source.index("\ndef ", start + 1):]
        assert "datetime.now().date()" not in rest
        assert "def _usage_now" in rest, "정의 뒤를 제대로 잘랐는지"

    def test_the_frontend_does_not_compute_its_own(self):
        """화면이 자기 날짜로 "오늘"을 정하면 서버 카운터와 어긋난 숫자를 보여준다."""
        for name in ("components/UsagePlanCard.jsx",
                     "pages/workspace/WorkspaceSettings.jsx",
                     "pages/workspace/WorkspaceDashboard.jsx"):
            source = (ROOT / "frontend" / "src" / name).read_text(encoding="utf-8")
            assert "jobs_today" in source, name
            assert "toLocaleDateString" not in source, name


class TestWhoseDayItIsIsWrittenDown:
    def test_the_docs_say_it_is_the_server_day(self):
        notes = (ROOT / "docs" / "usage-limits.md").read_text(encoding="utf-8")
        assert "server" in notes.lower() and "midnight" in notes.lower()

    def test_the_docs_warn_about_moving_the_timezone(self):
        """시간대를 바꾸는 것이 한도를 리셋하는 일이 될 수 있다."""
        notes = (ROOT / "docs" / "usage-limits.md").read_text(encoding="utf-8")
        assert "timezone" in notes.lower()


class TestTheChecksAreNotVacuous:
    def test_the_definition_really_is_where_the_test_says(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        assert "def _usage_today" in source

    def test_a_second_definition_would_be_caught(self):
        """검출이 성립하는지. 같은 형태의 줄을 만들어 정규식을 걸어본다."""
        assert re.match(r"\s*def _usage_today\b", "def _usage_today():")
        assert re.match(r"\s*def _usage_today\b", "    def _usage_today():")

    def test_the_comment_stripper_keeps_code(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        assert "def _usage_today" in executable(source)
