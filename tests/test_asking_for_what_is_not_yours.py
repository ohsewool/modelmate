"""없는 것과 남의 것을 물었을 때 무엇이 돌아오는가.

`HTTPException` 102개 중 CI가 한 번도 발동시키지 않는 것이 **53개** 남았고, 그중
`404`가 열다섯이다. 여섯을 골랐다 — **없는 것을 물었을 때 거절하는지 아무도 확인한
적이 없는** 자리들.

    get_beta_feedback                    관리자 전용 조회
    update_beta_feedback_status          관리자 전용 상태 변경
    update_pilot_inquiry_status          관리자 전용 상태 변경
    get_monitoring_error                 관리자 전용 조회
    revoke_project_prediction_token      **남의 토큰을 취소할 수 있는가**
    regenerate_project_prediction_token  **남의 토큰을 다시 발급할 수 있는가**

뒤의 둘이 이 파일의 이유다. 질의가 `AND owner_user_id=?`로 좁혀져 있어 남의 토큰은
못 만지게 돼 있는데, **그 조건이 지워져도 지금까지는 아무 검사도 빨간불이 되지
않았다.** 예측 API 토큰은 배포된 모델을 부르는 열쇠다.

`403`은 확인하지 않는다. 관리자 아닌 사람을 막는 열한 자리 중 열은 이미 발동하고,
남은 하나는 `delete_deployed`의 **일부러 둔 이중 방어**다(앞 회차에 대조로 확인했다).

`Depends`를 거치지 않고 핸들러를 직접 부른다.
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

STAMP = "2026-08-23T00:00:00"
ADMIN = {"sub": "notfound-admin", "email": "admin@notfound.test", "role": "admin"}

# **상태 값을 여기 적어 넣지 않는다.** 처음엔 `"triaged"`라고 썼고 400이 왔다 —
# 그건 이 제품의 상태가 아니다. 검사가 상수를 손으로 베끼면 제품이 바뀔 때
# 검사만 낡고, 그 상태로 초록불이 된다. 코드가 쓰는 집합에서 하나 꺼내 쓴다.
VALID_FEEDBACK_STATUS = sorted(modelmate.FEEDBACK_STATUSES)[0]
VALID_INQUIRY_STATUS = sorted(modelmate.PILOT_INQUIRY_STATUSES)[0]


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


def insert(table, **columns):
    """필수 컬럼을 **스키마에서 읽어** 빠진 것이 없는지 먼저 확인한다.

    앞 회차에 `NOT NULL constraint failed`로 두 번 죽었다 — 픽스처가 추측하면
    검사가 아니라 픽스처를 고치게 된다."""
    conn = modelmate.get_db()
    try:
        info = conn.execute(f"PRAGMA table_info({table})").fetchall()
        required = {row[1] for row in info if row[3] and row[4] is None}
        missing = required - set(columns)
        assert not missing, f"{table}의 필수 컬럼이 빠졌다: {sorted(missing)}"
        names = [row[1] for row in info if row[1] in columns]
        conn.execute(
            f"INSERT INTO {table} ({','.join(names)}) "
            f"VALUES ({','.join('?' * len(names))})",
            tuple(columns[name] for name in names))
        conn.commit()
    finally:
        conn.close()


def rows(statement, parameters=()):
    conn = modelmate.get_db()
    try:
        return conn.execute(statement, parameters).fetchall()
    finally:
        conn.close()


class TestTheAdminLookupsRefuseAnUnknownId:
    """관리자가 없는 것을 물으면 404다. **아무도 확인한 적이 없었다.**

    없는 것을 물었는데 조용히 빈 것을 주면, 화면은 "기록이 비어 있다"로 보이고
    사용자는 자기가 잘못 찾은 것인지 기록이 사라진 것인지 알 수 없다.
    """

    @pytest.fixture(autouse=True)
    def schema(self):
        for ensure in ("ensure_feedback_table", "ensure_pilot_inquiry_table",
                       "ensure_monitoring_tables"):
            getattr(modelmate, ensure)()

    @pytest.mark.parametrize("handler, kwargs", [
        ("get_beta_feedback", {"feedback_id": "nope-1"}),
        ("get_monitoring_error", {"error_id": "nope-2"}),
        ("update_beta_feedback_status",
         {"feedback_id": "nope-3", "body": {"status": VALID_FEEDBACK_STATUS}}),
        ("update_pilot_inquiry_status",
         {"inquiry_id": "nope-4", "body": {"status": VALID_INQUIRY_STATUS}}),
    ])
    def test_an_unknown_id_is_a_404(self, handler, kwargs):
        with pytest.raises(HTTPException) as refused:
            call(getattr(modelmate, handler), user=ADMIN, **kwargs)
        assert refused.value.status_code == 404

    def test_a_real_feedback_is_found(self):
        """**되돌림 방향.** 무엇을 물어도 404를 내는 구현도 위 검사는 통과한다."""
        feedback_id = f"fb-{uuid.uuid4().hex[:8]}"
        insert("beta_feedback", feedback_id=feedback_id, category="bug",
               severity="low", title="테스트", message="본문", status="new",
               created_at=STAMP, updated_at=STAMP)
        found = call(modelmate.get_beta_feedback, feedback_id=feedback_id, user=ADMIN)
        assert found["feedback_id"] == feedback_id

    def test_a_bad_status_is_a_400_not_a_404(self):
        """**두 거절을 가른다.** 없는 문의와 지원하지 않는 상태는 관리자가 할 일이
        다르다 — 하나는 id를 다시 찾고, 하나는 값을 고친다.

        순서도 여기서 드러난다: 상태 검사가 조회보다 **앞**이라, 없는 id에 잘못된
        상태를 보내면 404가 아니라 400이 온다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.update_beta_feedback_status,
                 feedback_id="nope-5", body={"status": "그런 상태 없음"}, user=ADMIN)
        assert refused.value.status_code == 400


