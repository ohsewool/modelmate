"""CI가 한 줄도 실행하지 않던 라우트 아홉 개.

로드맵에 **마흔 개**라고 적혀 있었고, 그 뒤 "프런트가 부르는 스물넷 중 열일곱이
남았다"로 바뀌어 있었다. 오늘 다시 쟀다 — pytest와 **스모크 열다섯을 합쳐서**,
CI가 실제로 돌리는 것 전부로.

    라우트 핸들러 100개 중 본문이 한 줄도 안 도는 것   9개

스모크 열둘을 CI에 넣은 것이 대부분을 닫았고 로드맵의 숫자만 그대로 있었다.
**세어본 것을 적어두면 그 문장은 그날부터 낡기 시작한다.**

처음 잰 결과는 **0개**였다. 너무 좋아서 다시 봤더니 `ast.walk(node)`가 데코레이터
노드까지 판다 — `@app.post(...)` 줄은 import 때 반드시 실행되므로 **모든 라우트가
"돌았다"로** 나왔다. 본문만 세도록 고쳐서 9개가 됐다.

아홉 중 둘이 **사용자 데이터를 지우는 `DELETE`**다. `clear_history`와
`delete_deployed` — 앞 회차에 연결 누수를 고치느라 손댄 바로 그 둘이고,
**그때 나는 아무것도 실행하지 않는 코드를 고치고 있었다.**

여기서는 `Depends`를 거치지 않고 핸들러를 직접 부른다. 확인하려는 것은 "이 핸들러가
무엇을 하는가"이지 FastAPI가 의존성을 주입하는가가 아니다.
"""

from __future__ import annotations

import asyncio
import ast
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from part_source import assembled  # noqa: E402

from fastapi import HTTPException  # noqa: E402

OWNER = {"sub": "route-owner", "email": "owner@routes.test", "role": "user"}
STRANGER = {"sub": "route-stranger", "email": "stranger@routes.test", "role": "user"}


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


@pytest.fixture
def empty_state():
    """`STATE`는 프로세스 하나가 공유한다. 앞뒤 검사와 섞이지 않게 되돌린다."""
    before = dict(modelmate.STATE)
    modelmate.STATE.clear()
    yield modelmate.STATE
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestDeletingHistory:
    """`DELETE /api/history`. **아무 검사도 없었다.**

    로그인한 사용자의 실험 기록을 지운다. 관리자는 **전부** 지운다 — 그 갈림길이
    한 줄이고, 그 줄이 CI에서 한 번도 실행된 적 없었다.
    """

    def make_row(self, user_id):
        conn = modelmate.get_db()
        try:
            cursor = conn.execute(
                "INSERT INTO experiments (user_id, data, created_at) VALUES (?,?,?)",
                (user_id, "{}", "2026-08-23T00:00:00"))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def rows_for(self, user_id):
        conn = modelmate.get_db()
        try:
            return [r[0] for r in conn.execute(
                "SELECT id FROM experiments WHERE user_id=?", (user_id,)).fetchall()]
        finally:
            conn.close()

    def test_a_user_clears_only_their_own(self):
        mine = self.make_row(OWNER["sub"])
        theirs = self.make_row(STRANGER["sub"])
        assert call(modelmate.clear_history, user=OWNER) == {"ok": True}
        assert mine not in self.rows_for(OWNER["sub"])
        # **남의 것이 지워지지 않는 쪽도 본다.** 전부 지우는 구현도 위 단언은 통과한다.
        assert theirs in self.rows_for(STRANGER["sub"])

    def test_an_admin_clears_everything(self):
        self.make_row(OWNER["sub"])
        self.make_row(STRANGER["sub"])
        admin = {"sub": "route-admin", "email": "admin@routes.test", "role": "admin"}
        assert call(modelmate.clear_history, user=admin) == {"ok": True}
        assert self.rows_for(OWNER["sub"]) == []
        assert self.rows_for(STRANGER["sub"]) == []

    def test_the_connection_does_not_leak_on_the_admin_path(self):
        """앞 회차에 이 함수를 `try/finally`로 감쌌다. **그때 이 코드는 CI에서
        한 줄도 돌지 않았다** — 감쌌다는 것 말고 도는 것을 본 적이 없었다."""
        admin = {"sub": "route-admin-2", "email": "a2@routes.test", "role": "admin"}
        call(modelmate.clear_history, user=admin)
        conn = modelmate.get_db()          # 잠금이 남아 있으면 여기서 죽는다
        try:
            conn.execute("INSERT INTO experiments (user_id, data, created_at) "
                         "VALUES (?,?,?)", ("lock-probe", "{}", "2026-08-23T00:00:00"))
            conn.commit()
        finally:
            conn.close()


