"""익명 호출자 둘이 같은 분석 상태를 나눠 쓴다 — 그 결정의 값을 눈에 보이게 둔다.

앞 회차에 `_scope_state_to_the_caller`가 적어둔 결정을 고정했다.

    Anything unauthenticated falls into the shared default, which is what the
    process did before scoping existed.

**결정은 적혀 있었고, 그것이 무슨 뜻인지는 안 적혀 있었다.** 이번에 재봤다.

    A(익명)  POST /api/upload   환자기록.csv → 200
    B(익명)  GET  /api/columns  → 200  ['환자ID', '진단코드', '결과']
    C(게스트) GET  /api/columns  → 400  (자기 버킷은 비어 있다)

**모르는 사람 둘이 서로의 업로드를 본다.** 그리고 **게스트 세션 하나면 갈린다** —
막을 장치는 이미 있고, 세션이 없는 호출자만 한 통에 들어간다.

프런트는 언제나 게스트 세션을 보내므로(`frontend/src/api.js`) 실제 사용자에게는
일어나지 않는다. 이 갈래에 들어오는 것은 맨 HTTP 호출자다.

**고치지 않았다.** "완전 익명 분석을 계속 허용할 것인가"는 제품 결정이고 로드맵에
사람 몫으로 적혀 있다. 여기서 하는 일은 **그 결정을 눈에 보이게 만드는 것**이다 —
바꾸기로 하면 이 검사가 빨간불이 되고, 그때 무엇이 바뀌는지 이 파일이 말해준다.

*적어둔 결정과 그 결정이 무슨 뜻인지는 다른 것이다.*

업로드 한도는 익명에게도 걸린다(따로 확인했다): 요금제 `free`, 5,000행·100열·10MB,
그리고 `datasets` 표에는 행이 생기지 않는다. **자원 소모는 막혀 있고 갈리지 않은 것은
상태뿐이다.**
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

COLUMNS = ["환자ID", "진단코드", "결과"]


def a_csv() -> bytes:
    head = ",".join(COLUMNS).encode("utf-8") + b"\n"
    return head + b"".join(f"P{i},D{i % 7},{i % 2}\n".encode() for i in range(60))


@pytest.fixture
def clean_bucket():
    """공용 버킷을 비우고 시작해 되돌린다. 앞선 검사가 남긴 것을 이 결과로 읽지 않는다."""
    before = dict(modelmate.STATE)
    modelmate.STATE.clear()
    yield
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


@pytest.fixture
def uploaded(clean_bucket):
    """A(익명)가 올린다."""
    client = TestClient(modelmate.app, raise_server_exceptions=False)
    response = client.post(
        "/api/upload",
        files={"file": ("환자기록.csv", io.BytesIO(a_csv()), "text/csv")})
    assert response.status_code == 200, response.text
    assert response.json()["columns"] == COLUMNS
    return response


class TestAStrangerSeesTheUpload:
    """**이 파일의 이유.** 고치는 검사가 아니라 보여주는 검사다."""

    def test_the_upload_itself_needs_no_account(self, clean_bucket):
        client = TestClient(modelmate.app, raise_server_exceptions=False)
        response = client.post(
            "/api/upload",
            files={"file": ("환자기록.csv", io.BytesIO(a_csv()), "text/csv")})
        assert response.status_code == 200

    def test_another_anonymous_caller_reads_the_columns(self, uploaded):
        """다른 클라이언트, 같은 답. **A가 올린 컬럼 이름이 그대로 나온다.**"""
        stranger = TestClient(modelmate.app, raise_server_exceptions=False)
        response = stranger.get("/api/columns")
        assert response.status_code == 200
        body = response.json()
        seen = body.get("columns") if isinstance(body, dict) else body
        assert seen == COLUMNS

    def test_a_guest_session_is_isolated(self, uploaded):
        """**막을 장치는 이미 있다.** 게스트 세션 하나면 자기 버킷을 본다."""
        stranger = TestClient(modelmate.app, raise_server_exceptions=False)
        response = stranger.get(
            "/api/columns", headers={"X-ModelMate-Guest-Session": "guest-isolated"})
        assert response.status_code == 400, (
            "게스트 세션이 있는데도 남의 업로드가 보인다 — 격리가 깨졌다")

    def test_a_signed_in_user_is_isolated_too(self, uploaded):
        """되돌림 방향의 또 한 갈래. 격리가 게스트에게만 되는 것이 아니어야 한다.

        **진짜 토큰을 쓴다.** 처음엔 `app.dependency_overrides`로 사용자를 넣었고
        200이 나왔다 — 로그인한 사용자에게 남의 업로드가 보이는 줄 알았다.

        아니었다. 범위를 정하는 것은 **미들웨어**이고, 그것은 `get_current_user`를
        의존성 주입이 아니라 **직접 부른다.** 그래서 오버라이드가 범위에 아무 영향이
        없었다. 헤더에 진짜 토큰을 실으니 400 — 갈려 있다.

        *가짜로 넣은 신원은 그것을 읽는 겹에만 보인다.* 앞 회차에 "검사가 사용자를
        직접 넣으면 의존성이 안 돈다"고 적었는데, 같은 함정의 다른 얼굴이다.
        """
        token = modelmate.make_token("bucket-user-1", "u@bucket.test", "테스트")
        response = TestClient(modelmate.app, raise_server_exceptions=False).get(
            "/api/columns", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 400


class TestTheLimitsStillApplyToNobody:
    """**자원 소모는 막혀 있다.** 갈리지 않은 것은 상태뿐이라는 것을 여기서 고정한다.

    "익명이 업로드할 수 있다"만 적으면 무제한으로 읽힌다. 무엇이 막혀 있고 무엇이
    안 막혀 있는지 함께 적어야 다음 사람이 판단할 수 있다.
    """

    def test_an_anonymous_caller_is_on_the_free_plan(self):
        assert modelmate.get_user_plan(None) == "free"

    def test_the_free_limits_are_real_numbers(self):
        limits = modelmate.get_plan_limits(None)
        for key in ("max_rows_per_dataset", "max_columns_per_dataset",
                    "max_file_size_mb"):
            assert limits.get(key), f"{key}가 비어 있으면 아래 검사는 아무것도 확인하지 않는다"

    def test_a_huge_upload_is_refused_even_without_an_account(self):
        limits = modelmate.get_plan_limits(None)
        with pytest.raises(HTTPException) as refused:
            modelmate.enforce_dataset_upload_limits(
                None, 1024, limits["max_rows_per_dataset"] + 1, 5)
        assert refused.value.status_code == 429
        assert refused.value.detail["limit_key"] == "max_rows_per_dataset"

    def test_it_writes_no_dataset_row(self, clean_bucket):
        """익명 업로드는 DB에 쌓이지 않는다 — `STATE`에만 앉는다."""
        def rows():
            conn = modelmate.get_db()
            try:
                return conn.execute("SELECT COUNT(*) FROM datasets").fetchone()[0]
            finally:
                conn.close()

        before = rows()
        TestClient(modelmate.app, raise_server_exceptions=False).post(
            "/api/upload",
            files={"file": ("환자기록.csv", io.BytesIO(a_csv()), "text/csv")})
        assert rows() == before


class TestTheDecisionIsStillWrittenDown:
    """근거가 코드에서 사라지면 이 파일은 **이유 없는 고정**이 된다."""

    def test_the_middleware_still_says_why(self):
        source = (ROOT / "backend" / "main_parts").glob("*.part")
        text = "".join(path.read_text(encoding="utf-8-sig") for path in source)
        assert "falls into the shared default" in text, (
            "공용 기본 버킷의 근거 문장이 사라졌다. 동작을 바꿨다면 이 파일도 "
            "함께 바꿔야 한다.")
