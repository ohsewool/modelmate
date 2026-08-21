"""화면이 영원히 도는 일이 없는가, 그리고 정당한 요청이 끊기지 않는가.

`axios.create({ baseURL })`에는 타임아웃이 없었다. axios의 기본값은 **0, 즉 무한**
이다. 서버가 죽거나 연결이 끊겨도 화면은 영원히 돌고 사용자는 무엇이 잘못됐는지
알 수 없다.

그렇다고 짧게 잡을 수도 없다. **무료 플랜이 파는 한도를 꽉 채운 데이터가 정당하게
오래 걸린다.** 2026-08-22에 쟀다:

| 데이터 | `/api/run-cv` |
|---|---|
| 1000행 × 20열 | 18.7초 |
| 1000행 × 100열 | 58.8초 |
| 5000행 × 20열 | 62.0초 |
| **5000행 × 100열 (무료 한도)** | **253.5초** |

시간은 대략 셀 수에 비례한다(25배 셀 → 13.6배). 60초에 끊으면 **파는 한도가
동작하지 않는 것**이 된다.

그래서 둘로 나눴다. 보통 요청은 60초, 분석처럼 오래 걸리는 것은 15분. 어느 쪽이든
끝은 있다.

**처음 쓴 긴-경로 목록은 양쪽으로 틀렸다.** `/run-shap`·`/optuna`·`/predict-batch`는
이 프런트엔드가 부르지 않는 죽은 항목이었고(실제 경로는 `/run-optuna`), 반대로 재보니
`/analyze-columns`(3.6초)와 보고서(1.4초)는 넣을 필요가 없었다. **또 추측으로 목록을
만들었다** — 이 저장소들에서 반복된 실수라 검사로 고정한다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SRC = ROOT / "frontend" / "src"
API_JS = SRC / "api.js"
CALL = re.compile(r"\bapi\.(get|post|put|patch|delete)\(\s*[`\"']([^`\"']+)")

pytestmark = pytest.mark.skipif(not API_JS.exists(), reason="frontend/src가 없다")


@pytest.fixture(scope="module")
def source():
    return API_JS.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def slow_paths(source):
    block = source[source.index("const SLOW_PATHS"):]
    block = block[:block.index("]")]
    return re.findall(r"'(/[^']+)'", block)


@pytest.fixture(scope="module")
def called_paths():
    found = set()
    for path in sorted(SRC.rglob("*.js*")):
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in CALL.finditer(text):
            found.add(match.group(2).split("?")[0])
    return found


class TestEveryRequestEnds:
    def test_the_client_has_a_default_timeout(self, source):
        """axios의 기본값은 0(무한)이다. 안 적으면 화면이 영원히 돈다."""
        assert re.search(r"axios\.create\(\{[^}]*timeout:", source)

    def test_the_default_is_a_real_number(self, source):
        assert "NORMAL_TIMEOUT_MS = 60_000" in source

    def test_slow_requests_get_a_longer_one(self, source):
        assert "ANALYSIS_TIMEOUT_MS" in source
        value = int(re.search(r"ANALYSIS_TIMEOUT_MS = ([\d_]+)", source).group(1).replace("_", ""))
        assert value > 60_000

    def test_the_long_timeout_clears_the_measured_worst_case(self, source):
        """5000×100에서 253.5초가 걸렸다. 여유가 없으면 파는 한도가 끊긴다."""
        value = int(re.search(r"ANALYSIS_TIMEOUT_MS = ([\d_]+)", source).group(1).replace("_", ""))
        assert value >= 253_500 * 2

    def test_an_interceptor_applies_it(self, source):
        """상수만 있고 배선이 없으면 긴 요청은 60초에 끊긴다."""
        assert "interceptors.request.use" in source
        assert "ANALYSIS_TIMEOUT_MS" in source[source.index("interceptors.request.use"):]


class TestTheSlowListMatchesReality:
    def test_no_entry_is_dead(self, slow_paths, called_paths):
        """부르지 않는 경로를 적어두면 목록이 무엇을 덮는지 알 수 없어진다.
        처음 쓴 목록에는 셋이 있었다."""
        dead = [entry for entry in slow_paths
                if not any(call.startswith(entry) for call in called_paths)]
        assert dead == [], dead

    def test_the_measured_slow_route_is_covered(self, slow_paths):
        """253.5초짜리 하나가 빠지면 이 목록의 존재 이유가 사라진다."""
        assert "/run-cv" in slow_paths

    def test_the_fast_routes_are_not_in_it(self, slow_paths):
        """재보니 60초 안이었다. 넣으면 목록이 "긴 것"을 뜻하지 않게 된다."""
        for fast in ("/analyze-columns", "/report/summary", "/report/html"):
            assert fast not in slow_paths

    def test_it_is_not_empty(self, slow_paths):
        assert len(slow_paths) >= 3


class TestTheseChecksAreNotVacuous:
    def test_the_call_sites_were_actually_read(self, called_paths):
        assert len(called_paths) >= 40
        assert "/run-cv" in called_paths

    def test_the_slow_list_was_actually_parsed(self, slow_paths):
        assert all(entry.startswith("/") for entry in slow_paths)

    def test_an_invented_entry_would_be_caught(self, called_paths):
        """죽은 항목 검출이 성립하는지. 없는 경로를 넣어 같은 판정을 걸어본다."""
        assert not any(call.startswith("/does-not-exist") for call in called_paths)

    def test_the_measurement_is_recorded_where_the_number_lives(self, source):
        """상수 옆에 근거가 없으면 다음 사람은 15분이 어디서 온 값인지 모른다."""
        assert "253.5" in source
