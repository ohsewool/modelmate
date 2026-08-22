"""환경 변수를 밖으로 흘리는 경로가 없어야 한다.

`GET /api/debug-env`가 있었다. 인증 없이 붙어 있었고, 환경 변수 이름 중 "GEMINI"나
"API"가 들어간 것을 모았고, **그 결과를 반환하지 않았다** — `return`이 지워진 채
수집 코드만 남은 상태였다.

    @app.get("/api/debug-env")
    async def debug_env():
        key = os.getenv("GEMINI_API_KEY", "")
        all_keys = sorted(os.environ.keys())
        gemini_keys = [k for k in all_keys if "GEMINI" in k.upper() or "API" in k.upper()]

오늘은 `null`을 준다. 누가 한 줄만 되돌리면 **인증 없는 경로가 키 이름 목록을 뱉는다.**

**이것은 두 문서가 이미 적어둔 것이었다.** `docs/MODEL_MATE_HANDOFF.md`의 §6.2가
"제거하거나 비활성화하거나 보호하라"고, §8.1이 첫 번째 보안 관문으로 같은 말을 적었고,
2026-06-22 감사 스냅숏도 같은 말을 했다. **두 달 동안 그대로였다.** 이 저장소가 반복해서
찾아온 모양의 또 하나다 — 손으로 적어둔 조치는 확인하는 검사가 없으면 조치가 아니다.

찾은 경위도 적어둔다. 이 경로를 의심해서 본 것이 아니라, **CI가 한 줄도 실행하지 않는
라우트 마흔 개**를 나열하고 그중 프런트엔드가 부르지 않는 열여섯을 추린 목록에서 나왔다.
"아무도 부르지 않고 아무도 시험하지 않는 경로"가 무엇인지 물었더니 이것이 있었다.
"""

import ast
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


def assembled() -> str:
    return "\n".join(path.read_text(encoding="utf-8-sig")
                     for path in sorted(PARTS.glob("*.part")))


PROSE = re.compile(r'("""|\'\'\')(?:.|\n)*?\1')


def executable(text: str) -> str:
    """주석과 **독스트링**을 걷어낸 나머지.

    처음에는 `#`만 걷었고, 그래서 이 검사가 걸렸다 — `001_imports_db.part`의
    독스트링이 *"예전에는 `os.getenv("JWT_SECRET", "modelmate-...")`였다"*라고
    적어두고 있다. 옛 값을 **설명하는 문장**이 옛 값을 **쓰는 코드**로 읽힌 것이다.

    이 프로젝트가 이걸로 여덟 번째다. 형제 저장소의 절대 경로 검사도 같은 이유로
    독스트링을 먼저 걷어낸다. 인용과 사용은 다르고, 걷어내기가 그 구분이다.
    """
    without_prose = PROSE.sub('""', text)
    return "\n".join(re.sub(r"#.*$", "", line) for line in without_prose.splitlines())


class TestTheDebugRouteIsGone:
    def test_no_route_answers_at_that_path(self):
        assert "/api/debug-env" not in {getattr(route, "path", "") for route in modelmate.app.routes}

    def test_the_source_does_not_register_it_again(self):
        assert "debug-env" not in executable(assembled())

    def test_the_handler_name_is_gone_too(self):
        """경로만 바꿔 되살리는 것을 막는다."""
        assert not hasattr(modelmate, "debug_env")


