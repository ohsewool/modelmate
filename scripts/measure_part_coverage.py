"""`.part` 파일들의 커버리지. coverage.py가 못 하는 것을 대신한다.

`backend/main.py`는 `main_parts/*.part`를 이어붙여 한 번에 `exec`한다. 컴파일할 때
넘기는 파일명이 **디렉터리 경로**라서, coverage.py는 그 이름을 파일로 열지 못하고
아무것도 보고하지 않는다. 형제 저장소 넷은 2026-08-22에 분기 커버리지 100% 관문을
얻었는데 여기만 **잴 방법이 없다**고 로드맵에 적혀 있었다.

잴 방법은 있었다. 이어붙인 소스는 유효한 파이썬이고, 줄 번호는 되돌릴 수 있다 —
파일 사이에 `"\\n".join`이 한 줄을 넣으므로 그 한 줄만 더하면 정확히 맞는다. 같은
매핑을 지난 회차에 `HTTPException` 발생 지점을 기록할 때 이미 확인했다.

    python3 scripts/measure_part_coverage.py                 # 전체 스위트
    python3 scripts/measure_part_coverage.py --top 20        # 안 돌던 곳이 많은 순
    python3 scripts/measure_part_coverage.py --by function   # 파일이 아니라 함수 단위로
    python3 scripts/measure_part_coverage.py --smoke         # pytest 대신 스모크 스크립트
    python3 scripts/measure_part_coverage.py tests/test_x.py # 일부만

**`.part` 경계는 기능 경계가 아니다.** 한 함수가 두 파일에 걸쳐 있는 곳이 있어서
파일별 표는 "이 파일은 0%"를 "이 기능은 안 시험된다"로 읽히게 만든다 — 실제로는
앞 파일에서 시작한 함수의 꼬리다. `--by function`이 뜻이 있는 단위다.

**스모크를 빼고 재면 숫자가 과장된다.** 이 저장소의 검사는 pytest만이 아니다.
`scripts/run_*_smoke.py`가 살아 있는 서버를 상대로 업로드·학습·예측 사슬을 돌린다.
`--smoke`는 앱을 이 프로세스 안에 띄우고(그래야 추적이 걸린다) 그 스크립트들을
상대로 돌린다.

`sys.settrace`는 느리다. 우리 프레임이 아니면 즉시 `None`을 돌려주므로 프레임당 한
번만 호출되고, 그래도 스위트가 두 배쯤 걸린다. **관문으로 쓸 물건이 아니라 어디를
봐야 하는지 알려주는 물건**이다 — 그 구분을 적어두지 않으면 다음 사람이 CI에 넣는다.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "backend" / "main_parts"

# `scripts/`에서 부르면 저장소 뿌리가 경로에 없다. pytest는 `conftest`가 넣어주지만
# `--smoke`는 여기서 직접 `backend.main`을 import하므로 우리가 넣어야 한다.
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def assemble() -> tuple[str, list[tuple[int, int, str]]]:
    """이어붙인 소스와, (시작줄, 끝줄, 파일명) 목록.

    `main.py`가 하는 것과 **같은 방식**이어야 한다. 다르면 줄 번호가 어긋나고,
    어긋난 줄 번호는 틀린 보고서를 확신 있게 낸다.
    """
    sources, spans, cursor = [], [], 1
    for part in sorted(PARTS.glob("*.part")):
        text = part.read_text(encoding="utf-8-sig")
        lines = len(text.splitlines())
        spans.append((cursor, cursor + lines - 1, part.name))
        cursor += lines + 1          # join이 사이에 넣는 한 줄
        sources.append(text)
    return "\n".join(sources), spans


def statement_lines(blob: str) -> set[int]:
    """문이 시작하는 줄. `ast`가 세는 것이지 coverage.py가 세는 것과 완전히 같지는
    않다(둘 다 "실행 가능한 줄"의 근사다). 절대값보다 **어디가 0인가**를 본다."""
    return {node.lineno for node in ast.walk(ast.parse(blob))
            if isinstance(node, ast.stmt)}


def run(pytest_args: list[str]) -> set[int]:
    import pytest

    target = str(PARTS)
    seen: set[int] = set()

    def line_tracer(frame, event, arg):
        if event == "line":
            seen.add(frame.f_lineno)
        return line_tracer

    def tracer(frame, event, arg):
        # 우리 프레임이 아니면 `None`을 돌려 그 프레임의 줄 추적을 꺼버린다.
        # 이것이 없으면 pytest 자체를 줄 단위로 따라가며 몇 시간이 걸린다.
        if frame.f_code.co_filename == target:
            seen.add(frame.f_lineno)
            return line_tracer
        return None

    threading.settrace(tracer)
    sys.settrace(tracer)
    try:
        pytest.main(pytest_args)
    finally:
        sys.settrace(None)
        threading.settrace(None)
    return seen


def function_rows(blob: str, statements: set[int], executed: set[int],
                  spans: list[tuple[int, int, str]]) -> list[tuple]:
    """함수 단위 집계. 파일 단위보다 이것이 읽을 수 있는 단위다."""
    def where(lineno: int) -> str:
        for start, end, name in spans:
            if start <= lineno <= end:
                return f"{name}:{lineno - start + 1}"
        return str(lineno)

    rows = []
    for node in ast.walk(ast.parse(blob)):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            body = ({inner.lineno for inner in ast.walk(node)
                     if isinstance(inner, ast.stmt)} & statements) - {node.lineno}
            if body:
                rows.append((len(body - executed), len(body), node.name, where(node.lineno)))
    rows.sort(reverse=True)
    return rows


def run_smoke(scripts: list[str], port: int) -> set[int]:
    """앱을 **이 프로세스 안에** 띄우고 스모크 스크립트를 상대로 돌린다.

    CI는 `uvicorn`을 별도 프로세스로 띄운다. 그러면 추적이 그 프로세스 안에 없어서
    아무것도 못 본다 - 그래서 여기서는 스레드로 띄운다. 측정하려고 실행 방식을
    바꾼 것이므로, **이 숫자는 CI가 돌리는 그 배치와 완전히 같지는 않다.**
    """
    import subprocess
    import time

    import uvicorn

    target = str(PARTS)
    seen: set[int] = set()

    def line_tracer(frame, event, arg):
        if event == "line":
            seen.add(frame.f_lineno)
        return line_tracer

    def tracer(frame, event, arg):
        if frame.f_code.co_filename == target:
            seen.add(frame.f_lineno)
            return line_tracer
        return None

    threading.settrace(tracer)
    sys.settrace(tracer)
    server = None
    try:
        from backend.main import app

        config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
        server = uvicorn.Server(config)
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()
        for _ in range(100):
            if server.started:
                break
            time.sleep(0.1)
        if not server.started:
            print("FAILED — 서버가 뜨지 않았다. 이 측정은 아무것도 보지 않았다.")
            return set()
        base = f"http://127.0.0.1:{port}"
        for script in scripts:
            finished = subprocess.run(
                [sys.executable, script, "--base-url", base],
                cwd=ROOT, capture_output=True, text=True, timeout=1800,
                env=os.environ)  # 관리자 비밀번호를 요구하는 둘은 ADMIN_PASSWORD로 넘긴다
            # **2는 실패가 아니라 사용법 오류다.** 둘을 같은 표시로 묶으면 "이
            # 스모크는 실패했다"로 읽히고, 실제로는 **아예 돌지 않은 것**이라
            # 커버리지에서 통째로 빠진다. 이 프로젝트가 감사 도구에서 한 번 크게
            # 당한 구분이다(없는 플러그인 인자로 pytest가 rc=4를 냈고 그것을
            # "잡힘"으로 읽었다).
            if finished.returncode == 2:
                mark = "인자 부족(2) — 돌지 않았다"
                first = (finished.stdout + finished.stderr).strip().splitlines()
                if first:
                    mark += f": {first[-1][:60]}"
            else:
                mark = "ok" if finished.returncode == 0 else f"실패 rc={finished.returncode}"
            print(f"  {Path(script).name:<38} {mark}", flush=True)
    finally:
        if server is not None:
            server.should_exit = True
        sys.settrace(None)
        threading.settrace(None)
    return seen


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pytest_args", nargs="*", default=None,
                        help="pytest에 넘길 인자 (기본: tests/)")
    parser.add_argument("--top", type=int, default=0, help="안 돌던 줄이 많은 파일 N개만")
    parser.add_argument("--json", type=Path, default=None, help="결과를 여기에 쓴다")
    parser.add_argument("--by", choices=("file", "function"), default="file",
                        help="집계 단위. `.part` 경계는 기능 경계가 아니다")
    parser.add_argument("--smoke", action="store_true",
                        help="pytest 대신 스모크 스크립트로 잰다")
    parser.add_argument("--port", type=int, default=8321, help="--smoke가 쓸 포트")
    arguments = parser.parse_args(argv)

    blob, spans = assemble()
    statements = statement_lines(blob)
    if not statements:
        print("FAILED — 문을 하나도 찾지 못했다. 이 측정은 아무것도 보지 않았다.")
        return 1

    if arguments.smoke:
        scripts = arguments.pytest_args or sorted(
            str(path.relative_to(ROOT)) for path in (ROOT / "scripts").glob("run_*_smoke.py"))
        print(f"스모크 {len(scripts)}개를 이 프로세스의 서버(:{arguments.port})에 돌린다\n")
        executed = run_smoke(scripts, arguments.port)
    else:
        args = arguments.pytest_args or ["tests/"]
        executed = run([*args, "-q", "-p", "no:cacheprovider", "--no-header"])
    if not executed:
        # 추적이 걸리지 않았는데 "전부 미실행"으로 보고하면, 스위트가 멀쩡한 날에도
        # 재앙처럼 보인다. 이 프로젝트가 반복해서 잡아온 "빈손을 결과로 착각하기"다.
        print("FAILED — 이어붙인 소스에서 실행된 줄을 하나도 보지 못했다. "
              "추적이 걸리지 않았거나 스위트가 앱을 import하지 않았다.")
        return 1

    per_file: dict[str, dict] = {}
    for start, end, name in spans:
        local = {line for line in statements if start <= line <= end}
        missed = sorted(line - start + 1 for line in local - executed)
        per_file[name] = {"statements": len(local), "missed": missed}

    total_statements = sum(item["statements"] for item in per_file.values())
    missed_total = sum(len(item["missed"]) for item in per_file.values())
    covered = total_statements - missed_total

    if arguments.by == "function":
        rows = function_rows(blob, statements, executed, spans)
        untouched = [row for row in rows if row[0] == row[1]]
        shown = rows[:arguments.top] if arguments.top else untouched
        width = max((len(row[2]) for row in shown), default=10)
        for gone, total, name, at in shown:
            print(f"  {total:>4}줄  {gone:>4} 미실행  {name:<{width}}  {at}")
        print(f"\n함수 {len(rows)}개 중 **한 줄도 안 돌아본 것 {len(untouched)}개**")
        print(f"{covered}/{total_statements} 문 실행 ({covered / total_statements:.1%})")
        if arguments.json:
            arguments.json.write_text(json.dumps(per_file, ensure_ascii=False, indent=1),
                                      encoding="utf-8")
            print(f"\n{arguments.json}에 썼다")
        return 0

    rows = sorted(per_file.items(), key=lambda item: -len(item[1]["missed"]))
    if arguments.top:
        rows = rows[:arguments.top]
    width = max(len(name) for name, _ in rows)
    print(f"{'part':<{width}}  {'stmts':>6} {'missed':>7} {'cover':>6}")
    for name, item in rows:
        if not item["statements"]:
            continue
        hit = item["statements"] - len(item["missed"])
        print(f"{name:<{width}}  {item['statements']:>6} {len(item['missed']):>7} "
              f"{hit / item['statements']:>5.0%}")
    print(f"\n{covered}/{total_statements} 문 실행 ({covered / total_statements:.1%}), "
          f"안 돌던 줄 {missed_total}")

    if arguments.top:
        print(f"\n(안 돌던 줄이 많은 {arguments.top}개만 보였다 — 전체는 --top 없이)")

    if arguments.json:
        arguments.json.write_text(json.dumps(per_file, ensure_ascii=False, indent=1),
                                  encoding="utf-8")
        print(f"\n{arguments.json}에 썼다")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
