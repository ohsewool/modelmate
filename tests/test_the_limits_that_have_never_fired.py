"""세 한도가 **한 번도 터진 적이 없다** — 안 터지는 한도는 있는지 모르는 한도다.

거부 지점을 다시 세다가 나왔다.

    소스의 거부 지점        112개
    검사가 도달하는 지점     58개   ← 이 중 확인 안 되는 것 0개
    **한 번도 도달 안 함**   54개

도구는 "확인되지 않는 것 0개"라고 했고 그건 **자기가 닿은 58개에 대해서만** 참이었다.
닿지 못한 54개는 보고에 아예 없었다. *분모가 빠진 초록불은 초록불이 아니다.*

54개 중 셋이 이것들이다. 셋 다 요금제 한도를 **실제로 세고 거절하는 자리**이고,
자기 독스트링에 그렇게 적어두고 있다.

    claim_analysis_job              "이제 세는 자리가 곧 판단하는 자리다"
    claim_prediction_api_call       "입구 검사는 빠른 거절로 남는다. 권위는 여기다"
    enforce_prediction_token_limit

입구(`enforce_*`)에는 검사가 있었다. **권위 있는 자리에는 없었다.** 입구를 지나온
요청이 실제로 거절되는지는 아무도 확인한 적이 없다.

`claim_daily_usage`는 읽기-판단-쓰기를 한 `UPDATE`로 한다(동시성 때문이다. 경위는
그 함수에 있다). 그 반환값이 `False`가 되는 순간 이 셋이 429를 던진다 — 여기서
고정하는 것이 그 순간이다.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

FREE = modelmate.PLAN_LIMITS["free"]


@pytest.fixture
def a_free_user():
    """무료 요금제 사용자 하나. 쓴 것은 되돌린다."""
    user_id = f"limit-{uuid.uuid4().hex[:10]}"
    conn = modelmate.get_db()
    try:
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, role, plan, created_at) "
            "VALUES (?,?,?,?,?,?,datetime('now'))",
            (user_id, f"{user_id}@limits.test", "한도", "x", "user", "free"))
        conn.commit()
    finally:
        conn.close()

    yield {"sub": user_id, "email": f"{user_id}@limits.test", "plan": "free",
           "role": "user"}

    conn = modelmate.get_db()
    try:
        for table, column in (("users", "id"), ("daily_usage", "user_id"),
                              ("prediction_api_tokens", "owner_user_id")):
            try:
                conn.execute(f"DELETE FROM {table} WHERE {column}=?", (user_id,))
            except Exception:
                pass          # 그 표가 없는 배치도 있다
        conn.commit()
    finally:
        conn.close()


class TestTheDailyJobLimitActuallyRefuses:
    """`claim_analysis_job` — 무료 요금제는 하루 다섯 건이다."""

    def test_the_limit_is_a_real_number(self):
        """**분모 먼저.** 한도가 `None`이면 아래 반복문은 영원히 통과하고, 이
        파일은 아무것도 확인하지 않은 채 초록불이 된다."""
        assert FREE["max_jobs_per_day"] == 5

    def test_the_sixth_job_of_the_day_is_refused(self, a_free_user):
        limit = FREE["max_jobs_per_day"]
        for attempt in range(limit):
            modelmate.claim_analysis_job(a_free_user)      # 다섯 번은 통과한다

        with pytest.raises(HTTPException) as refused:
            modelmate.claim_analysis_job(a_free_user)
        assert refused.value.status_code == 429
        assert refused.value.detail["limit_key"] == "max_jobs_per_day"

    def test_it_says_what_was_used_and_what_the_limit_was(self, a_free_user):
        """"한도에 걸렸습니다"만으로는 무엇을 해야 할지 알 수 없다."""
        for _ in range(FREE["max_jobs_per_day"]):
            modelmate.claim_analysis_job(a_free_user)
        with pytest.raises(HTTPException) as refused:
            modelmate.claim_analysis_job(a_free_user)
        detail = refused.value.detail
        assert detail["limit"] == FREE["max_jobs_per_day"]
        assert detail["current"] >= detail["limit"]
        assert detail["plan"] == "free"
        assert detail.get("user_friendly_message")

    def test_the_counter_does_not_move_once_it_is_full(self, a_free_user):
        """**거절은 세지 않는다.** 거절당한 시도가 카운터를 올리면 한도가 실제보다
        빨리 차고, 사용자는 자기가 안 쓴 것으로 막힌다."""
        for _ in range(FREE["max_jobs_per_day"]):
            modelmate.claim_analysis_job(a_free_user)
        before = modelmate.get_daily_usage(a_free_user["sub"])["jobs_today"]
        for _ in range(3):
            with pytest.raises(HTTPException):
                modelmate.claim_analysis_job(a_free_user)
        after = modelmate.get_daily_usage(a_free_user["sub"])["jobs_today"]
        assert after == before

    def test_an_admin_is_not_counted_at_all(self, a_free_user):
        """되돌림 방향. 관리자에게 한도가 걸리면 이 검사가 말해준다."""
        conn = modelmate.get_db()
        try:
            conn.execute("UPDATE users SET role='admin', plan='admin' WHERE id=?",
                         (a_free_user["sub"],))
            conn.commit()
        finally:
            conn.close()
        for _ in range(FREE["max_jobs_per_day"] + 3):
            modelmate.claim_analysis_job({**a_free_user, "role": "admin",
                                          "plan": "admin"})


class TestThePredictionCallLimitActuallyRefuses:
    """`claim_prediction_api_call` — 하루 100건. 세는 자리가 권위다."""

    def test_the_limit_is_a_real_number(self):
        assert FREE["max_prediction_api_calls_per_day"] == 100

    def test_the_call_after_the_last_one_is_refused(self, a_free_user):
        limit = FREE["max_prediction_api_calls_per_day"]
        for _ in range(limit):
            modelmate.claim_prediction_api_call(a_free_user["sub"])

        with pytest.raises(HTTPException) as refused:
            modelmate.claim_prediction_api_call(a_free_user["sub"])
        assert refused.value.status_code == 429
        assert refused.value.detail["limit_key"] == "max_prediction_api_calls_per_day"
        assert refused.value.detail["limit"] == limit

    def test_nobody_at_all_is_not_counted(self):
        """소유자가 없으면 셀 대상이 없다 — 여기서 터지면 익명 경로가 죽는다."""
        modelmate.claim_prediction_api_call(None)
        modelmate.claim_prediction_api_call("")


class TestTheTokenPerProjectLimitActuallyRefuses:
    """`enforce_prediction_token_limit` — 무료는 프로젝트당 하나."""

    def test_the_limit_is_a_real_number(self):
        assert FREE["max_prediction_tokens_per_project"] == 1

    def test_the_second_token_in_a_project_is_refused(self, a_free_user):
        project_id = f"proj-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            for _ in range(FREE["max_prediction_tokens_per_project"]):
                conn.execute(
                    "INSERT INTO prediction_api_tokens "
                    "(token_id, project_id, owner_user_id, token_hash, token_prefix, "
                    "status, created_at) VALUES (?,?,?,?,?,'active',datetime('now'))",
                    (str(uuid.uuid4()), project_id, a_free_user["sub"], "hash", "mm_test"))
            conn.commit()
        finally:
            conn.close()

        with pytest.raises(HTTPException) as refused:
            modelmate.enforce_prediction_token_limit(a_free_user, project_id)
        assert refused.value.status_code == 429
        assert refused.value.detail["limit_key"] == "max_prediction_tokens_per_project"

    def test_a_revoked_token_frees_the_slot(self, a_free_user):
        """**취소한 토큰이 자리를 계속 차지하면** 사용자는 하나도 못 만들게 된다.
        세는 것은 `status='active'`뿐이라는 것을 여기 고정한다."""
        project_id = f"proj-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            conn.execute(
                "INSERT INTO prediction_api_tokens "
                "(token_id, project_id, owner_user_id, token_hash, token_prefix, "
                "status, created_at) VALUES (?,?,?,?,?,'revoked',datetime('now'))",
                (str(uuid.uuid4()), project_id, a_free_user["sub"], "hash", "mm_test"))
            conn.commit()
        finally:
            conn.close()
        modelmate.enforce_prediction_token_limit(a_free_user, project_id)

    def test_another_project_has_its_own_slot(self, a_free_user):
        """한도는 프로젝트당이다. 계정 전체로 세면 프로젝트 하나를 쓰면 끝이다."""
        full = f"proj-{uuid.uuid4().hex[:8]}"
        empty = f"proj-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            conn.execute(
                "INSERT INTO prediction_api_tokens "
                "(token_id, project_id, owner_user_id, token_hash, token_prefix, "
                "status, created_at) VALUES (?,?,?,?,?,'active',datetime('now'))",
                (str(uuid.uuid4()), full, a_free_user["sub"], "hash", "mm_test"))
            conn.commit()
        finally:
            conn.close()
        with pytest.raises(HTTPException):
            modelmate.enforce_prediction_token_limit(a_free_user, full)
        modelmate.enforce_prediction_token_limit(a_free_user, empty)
