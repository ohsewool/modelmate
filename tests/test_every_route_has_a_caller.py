"""라우트 백 개마다 부르는 쪽이 있는가.

CI가 한 줄도 실행하지 않는 라우트를 세다가 나온 질문이다. 실행되지 않는 것과 **아무도
부르지 않는 것**은 다르다 — 앞은 검사의 빈 곳이고 뒤는 표면의 빈 곳이다.

근거 셋을 본다: 프런트엔드의 `api.<메서드>` 호출, `scripts/run_*_smoke.py`, 그리고
문서. 셋 중 하나라도 이름을 대면 그 라우트는 누군가의 것이다.

**넷이 남았다.** 전부 legacy `STATE` 기반 흐름의 옛 쌍둥이이고, 지금 프런트는 같은
기능을 다른 엔드포인트로 부른다.

    GET /api/predictions        결과 보기 — 프런트는 프로젝트 범위 경로를 쓴다
    GET /api/shap-local/{idx}   국소 설명 — 프런트는 `/api/explain/local/{idx}`를 부른다
    GET /api/columns            컬럼 목록 — 프런트는 `/api/analyze-columns`를 부른다
    GET /api/llm/status         LLM 준비 상태 — 부르는 화면이 없다

**지우지 않았다.** `docs/legacy-analysis-flow-audit.md`가 이 흐름의 기능들을 "Preserved"로
분류하고 *"동등한 빠른 분석 경로가 남지 않는 한 대체하지 말 것"*이라고 적어뒀다. 그
결정은 기능 단위이고, 이 넷은 그 기능의 옛 API 쌍둥이다 — 내부 스캔만으로 공개 표면을
지우는 것은 그 결정을 내 판단으로 덮는 일이다. 베타로 배포된 적이 있어 바깥 호출자가
없다고 단정할 근거도 없다.

**대신 이름으로 둔다.** 하한선(`>= N`)으로는 하나가 늘어나는 것을 못 본다 — 이 저장소가
`DECLARED_RECORDS`에서 이미 겪은 그대로다. 목록을 정확히 맞추므로 **새로 생기는 것도,
누가 조용히 쓰기 시작한 것도** 여기서 걸린다.

찾는 과정에서 매처가 두 번 틀렸다는 것도 적어둔다. 처음엔 `{model_id}`를 지워
`/api/v2//predict`를 찾았고, 다음엔 프런트가 axios `baseURL` 때문에 `/api` 없이
부른다는 것을 놓쳤다. **둘 다 "언급 없음"을 결과처럼 보이게 했다** — 16개라고 두 번
잘못 셌고, 대조를 넷 박고서야 4개가 나왔다.
"""

import ast
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PARTS = ROOT / "backend" / "main_parts"

# 부르는 쪽이 없다고 확인된 라우트. **이름으로 둔다** — 개수 하한이 아니라 집합이다.
UNREFERENCED = {
    # legacy `STATE` 흐름의 옛 API 쌍둥이 넷. 프런트는 같은 기능을 다른 경로로 부른다.
    ("GET", "/api/predictions"),
    ("GET", "/api/shap-local/{idx}"),
    ("GET", "/api/columns"),
    ("GET", "/api/llm/status"),

    # 관리자 목록. **검사는 있는데 부르는 화면이 없다** — 관리자 UI는 요약·피드백·
    # 문의·모니터링 넷만 부른다(`/admin/summary`, `/admin/feedback`,
    # `/admin/pilot-inquiries`, `/admin/monitoring/errors`). 시험되지 않는 것과 아무도
    # 부르지 않는 것은 다르고, 이것은 뒤쪽이다. 지우지 않는 이유는 나머지 넷과 같다.
    ("GET", "/api/admin/users"),

    # SPA 캐치올. 브라우저가 주소창으로 직접 치는 자리라 `api.<메서드>` 호출이
    # 있을 수 없다 — **매처가 못 찾는 것이 맞는** 유일한 항목이고, 그래서 여기 둔다.
    ("GET", "/{full_path:path}"),
}


def assembled() -> str:
    return "\n".join(path.read_text(encoding="utf-8-sig")
                     for path in sorted(PARTS.glob("*.part")))


def routes() -> set[tuple[str, str]]:
    found = set()
    for node in ast.walk(ast.parse(assembled())):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if (isinstance(decorator, ast.Call)
                    and isinstance(decorator.func, ast.Attribute)
                    and isinstance(decorator.func.value, ast.Name)
                    and decorator.func.value.id == "app"
                    and decorator.args
                    and isinstance(decorator.args[0], ast.Constant)):
                found.add((decorator.func.attr.upper(), decorator.args[0].value))
    return found


