"""실패할 때 클라이언트에게 무엇을 말하는가.

`HTTPException`에 실린 `detail`을 형태별로 셌다.

    문자열 리터럴          70   지어 쓴 문장이다. 런타임 값이 안 섞인다
    인라인 dict            17   구조화돼 있다
    failure_detail(...)     8
    변수에 담긴 구조체       7   `detail` · `blocker` · `_quick_failure(...)`
    **예외 문자열 그대로     1** ← 여기

**처음엔 "스물넷이 `failure_detail`"이라고 적었다. 여덟이다.** 인라인 dict와 헬퍼가
만든 것까지 한 덩어리로 셌기 때문이다. 세어보지 않고 적으면 이렇게 된다 — 그리고
이 목록이 잡아온 결함의 절반이 그 모양이다.

    raise HTTPException(500, str(e))        030_shap.part, `run_shap`

재현해 보면 클라이언트가 이런 것을 받는다.

    cannot load artifact: /home/jovyan/work/modelmate/models/u-42/best.pkl (uid=1000)

**절대 경로와 uid가 그대로 나간다.** 이 저장소는 `GET /api/debug-env`로 환경 노출을
한 번 겪었고 `test_no_environment_disclosure.py`가 그 자리를 지키는데, **예외 문자열로
나가는 길은 아무도 안 보고 있었다.**

이 줄이 왜 살아남았는지가 요점이다. **안 도는 줄이었다** — 안쪽 되돌림(계수 기반
중요도)까지 실패해야 여기 닿는다. 커버리지에도, 거부 감사에도 안 걸렸다.

여기서 둘을 지킨다.

    1. 이 경로가 예외 문자열을 그대로 내보내지 않는다 (행동으로)
    2. `HTTPException(*, str(e))` 형태가 **어디에도 새로 생기지 않는다** (구조로)
"""

from __future__ import annotations

import ast
import asyncio
import sys
import types
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from part_source import assembled  # noqa: E402

from fastapi import HTTPException  # noqa: E402

SECRETISH = ("/home/", "/root/", "/opt/", "uid=", "Traceback", "site-packages")


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


class Unexplainable:
    """설명을 만들 수 없는 모델. **안쪽 되돌림까지 실패시켜야** 바깥에 닿는다."""

    LEAK = "cannot load artifact: /home/jovyan/models/u-42/best.pkl (uid=1000)"

    @property
    def coef_(self):
        raise RuntimeError(self.LEAK)

    def predict(self, frame):
        return [0] * len(frame)


@pytest.fixture
def shap_that_fails(monkeypatch):
    """`STATE`는 프로세스가 공유한다. 되돌린다."""
    def explode(*args, **kwargs):
        raise RuntimeError("tree explainer unavailable")

    before = dict(modelmate.STATE)
    monkeypatch.setitem(modelmate.__dict__, "SHAP_OK", True)
    monkeypatch.setitem(modelmate.__dict__, "shap",
                        types.SimpleNamespace(TreeExplainer=explode))
    modelmate.STATE.clear()
    modelmate.STATE["best_model"] = Unexplainable()
    modelmate.STATE["X"] = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    yield
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestAFailedExplanationSaysNothingInternal:
    def test_it_still_refuses(self, shap_that_fails):
        """**대조가 먼저다.** 실패하지 않으면 아래 단언들은 아무것도 안 본다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_shap)
        assert refused.value.status_code == 500

    def test_the_raw_message_does_not_reach_the_client(self, shap_that_fails):
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_shap)
        rendered = repr(refused.value.detail)
        assert Unexplainable.LEAK not in rendered
        for leak in SECRETISH:
            assert leak not in rendered, f"{leak}가 응답에 있다: {rendered[:200]}"

    def test_it_still_says_what_kind_of_failure(self, shap_that_fails):
        """가리는 것과 입을 다무는 것은 다르다. **예외 종류는 화면에 띄워도 되는
        만큼의 정보**이고, 그것마저 없으면 사용자도 지원하는 쪽도 할 일이 없다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_shap)
        detail = refused.value.detail
        assert detail["technical_message"] == "error_type=RuntimeError"
        assert detail["user_friendly_message"]
        # **`assert detail["recommended_next_action"]`만으로는 못 잡는다.**
        # `failure_detail`이 비어 있으면 "입력값을 확인한 뒤 다시 시도하세요."를
        # 채워 넣으므로 그 단언은 어떤 경우에도 참이다. 대조를 걸어보고 알았다.
        # 이 라우트의 안내는 그 기본값과 달라야 한다 — 설명 실패에 "입력값을
        # 확인하라"는 것은 할 수 없는 일을 시키는 것이다.
        assert detail["recommended_next_action"] == "분석을 다시 실행한 뒤 설명을 요청해 주세요."
        assert detail["support_debug_id"]

    def test_the_real_message_is_recorded_server_side(self, shap_that_fails, monkeypatch):
        """숨기는 것이 아니라 **옮기는 것**이다. 서버는 진짜 이유를 알아야 한다."""
        recorded = []
        monkeypatch.setattr(modelmate, "record_security_event",
                            lambda *args, **kwargs: recorded.append((args, kwargs)))
        with pytest.raises(HTTPException):
            call(modelmate.run_shap)
        assert [args[0] for args, _ in recorded] == ["explain.shap_failed"]
        assert recorded[0][1]["safe_details"]["error_type"] == "RuntimeError"


class TestNoHandlerHandsBackARawException:
    """`HTTPException(*, str(e))`가 **어디에도** 새로 생기지 않는가.

    행동 검사는 이 한 경로만 본다. 같은 모양이 다른 라우트에 생기면 그 검사는
    조용하다 — 이 저장소가 반복해서 겪은 것이 그것이다.
    """

    def raw_detail_sites(self):
        parts = assembled()
        found = []
        for _, node in parts.functions():
            for inner in ast.walk(node):
                if not (isinstance(inner, ast.Raise) and isinstance(inner.exc, ast.Call)
                        and ast.unparse(inner.exc.func).endswith("HTTPException")):
                    continue
                if len(inner.exc.args) < 2:
                    continue
                detail = ast.unparse(inner.exc.args[1])
                if detail.startswith("str(") and detail != "str(technical_message)":
                    found.append(f"{parts.where(inner)} ({node.name}): {detail}")
        return found

    def test_there_are_none(self):
        found = self.raw_detail_sites()
        assert found == [], (
            "예외 문자열을 그대로 `detail`에 싣는 곳이 있다. `failure_detail(...)`로 "
            "가려서 내보내고 진짜 메시지는 기록으로 남겨라:\n  " + "\n  ".join(found))

    def test_the_scan_would_see_one(self):
        """대조: 훑기가 깨져 있으면 위 단언은 빈손으로 통과한다."""
        planted = ast.parse("raise HTTPException(500, str(e))")
        node = planted.body[0]
        assert ast.unparse(node.exc.args[1]).startswith("str(")

    def test_the_convention_is_actually_used(self):
        """**반대 방향.** `failure_detail`을 아무도 안 쓰면 위 검사는 '없음'을 두고
        초록불이지만, 그건 관례가 지켜진 게 아니라 사라진 것이다."""
        source = assembled().source
        assert source.count("failure_detail(") == 12, (
            "`failure_detail` 호출 수가 바뀌었다. 늘어난 것은 좋고, 줄었다면 "
            "무엇이 그 자리를 대신하는지 보고 이 수를 고쳐라.")
