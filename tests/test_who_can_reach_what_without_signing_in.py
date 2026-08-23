"""인증 없이 앱을 통과하면 무엇이 돌아오는가.

앞 회차에 이 저장소의 검사가 **전부 핸들러를 직접 부른다**는 것을 알았다. 그러면
`user=Depends(get_current_user)`가 **한 번도 안 돈다** — 검사가 `user=OWNER`를 직접
넣기 때문이다.

그게 무엇을 가리는지 재봤다. `get_current_user`는 **자격이 없으면 `None`을 돌려준다** —
막지 않는다. 즉 의존을 선언하는 것만으로는 아무것도 안 걸리고, 핸들러가 스스로
확인해야 한다. **선언과 확인이 다른 일인데 검사는 둘 다 안 본다.**

`TestClient`로 매개변수 없는 `GET` 28개에 인증 없이 요청을 보냈다.

    401/403으로 거절   11개
    400(상태 없음)      6개
    **200으로 응답     11개**

열하나 중 열은 괜찮았다 — `/api/health`, 준비 상태, 그리고 **빈 목록**을 주는 것들
(`/api/projects`, `/api/deployed`는 2바이트, 즉 `[]`).

**`/api/history`가 45,506바이트를 줬다.**

### 무엇이 나갔나

43건. 타깃 컬럼명(`"Machine failure"`), 데이터 크기(`[10000, 11]`), 모델 이름과 점수.
`experiment_history.json` — **인증 이전 시절의 공용 파일**이고, 익명 분석이 전부 한곳에
쌓인다. 로그인한 사용자의 경로는 `WHERE user_id=?`로 좁혀져 있고 검사도 있다.

**익명 갈래에도 검사가 있었다 — 그리고 통과하고 있었다.**
`test_an_anonymous_caller_sees_nothing_of_either`가 DB에 심은 무작위 표식이 응답에
없는지를 봤는데, 익명 갈래는 **DB를 아예 안 읽는다.** 파일을 돌려주니 DB 표식이
들어갈 리가 없고, 단언은 언제나 참이었다. **"아무도 안 봤다"가 아니라 "본 것이
다른 것이었다".**

`DELETE`도 같은 갈래를 지난다. 인증 없이 부르면 **그 파일을 지웠다.** `ok: True`와 함께.

읽기와 파괴 둘 다, 아무도 결정한 적 없다. 프런트는 언제나 토큰이나
`X-ModelMate-Guest-Session` 중 하나를 보내므로(`frontend/src/api.js`) 이 갈래에 오는
것은 **이 제품의 클라이언트가 아니다.** 401로 바꿨다 — 조용히 빈 목록을 주면
"기록이 없다"로 읽힌다.

### 그리고 공개 표면을 이름으로 둔다

인증 없이 200을 주는 것이 무엇인지 **아무 데도 적혀 있지 않았다.** 새 라우트가 의존을
빼먹어도 검사는 전부 통과한다 — 검사가 사용자를 직접 넣으니까. 아래 목록이 그것을 막는다.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

# 인증 없이 `200`을 주기로 **정한** 것들. 각각 이유가 있다.
# 새로 하나 생기면 여기서 걸리고, 그때 그것이 결정이 된다.
PUBLIC_GET = {
    "/api/health": "가동 확인. 배포가 부르는 자리다",
    "/api/llm/status": "선택적 LLM의 준비 상태만. 값은 안 나간다",
    "/api/agent/tools": "에이전트 도구 목록. 카탈로그이고 사용자 데이터가 아니다",
    "/api/session": "세션 형태만 돌려준다. 익명이면 익명이라고 답한다",
    "/api/state": "요청별로 좁혀진 STATE. 익명 호출자는 자기 것만 본다",
    "/api/me/usage": "익명에게는 요금제 기본값. 남의 사용량이 아니다",
    "/api/profile/summary": "익명이면 빈 프로필",
    "/api/validation-summary": "현재 STATE 기준. 익명이면 비어 있다",
    "/api/projects": "익명에게 빈 목록",
    "/api/deployed": "익명에게 빈 목록",
}


@pytest.fixture
def anonymous():
    """토큰도 게스트 헤더도 없는 호출자. **프런트는 이렇게 부르지 않는다.**

    **공용 `STATE`를 비우고 시작한다.** 처음엔 안 비웠고, 파일 단독으로는 통과하고
    전체 스위트에서는 실패했다 — 앞선 검사가 `STATE`에 데이터셋을 남기면
    `/api/columns` 같은 여섯이 400에서 200으로 바뀐다. 그 여섯은 `STATE`가 있는지에
    달렸지 인증에 달린 것이 아니다.
    """
    before = dict(modelmate.STATE)
    modelmate.STATE.clear()
    yield TestClient(modelmate.app, raise_server_exceptions=False)
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestTheSharedHistoryIsNoLongerPublic:
    """**이번 회차의 결함.** 읽기와 파괴 둘 다 인증 없이 됐다."""

    def test_reading_it_is_refused(self, anonymous):
        response = anonymous.get("/api/history")
        assert response.status_code == 401

    def test_deleting_it_is_refused(self, anonymous):
        response = anonymous.delete("/api/history")
        assert response.status_code == 401

    def test_the_file_survives_the_attempt(self, anonymous):
        """거절했는데 지워졌으면 거절이 아니다."""
        import json
        import os

        path = Path(modelmate.HISTORY_FILE)
        created = not path.exists()
        if created:
            path.write_text(json.dumps([{"timestamp": "x", "target": "표식"}]),
                            encoding="utf-8")
        try:
            anonymous.delete("/api/history")
            assert path.exists(), "인증 없는 호출이 공용 기록을 지웠다"
        finally:
            if created:
                os.remove(path)

    @pytest.mark.parametrize("method", ["get", "delete"])
    def test_it_says_what_to_do(self, method, anonymous):
        """**조용히 빈 목록을 주지 않는다** — 그러면 "기록이 없다"로 읽힌다."""
        response = getattr(anonymous, method)("/api/history")
        detail = response.json()["detail"]
        assert detail["code"] == "sign_in_required"
        assert "게스트" in detail["recommended_next_action"]

    def test_a_guest_session_still_works(self, anonymous):
        """**되돌림 방향.** 전부 막는 것은 고친 것이 아니다. 게스트 세션을 시작한
        호출자는 자기 기록을 볼 수 있어야 한다."""
        response = anonymous.get(
            "/api/history", headers={"X-ModelMate-Guest-Session": "guest-abc123"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestThePublicSurfaceIsNamed:
    """인증 없이 `200`을 주는 것이 정확히 무엇인가.

    **검사가 사용자를 직접 넣으므로, 라우트가 의존을 빼먹어도 아무것도 안 걸린다.**
    앱을 통과시켜 재고, 그 결과를 이름으로 둔다.
    """

    def measured(self, client):
        import ast

        sys.path.insert(0, str(ROOT / "tests"))
        from part_source import assembled

        paths = set()
        for _, node in assembled().functions():
            for decorator in node.decorator_list:
                text = ast.unparse(decorator)
                if text.startswith("app.get(") and "'" in text:
                    path = text.split("'")[1]
                    if "{" not in path:
                        paths.add(path)
        served = {}
        for path in sorted(paths):
            response = client.get(path)
            if response.status_code == 200:
                served[path] = len(response.content)
        return served

    def test_exactly_these_are_public(self, anonymous):
        served = set(self.measured(anonymous))
        assert served == set(PUBLIC_GET), (
            "인증 없이 200을 주는 GET이 바뀌었다.\n"
            f"  새로 열림: {sorted(served - set(PUBLIC_GET)) or '없음'}\n"
            f"  이제 닫힘: {sorted(set(PUBLIC_GET) - served) or '없음'}\n"
            "새로 열린 것은 `PUBLIC_GET`에 **이유와 함께** 넣거나 막아라.")

    def test_the_list_ones_are_actually_empty(self, anonymous):
        """`/api/projects`와 `/api/deployed`가 `200`인 것은 **빈 목록이기 때문**이다.
        내용이 생기면 그건 다른 이야기다."""
        for path in ("/api/projects", "/api/deployed"):
            body = anonymous.get(path).json()
            assert body == [], f"{path}가 익명에게 {len(body)}건을 준다"

    def test_the_scan_reached_the_app(self, anonymous):
        """대조: 요청이 안 갔으면 위 검사는 빈 집합끼리 비교한다."""
        assert anonymous.get("/api/health").status_code == 200
        assert len(self.measured(anonymous)) >= 8


class TestTheSharedDefaultScopeIsADecision:
    """인증 없는 호출자는 **하나의 공용 `STATE` 버킷**을 함께 쓴다.

    `_scope_state_to_the_caller`가 그렇게 적어두고 있다:

        Anything unauthenticated falls into the shared default, which is what
        the process did before scoping existed.

    **결함이 아니라 적어둔 결정이다.** 그래서 고치지 않는다. 다만 그 결정이 무엇을
    뜻하는지 여기 고정한다 — `STATE`에 데이터가 있으면 아래 여섯은 인증 없이도
    `200`을 준다. 프런트는 언제나 게스트 세션을 보내므로 실제로 이 버킷에 들어오는
    것은 이 제품의 클라이언트가 아니다.

    바꾸기로 하면 이 검사가 빨간불이 되고, 그때 그것이 결정이 된다.
    """

    STATE_DEPENDENT = (
        "/api/columns", "/api/explain/summary", "/api/feature-info",
        "/api/predictions", "/api/report/html", "/api/report/summary",
    )

    @pytest.mark.parametrize("path", STATE_DEPENDENT)
    def test_without_state_it_refuses(self, path, anonymous):
        assert anonymous.get(path).status_code == 400

    def test_with_state_the_shared_bucket_answers(self, anonymous):
        """**되돌림 방향.** 늘 400이면 위 검사는 "무엇이든 거절"을 확인한 것이다."""
        import pandas as pd

        modelmate.STATE["df"] = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
        modelmate.STATE["col_labels"] = {"a": "가", "b": "나"}
        assert anonymous.get("/api/columns").status_code == 200


class TestDeclaringTheDependencyIsNotChecking:
    """`get_current_user`는 자격이 없으면 **`None`을 돌려준다.** 막지 않는다.

    이 사실이 이 파일의 이유다. 의존을 선언한 라우트가 서른 개 넘지만, 그 선언이
    막아주는 것은 아무것도 없다 — 핸들러가 `require_current_user`나 소유권 관문을
    불러야 한다. **선언과 확인은 다른 일이다.**
    """

    def test_it_returns_none_rather_than_refusing(self):
        from types import SimpleNamespace

        result = modelmate.get_current_user(credentials=None,
                                            x_modelmate_guest_session=None)
        assert result is None, "이제 막는다면 이 파일의 설명을 고쳐야 한다"

    def test_a_guest_header_alone_makes_an_identity(self):
        result = modelmate.get_current_user(credentials=None,
                                            x_modelmate_guest_session="abc-123")
        assert result["role"] == "guest"
        assert result["sub"].startswith("guest:")
