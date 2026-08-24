"""서버가 졌을 때 사용자가 무엇을 보는가 — 500 다섯 갈래, 전부 한 번도 안 밟혔다.

거부 112개 중 미도달 42개에서 마지막까지 남겨뒀던 가족이다. 400들은 "당신이
고칠 수 있다"이고 이 다섯은 **"우리가 졌다"**다.

    020_run_cv        모든 회귀 모델 학습 실패
    020_run_cv        모든 분류 모델 학습 실패
    020_run_cv        최고 모델 재학습까지 전부 실패 (되돌림 고리 소진)
    098_sample_files  샘플 CSV 자리에 HTML이 온다 (SPA 폴백 사고의 흉터)
    098_sample_files  샘플 CSV에 타깃 컬럼이 없다

### 여기서 고정하는 성질

**졌다는 것과 어떻게 지는가는 다른 문제다.** 다섯 다 `HTTPException(500)`이지만
그 순간에도 지켜야 할 것이 있다:

    내장을 쏟지 않는다     응답에 Traceback / File "..." 이 없다
    다음 행동을 말한다     recommended_next_action이 있다 — 서버가 져도
                          사용자는 데이터를 바꿔볼 수 있다
    어디서 졌는지 남긴다    failed_stage가 있다

일부러 지게 만드는 방법: 모델 팩토리와 채점 함수를 예외를 던지게 바꿔치기한다.
**게이트가 아니라 본문이 죽는 상황**이다 — 앞선 검사들이 못 만드는 상태다.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

LEAK_MARKERS = ("Traceback", 'File "', "raise ", "sqlite3.", "pandas.errors")


@pytest.fixture
def client():
    return TestClient(modelmate.app, raise_server_exceptions=False)


def ready_state(task: str):
    """CV 직전 상태. 게이트("CV 먼저" 400들)를 지나 본문에 닿기 위한 최소치."""
    if task == "classification":
        df = pd.DataFrame({
            "a": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 3,
            "b": [0.1 * i for i in range(30)],
            "y": [0, 1] * 15,
        })
    else:
        df = pd.DataFrame({
            "a": list(range(30)),
            "b": [0.5 * i for i in range(30)],
            "y": [1.5 * i for i in range(30)],
        })
    return df


@pytest.fixture
def at_the_edge(client):
    """업로드→타깃 선택까지 실제 라우트로 밟아 CV 직전에 세운다."""
    before = dict(modelmate.STATE)

    def arrive(task: str):
        modelmate.STATE.clear()
        df = ready_state(task)
        modelmate.STATE["df"] = df
        response = client.post("/api/set-target", json={"target_col": "y"})
        assert response.status_code == 200, (
            f"준비 단계가 실패하면 아래 검사는 게이트에서 끊긴 400을 500으로 "
            f"착각한다: {response.text[:120]}")

    yield arrive
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


def assert_lost_gracefully(response, stage="automl_training"):
    """500이되, 지는 방식이 계약을 지킨다."""
    assert response.status_code == 500, response.text[:200]
    detail = response.json()["detail"]
    assert detail["failed_stage"] == stage
    assert detail.get("user_friendly_message")
    assert detail.get("recommended_next_action"), (
        "서버가 져도 사용자는 다음에 뭘 할지 알아야 한다")
    body = response.text
    for marker in LEAK_MARKERS:
        assert marker not in body, f"내장이 샜다: {marker!r} in {body[:160]}"


class TestWhenEveryModelDies:
    def test_classification_all_fail(self, client, at_the_edge, monkeypatch):
        at_the_edge("classification")
        monkeypatch.setattr(modelmate, "run_classification_scores",
                            lambda *a, **k: (_ for _ in ()).throw(
                                RuntimeError("sklearn internals exploded")))
        response = client.post("/api/run-cv", json={})
        assert_lost_gracefully(response)
        assert "분류" in response.json()["detail"]["user_friendly_message"]

    def test_regression_all_fail(self, client, at_the_edge, monkeypatch):
        at_the_edge("regression")
        monkeypatch.setattr(modelmate, "run_regression_scores",
                            lambda *a, **k: (_ for _ in ()).throw(
                                RuntimeError("sklearn internals exploded")))
        response = client.post("/api/run-cv", json={})
        assert_lost_gracefully(response)
        assert "회귀" in response.json()["detail"]["user_friendly_message"]

    def test_the_refit_fallback_loop_can_also_lose(self, client, at_the_edge,
                                                   monkeypatch):
        """가장 깊은 갈래. **채점은 되는데 재학습이 전부 죽는다** — 팩토리가
        모델당 한 번(채점)은 성공하고 그 뒤로는 던지게 만든다. 되돌림 고리가
        나머지 모델을 차례로 시도하고, 전부 소진되면 이 500이다."""
        at_the_edge("classification")
        calls: dict[str, int] = {}
        original = dict(modelmate.MODELS)

        def once_then_boom(name):
            def factory():
                calls[name] = calls.get(name, 0) + 1
                if calls[name] > 1:
                    raise RuntimeError("refit exploded")
                return original[name]()
            return factory

        monkeypatch.setattr(modelmate, "MODELS",
                            {name: once_then_boom(name) for name in original})
        response = client.post("/api/run-cv", json={})
        assert_lost_gracefully(response)
        assert max(calls.values()) >= 2, (
            "재학습 갈래에 닿지 못했다 — 이 검사는 채점 실패(위 갈래)를 "
            "확인했을 뿐이다")

    def test_one_surviving_model_means_no_500(self, client, at_the_edge,
                                              monkeypatch):
        """**되돌림 방향.** 하나라도 살아 있으면 500이 아니라 결과가 온다 —
        이 500들이 '전부 죽었을 때만' 나온다는 것이 계약이다."""
        at_the_edge("classification")
        real = modelmate.run_classification_scores
        state = {"n": 0}

        def first_survives(m, X, y, cv, scoring):
            state["n"] += 1
            if state["n"] == 1:
                return real(m, X, y, cv, scoring)
            raise RuntimeError("the rest die")

        monkeypatch.setattr(modelmate, "run_classification_scores", first_survives)
        response = client.post("/api/run-cv", json={})
        assert response.status_code == 200, response.text[:160]


class TestWhenTheSampleFileIsCorrupt:
    """배포 사고의 흉터를 지키는 두 500. 서빙 직전 검증이 오염을 잡는다."""

    def plant(self, tmp_path, monkeypatch, content: str):
        bad = tmp_path / "customer_churn_demo.csv"
        bad.write_text(content, encoding="utf-8")
        monkeypatch.setattr(modelmate, "sample_file_path", lambda name: str(bad))

    def test_html_instead_of_csv(self, client, tmp_path, monkeypatch):
        """실제로 있었던 사고 모양 — SPA 폴백이 CSV 요청에 index.html을 준다."""
        self.plant(tmp_path, monkeypatch, "<!doctype html><html><head></head>")
        response = client.get("/api/samples/customer_churn_demo.csv/download")
        assert response.status_code == 500
        assert "HTML" in response.text

    def test_missing_target_column(self, client, tmp_path, monkeypatch):
        self.plant(tmp_path, monkeypatch, "a,b,c\n1,2,3\n")
        response = client.get("/api/samples/customer_churn_demo.csv/download")
        assert response.status_code == 500
        assert "churn" in response.text, "무엇이 빠졌는지 말해야 고칠 수 있다"

    def test_a_healthy_sample_still_downloads(self, client):
        """**되돌림 방향.** 검증이 멀쩡한 파일까지 막으면 다음 사람이 검증을 뗀다."""
        response = client.get("/api/samples/customer_churn_demo.csv/download")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert "churn" in response.text.splitlines()[0]
