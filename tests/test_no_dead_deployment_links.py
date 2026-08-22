"""죽은 링크는 없는 링크보다 나쁘다 — README만 그렇게 하고 있었다.

Railway 인스턴스는 무료 플랜 만료로 내려갔다. README는 그걸 적고 주소를 지우면서
"죽은 링크는 없는 링크보다 나쁘다"고 썼는데, `docs/` 안 일곱 문서는 같은 주소를
그대로 들고 있었다. 전부 404다. 저장소가 한 파일에서 원칙을 말하고 일곱 파일에서
어기고 있었던 셈이다.

가장 나쁜 건 `docs/prediction-api.md`였다. 예측 API 사용법을 설명하면서 존재하지
않는 호스트로 `curl` 예시를 준다 — 따라 한 사람은 아무것도 못 얻는다.

대부분은 `--base-url <주소>` 형태의 QA 명령이었고, 로컬 주소로 바꾸니 **실제로
동작한다.** 지난 QA 실행 보고서 하나는 그때 그 주소로 통과한 것이 사실이므로
`<!-- historical: ... -->`로 선언했다.

이 테스트는 네트워크를 쓰지 않는다. "이 주소는 지금 살아 있는가"가 아니라
"우리가 죽었다고 아는 주소를 살아 있는 것처럼 적고 있는가"를 묻기 때문이고,
후자는 확정적으로 답할 수 있다. 네트워크에 의존하는 검사는 인터넷이 끊긴 CI에서
조용히 통과하는 검사다.
"""

import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

# 내려간 배포. 다시 살릴 수는 있지만 이 주소로는 아니다.
RETIRED_HOSTS = ("web-production-5d6fa.up.railway.app",)

# **선언**과 **언급**은 다르다.
#
# 예전 정규식은 `<!--\s*historical:`을 파일 어디에서든 찾았다. 그래서 이 관례를
# **설명하는 문장**이 있는 문서가 통째로 면제됐다 — 2026-08-22에 `README.md`가
# 그 상태였다. 349줄에 "…은 각자 `<!-- historical: -->`로 선언돼 있다"고 적었고,
# 그 한 문장이 **가장 많이 읽히는 문서를 모든 living-document 검사에서 빼버렸다.**
# 두 회차 전에 아카이브를 정리하며 내가 쓴 문장이다.
#
# 이 프로젝트가 자기 테스트에서 여러 번 만난 함정("인용과 사용")이 면제 장치 안에
# 있었다. 진짜 선언은 **줄 시작에, 문서 앞쪽에** 있다 — 추적되는 17개 중 15개가
# 2~3줄이었고, 어긋난 둘은 정확히 산문 언급이었다.
HISTORICAL = re.compile(r"^\s*<!--\s*historical:", re.MULTILINE)
DECLARATION_WITHIN_LINES = 15


def declared_historical(text: str) -> bool:
    """문서 앞쪽에 줄 시작으로 놓인 선언만 인정한다."""
    head = "\n".join(text.splitlines()[:DECLARATION_WITHIN_LINES])
    return bool(HISTORICAL.search(head))

SKIP_DIRECTORIES = {".git", "node_modules", "__pycache__", "archive"}


def documents() -> list[Path]:
    """저장소가 담고 있는 문서. 디스크가 아니라 git에 묻는다.

    형제 저장소를 체크아웃하는 CI 잡에서 `rglob`이 남의 문서까지 집어
    수집 개수가 흔들린 적이 있다.
    """
    listed = subprocess.run(["git", "ls-files", "*.md", "**/*.md"], cwd=ROOT,
                            capture_output=True, text=True, timeout=30)
    names = set(listed.stdout.split()) if listed.returncode == 0 else set()
    return sorted(
        ROOT / name for name in names
        if not SKIP_DIRECTORIES & set(Path(name).parts) and (ROOT / name).exists()
    )


def living_documents() -> list[Path]:
    return [path for path in documents()
            if not declared_historical(path.read_text(encoding="utf-8", errors="replace"))]


def test_no_living_document_points_at_a_retired_deployment():
    """문서 하나당 테스트 하나가 아니라, 한 성질에 테스트 하나다.

    처음에는 문서마다 파라미터를 걸었다 - 어느 문서가 걸렸는지 pytest가 이름으로
    알려주니까. 그랬더니 이 파일 하나가 88개를 만들었고 저장소 합계가 427에서
    515로 뛰었다. **테스트 수가 뜻을 갖도록 CI까지 만들어놓고 그 숫자를 내가
    부풀린 셈이다.** 검사하는 성질은 하나뿐인데 문서가 늘면 숫자가 늘었다.

    지금은 전부 모아 한 번에 보고한다. 어느 문서인지는 실패 메시지가 말한다 -
    파라미터 이름이 해주던 일이고, 그것 때문에 개수를 왜곡할 이유는 없다.
    """
    offenders = []
    for path in living_documents():
        text = path.read_text(encoding="utf-8", errors="replace")
        found = [host for host in RETIRED_HOSTS if host in text]
        if found:
            offenders.append(f"{path.relative_to(ROOT)} → {', '.join(found)}")
    assert not offenders, (
        "내려간 배포를 가리키는 문서:\n  " + "\n  ".join(offenders)
        + "\n현재 안내라면 주소를 고치고, 과거 기록이라면 <!-- historical: 시점 -->으로 선언하라."
    )


