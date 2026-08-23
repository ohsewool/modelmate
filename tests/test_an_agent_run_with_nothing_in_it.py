"""내 것이지만 안이 비어 있는 에이전트 실행.

`045_agent_runs.part`의 라우트 여섯이 같은 모양이다.

    assert_analysis_run_owner(user, analysis_run_id)   ← 없거나 남의 것이면 여기서 404
    ... 조회 ...
    if not result:
        raise HTTPException(404, "...")                ← 한 번도 안 돌았다

**그 줄들을 돌게 만들려다 두 가지를 배웠고, 둘 다 예상과 달랐다.**

### 하나. 넷은 돌릴 수 없다

행은 있고 계획도 단계도 없는 실행을 만들어 넷을 불러봤다. **전부 dict를 돌려준다** —
`agent_run: None`, `steps: []`을 담은 채로. 조회 함수들이 소유자의 실재하는 행에
대해서는 빈 값을 주지 않기 때문이다.

그럼 그 `if not result: 404`는 언제 도는가. **관문을 지난 뒤 조회 사이에 행이
사라졌을 때** — 경쟁 구간을 막는 방어선이다. 정상 입력으로는 못 만든다.

`delete_deployed`의 403 이중 방어와 같은 자리다. **도달하지 않는 것과 쓸모없는 것은
다르다.** 억지로 돌리는 검사를 지어내지 않고, **여기 그 사실을 적어 이름으로 둔다.**

### 둘. 계획 없는 실행을 돌리면 500이 났다

`execute`는 달랐다. `execute_agent_run`이 맨 `ValueError("Agent Run or Plan was not
found.")`를 올리고, 그게 전역 처리기에 잡혀 **500 "예상하지 못한 내부 오류 — 잠시 후
다시 시도하거나 관리자에게"**가 된다.

**완전히 예상되는 상태를 예상하지 못한 오류로 보고한 것이다.** 사용자가 할 일은
기다리는 것도 관리자를 찾는 것도 아니고 **계획을 먼저 만드는 것**이다. 새어 나가는
정보는 없었지만(전역 처리기가 가린다) 안내가 틀렸다.

`409`로 바꿨다 — 실행은 있고 없는 것은 그 안의 계획이라 `404`는 맞지 않고, 이
저장소는 "지금 하면 안 된다"를 `409`로 쓴다.
"""

from __future__ import annotations

import ast
import asyncio
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from part_source import assembled  # noqa: E402

from fastapi import HTTPException  # noqa: E402

STAMP = "2026-08-23T00:00:00"

# 소유자의 실재하는 행에 대해서는 조회가 빈 값을 주지 않으므로, 이 `404`들은 정상
# 입력으로 도달하지 않는다. **경쟁 구간 방어선이다** — 관문과 조회 사이에 행이
# 사라진 경우. 지우지 않고 이름으로 둔다.
UNREACHABLE_RACE_GUARDS = {
    ("get_goal_first_agent_run_api", "Agent Run을 찾을 수 없습니다."),
    ("get_goal_first_agent_trace_api", "Agent Run trace를 찾을 수 없습니다."),
    ("get_agent_mock_run", "Agent analysis run not found"),
    ("get_agent_mock_timeline", "Agent analysis run timeline not found"),
}


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


@pytest.fixture
def empty_run():
    """행은 있고 안은 비어 있는 실행. **계획도 단계도 만들지 않는다.**"""
    from backend.agents.persistence import ensure_agent_trace_schema

    owner = {"sub": f"empty-{uuid.uuid4().hex[:8]}",
             "email": f"{uuid.uuid4().hex[:6]}@empty.test", "role": "user"}
    run_id = f"ar-{uuid.uuid4().hex[:8]}"
    conn = modelmate.get_db()
    try:
        ensure_agent_trace_schema(conn)
        conn.execute(
            "INSERT INTO analysis_runs (id,user_id,user_goal,status,created_at) "
            "VALUES (?,?,?,?,?)",
            (run_id, owner["sub"], "아직 안 돌린 목표", "created", STAMP))
        conn.commit()
    finally:
        conn.close()
    return owner, run_id


