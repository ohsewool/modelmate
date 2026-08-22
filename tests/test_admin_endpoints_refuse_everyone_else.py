"""관리자 전용 엔드포인트가 비관리자를 실제로 막는가.

2026-08-22에 스위트가 도는 동안 `HTTPException`이 **실제로 발생한 자리**를 기록했다.
`.part` 파일들은 이어붙여 `exec`되므로 프레임의 파일명이 디렉터리 경로다 — 줄 번호는
이어붙인 소스 기준이라 되돌릴 수 있고, 그렇게 매핑했다.

    소스의 HTTPException 발생 지점        101곳
    스위트가 실제로 발생시킨 지점            3곳

세 곳은 한도 초과(429) 둘과 타깃 설정 실패(400) 하나다. **거부 98곳은 한 번도 발동한
적이 없다.** 그중 열여섯이 권한과 관련된 것이었다 — 관리자 전용 403이 아홉, 로그인
필요 401이 셋, 내려간 예측 API 410이 둘.

계측기를 먼저 의심했다. parts 밖에서 난 예외를 놓치는 것 아닌가 싶어 **프레임이
parts에 없으면 그것도 기록하도록 넓혀** 다시 돌렸다. 여전히 3곳이었다. 기록된 세 줄에
실제로 `HTTPException(`이 있는 것도 확인했다.

관리자 엔드포인트를 고른 이유는 분명하다. **조건 하나가 뒤집혀도 정상 사용자는 아무
차이를 못 느낀다** — 관리자만 쓰는 화면이고, 뚫린 것은 뚫린 뒤에야 보인다. 형제
저장소 `document-intelligence`에서 어제 같은 일을 확인했다: 거부 76개 중 21개가 지워도
초록불이었고, 그중 하나는 저장소가 스스로 경고해둔 함정이었다.

`Depends`를 거치지 않고 핸들러를 직접 부른다. 여기서 확인하려는 것은 "이 함수가
비관리자를 막는가"이지 FastAPI가 의존성을 주입하는가가 아니다.
"""

import asyncio
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

NOT_ADMIN = {"sub": "user-not-admin", "email": "someone@example.com", "role": "user"}
ANONYMOUS = None

# (핸들러 이름, 인자, 기대 코드). 인자는 관리자 판정 **앞**에서 쓰이지 않는 것들이라
# 값 자체는 중요하지 않다 - 거부가 먼저 나야 한다는 것이 요점이다.
ADMIN_ONLY = (
    ("admin_users", (), 403),
    ("admin_summary", (), 403),
    ("list_beta_feedback", (None, None, None, 50), 403),
    ("get_beta_feedback", ("feedback-1",), 403),
    ("update_beta_feedback_status", ("feedback-1", {"status": "closed"}), 403),
    ("list_pilot_inquiries", (None, 50), 403),
    ("update_pilot_inquiry_status", ("inquiry-1", {"status": "closed"}), 403),
    ("list_monitoring_errors", (None, None, None, 50), 403),
    ("list_monitoring_events", (None, 50), 403),
    ("get_monitoring_error", ("error-1",), 403),
)


def call(name, args, user):
    handler = getattr(modelmate, name)
    result = handler(*args, user=user)
    if asyncio.iscoroutine(result):
        return asyncio.run(result)
    return result


@pytest.mark.parametrize("name,args,expected", ADMIN_ONLY,
                         ids=[case[0] for case in ADMIN_ONLY])
def test_a_non_admin_is_refused(name, args, expected):
    with pytest.raises(HTTPException) as raised:
        call(name, args, NOT_ADMIN)
    assert raised.value.status_code == expected, f"{name}: {raised.value.detail}"


@pytest.mark.parametrize("name,args,expected", ADMIN_ONLY,
                         ids=[case[0] for case in ADMIN_ONLY])
def test_an_anonymous_caller_is_refused(name, args, expected):
    """`user`가 없을 때도 같은 분기로 막힌다. 로그인 여부와 권한을 **다른 조건**으로
    보는 코드가 있으면 여기서 갈린다."""
    with pytest.raises(HTTPException) as raised:
        call(name, args, ANONYMOUS)
    assert raised.value.status_code == expected, f"{name}: {raised.value.detail}"


class TestSignInRequired:
    """401 셋. 403과 달리 "로그인하라"는 안내이고, 둘이 섞이면 존재하지 않는
    계정에 대해서도 권한 이야기를 하게 된다."""

    def test_auth_me_refuses_an_anonymous_caller(self):
        with pytest.raises(HTTPException) as raised:
            call("auth_me", (), ANONYMOUS)
        assert raised.value.status_code == 401

    def test_creating_a_project_requires_a_user(self):
        body = modelmate.ProjectBody(name="p", description="")
        with pytest.raises(HTTPException) as raised:
            call("create_project", (body,), ANONYMOUS)
        assert raised.value.status_code == 401

    def test_the_shared_helper_refuses_an_anonymous_caller(self):
        """`require_current_user`는 저장된 비공개 자원 경로 전체가 쓰는 문지기다."""
        with pytest.raises(HTTPException) as raised:
            modelmate.require_current_user(None)
        assert raised.value.status_code == 401

    def test_the_shared_helper_passes_a_signed_in_caller(self):
        """거부만 확인하면 전부 거부하는 구현도 통과한다."""
        assert modelmate.require_current_user(NOT_ADMIN) == NOT_ADMIN


class TestTheChecksAreNotVacuous:
    def test_an_admin_is_not_refused_by_the_admin_check(self):
        """전부 막는 구현이라면 위 스무 개가 모두 통과하면서 아무것도 증명하지
        않는다. 관리자 판정 자체가 참을 낼 수 있어야 한다."""
        assert modelmate.is_admin_user({"sub": "a", "email": "a@b.c", "role": "admin"})
        assert not modelmate.is_admin_user(NOT_ADMIN)
        assert not modelmate.is_admin_user(None)

    def test_every_listed_handler_exists(self):
        """이름이 바뀌면 `getattr`이 실패한다 — 목록이 조용히 비는 것을 막는다."""
        for name, _, _ in ADMIN_ONLY:
            assert callable(getattr(modelmate, name, None)), name

    def test_the_list_covers_every_admin_route_in_the_source(self):
        """소스에서 관리자 403을 내는 자리를 세어 목록과 맞춘다. 새 관리자
        엔드포인트가 생기면 여기서 걸린다 — **하한선이 아니라 개수 일치**다."""
        import re

        parts = sorted((ROOT / "backend" / "main_parts").glob("*.part"))
        found = sum(
            len(re.findall(r"HTTPException\(\s*(?:status_code\s*=\s*)?403",
                           path.read_text(encoding="utf-8-sig")))
            for path in parts
        )
        assert found == len(ADMIN_ONLY) + 1, (
            f"소스의 403 거부가 {found}곳인데 목록은 {len(ADMIN_ONLY)}개다. "
            "(+1은 소유자 아닌 배포 모델 삭제로, 관리자 전용이 아니라 별도로 다룬다)"
        )