class TestTheCheckIsNotVacuous:
    """전부 통과했다는 결과는, 검사가 문서를 보지 않았어도 똑같이 나온다."""

    def test_it_looked_at_documents(self):
        assert len(living_documents()) >= 20

    def test_something_was_declared_historical(self):
        """선언 기능이 실제로 쓰이고 있는지. 아무도 선언하지 않는다면 그 분기는
        한 번도 실행되지 않는 코드다."""
        declared = set(documents()) - set(living_documents())
        assert declared, "historical 선언이 하나도 없다"

    def test_a_retired_host_in_a_living_document_fails(self, tmp_path):
        doc = tmp_path / "live.md"
        doc.write_text(f"보세요: https://{RETIRED_HOSTS[0]}/upload\n", encoding="utf-8")
        text = doc.read_text(encoding="utf-8")
        assert any(host in text for host in RETIRED_HOSTS)
        assert not declared_historical(text)

    def test_the_same_host_in_a_declared_record_is_allowed(self, tmp_path):
        """기록이 당시 주소를 적는 것은 정확한 서술이다. 그걸 고치면 낡은 문서가
        관리되는 것처럼 보인다."""
        doc = tmp_path / "record.md"
        doc.write_text(f"<!-- historical: 2026-06 -->\n당시 https://{RETIRED_HOSTS[0]} 기준\n",
                       encoding="utf-8")
        assert declared_historical(doc.read_text(encoding="utf-8"))

    def test_the_retired_list_is_not_empty(self):
        """`RETIRED_HOSTS = ()`는 모든 문서를 통과시키면서 검사처럼 보인다."""
        assert RETIRED_HOSTS

    def test_the_readme_still_says_why(self):
        """이 검사의 근거가 되는 문장. 사라지면 검사만 남고 이유가 없어진다."""
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        assert "죽은 링크는 없는 링크보다 나쁘다" in readme


class TestAMentionIsNotADeclaration:
    """관례를 **설명하는 문장**이 문서를 면제시키면 안 된다.

    2026-08-22에 `README.md`가 그 상태였다. 349줄에 "…은 각자
    `<!-- historical: -->`로 선언돼 있다"고 적혀 있었고, 옛 정규식은 그것을 선언으로
    읽었다. **가장 많이 읽히는 문서가 모든 living-document 검사에서 빠져 있었다** —
    두 회차 전에 아카이브를 정리하며 내가 쓴 한 문장 때문이다.

    조용히 빠졌다는 것이 요점이다. 아무 검사도 "살아 있는 문서 수가 줄었다"고 말하지
    않았다. 다시 넣자마자 `check_doc_paths.py`가 **가려져 있던 죽은 링크 둘**을 찾아냈고,
    둘 다 내가 쓴 아카이브 README에 있었다(존재하지 않는 스냅숏, 저장소 밖 경로).

    진짜 선언은 **줄 시작에, 문서 앞쪽에** 있다. 추적되는 17개 중 15개가 2~3줄이었고
    어긋난 둘은 정확히 산문 언급이었다.
    """

    def test_a_prose_mention_does_not_exempt(self):
        text = "# 제목\n\n관례는 `<!-- historical: 시점 -->`으로 적는다.\n"
        assert not declared_historical(text)

    def test_a_real_declaration_exempts(self):
        text = "# 제목\n<!-- historical: 2026-06 -->\n> 이 문서는 기록이다.\n"
        assert declared_historical(text)

    def test_a_declaration_far_down_does_not_count(self):
        """문서 끝에 붙인 표시는 선언이 아니다 — 읽는 사람은 앞을 보고 판단한다."""
        text = "# 제목\n" + "본문\n" * 40 + "<!-- historical: 2026-06 -->\n"
        assert not declared_historical(text)

    def test_the_readme_is_a_living_document_again(self):
        assert any(path.name == "README.md" and path.parent == ROOT
                   for path in living_documents())

    def test_the_real_records_are_still_exempt(self):
        """넓히다가 진짜 기록까지 끌고 들어오면 그 문서들이 거짓 실패를 낸다."""
        for name in ("CODEX_HANDOFF.md", "TEAM_SPLIT.md", "QA_CHECKLIST.md"):
            path = ROOT / name
            if path.exists():
                assert declared_historical(path.read_text(encoding="utf-8")), name
