"""pytest·스모크 두 측정을 합쳐 기록(coverage-record) 모양의 요약을 낸다.

    python3 scripts/measure_part_coverage.py --json /tmp/a.json
    ADMIN_PASSWORD=<아무 값> python3 scripts/measure_part_coverage.py --smoke --json /tmp/b.json
    python3 scripts/combine_coverage.py /tmp/a.json /tmp/b.json

### 이 스크립트가 존재하는 이유

`docs/coverage-record.json`은 `functions_never_run: 12`를 들고 있었고, `command`
필드는 위의 두 `--json` 실행을 가리켰다. **그 두 명령은 함수 통계를 내지 않는다** —
파일별 줄 목록뿐이다. 기록이 자기 명령으로 재현할 수 없는 값을 담고 있었고,
빠른 검사는 "명령이 적혀 있는가"만 봤지 **그 명령이 기록의 모든 값을 만드는가**는
안 물었다.

2026-08-24에 합집합을 다시 재니 안 도는 함수가 43이었다(합집합 66.2%). 12가
어떻게 나온 수인지는 재구성할 수 없었다 — 그래서 계산을 이 파일로 저장소에 넣는다.
**다음 사람은 세 명령으로 기록의 모든 필드를 다시 만들 수 있다.**

### ADMIN_PASSWORD

스모크 열다섯 중 둘(pilot_inquiry·usage_limits)은 관리자 비밀번호가 없으면
"돌지 않았다"로 빠진다. 그 상태의 측정은 **합집합을 조용히 낮게 잰다** — 처음
잰 값(합집합 65.4%·함수 45개)이 그랬고, 도구가 안 돈 스크립트를 이름으로
말해줘서 잡았다. 스모크 로그에 `ok`가 아닌 줄이 있으면 이 합산은 그 측정을
받지 않는 것이 맞다.

### 줄 매핑

part-로컬 줄 번호를 blob 전역으로 되돌릴 때 `assemble()`의 스팬을 쓴다.
넣기 전에 확인했다: 무작위 8개 지점에서 로컬 줄 원문과 전역 줄 원문이 같다.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))

import measure_part_coverage as mpc  # noqa: E402


def to_global(per_file: dict, spans) -> set[int]:
    out: set[int] = set()
    for start, _end, name in spans:
        for local in per_file.get(name, {}).get("missed", []):
            out.add(start + local - 1)
    return out


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if len(args) != 2:
        print("사용법: combine_coverage.py <pytest.json> <smoke.json>")
        return 2
    a = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    b = json.loads(Path(args[1]).read_text(encoding="utf-8"))

    blob, spans = mpc.assemble()
    statements = mpc.statement_lines(blob)
    total = sum(v["statements"] for v in a.values())
    if total != len(statements):
        # 측정과 지금 소스가 다르면 함수 귀속이 어긋난다 — 조용히 계속하지 않는다.
        print(f"FAILED — 측정 당시 문 수({total})와 지금({len(statements)})이 다르다. "
              "소스가 바뀌었다. 다시 재라.")
        return 1

    def pct(missed: int) -> float:
        return round((total - missed) / total * 100, 1)

    union_missed_local = sum(
        len(set(a[k]["missed"]) & set(b.get(k, {}).get("missed", []))) for k in a)
    executed = statements - (to_global(a, spans) & to_global(b, spans))
    rows = mpc.function_rows(blob, statements, executed, spans)
    untouched = [row for row in rows if row[0] == row[1]]

    summary = {
        "statements": total,
        "pytest_percent": pct(sum(len(v["missed"]) for v in a.values())),
        "smoke_percent": pct(sum(len(b.get(k, {"missed": []})["missed"]) for k in a)),
        "union_percent": pct(union_missed_local),
        "functions": len(rows),
        "functions_never_run": len(untouched),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    for row in untouched:
        print(f"  안 도는 함수: {row[2]}  {row[3]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
