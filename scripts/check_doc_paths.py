"""문서가 링크하거나 경로로 부르는 파일이 실제로 있는가.

문서가 파일 이름을 대는 것은 "여기 가면 있다"는 주장이고, 확인할 수 있는 주장은
확인해야 한다. `backend/main_parts/*.py`는 `09a1116`(2026-06-11)에 `*.part`가 됐고,
그걸 가리키는 문서 18곳은 두 달 넘게 없는 파일을 가리키고 있었다. 아무도 클릭해
보지 않았기 때문에 아무도 몰랐다.

**낡았다는 것이 선언이면 기록이고, 선언이 아니면 사고다.** 지난 발표나 인수인계의
기록은 당시 경로를 가리키는 것이 맞다 - 그걸 조용히 고치면 낡은 문서가 관리되는
것처럼 보인다. 그래서 문서는 첫 줄 근처에 `<!-- historical: 언제 -->`를 달아 스스로
기록임을 선언할 수 있고, 검사는 그런 문서를 건너뛴다.

세는 것은 둘뿐이다:

  - 마크다운 링크의 상대 경로   `[이름](docs/X.md)`
  - 확장자가 있는 백틱 경로     `` `core/ledger.py` ``

산문 속 파일명(`ledger.py`)은 경로가 아니라 지칭이므로 세지 않는다. 첫 판은 그것까지
세어 740건 중 161건 "없음"이라는 무의미한 숫자를 냈다. `tools/call` 같은 JSON-RPC
메서드명이나 `text/csv` 같은 MIME 타입도 슬래시가 있다는 이유로 경로로 집혔다.
**검사기가 틀리면 결론도 틀린다.**

    python3 scripts/check_doc_paths.py
    python3 scripts/check_doc_paths.py --control   # 검사가 실제로 잡는지 확인
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LINK = re.compile(r"\[[^\]]*\]\((?!https?:|#|mailto:)([^)\s]+)\)")
EXTENSIONS = "py|md|toml|yml|yaml|json|jsonl|csv|part|txt|cfg|sh|js|css|pkl|db"
BACKTICK = re.compile(rf"`([A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+\.(?:{EXTENSIONS}))`")
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


# 에이전트 작업 노트. 저장소의 주장이 아니라 그때의 작업 기록이라 검사 대상이 아니다.
SKIP_DIRECTORIES = (".codex", ".codex-prompts", ".agents", "node_modules", ".git")


def documents() -> list[Path]:
    return [
        path for path in sorted(ROOT.rglob("*.md"))
        if not any(part in SKIP_DIRECTORIES for part in path.relative_to(ROOT).parts)
    ]


def broken(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    if declared_historical(text):
        return []
    missing = []
    for pattern in (LINK, BACKTICK):
        for match in pattern.finditer(text):
            reference = match.group(1).split("#")[0].strip()
            if not reference or reference.endswith("/"):
                continue
            if (ROOT / reference).exists() or (path.parent / reference).exists():
                continue
            if reference not in missing:
                missing.append(reference)
    return missing


def control() -> int:
    """검사가 실제로 잡는지 확인한다.

    전부 통과했다는 결과는 그 자체로는 아무것도 증명하지 않는다 - 정규식이
    아무것도 매칭하지 않아도 출력이 똑같다. 없는 경로를 가리키는 문서를 하나
    만들어 잡히는지 보고, 그 문서에 historical 선언을 붙이면 넘어가는지 본다.
    """
    scratch = Path(tempfile.mkdtemp(dir=ROOT)) / "control.md"
    scratch.parent.mkdir(exist_ok=True)
    try:
        scratch.write_text("# control\n\n[없는 것](docs/does-not-exist.md)\n"
                           "그리고 `backend/nowhere/absent.py`도.\n", encoding="utf-8")
        found = broken(scratch)
        if len(found) != 2:
            print(f"✗ 대조 실패: 없는 경로 2건을 넣었는데 {len(found)}건 잡았다 — {found}")
            return 1
        print(f"✓ 없는 경로를 잡는다 ({', '.join(found)})")

        scratch.write_text("# control\n\n<!-- historical: 2020 -->\n"
                           "[없는 것](docs/does-not-exist.md)\n", encoding="utf-8")
        if broken(scratch):
            print("✗ 대조 실패: historical 선언을 무시했다")
            return 1
        print("✓ historical 선언은 존중한다")

        scratch.write_text("# control\n\n[있는 것](README.md)\n"
                           "그리고 `scripts/check_doc_paths.py`도.\n", encoding="utf-8")
        if broken(scratch):
            print("✗ 대조 실패: 있는 경로를 없다고 했다")
            return 1
        print("✓ 있는 경로는 통과시킨다")
        return 0
    finally:
        scratch.unlink(missing_ok=True)
        scratch.parent.rmdir()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--control", action="store_true",
                        help="검사가 실제로 잡는지만 확인하고 끝낸다")
    arguments = parser.parse_args(argv)

    if control():
        return 1
    if arguments.control:
        return 0

    found = documents()
    if not found:
        # "훑어서 안 나왔다"와 "안 훑었다"는 다르다.
        print("FAILED — 훑은 문서가 없다. 이 결과는 아무 뜻도 없다.")
        return 1

    failures = 0
    checked = skipped = 0
    for path in found:
        if declared_historical(path.read_text(encoding="utf-8", errors="replace")):
            skipped += 1
            continue
        checked += 1
        missing = broken(path)
        failures += len(missing)
        for reference in missing:
            print(f"  ✗ {path.relative_to(ROOT)}: {reference}")

    print(f"\n문서 {checked}개 확인, {skipped}개는 기록으로 선언돼 건너뜀")
    if failures:
        print(f"{failures}건이 없는 곳을 가리킨다")
        return 1
    print("가리키는 곳이 전부 있다")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