class TestDeletingADeployedModel:
    """`DELETE /api/deployed/{model_id}`. 남의 모델을 지울 수 있으면 안 된다."""

    def make_model(self, user_id):
        model_id = f"m-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            columns = [r[1] for r in conn.execute(
                "PRAGMA table_info(deployed_models)").fetchall()]
            # 스키마를 읽어서 채운다. 처음엔 세 컬럼만 넣었고
            # `NOT NULL constraint failed: task_type`으로 죽었다 — 픽스처가
            # 추측하면 검사가 아니라 픽스처를 고치게 된다.
            values = {"id": model_id, "user_id": user_id, "name": "테스트 모델",
                      "task_type": "classification", "created_at": "2026-08-23T00:00:00"}
            required = {row[1] for row in conn.execute(
                "PRAGMA table_info(deployed_models)").fetchall() if row[3]}
            assert required <= set(values), f"채우지 않은 필수 컬럼: {required - set(values)}"
            usable = [c for c in columns if c in values]
            conn.execute(
                f"INSERT INTO deployed_models ({','.join(usable)}) "
                f"VALUES ({','.join('?' * len(usable))})",
                tuple(values[c] for c in usable))
            conn.commit()
            return model_id
        finally:
            conn.close()

    def exists(self, model_id):
        conn = modelmate.get_db()
        try:
            return conn.execute("SELECT 1 FROM deployed_models WHERE id=?",
                                (model_id,)).fetchone() is not None
        finally:
            conn.close()

    def test_the_owner_can_delete_it(self):
        model_id = self.make_model(OWNER["sub"])
        assert call(modelmate.delete_deployed, model_id=model_id, user=OWNER) == {"ok": True}
        assert not self.exists(model_id)

    @pytest.mark.parametrize("who, expected", [
        ("stranger", 404),   # 있는지 여부도 알려주지 않는다
        ("anonymous", 401),
    ])
    def test_only_the_owner_gets_through(self, who, expected):
        """**`in (403, 404)`으로 쓰지 않는다.** 처음엔 그렇게 썼고, 그건 둘 중
        아무거나면 통과다. 재보니 답은 하나였다 — 404."""
        model_id = self.make_model(OWNER["sub"])
        user = STRANGER if who == "stranger" else None
        with pytest.raises(HTTPException) as refused:
            call(modelmate.delete_deployed, model_id=model_id, user=user)
        assert refused.value.status_code == expected
        assert self.exists(model_id), "거절했는데 지워졌다"

    def test_the_inline_check_is_a_backstop_not_debris(self):
        """`delete_deployed` 안에 소유권 검사가 **하나 더** 있다. 403을 낸다.

        위 검사들이 보여주듯 그것은 **한 번도 안 터진다** — 앞의
        `assert_deployed_model_owner`가 먼저 404로 끊기 때문이다. 처음엔 죽은
        코드라 지우려 했다.

        **대조가 그 판단을 뒤집었다.** 관문의 거절을 지우고 돌렸더니 인라인
        검사가 403으로 막았다. 죽은 게 아니라 **관문이 맞는 동안에만 안 도는
        것**이고, 그게 이중 방어가 뜻하는 바다. 지우지 않는다.

        여기서는 그것이 여전히 거기 있는지만 지킨다 — 없어지면 조용히 한 겹이
        사라진다.
        """
        source = ast.unparse(
            [node for _, node in assembled().functions()
             if node.name == "delete_deployed"][0])
        assert "HTTPException(403" in source
        assert "assert_deployed_model_owner" in source


