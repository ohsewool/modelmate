"""이미 사용자를 향해 쓰인 문장이 배관에서 버려지고 있었다.

앞 회차에 `execute_agent_run`의 맨 `ValueError`가 500이 되는 것을 고쳤다. 그건 한
자리였고, **내가 세어온 목록(거부 108개)에는 그런 것이 아예 안 들어 있었다** —
`raise HTTPException`만 셌기 때문이다. 그래서 다시 셌다.

    backend 전체의 비-HTTPException raise    7개
      resolve_jwt_secret      RuntimeError   부팅 거부. 요청 경로가 아니다
      create_goal_first_agent_run RuntimeError  **진짜 내부 실패.** 500이 맞다
      _fallback_from_state    ValueError ×2  같은 모듈 안에서 잡힌다
      execute_agent_run       ValueError     앞 회차에 409로 고쳤다
      make_cv_for_target      ValueError ×2  ← **여기**

`make_cv_for_target`의 둘은 이미 사용자를 향해 쓰여 있다.

    "학습할 데이터가 너무 적습니다."
    "일부 정답 값의 데이터가 1개뿐이라 교차검증을 할 수 없습니다."

그런데 세 호출 자리(`run_cv` 둘, `run_agent` 하나) 어디도 안 잡아서 전역 처리기까지
올라갔고, 사용자는 **500 "예상하지 못한 내부 오류 — 잠시 후 다시 시도하거나
관리자에게"**를 받았다. **정답 클래스 하나에 행이 하나뿐인 CSV는 흔하다.**

*문장은 이미 쓰여 있었고 배관이 그것을 버리고 있었다.*

`cv_for_target_or_refuse`가 한 곳에서 변환한다. 세 자리에 각각 `try/except`를 쓰면
같은 사실을 세 번 적는 꼴이고, 이 저장소가 반복해서 찾아온 결함이 그것이다.
"""

from __future__ import annotations

import ast
import asyncio
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from part_source import assembled  # noqa: E402

from fastapi import HTTPException  # noqa: E402

USER = {"sub": "cv-user", "email": "cv@message.test", "role": "user"}


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


@pytest.fixture
def trained_state():
    """`STATE`는 프로세스가 공유한다. 되돌린다."""
    before = dict(modelmate.STATE)
    yield modelmate.STATE
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


def load(state, y, *, n_unique=2):
    state.clear()
    state.update({
        "X": pd.DataFrame({"a": list(range(len(y))), "b": list(range(len(y)))}),
        "y": pd.Series(y),
        "n_unique_target": n_unique,
        "task_type": "classification",
    })


class TestTheUserSeesWhyTheDataWillNotTrain:
    @pytest.mark.parametrize("label, y, n_unique, expected", [
        ("클래스 하나가 1개뿐", [0, 0, 0, 1], 2, "1개뿐"),
        ("행이 하나뿐", [0], 1, "너무 적습니다"),
    ])
    def test_it_is_a_400_with_the_written_sentence(
            self, label, y, n_unique, expected, trained_state):
        load(trained_state, y, n_unique=n_unique)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_cv, user=USER)
        assert refused.value.status_code == 400, label
        assert expected in refused.value.detail["user_friendly_message"], label

    @pytest.mark.parametrize("y, n_unique", [([0, 0, 0, 1], 2), ([0], 1)])
    def test_it_says_what_to_change(self, y, n_unique, trained_state):
        """500 안내는 **"잠시 후 다시 시도하거나 관리자에게"**였다. 데이터를
        고치는 것은 사용자만 할 수 있고, 기다린다고 행이 늘지 않는다."""
        load(trained_state, y, n_unique=n_unique)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_cv, user=USER)
        action = refused.value.detail["recommended_next_action"]
        assert "관리자" not in action
        assert "다시 시도" in action

    def test_it_does_not_hand_back_a_raw_exception(self, trained_state):
        """아는 문구만 통과시킨다. 이 함수 안에서 sklearn이 던지는 것이 늘면
        그 문구가 그대로 나가게 되고, 그건 `run_shap`에서 겪은 결함이다."""
        load(trained_state, [0, 0, 0, 1])
        with pytest.raises(HTTPException) as refused:
            call(modelmate.run_cv, user=USER)
        assert refused.value.detail["technical_message"] == "error_type=ValueError"

    def test_an_unknown_value_error_becomes_a_general_sentence(self):
        """**아는 문구가 아니면 일반 문장으로 바꾼다.** 통과시키는 목록이 있으면
        그 목록 밖이 어떻게 되는지도 확인해야 한다."""
        original = modelmate.make_cv_for_target

        def explode(*args, **kwargs):
            raise ValueError("n_splits=5 cannot be greater than the number of members")

        modelmate.__dict__["make_cv_for_target"] = explode
        try:
            with pytest.raises(HTTPException) as refused:
                modelmate.cv_for_target_or_refuse(pd.Series([0, 1]), "classification")
        finally:
            modelmate.__dict__["make_cv_for_target"] = original
        rendered = repr(refused.value.detail)
        assert "n_splits" not in rendered, "sklearn 문구가 그대로 나간다"
        assert refused.value.detail["user_friendly_message"] == \
            "이 데이터로는 교차검증을 할 수 없습니다."

    def test_good_data_still_trains(self, trained_state):
        """**되돌림 방향.** 무엇이든 400을 내는 구현도 위 검사들은 통과한다."""
        load(trained_state, [0, 0, 1, 1])
        assert modelmate.cv_for_target_or_refuse(
            modelmate.STATE["y"], "classification") is not None


