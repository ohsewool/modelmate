"""CI가 한 줄도 실행하지 않던 마지막 둘.

라우트 감사가 아홉을 남겼고 일곱은 앞 회차에 닫았다. 둘은 **상태를 갖춰야 도달한다**고
적어두고 넘어갔다.

    predict_single        31줄   `STATE`에 학습된 모델과 인코더가 있어야 한다
    retry_agent_step_api   7줄   소유한 analysis_run이 필요하다

그 사이에 둘 다 만들 방법이 생겼다 — `STATE`를 되돌리는 픽스처(설명 실패 검사에서
썼다)와 `ensure_agent_trace_schema`(소유권 검사를 CI에서 돌게 만들 때 썼다). **막혀서
남긴 것이 아니라 도구가 없어서 남긴 것이었다.**

`predict_single`은 덤으로 로드맵의 제품 결정 하나를 문서로 만든다: **사용자가 보내지
않은 값을 0이나 평균으로 채우고 예측한다.** 그 판단은 여전히 사람 몫이지만, 지금
무엇을 하는지는 여기 고정해 둔다 — 결정할 때 무엇을 바꾸는지 알아야 한다.
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

STAMP = "2026-08-23T00:00:00"


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


class Recorder:
    """무엇이 들어왔는지 적어두는 모델. **예측값이 아니라 입력을 보려고 쓴다.**"""

    def __init__(self, value=1):
        self.seen = []
        self.value = value

    def predict(self, frame):
        self.seen.append(frame.iloc[0].to_dict())
        return [self.value]


class Encoder:
    """sklearn의 `LabelEncoder` 모양. **`classes_`는 리스트가 아니라 배열이다** —
    처음에 리스트로 뒀더니 라우트의 `classes_.tolist()`에서 죽었다. 흉내가 느슨하면
    검사가 제품이 아니라 흉내를 시험한다."""

    classes_ = np.array(["아니오", "예"])

    def transform(self, values):
        return [list(self.classes_).index(str(values[0]))]

    def inverse_transform(self, values):
        return [self.classes_[int(values[0])]]


@pytest.fixture
def trained():
    """`STATE`는 프로세스가 공유한다. 앞뒤 검사와 섞이지 않게 되돌린다."""
    before = dict(modelmate.STATE)
    model = Recorder()
    modelmate.STATE.clear()
    modelmate.STATE.update({
        "best_model": model,
        "X": pd.DataFrame({"나이": [10.0, 20.0, 30.0], "등급": [0, 1, 0]}),
        "cat_cols": ["등급"],
        "encoders": {"등급": Encoder()},
        "task_type": "classification",
    })
    yield model
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestPredictingOneRow:
    def test_without_a_model_it_refuses(self):
        before = dict(modelmate.STATE)
        modelmate.STATE.clear()
        try:
            with pytest.raises(HTTPException) as refused:
                call(modelmate.predict_single, body={"features": {}})
            assert refused.value.status_code == 400
        finally:
            modelmate.STATE.clear()
            modelmate.STATE.update(before)

    def test_a_categorical_value_goes_through_its_encoder(self, trained):
        call(modelmate.predict_single, body={"features": {"나이": 25, "등급": "예"}})
        assert trained.seen[-1]["등급"] == 1, trained.seen[-1]

    def test_the_label_comes_back_when_a_target_encoder_exists(self, trained):
        modelmate.STATE["target_encoder"] = Encoder()
        result = call(modelmate.predict_single, body={"features": {"나이": 25, "등급": "예"}})
        assert result["prediction"] == 1
        assert result["prediction_label"] == "예"
        assert result["class_labels"] == ["아니오", "예"]

    def test_regression_returns_a_number_not_a_class(self, trained):
        modelmate.STATE["task_type"] = "regression"
        modelmate.STATE["best_model"] = Recorder(value=3.14159)
        result = call(modelmate.predict_single, body={"features": {"나이": 25, "등급": "예"}})
        assert result["task_type"] == "regression"
        assert result["prediction"] == 3.1416
        assert "prediction_label" not in result


class TestWhatHappensToAValueTheUserDidNotSend:
    """**로드맵의 제품 결정을 문서로 만든다.**

    보내지 않은 값은 조용히 채워진다 — 범주형은 `0`, 수치형은 **학습 데이터의 평균.**
    읽을 수 없는 값도 마찬가지다.

    그러면 응답은 **사용자가 보내지 않은 값으로 계산된 예측**인데, 어디에도 그렇게
    적혀 있지 않다. 거절할지, 채우되 응답에 적을지는 제품 결정이고 사람 몫이다.
    여기서는 **지금 무엇을 하는지**만 고정한다 — 바꾸는 날 무엇이 바뀌는지 알아야 한다.
    """

    def test_a_missing_number_becomes_the_training_mean(self, trained):
        call(modelmate.predict_single, body={"features": {"등급": "예"}})
        assert trained.seen[-1]["나이"] == 20.0, "학습 평균이 아니다"

    def test_a_missing_category_becomes_zero(self, trained):
        call(modelmate.predict_single, body={"features": {"나이": 25}})
        assert trained.seen[-1]["등급"] == 0

    def test_an_unreadable_number_also_becomes_the_mean(self, trained):
        call(modelmate.predict_single, body={"features": {"나이": "스물다섯", "등급": "예"}})
        assert trained.seen[-1]["나이"] == 20.0

    def test_an_unknown_category_becomes_zero(self, trained):
        call(modelmate.predict_single, body={"features": {"나이": 25, "등급": "모름"}})
        assert trained.seen[-1]["등급"] == 0

    def test_the_response_does_not_say_it_substituted(self, trained):
        """**이것이 결정해야 할 지점이다.** 채운 사실이 응답에 없다.

        고쳐서 알리기로 하면 이 검사가 빨간불이 되고, 그때 이 문장을 다시 읽게 된다.
        """
        result = call(modelmate.predict_single, body={"features": {}})
        flat = repr(result)
        for word in ("substitut", "기본값", "채움", "imputed", "missing"):
            assert word not in flat, f"이제 알린다: {result}"


class TestRetryingAnAgentStep:
    """`POST /api/agent-runs/{id}/retry-step`.

    라우트가 하는 일은 셋이다 — **소유권을 확인하고, 상태를 `planned`로 되돌리고,
    실행을 위임한다.** 실행 자체는 에이전트의 몫이라 여기서 대신하지 않는다.
    `execute_agent_run`을 가로채면 이 라우트의 몫만 남는다.
    """

    @pytest.fixture
    def owned_run(self):
        from backend.agents.persistence import ensure_agent_trace_schema

        owner = {"sub": f"retry-{uuid.uuid4().hex[:8]}",
                 "email": "r@retry.test", "role": "user"}
        run_id = f"ar-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            ensure_agent_trace_schema(conn)
            conn.execute(
                "INSERT INTO analysis_runs (id,user_id,user_goal,status,created_at) "
                "VALUES (?,?,?,?,?)",
                (run_id, owner["sub"], "다시 해보자", "failed", STAMP))
            conn.commit()
        finally:
            conn.close()
        return owner, run_id

    def test_the_owner_can_retry(self, owned_run, monkeypatch):
        owner, run_id = owned_run
        monkeypatch.setattr(modelmate, "execute_agent_run",
                            lambda conn, identifier: {"analysis_run_id": identifier,
                                                      "steps": []})
        result = call(modelmate.retry_agent_step_api,
                      analysis_run_id=run_id, user=owner)
        assert result["analysis_run_id"] == run_id
        assert "보존한 채" in result["message"]

    def test_it_resets_the_status_before_running(self, owned_run, monkeypatch):
        """**순서가 요점이다.** 되돌리지 않고 실행하면 이미 실패한 상태 위에서
        돌고, 화면은 재시도했는데 여전히 실패로 보인다."""
        owner, run_id = owned_run
        seen = {}

        def capture(conn, identifier):
            row = conn.execute("SELECT status FROM analysis_runs WHERE id=?",
                               (identifier,)).fetchone()
            seen["status_at_execute"] = row["status"]
            return {"analysis_run_id": identifier, "steps": []}

        monkeypatch.setattr(modelmate, "execute_agent_run", capture)
        call(modelmate.retry_agent_step_api, analysis_run_id=run_id, user=owner)
        assert seen["status_at_execute"] == "planned"

    def test_a_stranger_cannot(self, owned_run, monkeypatch):
        _, run_id = owned_run
        ran = []
        monkeypatch.setattr(modelmate, "execute_agent_run",
                            lambda conn, identifier: ran.append(identifier) or {})
        stranger = {"sub": "retry-stranger", "email": "s@retry.test", "role": "user"}
        with pytest.raises(HTTPException) as refused:
            call(modelmate.retry_agent_step_api, analysis_run_id=run_id, user=stranger)
        assert refused.value.status_code == 404
        assert ran == [], "거절했는데 실행됐다"

    def test_the_connection_does_not_leak_when_the_run_explodes(self, owned_run, monkeypatch):
        """이 라우트는 `try/finally`로 감싸져 있다. **감쌌다는 것과 도는 것은 다르다** —
        지금까지 이 코드는 CI에서 한 줄도 안 돌았다."""
        owner, run_id = owned_run

        def explode(conn, identifier):
            raise RuntimeError("에이전트가 죽었다")

        monkeypatch.setattr(modelmate, "execute_agent_run", explode)
        with pytest.raises(RuntimeError):
            call(modelmate.retry_agent_step_api, analysis_run_id=run_id, user=owner)

        conn = modelmate.get_db()          # 잠금이 남아 있으면 여기서 죽는다
        try:
            conn.execute("UPDATE analysis_runs SET status='failed' WHERE id=?", (run_id,))
            conn.commit()
        finally:
            conn.close()