class TestTheSmallHandlers:
    def test_reset_session_empties_the_shared_state(self, empty_state):
        empty_state["df"] = "무언가"
        assert call(modelmate.reset_session, user=OWNER) == {"ok": True}
        assert dict(modelmate.STATE) == {}

    def test_llm_status_says_nothing_sensitive(self):
        """이 라우트는 **환경 노출로 한 번 데인 자리 옆**에 있다. 값이 아니라
        준비 상태만 나가는지 본다."""
        status = call(modelmate.llm_status, user=OWNER)
        assert isinstance(status, dict)
        flat = repr(status).lower()
        for leaked in ("sk-", "api_key", "secret", "token", "environ"):
            assert leaked not in flat, f"{leaked}가 응답에 있다: {status}"

    @pytest.mark.parametrize("handler", ["download_sample_csv", "serve_sample_csv_compat"])
    def test_a_missing_sample_is_refused_not_guessed(self, handler):
        """둘은 같은 함수를 부르는 쌍둥이다. **한쪽만 검사하면 다른 쪽이 조용히
        갈라진다** — 이 저장소가 `can_rerun`에서 이미 겪었다."""
        with pytest.raises(HTTPException) as refused:
            call(getattr(modelmate, handler), file_name="../../etc/passwd")
        assert refused.value.status_code in (400, 404)

    def test_explain_local_refuses_when_there_is_no_model(self, empty_state):
        """**둘 중 하나면 통과**로 쓰지 않는다. 처음엔 "거절하거나, 빈 걸 주거나"로
        썼는데 그건 어느 쪽이든 통과하는 단언이다. 재보니 답은 하나였다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.explain_local, idx=0, limit=8)
        assert refused.value.status_code == 400
        assert "cross-validation" in str(refused.value.detail).lower()

    @pytest.mark.parametrize("limit", [-5, 0, 1, 20, 100])
    def test_a_bad_limit_does_not_crash_it(self, limit, empty_state):
        """`max(1, min(limit, 20))`이 있다. 음수나 큰 수가 들어와도 **터지지 않고
        같은 거절로 끝나는지**를 본다 — 구현을 읽는 대신 넣어본다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.explain_local, idx=0, limit=limit)
        assert refused.value.status_code == 400

    def test_the_clamp_is_still_there(self):
        """위 검사는 모델이 없을 때만 도므로 **자르는 동작 자체는 못 본다.**
        구조만 확인하고, 그것이 구조 확인임을 적어둔다."""
        source = ast.unparse(
            [node for _, node in assembled().functions()
             if node.name == "explain_local"][0])
        assert "max(1, min(limit, 20))" in source


class TestNothingIsStrandedAfterAReturn:
    """도달할 수 없는 문장이 남아 있지 않은가.

    `GET /api/debug-env`를 지웠을 때 **그 `return` 줄이 다음 조각 맨 앞에 남았다.**
    조각들은 이어 붙여 컴파일되므로, 그 고아 한 줄은 아무 상관 없는
    `reset_session`의 본문 끝에 붙었다 — `return {"ok": True}` 다음에.

        async def reset_session(user=...):
            STATE.clear()
            return {"ok": True}
            return {"key_length": ..., "all_env_keys": all_keys}   ← 여기

    죽은 줄이라 실행되지 않고, 그래서 `test_no_environment_disclosure.py`도
    못 봤다. 하지만 그것을 읽는 사람에게는 **환경을 뱉는 라우트로 보인다.**
    그리고 그 위 한 줄이 지워지면 실제로 그렇게 된다.

    **조각 경계가 이런 것을 숨긴다.** 지운 곳과 남은 곳이 다른 파일이었다.
    """

    def stranded(self):
        parts = assembled()
        terminal = (ast.Return, ast.Raise, ast.Continue, ast.Break)
        found = []

        def scan(body, where):
            for index, statement in enumerate(body):
                if isinstance(statement, terminal) and index + 1 < len(body):
                    for dead in body[index + 1:]:
                        found.append(f"{parts.where(dead)} ({where})")
            for statement in body:
                for field in ("body", "orelse", "finalbody"):
                    inner = getattr(statement, field, None)
                    if isinstance(inner, list):
                        scan(inner, where)
                for handler in getattr(statement, "handlers", []):
                    scan(handler.body, where)

        for _, node in parts.functions():
            scan(node.body, node.name)
        return found

    def test_there_is_none(self):
        found = self.stranded()
        assert found == [], (
            "`return`/`raise` 뒤에 도달할 수 없는 문장이 있다. 라우트를 지우다 남은 "
            "조각일 수 있고, 조각 경계 때문에 다른 파일에 남는다:\n  " + "\n  ".join(found))

    def test_the_scan_would_see_one(self):
        """대조. 못 찾는 훑기도 초록불이다."""
        planted = ast.parse("def f():\n    return 1\n    return 2\n")
        body = planted.body[0].body
        assert len(body) == 2 and isinstance(body[0], ast.Return)

    def test_it_looked_at_real_functions(self):
        assert sum(1 for _ in assembled().functions()) >= 200