class TestRevokingATokenThatIsNotYours:
    """**이 파일의 이유.**

    예측 API 토큰은 배포된 모델을 부르는 열쇠다. 취소와 재발급 질의는
    `AND owner_user_id=?`로 좁혀져 있는데, **그 조건이 지워져도 지금까지는 아무
    검사도 빨간불이 되지 않았다.**

    남의 토큰을 물었을 때 `403`이 아니라 `404`인 것도 확인한다 — 403은 "그것이
    존재한다"를 알려준다. 이 저장소는 그 구분을 `_resource_not_found`로 세워뒀다.
    """

    @pytest.fixture
    def owned_token(self):
        modelmate.ensure_prediction_token_table()
        owner = {"sub": f"tok-{uuid.uuid4().hex[:8]}",
                 "email": f"{uuid.uuid4().hex[:6]}@tok.test", "role": "user"}
        project_id = f"p-{uuid.uuid4().hex[:8]}"
        token_id = f"t-{uuid.uuid4().hex[:8]}"
        insert("projects", id=project_id, user_id=owner["sub"], name="토큰 검사용",
               description="", created_at=STAMP, updated_at=STAMP)
        insert("prediction_api_tokens", token_id=token_id, project_id=project_id,
               owner_user_id=owner["sub"], token_hash="h", token_prefix="pre",
               status="active", created_at=STAMP)
        return owner, project_id, token_id

    def status_of(self, token_id):
        found = rows("SELECT status FROM prediction_api_tokens WHERE token_id=?",
                     (token_id,))
        assert found, "토큰 행이 사라졌다"
        return found[0]["status"]

    def test_the_owner_can_revoke_it(self, owned_token):
        """**되돌림 방향이 먼저다.** 아무도 취소하지 못하는 구현이면 아래 거절
        검사는 아무것도 증명하지 않는다."""
        owner, project_id, token_id = owned_token
        call(modelmate.revoke_project_prediction_token,
             project_id=project_id, token_id=token_id, user=owner)
        assert self.status_of(token_id) == "revoked"

    def test_a_stranger_cannot_revoke_it(self, owned_token):
        """**이 검사는 프로젝트 관문이 막는다.** 토큰 질의까지 가지도 않는다.

        대조에서 알았다: 토큰 줄의 404를 403으로 바꿔도 초록불이었다.
        `assert_project_owner`가 먼저 끊기 때문이다. 단언은 맞지만 **이름이
        말하는 자리를 지나지 않는다** — 그래서 아래 검사를 따로 뒀다.
        """
        _, project_id, token_id = owned_token
        stranger = {"sub": "tok-stranger", "email": "s@tok.test", "role": "user"}
        with pytest.raises(HTTPException) as refused:
            call(modelmate.revoke_project_prediction_token,
                 project_id=project_id, token_id=token_id, user=stranger)
        assert refused.value.status_code == 404, "남에게 존재를 알려준다"
        assert self.status_of(token_id) == "active", "거절했는데 취소됐다"

    def test_a_second_owner_cannot_reach_it_through_their_own_project(self, owned_token):
        """**여기가 `owner_user_id` 조건이 실제로 일하는 자리다.**

        남이 **자기 프로젝트를 가지고** 남의 토큰 id를 부른다. 프로젝트 관문은
        통과한다(자기 프로젝트니까). 막는 것은 토큰 질의뿐이다.
        """
        _, _, token_id = owned_token
        other = {"sub": f"tok2-{uuid.uuid4().hex[:8]}",
                 "email": f"{uuid.uuid4().hex[:6]}@tok.test", "role": "user"}
        their_project = f"p-{uuid.uuid4().hex[:8]}"
        insert("projects", id=their_project, user_id=other["sub"], name="남의 프로젝트",
               description="", created_at=STAMP, updated_at=STAMP)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.revoke_project_prediction_token,
                 project_id=their_project, token_id=token_id, user=other)
        assert refused.value.status_code == 404
        assert self.status_of(token_id) == "active", "남이 취소했다"

    def test_an_unknown_token_is_a_404_for_the_owner_too(self, owned_token):
        owner, project_id, _ = owned_token
        with pytest.raises(HTTPException) as refused:
            call(modelmate.revoke_project_prediction_token,
                 project_id=project_id, token_id="t-does-not-exist", user=owner)
        assert refused.value.status_code == 404

    def test_a_token_from_another_project_is_not_reachable(self, owned_token):
        """질의는 `token_id`와 `project_id`를 **둘 다** 본다. 하나만 보면 자기
        프로젝트 경로로 남의 프로젝트 토큰을 만질 수 있다."""
        owner, _, token_id = owned_token
        other = f"p-{uuid.uuid4().hex[:8]}"
        insert("projects", id=other, user_id=owner["sub"], name="다른 프로젝트",
               description="", created_at=STAMP, updated_at=STAMP)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.revoke_project_prediction_token,
                 project_id=other, token_id=token_id, user=owner)
        assert refused.value.status_code == 404
        assert self.status_of(token_id) == "active"

    def test_regenerating_someone_elses_token_is_refused(self, owned_token):
        """재발급도 같은 자리를 지나야 한다. **남이 자기 프로젝트를 가지고** 부른다 —
        아니면 프로젝트 관문이 먼저 끊어서 토큰 질의를 확인하지 못한다."""
        _, _, token_id = owned_token
        other = {"sub": f"tok3-{uuid.uuid4().hex[:8]}",
                 "email": f"{uuid.uuid4().hex[:6]}@tok.test", "role": "user"}
        their_project = f"p-{uuid.uuid4().hex[:8]}"
        insert("projects", id=their_project, user_id=other["sub"], name="남의 프로젝트",
               description="", created_at=STAMP, updated_at=STAMP)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.regenerate_project_prediction_token,
                 project_id=their_project, token_id=token_id, user=other)
        assert refused.value.status_code == 404
        assert self.status_of(token_id) == "active", "남이 다시 발급했다"
