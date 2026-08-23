"""README가 말하는 커버리지가 마지막 측정과 같은가.

이 저장소는 셀 수 있는 것을 거의 다 검사로 묶어뒀다 — 테스트 개수, 항목 개수,
라우트 개수, 의존성 개수. **커버리지 숫자만 아무것도 안 묶여 있었다.**

그 사이 무슨 일이 있었는지는 재보고 알았다.

    2026-08-22 문서에 적은 값        2026-08-24 실제
    pytest만          27.7%    →     48.4%
    합집합            47.3%    →     63.8%
    안 도는 함수      132개    →     12개
    전체 문          4,256     →     4,323

**두 달 치 작업 동안 숫자는 그대로였다.** 문서와 로드맵을 합쳐 열여섯 군데에 적혀 있었다.

### 왜 이 검사만으로는 모자라는가

여기서 보는 것은 **README와 기록이 같은가**이지 **기록이 참인가**가 아니다. 측정은
`sys.settrace`로 스위트를 두 번 돌리는 일이라 몇십 분 걸린다 — 매 푸시마다 할 수 없다.

    이 검사              문서가 기록에서 떠나는 것을 잡는다 (빠르다)
    coverage.yml(주간)   기록이 현실에서 떠나는 것을 잡는다 (느리다)

**둘 다 있어야 한다.** 이 검사만 있으면 기록과 문서가 **함께 틀린 채로 서로 맞을 수
있고**, 그건 이 포트폴리오가 여러 번 본 모양이다 — 신선함과 참인 것은 다르다.
그래서 아래에서 기록이 **언제 재졌는지와 무엇으로 재졌는지**도 함께 요구한다.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

RECORD = ROOT / "docs" / "coverage-record.json"
README = ROOT / "README.md"

# README의 표에서 읽어낼 값들. **정규식이 깨지면 빈손으로 통과하므로** 아래
# `test_the_scan_found_every_number`가 넷을 다 찾았는지 먼저 본다.
CLAIMS = {
    "pytest_percent": r"pytest만\s+([\d.]+)%",
    "smoke_percent": r"스모크 열다섯\s+([\d.]+)%",
    "union_percent": r"둘을 합쳐 CI가 지키는 것\*\*\s+([\d.]+)%",
    "functions_never_run": r"한 줄도 안 도는 함수\s+(\d+)개",
}


@pytest.fixture(scope="module")
def record():
    assert RECORD.exists(), (
        f"{RECORD.relative_to(ROOT)}가 없다. 측정 기록이 없으면 README의 숫자는 "
        "아무 근거가 없다 — `scripts/measure_part_coverage.py`로 재서 남겨라.")
    return json.loads(RECORD.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def claimed():
    text = README.read_text(encoding="utf-8")
    found = {}
    for key, pattern in CLAIMS.items():
        match = re.search(pattern, text)
        if match:
            found[key] = float(match.group(1))
    return found


class TestTheReadmeMatchesTheRecord:
    def test_the_scan_found_every_number(self, claimed):
        """**대조가 먼저다.** 문장이 바뀌어 정규식이 못 찾으면 아래 비교는 빈
        딕셔너리끼리 하는 꼴이고 언제나 통과한다."""
        missing = sorted(set(CLAIMS) - set(claimed))
        assert missing == [], (
            f"README에서 못 찾은 값: {missing}. 표현이 바뀌었으면 이 검사의 "
            "정규식도 함께 고쳐라 — 안 고치면 조용히 아무것도 확인하지 않는다.")

    @pytest.mark.parametrize("key", sorted(CLAIMS))
    def test_each_number_agrees(self, key, claimed, record):
        assert claimed[key] == float(record[key]), (
            f"README는 {key}를 {claimed[key]}라 하는데 기록은 {record[key]}다.\n"
            "  다시 쟀으면 `docs/coverage-record.json`과 README를 함께 고쳐라.")

    def test_the_statement_total_agrees(self, record):
        text = README.read_text(encoding="utf-8")
        assert f"{record['statements']:,}문" in text, (
            f"README의 전체 문 수가 기록({record['statements']})과 다르다")


class TestTheRecordSaysHowItWasMade:
    """숫자만 있고 **언제·무엇으로**가 없으면 다음 사람이 다시 잴 수 없다."""

    def test_it_names_the_day(self, record):
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", record["measured_at"])

    def test_it_names_the_command(self, record):
        assert "measure_part_coverage" in record["command"]

    def test_the_command_exists(self, record):
        assert (ROOT / "scripts" / "measure_part_coverage.py").exists(), (
            "기록이 가리키는 명령이 없다. 이름만 남은 재현 절차는 절차가 아니다.")

    def test_the_union_is_the_headline(self, record):
        """**합집합이 CI가 실제로 지키는 값이다.** 셋 중 가장 큰 수를 앞세우면
        pytest만 돌린 수치를 CI 값으로 읽게 된다."""
        assert record["union_percent"] >= record["pytest_percent"]
        assert record["union_percent"] >= record["smoke_percent"]
        assert "합집합" in record["note"]


class TestTheSlowCheckExists:
    """이 파일은 **기록이 참인지**는 못 본다. 그 일을 하는 것이 따로 있어야 한다."""

    def test_the_weekly_workflow_is_there(self):
        workflow = ROOT / ".github" / "workflows" / "coverage.yml"
        assert workflow.exists(), (
            "주간 재측정 워크플로가 없다. 이 검사만 남으면 기록과 문서가 함께 "
            "틀린 채로 서로 맞을 수 있다.")
        text = workflow.read_text(encoding="utf-8")
        assert "schedule:" in text and "workflow_dispatch:" in text
        assert "measure_part_coverage" in text
