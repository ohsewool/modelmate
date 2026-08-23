"""도달은 하는데 아무도 확인하지 않는 거부를 찾는다.

거부에는 세 가지 상태가 있고, 초록불은 셋을 구별하지 않는다.

    한 번도 도달하지 않는다     커버리지가 말해준다
    도달하고 확인된다           바꾸면 검사가 빨간불이 된다
    **도달하는데 확인되지 않는다**  ← 커버리지는 "돌았다"고 하고, 검사는 통과한다

가운데와 마지막이 화면에서 같아 보인다. 커버리지는 그 줄이 실행됐다고 말하지만,
**실행된 것과 그 결과를 누가 단언하는 것은 다르다.**

2026-08-23에 이 도구가 넷을 찾았다. 셋은 `assert status_code != 410` 같은 **부정
단언**이 지나가는 자리였다 — "이건 아니다"는 무엇이 왔는지 묻지 않는다. 하나는
다른 겹의 계약(`success is False`)만 단언하는 검사가 지나가는 자리였다.

    010_upload.part:75              CSV가 데이터셋으로 보기 어렵다
    012_set_target.part:14          없는 컬럼을 타깃으로 골랐다
    072_deploy_static_b.part:140    모델 파일이 디스크에 없다
    086_deploy_stable_api.part:80   같은 것, v2 쌍둥이

**어떻게 재는가.** 두 단계다.

    1. 스위트를 한 번 돌리며 `HTTPException.__init__`을 감싸,
       (검사 nodeid, 상태, 조각:줄)을 적는다
    2. 지점마다 상태 코드를 599로 바꾸고 **그 지점을 지나는 검사만** 돌린다.
       여전히 통과하면 그 지점은 확인되지 않는 것이다

2번이 이 도구가 쓸 만한 이유다. 지점이 백 개여도 지점당 검사는 보통 한둘이라,
전체 스위트를 백 번 돌리는 대신 **필요한 것만** 돌린다.

**관문으로 쓸 물건이 아니다.** 1단계가 스위트 한 번, 2단계가 지점 수만큼의 부분
실행이라 십몇 분 걸린다. `measure_part_coverage.py`와 같은 자리에 있는 도구다 —
어디를 봐야 하는지 알려주는 물건이지 매 푸시마다 도는 물건이 아니다.

    python3 scripts/find_unasserted_refusals.py              # 전체
    python3 scripts/find_unasserted_refusals.py --trace-only # 1단계만
    python3 scripts/find_unasserted_refusals.py --from FILE  # 저장한 추적으로 2단계만

**`--from`은 낡을 수 있다.** 추적은 "그때 어느 검사가 어느 줄을 지났는가"이고,
그 뒤에 검사를 추가하면 새 검사는 그 지도에 없다. 실제로 그 넷을 고친 직후 옛
추적으로 돌려보니 하나가 여전히 "확인 안 됨"으로 나왔다 — 고친 검사가 지도에 없어서
그 지점을 지나는 검사로 옛것만 돌린 것이다. **지도가 낡으면 이 도구는 옛 상태를
보고한다.** 검사를 고쳤으면 추적부터 다시 뜬다.
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))

from part_source import assembled  # noqa: E402

PLUGIN = '''
import json, os, traceback, sys
from pathlib import Path
sys.path.insert(0, {tests!r})
from part_source import assembled

_PARTS = assembled()
_OUT = os.environ["UNASSERTED_TRACE"]
_current = {{"nodeid": None}}
_records = []

def pytest_runtest_protocol(item, nextitem):
    _current["nodeid"] = item.nodeid
    return None

def pytest_sessionstart(session):
    from fastapi import HTTPException
    original = HTTPException.__init__

    def traced(self, status_code, detail=None, headers=None, **kwargs):
        # **한 프레임만 보면 공장을 지나는 거부를 놓친다.**
        # `raise usage_limit_error(...)`는 헬퍼 안에서 HTTPException을 만든다.
        # 가장 안쪽 프레임만 적으면 여섯 호출자가 전부 그 헬퍼 한 줄로 뭉친다.
        # 안쪽부터 몇 개를 적고, 훑는 쪽이 아는 `raise` 자리를 고르게 한다.
        chain = []
        for frame in traceback.extract_stack()[:-1][::-1]:
            if frame.filename.endswith("main_parts"):
                try:
                    chain.append(
                        f"{{_PARTS.owner(frame.lineno)}}:{{_PARTS.local_line(frame.lineno)}}")
                except Exception:
                    pass
                if len(chain) >= 4:
                    break
        _records.append({{"test": _current["nodeid"], "chain": chain,
                          "where": chain[0] if chain else None}})
        return original(self, status_code, detail, headers, **kwargs)

    HTTPException.__init__ = traced

def pytest_sessionfinish(session, exitstatus):
    Path(_OUT).write_text(json.dumps(_records), encoding="utf-8")
'''


def trace(destination: Path) -> None:
    """1단계. 어느 검사가 어느 `raise`를 지나는가."""
    holder = Path(tempfile.mkdtemp())
    (holder / "unasserted_trace_plugin.py").write_text(
        PLUGIN.format(tests=str(ROOT / "tests")), encoding="utf-8")
    environment = {"PYTHONPATH": str(holder), "UNASSERTED_TRACE": str(destination)}
    import os
    finished = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-p", "unasserted_trace_plugin"],
        cwd=ROOT, env={**os.environ, **environment}, capture_output=True, text=True)
    if not destination.exists():
        raise SystemExit(f"추적이 남지 않았다. pytest 출력:\n{finished.stdout[-2000:]}")


def raise_sites() -> dict[str, tuple[str, int, str]]:
    """`raise`가 거부를 내는 자리. **공장을 거치는 것도 센다.**

    처음에는 `raise HTTPException(...)`만 봤고 102개를 셌다. `usage_limit_error`는
    HTTPException을 **돌려주는** 헬퍼라 호출자들은 `raise usage_limit_error(...)`로
    쓴다 — 그 여섯이 통째로 안 보였다. 사용량 한도 429는 요금제를 지키는 자리다.
    """
    parts = assembled()
    factories = {node.name for _, node in parts.functions()
                 for inner in ast.walk(node)
                 if isinstance(inner, ast.Return) and isinstance(inner.value, ast.Call)
                 and ast.unparse(inner.value.func).endswith("HTTPException")}
    sites = {}
    for _, node in parts.functions():
        for inner in ast.walk(node):
            if not (isinstance(inner, ast.Raise) and isinstance(inner.exc, ast.Call)):
                continue
            called = ast.unparse(inner.exc.func)
            if called.endswith("HTTPException") or called.split("(")[0] in factories:
                sites[parts.where(inner)] = (
                    parts.owner(inner.lineno), parts.local_line(inner.lineno), node.name)
    return sites


def sweep(trace_file: Path) -> int:
    """2단계. 지점마다 상태를 599로 바꾸고 그 지점을 지나는 검사만 돌린다."""
    sites = raise_sites()
    by_site = defaultdict(set)
    for record in json.loads(trace_file.read_text(encoding="utf-8")):
        # 사슬에서 **훑는 쪽이 아는 첫 `raise` 자리**를 고른다. 공장 안쪽 프레임은
        # `raise` 자리가 아니므로 자연히 건너뛰고 호출자가 잡힌다.
        for where in record.get("chain") or ([record["where"]] if record["where"] else []):
            if where in sites:
                by_site[where].add(record["test"])
                break
    unasserted, checked, skipped = [], 0, []
    for where, tests in sorted(by_site.items()):
        if where not in sites:
            skipped.append(where)
            continue
        owner, local, function = sites[where]
        path = ROOT / "backend" / "main_parts" / owner
        original = path.read_bytes()
        lines = original.decode("utf-8").splitlines(keepends=True)
        mutated = re.sub(r"HTTPException\(\s*\d+", "HTTPException(599",
                         lines[local - 1], count=1)
        if mutated == lines[local - 1]:
            # 공장을 거치는 자리: `raise usage_limit_error(...)` 자체를 바꾼다.
            mutated = re.sub(r"raise\s+\w+\(", "raise HTTPException(599, ", 
                             lines[local - 1], count=1)
        if mutated == lines[local - 1]:
            # **심지 못한 것을 통과로 세지 않는다.** 상태가 변수로 오는 자리가 있다.
            skipped.append(f"{where} (상태가 리터럴이 아니다)")
            continue
        lines[local - 1] = mutated
        path.write_bytes("".join(lines).encode("utf-8"))
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", *sorted(tests), "-q", "--no-header",
                 "-p", "no:cacheprovider"],
                cwd=ROOT, capture_output=True, text=True)
        finally:
            path.write_bytes(original)
        checked += 1
        if result.returncode == 0:
            unasserted.append((where, function, len(tests)))
        print(f"  {'확인 안 됨' if result.returncode == 0 else '확인됨':12} "
              f"{where:34} {function:32} 검사 {len(tests)}개", flush=True)

    print(f"\n도달하는 지점 {checked}개 · **확인되지 않는 것 {len(unasserted)}개**")
    for where, function, count in unasserted:
        print(f"    {where:34} {function}  (검사 {count}개가 지나가지만 아무도 안 본다)")
    if skipped:
        # **못 잰 것을 0으로 세지 않는다.** 조용히 빼면 이 도구도 초록불이 된다.
        print(f"\n재지 못한 지점 {len(skipped)}개:")
        for where in skipped:
            print(f"    {where}")
    return 1 if unasserted else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--trace-only", action="store_true", help="1단계만 하고 멈춘다")
    parser.add_argument("--from", dest="existing", type=Path, default=None,
                        help="저장해둔 추적 파일로 2단계만 한다")
    parser.add_argument("--trace", type=Path,
                        default=Path(tempfile.gettempdir()) / "unasserted-trace.json")
    arguments = parser.parse_args(argv)

    if arguments.existing:
        return sweep(arguments.existing)
    print(f"1단계: 스위트를 돌리며 거부 지점을 적는다 -> {arguments.trace}")
    trace(arguments.trace)
    count = len(json.loads(arguments.trace.read_text(encoding="utf-8")))
    print(f"  거부 {count}건 기록")
    if arguments.trace_only:
        return 0
    print("2단계: 지점마다 상태를 599로 바꾸고 그 지점을 지나는 검사만 돌린다")
    return sweep(arguments.trace)


if __name__ == "__main__":
    raise SystemExit(main())