class TestEveryCallSiteGoesThroughIt:
    """세 자리 중 하나가 옛 함수를 그대로 부르면 그 경로만 조용히 500으로 남는다.

    **한 곳만 고치고 나머지를 안 세는 것**이 이 저장소가 반복해서 찾아온 결함이라,
    자리 수를 못으로 박는다.
    """

    def call_sites(self, name):
        parts = assembled()
        found = []
        for _, node in parts.functions():
            if node.name == "cv_for_target_or_refuse":
                continue                       # 도우미 안의 원본 호출은 세지 않는다
            for inner in ast.walk(node):
                if isinstance(inner, ast.Call) and ast.unparse(inner.func).endswith(name):
                    found.append(f"{parts.where(inner)} ({node.name})")
        return found

    def test_nobody_calls_the_raw_helper_any_more(self):
        raw = self.call_sites("make_cv_for_target")
        assert raw == [], (
            "`make_cv_for_target`를 직접 부르는 곳이 있다. 그 경로의 거절은 "
            f"500으로 나간다:\n  " + "\n  ".join(raw))

    def test_the_wrapper_is_used_in_three_places(self):
        wrapped = self.call_sites("cv_for_target_or_refuse")
        assert len(wrapped) == 3, (
            f"호출 자리가 셋이 아니다: {wrapped}. 늘었으면 이 수를 고치고, "
            "줄었으면 그 경로가 무엇으로 바뀌었는지 보라.")

    def test_the_helper_still_exists(self):
        """대조: 이름을 못 찾으면 위 둘은 빈손으로 통과한다."""
        names = {node.name for _, node in assembled().functions()}
        assert {"make_cv_for_target", "cv_for_target_or_refuse"} <= names


class TestTheOtherInternalRaisesAreDeliberate:
    """나머지 넷은 **고치지 않는다.** 이유를 여기 적는다.

    `create_goal_first_agent_run`의 `RuntimeError`는 INSERT가 성공한 뒤 읽기가
    실패한 경우다 — **진짜 내부 실패**이고 500이 맞다. 사용자가 할 일이 없다.
    `resolve_jwt_secret`은 부팅을 거부하는 자리라 요청 경로가 아니다.
    """

    KEPT = {
        ("backend/agents/persistence.py", "create_goal_first_agent_run", "RuntimeError"),
        ("backend/main_parts/001_imports_db.part", "resolve_jwt_secret", "RuntimeError"),
    }

    @pytest.mark.parametrize("path, function, kind", sorted(KEPT))
    def test_each_one_is_still_there(self, path, function, kind):
        source = (ROOT / path).read_text(encoding="utf-8-sig")
        assert f"raise {kind}" in source, f"{function}의 {kind}가 사라졌다"
