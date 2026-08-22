"""README가 이 저장소를 세는 숫자가 지금도 맞는가.

테스트 개수는 CI가 `--collect-only`와 대조한다. 그런데 README는 **저장소 자신에
대한 다른 숫자들**도 들고 있다 — 파일의 줄 수, 호출 수, 사용처 수. 그것들은 손으로
적혔고 **재는 것이 하나도 없었다.**

2026-08-22에 셋을 재봤다.

    api.<메서드>( 호출        99건  → 99          맞음
    .part 파일의 STATE 사용   232건 → 266건       틀림
    STATE를 쓰는 .part 파일   "20여 곳" → 35곳    틀림
    persistence.py            977줄 → 996줄       틀림

**셋 중 둘이 어긋났고, 어긋난 방향이 같다** — 저장소가 자라는 동안 숫자는 그대로
있었다. 232는 스코핑 커밋 당시에는 맞았고(커밋 메시지가 "232 call sites"라고 적고
있다) 그 뒤로 34건이 늘었다. 977도 마찬가지다. **한 번 맞았던 숫자가 계속 맞다고
읽히는 것**이 이 검사가 막으려는 것이다.

숫자를 이 파일에 박지 않고 README에서 읽어온다. 박아두면 문서와 코드가 갈릴 때 어느
편을 들지 알 수 없고, 읽어오면 둘 중 하나가 움직이는 순간 걸린다 —
`document-intelligence`가 공개된 구역 수에 쓴 것과 같은 방식이다.
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
README = (ROOT / "README.md").read_text(encoding="utf-8")

CALL = re.compile(r"\bapi\.(?:get|post|put|patch|delete)\(\s*[`\"']([^`\"']+)")
STATE = re.compile(r"\bSTATE\b")


def claimed(pattern: str) -> int:
    """README가 말하는 값. 못 찾으면 실패다 — 문장이 바뀌었는데 검사가 조용히
    통과하면 그때부터 이 파일은 아무것도 확인하지 않는다."""
    match = re.search(pattern, README)
    assert match, f"README에서 {pattern!r}를 찾지 못했다. 문장이 바뀌었으면 여기도 고쳐라."
    return int(match.group(1))


def frontend_calls() -> list[str]:
    src = ROOT / "frontend" / "src"
    found = []
    for path in sorted(src.rglob("*.js*")):
        found += CALL.findall(path.read_text(encoding="utf-8", errors="replace"))
    return found


def part_files() -> list[Path]:
    return sorted((ROOT / "backend" / "main_parts").glob("*.part"))


class TestTheNumbersStillHold:
    @pytest.mark.skipif(not (ROOT / "frontend" / "src").exists(),
                        reason="frontend/src가 없다")
    def test_the_frontend_call_count(self):
        """`test_frontend_contract`가 이 호출들이 실재하는 라우트를 가리키는지
        보고, 여기서는 **몇 개인지**를 본다. 개수가 줄면 호출이 사라진 것이고,
        그 검사는 줄어든 것을 잡지 못한다 — 남은 것만 확인하기 때문이다."""
        assert len(frontend_calls()) == claimed(r"호출 (\d+)개가 전부 실재하는 라우트")

    def test_the_state_usage_count(self):
        total = sum(len(STATE.findall(path.read_text(encoding="utf-8-sig")))
                    for path in part_files())
        assert total == claimed(r"STATE 사용 (\d+)건은 한 줄도 바뀌지 않았다")

    def test_the_number_of_part_files_that_use_state(self):
        """"20여 곳"은 35곳이 됐다. 어림수는 틀려도 틀린 티가 안 난다."""
        using = sum(1 for path in part_files()
                    if STATE.search(path.read_text(encoding="utf-8-sig")))
        assert using == claimed(r"`\.part` 파일 (\d+)곳의 STATE 사용")

    def test_the_persistence_line_count(self):
        lines = (ROOT / "backend" / "agents" / "persistence.py").read_text(
            encoding="utf-8").splitlines()
        assert len(lines) == claimed(r"`persistence\.py`\((\d+)줄\)")


class TestTheChecksAreNotVacuous:
    """세는 것이 없으면 "0 == 0"으로 전부 통과한다."""

    def test_it_found_part_files(self):
        assert len(part_files()) >= 40

    def test_it_found_state_usages(self):
        assert sum(len(STATE.findall(path.read_text(encoding="utf-8-sig")))
                   for path in part_files()) >= 100

    @pytest.mark.parametrize("pattern", [
        r"호출 (\d+)개가 전부 실재하는 라우트",
        r"STATE 사용 (\d+)건은 한 줄도 바뀌지 않았다",
        r"`\.part` 파일 (\d+)곳의 STATE 사용",
        r"`persistence\.py`\((\d+)줄\)",
    ])
    def test_every_claim_is_still_findable(self, pattern):
        """문장이 바뀌면 `claimed()`가 실패한다. 그 실패가 실제로 일어나는지
        여기서 확인한다 — 정규식이 조용히 안 맞게 되는 것이 이 방식의 실패 모드다."""
        assert re.search(pattern, README), pattern

    def test_a_wrong_number_would_be_caught(self):
        """README를 고쳐 심는 대신, 같은 비교를 틀린 값으로 해본다."""
        text = "호출 12345개가 전부 실재하는 라우트를 가리킨다"
        assert int(re.search(r"호출 (\d+)개가 전부 실재하는 라우트", text).group(1)) == 12345
        assert len(frontend_calls()) != 12345 if (ROOT / "frontend" / "src").exists() else True
