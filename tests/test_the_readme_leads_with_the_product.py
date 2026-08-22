"""README가 제품을 먼저 말하는가.

**`## What It Does`가 208번째 줄에 있었다.** 그 앞에는 발견 열넷이 쌓여 있었다 —
회차마다 새로 찾은 것을 문서 위쪽에 덧붙였고, 각 회차에는 그것이 맞는 자리였다.
아무도 전체를 **처음 온 사람의 자리에서** 보지 않았다.

이 저장소가 반복해서 찾아온 모양이다. 개별 변경은 각각 옳고, 합쳐진 결과를 보는
것이 없다. 하한선 가드가 그랬고, 손으로 돌리는 검사가 그랬고, 이번엔 문서 순서다.

형제 저장소 넷은 처음부터 제품을 앞세우고 있었다(각각 12~14절, 133~162줄). 여기만
38절 504줄로 자랐고 뒤집혔다 — **규모가 문제를 만든 것이지 규칙이 없어서가 아니다.**

2026-08-23에 순서만 바꿨다. **한 글자도 지우지 않았고**, 낱말 단위로 세어 잃은 것이
없음을 확인했다. 발견들은 `## 무엇이 잘못됐고 어떻게 알았나` 아래로 모았다.

이 검사는 그 순서를 지킨다. 다음 회차가 새 발견을 문서 맨 위에 붙이면 여기서 걸린다.
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"

UMBRELLA = "## 무엇이 잘못됐고 어떻게 알았나"
PRODUCT_FIRST = "## What It Does"


def text() -> str:
    return README.read_text(encoding="utf-8")


def headings() -> list[tuple[int, str]]:
    return [(index, line) for index, line in enumerate(text().splitlines(), start=1)
            if line.startswith("## ")]


class TestAReaderMeetsTheProductFirst:
    def test_what_it_does_comes_before_anything_else(self):
        first = headings()[0]
        assert first[1].strip() == PRODUCT_FIRST, (
            f"첫 절이 {first[1]!r}이다. 새 절은 제품 설명 **뒤**에 붙인다 — "
            f"발견은 {UMBRELLA!r} 아래로."
        )

    def test_it_arrives_within_the_first_screen(self):
        """"화면 하나"를 스무 줄로 잡는다. 배지와 한 문단 뒤에는 제품이 와야 한다."""
        line, _ = headings()[0]
        assert line <= 20, f"{line}번째 줄에서야 제품이 나온다"

    def test_the_findings_live_under_one_heading(self):
        body = text()
        assert UMBRELLA in body
        umbrella_at = body.index(UMBRELLA)
        product_at = body.index(PRODUCT_FIRST)
        assert product_at < umbrella_at

    def test_nothing_but_the_tail_follows_the_findings(self):
        """발견 우산 뒤에 오는 `##`는 라이선스·기록·함께 보기뿐이다. 새 제품 절이
        거기 붙으면 읽는 사람이 발견 삼백 줄을 지나야 만난다."""
        after = [title.strip() for line, title in headings()
                 if line > next(l for l, t in headings() if t.strip() == UMBRELLA)]
        assert after == ["## 라이선스", "## 기록", "## 함께 보기"], after


class TestTheCheckIsNotVacuous:
    def test_it_read_a_real_readme(self):
        assert len(text()) > 20_000
        assert len(headings()) >= 15

    def test_the_findings_are_still_there(self):
        """순서를 지키느라 내용을 잃으면 안 된다. 발견 절들이 우산 아래에 있는지
        개수로 본다 — 옮기면서 지운 것이 없다는 뜻이다."""
        body = text()
        beneath = body[body.index(UMBRELLA):]
        assert beneath.count("\n### ") >= 18

    def test_a_section_added_at_the_top_would_be_caught(self):
        """심어보기. 맨 위에 절을 붙이면 첫 검사가 실패해야 한다."""
        planted = "## 새 발견\n\n내용\n\n" + text()
        first = next(line for line in planted.splitlines() if line.startswith("## "))
        assert first.strip() != PRODUCT_FIRST
