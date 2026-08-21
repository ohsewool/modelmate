"""프런트엔드가 부르는 엔드포인트가 백엔드에 실제로 있는가.

두 계층이 한 계약을 공유하는데 **맞춰보는 곳이 없었다.** 백엔드 라우트 이름을
바꾸면 프런트엔드는 조용히 깨진다 — pytest는 백엔드만 보고, 제품 스모크는 프런트가
쓰지 않는 경로도 포함해 HTTP API를 직접 치고, `vite build`는 문자열 안의 URL을
검사하지 않는다. **사용자만 안다.**

이 프로젝트가 반복해서 찾아온 모양이다: 같은 질문에 답하는 장치가 둘인데 둘이
어긋나는지 보는 것이 없다. 누출 검사기와 평가 관문이 그랬고, export 검증기와 원장이
그랬고, `can_rerun`과 재실행 엔드포인트가 그랬다.

**결과는 빈손이다** — 호출 99개가 전부 실재하는 라우트를 가리킨다. 그래도 값이 있다:
다음에 라우트 이름이 바뀌면 여기서 걸린다.

`frontend/src`의 `api.<메서드>(...)` 호출만 본다. 템플릿 리터럴(`${id}`)은 경로
매개변수로 접어서 비교하므로 `/projects/${projectId}`가 `/api/projects/{project_id}`와
맞는다. **메서드까지 함께 본다** — 경로는 있는데 그 메서드가 없는 경우가 실제 실패
모드이고, 경로만 비교하면 놓친다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SRC = ROOT / "frontend" / "src"
CALL = re.compile(r"\bapi\.(get|post|put|patch|delete)\(\s*[`\"']([^`\"']+)")

pytestmark = pytest.mark.skipif(not SRC.exists(), reason="frontend/src가 없다")


def route_key(path: str) -> str:
    """경로 매개변수를 하나로 접는다. 이름이 아니라 자리가 계약이다."""
    return re.sub(r"\{[^}]+\}", "{x}", path.rstrip("/"))


def call_key(raw: str) -> str:
    path = raw.split("?")[0].rstrip("/")
    path = re.sub(r"\$\{[^}]+\}", "{x}", path)
    if not path.startswith("/api"):
        path = "/api" + path
    return route_key(path)


@pytest.fixture(scope="module")
def backend_routes() -> dict[str, set[str]]:
    from backend.main import app

    found: dict[str, set[str]] = {}
    for route in app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api"):
            continue
        for method in getattr(route, "methods", set()) or set():
            found.setdefault(method, set()).add(route_key(path))
    return found


@pytest.fixture(scope="module")
def frontend_calls() -> list[tuple[str, str, str]]:
    found = []
    for path in sorted(SRC.rglob("*.js*")):
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in CALL.finditer(text):
            found.append((match.group(1).upper(), match.group(2), path.name))
    return found


class TestEveryCallReachesARoute:
    def test_no_call_names_an_endpoint_that_does_not_exist(self, backend_routes, frontend_calls):
        missing = [
            f"{method} {raw}  ({where})"
            for method, raw, where in frontend_calls
            if call_key(raw) not in backend_routes.get(method, set())
        ]
        assert not missing, (
            "프런트엔드가 없는 엔드포인트를 부른다:\n  " + "\n  ".join(missing[:12])
        )

    def test_the_method_matters_too(self, backend_routes):
        """경로는 있는데 그 메서드가 없는 경우가 실제 실패 모드다.
        경로만 비교하면 `DELETE /api/state`가 통과한다."""
        assert route_key("/api/state") in backend_routes.get("GET", set())
        assert route_key("/api/state") not in backend_routes.get("DELETE", set())


class TestTheComparisonIsNotVacuous:
    """호출을 하나도 못 찾았거나 라우트를 하나도 못 읽었어도 "전부 일치"가 나온다."""

    def test_calls_were_actually_found(self, frontend_calls):
        assert len(frontend_calls) >= 50, f"{len(frontend_calls)}개만 찾았다"

    def test_routes_were_actually_read(self, backend_routes):
        assert sum(len(paths) for paths in backend_routes.values()) >= 50

    def test_an_invented_path_is_refused(self, backend_routes):
        assert call_key("/does-not-exist") not in backend_routes.get("GET", set())

    def test_a_templated_path_still_matches(self, backend_routes):
        """`${projectId}`가 `{project_id}`와 맞지 않으면 이 파일은 모든 동적
        경로를 놓치면서 통과한다 - 정확히 아무것도 확인하지 않는 상태."""
        assert call_key("/projects/${id}/runs/${rid}/rerun") in backend_routes.get("POST", set())

    def test_at_least_one_call_is_templated(self, frontend_calls):
        """위 검사가 실제 코드에서도 쓰이는지. 전부 정적 경로라면 접는 로직은
        한 번도 실행되지 않는다."""
        assert any("${" in raw for _, raw, _ in frontend_calls)
