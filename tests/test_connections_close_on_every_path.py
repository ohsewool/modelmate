"""예외가 나도 DB 연결이 닫히는가 — 그리고 아직 안 닫히는 곳이 어디인가.

2026-08-23에 `auth_google`에서 재현했다. 비밀번호로 가입한 이메일과 같은 주소로 구글
로그인을 하면 유니크 인덱스가 INSERT를 거절하고, `conn.close()`가 함수 마지막 줄에
있어 **연결이 열린 채 남는다.** sqlite는 그 연결이 쥔 쓰기 잠금을 놓지 않으므로
**그 뒤 이 프로세스의 모든 쓰기가 `database is locked`로 죽는다.**

고친 뒤 **나머지를 셌다.** 이 프로젝트가 반복해서 놓치는 자리다 — 규칙을 세우고 한
곳에 적용한 뒤 나머지를 세어보지 않는 것.

    `get_db()`를 여는 함수            87개
    예외에 연결이 남을 수 있는 것       28개
    그중 **쓰기를 하는 것**            22개   ← 잠금을 쥔다

**이 수가 틀렸다.** 25개다. 조각을 하나씩 `ast.parse`하고 `except SyntaxError:
continue`로 넘겼는데, 조각 열둘은 단독으로 파싱되지 않는다(앞 조각에서 시작한 함수
본문이 이어진다). **열두 파일이 조용히 빠졌고 화면에서는 "이상 없음"과 같아 보였다.**
`tests/part_source.py`에 이유와 함께 적었다. 숨어 있던 셋은 부팅 시 DDL이 아니라
`deploy_model`·`delete_deployed`·`deploy_model_stable` — **사용자가 닿는 배포
엔드포인트**다.

읽기만 하는 것도 연결을 새지만 쓰기 잠금은 쥐지 않는다. 위험의 크기가 다르므로
구분해서 센다.

**22개를 한 번에 고치지 않았다.** 배포된 앱의 스물두 함수를 기계적으로 감싸는 것은
이 회차에 감당할 위험이 아니고, 각 함수의 조기 반환·예외 경로가 제각각이다. 대신
**인증 없이 도달하는 쓰기 넷**을 고쳤다 — `auth_google`(앞 회차)·`auth_signup`·
`auth_login`·`auth_logout`. 바깥에서 입력을 넣어 예외를 만들 수 있는 자리다.

`auth_logout`은 덤으로 하나 더 나왔다. 바깥이 `except Exception: pass`여서 **세션
취소가 실패해도 응답은 `ok: True`였고 어디에도 남지 않았다.** 응답은 그대로 두고
(로그아웃을 실패로 돌려주면 사용자가 토큰을 쥔 채 남는다) 보안 기록에 적게 했다.

나머지는 **이름으로 둔다.** 목록이 정확히 일치해야 하므로, 새로 생기는 것도 고쳐서
빠지는 것도 여기서 걸린다. 하한선이었다면 하나 늘어나는 것을 못 본다 — 이 저장소가
`DECLARED_RECORDS`에서 이미 겪었다.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

import pytest

from part_source import assembled

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PARTS = ROOT / "backend" / "main_parts"
WRITES = ("INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP", "commit(")

# 아직 `try/finally` 없이 `get_db()`를 여는 **쓰기** 함수들.
#
# 대부분은 표를 만드는 부팅 시 DDL(`ensure_*`)이다 — 거기서 예외가 나면 부팅이
# 실패하고 프로세스는 어차피 못 뜬다. 나머지는 로그인한 사용자만 도달한다.
# 고치는 것이 맞지만, 스물두 개를 한 번에 감싸는 것보다 **어디가 남았는지 아는 채로
# 두는 것**이 먼저다.
STILL_UNGUARDED = {
    ("001_imports_db.part", "init_db"),
    ("003_models_helpers.part", "save_history"),
    ("008_usage_limits.part", "ensure_usage_limit_storage"),
    ("020_run_cv.part", "_record_workspace_analysis_result"),
    ("050_columns_auth_defs.part", "make_token"),
    ("051_auth_history_debug.part", "clear_history"),
    ("052_workspace_projects.part", "ensure_dataset_management_columns"),
    ("052_workspace_projects.part", "ensure_default_project"),
    ("052_workspace_projects.part", "save_dataset_record"),
    ("052_workspace_projects.part", "create_project"),
    ("055_training_jobs.part", "ensure_training_jobs_table"),
    ("055_training_jobs.part", "_update_training_job"),
    ("055_training_jobs.part", "record_sync_training_job"),
    ("055_training_jobs.part", "_create_training_job_record"),
    ("088_prediction_tokens.part", "ensure_prediction_token_table"),
    ("097_beta_feedback.part", "ensure_feedback_table"),
    ("097_pilot_inquiries.part", "ensure_pilot_inquiry_table"),
    ("098_monitoring.part", "ensure_monitoring_tables"),
    # 아래 셋은 조립 파싱으로 바꾸고 나서야 보였다. **부팅 시 DDL이 아니다** —
    # 로그인한 사용자가 배포 화면에서 직접 닿는 자리라 위의 열여덟보다 급하다.
    ("071_batch_deploy_a.part", "deploy_model"),
    ("072_deploy_static_b.part", "delete_deployed"),
    ("086_deploy_stable_api.part", "deploy_model_stable"),
}

# 인증 없이 도달하는 쓰기. **여기는 비어 있어야 한다.**
UNAUTHENTICATED_WRITES = {"auth_google", "auth_signup", "auth_login", "auth_logout"}


def functions():
    """조립해서 파싱한다. 조각을 하나씩 읽고 `SyntaxError`를 넘기면 열두 파일이
    조용히 빠진다 — 그렇게 해서 이 목록이 셋 모자랐다."""
    yield from assembled().functions()


def guarded(node: ast.AST) -> bool:
    """연결을 `finally`에서 닫거나 `with`로 여는가."""
    return any(
        isinstance(inner, ast.Try)
        and any("close()" in ast.unparse(statement) for statement in inner.finalbody)
        for inner in ast.walk(node)
    ) or any(
        isinstance(inner, ast.With) and "get_db()" in ast.unparse(inner)
        for inner in ast.walk(node)
    )


def unguarded_writers() -> set[tuple[str, str]]:
    found = set()
    for name, node in functions():
        source = ast.unparse(node)
        if "get_db()" not in source or guarded(node):
            continue
        if any(word in source for word in WRITES):
            found.add((name, node.name))
    return found


class TestTheUnauthenticatedWritesAreGuarded:
    """바깥에서 입력을 넣어 예외를 만들 수 있는 자리다. **여기가 먼저다.**"""

    @pytest.mark.parametrize("handler", sorted(UNAUTHENTICATED_WRITES))
    def test_it_closes_in_a_finally(self, handler):
        found = [node for _, node in functions() if node.name == handler]
        assert found, f"{handler}를 찾지 못했다"
        assert all(guarded(node) for node in found), handler

    def test_none_of_them_is_in_the_remaining_list(self):
        names = {name for _, name in STILL_UNGUARDED}
        assert not (names & UNAUTHENTICATED_WRITES)


class TestTheRemainderIsExactlyWhatWeListed:
    def test_the_list_matches(self):
        """늘어남과 줄어듦을 둘 다 본다. **고쳐서 빠지는 것도 여기서 걸린다** —
        목록이 낡으면 다음 사람은 없는 위험을 쫓는다."""
        actual = unguarded_writers()
        assert actual == STILL_UNGUARDED, (
            "감싸지 않은 쓰기 함수가 목록과 다르다.\n"
            f"  새로 생김: {sorted(actual - STILL_UNGUARDED) or '없음'}\n"
            f"  이제 감싸짐: {sorted(STILL_UNGUARDED - actual) or '없음'}\n"
            "고쳤으면 목록에서 빼고, 새로 만들었으면 `try/finally`로 감싸라."
        )

    def test_the_count_is_what_the_readme_says(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        assert f"쓰기를 하는 것 {len(STILL_UNGUARDED) + len(UNAUTHENTICATED_WRITES)}개" in readme


class TestTheScanIsNotVacuous:
    def test_it_found_functions(self):
        assert sum(1 for _ in functions()) >= 200

    def test_it_can_tell_guarded_from_not(self):
        guarded_source = ast.parse(
            "def f():\n"
            "    conn = get_db()\n"
            "    try:\n"
            "        conn.execute('INSERT INTO t VALUES (1)')\n"
            "    finally:\n"
            "        conn.close()\n")
        bare = ast.parse(
            "def f():\n"
            "    conn = get_db()\n"
            "    conn.execute('INSERT INTO t VALUES (1)')\n"
            "    conn.close()\n")
        assert guarded(guarded_source.body[0])
        assert not guarded(bare.body[0])

    def test_the_write_words_are_not_empty(self):
        """`WRITES = ()`면 위험한 것이 하나도 없다고 보고하면서 검사처럼 보인다."""
        assert len(WRITES) >= 5
