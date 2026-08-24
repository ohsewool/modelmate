"""건너뛴 검사는 **아무것도 확인하지 않은 초록불**이다 — 그 집합을 지킨다.

지금 이 스위트는 하나도 건너뛰지 않는다. 그래서 기대 집합은 **비어 있다.**

빈 집합을 지키는 것이 왜 값이 있는가. `document-intelligence`에서 2026-08-24에
이렇게 됐다: 샘플 PDF를 못 받자 **서른둘이 조용히 skip**됐는데, CI에는 그것을
잡으라고 둔 단계가 있었고 그 단계는 `--collect-only`의 수집 수를 보고 있었다.
**런타임 skip은 수집 수를 바꾸지 않는다.** 234개가 그대로 수집됐고 관문은
통과시켰다.

    수집 수  234   ← 관문이 본 수
    실행     201 passed, 32 skipped

건너뛰기는 **하나씩 조용히 는다.** 하한선은 목록이 줄어드는 것만 보고, 목록이
현실에서 멀어지는 것은 못 본다. 그래서 하한이 아니라 **정확한 집합**으로 둔다 —
늘어나는 것도, 고쳐서 줄어드는 것도 걸린다.

이 저장소는 선택적 의존이 많다(SHAP, optuna 등). 지금은 전부 설치돼 있어 건너뛰는
것이 없지만, 하나가 빠지면 그것을 쓰는 검사들이 **조용히** 사라진다 — 그리고 스위트는
1,124개가 아니라 그보다 적은 수로 초록불이 된다.

집합이 바뀌는 것이 옳은 변경이라면 `EXPECTED_SKIPS`를 함께 고치면 된다. 그것이
요점이다: **조용히 바뀌지 않게 하는 것.** 잠깐 넘어가려면
`ALLOW_UNEXPECTED_SKIPS=1`을 준다.
"""

import os

EXPECTED_SKIPS: dict[str, int] = {}

_skipped: list[tuple[str, str]] = []


def pytest_runtest_logreport(report):
    if report.skipped and report.when in ("setup", "call"):
        reason = ""
        if isinstance(report.longrepr, tuple) and len(report.longrepr) == 3:
            reason = report.longrepr[2]
        _skipped.append((report.nodeid.split("::")[0], reason))



def _collected_every_test_file(session) -> bool:
    """이번 실행이 **디스크의 테스트 파일을 전부** 모았는가.

    부르는 방법은 여럿이다(`pytest`, `pytest tests/`, `pytest tests/ -q`). 셋 다
    같은 것을 돌린다. 반면 `pytest tests/test_one.py`는 아니다. 인자의 모양이
    아니라 **모인 결과**로 가른다.
    """
    from pathlib import Path as _Path

    root = _Path(str(session.config.rootpath)) / "tests"
    if not root.is_dir():
        return False
    on_disk = {p.resolve() for p in root.rglob("test_*.py")}
    if not on_disk:
        return False
    collected = set()
    for item in getattr(session, "items", []):
        try:
            collected.add(_Path(str(item.fspath)).resolve())
        except Exception:
            pass
    return on_disk <= collected

def pytest_sessionfinish(session, exitstatus):
    """**돌린 것이 있을 때만 판정한다.**

    세션 훅은 내가 생각하지 않은 모드에서도 돈다 — `--collect-only`, `-k` 선택,
    파일 하나. 판정할 근거가 없는 실행에서 걸리면 그건 검사가 아니라 방해이고,
    다음 사람이 훅을 지운다. `rag-profile-selector`가 같은 훅을 쓰다 CI에서 바로
    이것에 걸렸고, 그 경위가 그 파일에 적혀 있다.
    """
    if os.getenv("ALLOW_UNEXPECTED_SKIPS"):
        return
    if getattr(session.config.option, "collectonly", False):
        return
    if not _collected_every_test_file(session):
        # **"경로를 줬다"와 "일부만 돌렸다"는 다르다.**
        #
        # 예전에는 `file_or_dir`가 있으면 무조건 건너뛰었다. 그래서 README가
        # 시키는 `pytest tests/ -q`에서 이 훅이 통째로 침묵했다 — CI는 인자 없이
        # `pytest -q`를 쓰므로 거기서만 살아 있었고, **README를 따르는 사람에게는
        # 없는 것과 같았다.** 2026-08-24에 새 clone에서 재보다 걸렸다:
        # 33개가 건너뛰어졌는데 종료 코드가 0이었다.
        #
        # 이제 "무엇을 줬는가"가 아니라 **"전부 모였는가"**를 본다. 디스크의
        # `test_*.py`가 전부 수집됐으면 어떻게 불렀든 판정할 근거가 있다.
        return
    if getattr(session.config.option, "keyword", None):
        return
    if not getattr(session, "testscollected", 0):
        return
    if session.testsfailed:
        return                      # 이미 빨간불이다. 이유를 하나 더 얹지 않는다

    counted: dict[str, int] = {}
    for path, _reason in _skipped:
        counted[path] = counted.get(path, 0) + 1

    if counted != EXPECTED_SKIPS:
        raise SystemExit(
            "SKIP 집합 검사 실패 —\n"
            "  건너뛴 검사의 집합이 다르다.\n"
            f"    실제: {dict(sorted(counted.items()))}\n"
            f"    기대: {dict(sorted(EXPECTED_SKIPS.items()))}\n"
            "  건너뛴 검사는 아무것도 확인하지 않은 초록불이다. 옳은 변경이면\n"
            "  conftest.py의 EXPECTED_SKIPS를 함께 고쳐라.\n"
            "  잠깐 넘어가려면 ALLOW_UNEXPECTED_SKIPS=1.")