def variants(path: str) -> set[str]:
    """찾을 문자열들.

    프런트엔드는 axios `baseURL` 때문에 `/api` 없이 부른다 — 그것을 놓쳐서 한 번
    틀렸다. 매개변수는 앞뒤로 쪼갠다: `{model_id}`를 그냥 지우면 `/api/v2//predict`가
    되어 아무것도 맞지 않는다 — 그것이 다른 한 번이다.
    """
    out = set()
    for base in {path, path[4:] if path.startswith("/api") else path}:
        head = base.split("{")[0].rstrip("/")
        if len(head) > 3:
            out.add(head)
        if "}" in base:
            tail = base.split("}")[-1].lstrip("/")
            if len(tail) > 3:
                out.add(tail)
    return out


# 이 검사의 **기록**이 담긴 구간. 여기 적힌 경로 이름은 "누가 부른다"가 아니라
# "아무도 안 부른다"는 서술이다. 걷어내지 않으면 **기록하는 행위가 기록을 뒤집는다** —
# 실제로 그렇게 됐다: 위 목록을 README에 적자마자 다섯이 "이제 누가 부름"으로 바뀌었다.
#
# 이 저장소들에서 인용과 사용을 혼동한 것이 아홉 번째다. 관례를 설명한 문장이 문서를
# 검사에서 빼버렸고, 옛 기본값을 설명한 독스트링이 그 값을 쓰는 코드로 읽혔다.
RECORD_FENCE = re.compile(r"<!--\s*surface-record: start.*?surface-record: end\s*-->",
                          re.DOTALL)


def haystack() -> str:
    parts = []
    source = ROOT / "frontend" / "src"
    if source.exists():
        parts += [p.read_text(encoding="utf-8", errors="replace") for p in source.rglob("*.js*")]
    parts += [p.read_text(encoding="utf-8", errors="replace") for p in (ROOT / "scripts").glob("*.py")]
    parts += [p.read_text(encoding="utf-8", errors="replace") for p in (ROOT / "docs").glob("*.md")]
    parts.append((ROOT / "README.md").read_text(encoding="utf-8"))
    return RECORD_FENCE.sub("", "\n".join(parts))


def unreferenced() -> set[tuple[str, str]]:
    body = haystack()
    return {(method, path) for method, path in routes()
            if not any(variant in body for variant in variants(path))}


class TestTheSurfaceIsExactlyWhatWeSaidItIs:
    def test_exactly_these_routes_have_no_caller(self):
        """늘어남과 줄어듦을 둘 다 본다. 하한선으로는 하나가 늘어나는 것을 못 본다."""
        actual = unreferenced()
        assert actual == UNREFERENCED, (
            "부르는 쪽 없는 라우트가 적어둔 목록과 다르다.\n"
            f"  새로 생김: {sorted(actual - UNREFERENCED) or '없음'}\n"
            f"  이제 누가 부름: {sorted(UNREFERENCED - actual) or '없음'}\n"
            "새 라우트라면 부르는 쪽을 만들거나 여기 이유와 함께 넣어라."
        )

    def test_the_listed_ones_still_exist(self):
        """지워졌으면 목록에서도 빠져야 한다. 없는 것을 지키는 목록은 늘 통과한다."""
        missing = sorted(UNREFERENCED - routes())
        assert missing == [], f"목록에 있는데 라우트가 없다: {missing}"


class TestTheScanIsNotVacuous:
    def test_it_found_the_routes(self):
        assert len(routes()) >= 90

    def test_the_haystack_was_actually_read(self):
        body = haystack()
        assert len(body) > 200_000
        assert "api." in body

    @pytest.mark.parametrize("path,expected,why", [
        ("/api/v2/{model_id}/predict", True, "문서가 예측 API로 설명한다"),
        ("/api/quick-analysis/start", True, "프런트가 부른다 — `/api` 없이"),
        ("/api/profile/summary", True, "프런트가 부른다"),
        ("/api/agent/mock-plan", True, "스모크 둘이 부른다"),
        ("/api/no-such-route-xyz", False, "없는 경로"),
    ])
    def test_the_matcher_answers_known_cases(self, path, expected, why):
        """**매처가 틀리면 "없음"이 결과처럼 보인다.** 이 프로젝트에서 세 번째다 —
        빈 정규식을 쓴 시크릿 스캐너, 한 철자만 보던 절대 경로 검사, 그리고 이것.
        아는 답 다섯 개를 박아둔다."""
        assert any(variant in haystack() for variant in variants(path)) is expected, why

    def test_the_record_itself_does_not_count_as_a_caller(self):
        """**기록하는 행위가 기록을 뒤집으면 안 된다.** README에 "이 넷은 아무도
        부르지 않는다"고 적자마자 다섯이 "이제 누가 부름"으로 바뀌었다 — 문서가
        근거 중 하나이기 때문이다. 울타리 안은 서술이지 호출이 아니다."""
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        assert "surface-record: start" in readme
        assert "/api/shap-local" in readme          # 기록에는 있고
        assert "/api/shap-local" not in haystack()  # 건초더미에는 없다

    def test_a_route_nobody_names_is_detected(self):
        """심어보기. 목록에 없는 새 라우트가 생기면 위 검사가 실패해야 한다."""
        planted = ("GET", "/api/definitely-not-referenced-anywhere")
        body = haystack()
        assert not any(variant in body for variant in variants(planted[1]))