class TestExecutingARunThatHasNoPlan:
    """**이번 회차의 결함.** 예상되는 상태가 500으로 보고되고 있었다."""

    def test_it_is_refused_with_a_conflict_not_a_crash(self, empty_run):
        owner, run_id = empty_run
        with pytest.raises(HTTPException) as refused:
            call(modelmate.execute_goal_first_agent_run_api,
                 analysis_run_id=run_id, user=owner)
        assert refused.value.status_code == 409

    def test_it_tells_the_user_what_to_do(self, empty_run):
        """500 안내는 **"잠시 후 다시 시도하거나 관리자에게"**였다. 기다린다고
        계획이 생기지 않는다 — 안내가 행동으로 이어져야 한다."""
        owner, run_id = empty_run
        with pytest.raises(HTTPException) as refused:
            call(modelmate.execute_goal_first_agent_run_api,
                 analysis_run_id=run_id, user=owner)
        detail = refused.value.detail
        assert "계획" in detail["user_friendly_message"]
        assert "계획" in detail["recommended_next_action"]
        assert "관리자" not in detail["recommended_next_action"]

    def test_it_does_not_leak_the_internal_message(self, empty_run):
        """`ValueError`의 문구를 그대로 실어 보내면 앞 회차의 결함을 되풀이한다."""
        owner, run_id = empty_run
        with pytest.raises(HTTPException) as refused:
            call(modelmate.execute_goal_first_agent_run_api,
                 analysis_run_id=run_id, user=owner)
        rendered = repr(refused.value.detail)
        assert "Agent Run or Plan was not found" not in rendered
        assert refused.value.detail["technical_message"] == "error_type=ValueError"

    def test_a_stranger_is_refused_before_that(self, empty_run):
        """**바깥 겹이 먼저다.** 남에게는 409가 아니라 404가 가야 한다 —
        409는 "그 실행은 있다"를 알려준다."""
        _, run_id = empty_run
        stranger = {"sub": "plan-stranger", "email": "s@empty.test", "role": "user"}
        with pytest.raises(HTTPException) as refused:
            call(modelmate.execute_goal_first_agent_run_api,
                 analysis_run_id=run_id, user=stranger)
        assert refused.value.status_code == 404


class TestTheLookupsDoNotRefuseAnEmptyRun:
    """**넷은 거절하지 않는다.** 빈 실행에도 dict를 준다 — 그 사실을 고정한다.

    억지로 404를 만드는 검사를 지어내지 않는다. 대신 **지금 무엇을 하는지**를 적어,
    나중에 조회가 빈 값을 주도록 바뀌면 여기서 걸리게 한다.
    """

    @pytest.mark.parametrize("handler", [
        "get_goal_first_agent_run_api",
        "get_goal_first_agent_trace_api",
        "get_agent_mock_run",
        "get_agent_mock_timeline",
    ])
    def test_an_empty_run_still_answers(self, handler, empty_run):
        owner, run_id = empty_run
        result = call(getattr(modelmate, handler), analysis_run_id=run_id, user=owner)
        assert isinstance(result, dict) and result, handler

    @pytest.mark.parametrize("handler", [
        "get_goal_first_agent_run_api",
        "get_goal_first_agent_trace_api",
        "get_agent_mock_run",
        "get_agent_mock_timeline",
    ])
    def test_a_stranger_is_still_refused(self, handler, empty_run):
        """비어 있어도 **남에게는 안 준다.** 빈 응답과 거절을 헷갈리면 안 된다."""
        _, run_id = empty_run
        stranger = {"sub": "empty-stranger", "email": "s@empty.test", "role": "user"}
        with pytest.raises(HTTPException) as refused:
            call(getattr(modelmate, handler), analysis_run_id=run_id, user=stranger)
        assert refused.value.status_code == 404


class TestTheRaceGuardsAreNamedNotRemoved:
    """도달하지 않는 방어선을 **지우지 않고 이름으로 둔다.**

    `delete_deployed`의 403에서 배운 것이다 — 관문을 껐더니 그것이 막았다.
    **도달하지 않는 것과 쓸모없는 것은 다르다.**
    """

    def test_each_one_is_still_there(self):
        missing = []
        for handler, message in sorted(UNREACHABLE_RACE_GUARDS):
            node = [n for _, n in assembled().functions() if n.name == handler]
            assert node, handler
            source = ast.unparse(node[0])
            if message not in source or "HTTPException(404" not in source:
                missing.append(handler)
        assert missing == [], (
            "경쟁 구간 방어선이 사라졌다. 조회가 빈 값을 줄 수 있는 순간이 "
            f"있는 한 남겨둬야 한다:\n  {missing}")

    def test_the_list_is_not_empty(self):
        """대조: 목록이 비면 위 검사는 아무것도 확인하지 않는다."""
        assert len(UNREACHABLE_RACE_GUARDS) == 4