class TestNoRouteReadsTheWholeEnvironment:
    """`os.environ`을 통째로 훑는 것은 설정을 읽는 것과 다르다. `os.getenv("X")`는
    아는 이름 하나를 묻지만, `os.environ.keys()`는 **무엇이 있는지**를 묻는다 —
    그 답이 응답으로 나가면 배포의 구성이 밖으로 나간다."""

    def test_no_part_enumerates_environment_keys(self):
        offenders = []
        for path in sorted(PARTS.glob("*.part")):
            body = executable(path.read_text(encoding="utf-8-sig"))
            for pattern in (r"os\.environ\.keys\(\)", r"sorted\(os\.environ\)",
                            r"dict\(os\.environ\)", r"os\.environ\.items\(\)"):
                if re.search(pattern, body):
                    offenders.append(f"{path.name}: {pattern}")
        assert offenders == [], offenders

    def test_the_scan_would_catch_it(self):
        """빈손이 결과이려면 훑기가 실제로 잡을 수 있어야 한다."""
        planted = "values = sorted(os.environ.keys())"
        assert re.search(r"os\.environ\.keys\(\)", executable(planted))

    def test_the_scan_reads_the_real_parts(self):
        body = assembled()
        assert len(body) > 100_000
        assert "@app.get" in body


class TestTheHandoffDocumentSaysWhatIsTrueNow:
    """위험 목록을 들고 있는 문서는, 고쳐진 위험을 계속 위험이라고 말하면 안 된다.
    **읽는 사람이 없는 위험을 쫓게 되고, 남아 있는 위험은 그 사이에 묻힌다.**

    반대 방향도 같다 — 목록에서 조용히 지우면 무엇이 왜 해결됐는지가 사라진다.
    그래서 문서는 항목을 남기되 **해결됐다고 적어야** 하고, 이 검사가 그 둘을
    함께 강제한다.
    """

    def document(self) -> str:
        return (ROOT / "docs" / "MODEL_MATE_HANDOFF.md").read_text(encoding="utf-8")

    def test_it_no_longer_calls_the_debug_route_a_present_risk(self):
        text = self.document()
        for line in text.splitlines():
            if "/api/debug-env" in line:
                assert "resolved" in line.lower() or "removed" in line.lower(), line

    def test_it_still_records_that_the_route_existed(self):
        """지우지 않고 남긴다. 왜 지웠는지가 사라지면 다음 사람이 다시 만든다."""
        assert "/api/debug-env" in self.document()


class TestTheResolvedRisksStayResolved:
    """문서가 "해결됐다"고 적은 것들. **적어두는 것과 지켜지는 것은 다르다** —
    이 파일이 존재하는 이유가 정확히 그 차이이므로, 같은 문서의 나머지 주장도
    여기서 붙잡는다.

    2026-08-22에 다시 재면서 문서에 쓴 문장 하나를 스스로 정정했다. "설정 없이
    부팅하면 죽는다"고 적었는데 실제로는 **배포로 판단될 때만** 그렇고 로컬에서는
    난수를 만들어 저장한다. 과장이 아니라 사실을 적는 것이 이 문서의 일이다.
    """

    def source(self) -> str:
        return executable(assembled())

    def test_the_jwt_secret_has_no_literal_default(self):
        assert 'os.getenv("JWT_SECRET", "modelmate' not in self.source()
        assert 'getenv("JWT_SECRET", "").strip()' in self.source()

    def test_a_hosted_deployment_refuses_to_boot_without_one(self):
        body = self.source()
        assert "is_hosted_deployment()" in body
        assert "JWT_SECRET이 설정되지 않았다" in body

    def test_the_admin_password_has_no_default(self):
        """`os.getenv("ADMIN_PASSWORD", "something")`이면 저장소에 적힌 값으로
        관리자가 로그인된다. 없으면 **비밀번호 없는 계정**이어야 한다."""
        assert 'getenv("ADMIN_PASSWORD", "").strip()' in self.source()

    def test_only_the_documented_list_grants_admin(self):
        """`ADMIN_EMAIL`(단수)을 따로 읽던 두 번째 시딩 경로가 있었다 —
        `get_admin_emails()`가 무시하는 주소를 관리자로 만들었다."""
        body = self.source()
        assert body.count("get_admin_emails()") >= 1
        assert 'INSERT INTO users' in body
        for line in body.splitlines():
            if 'getenv("ADMIN_EMAIL"' in line:
                assert "ADMIN_EMAILS" in line, line

    def test_runtime_state_is_not_tracked(self):
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        for name in ("modelmate.db", "uploaded_datasets/"):
            assert name in ignored, name
