""""먼저 이걸 하세요" 다섯 갈래 — **한 번도 지나간 적이 없었다.**

거부 지점 112개 중 47개가 검사에 닿지 않는다. 그 47개에서 **실제로 닿는** 것들을
골랐다. 전부 공개 예측·배포 표면이고, 전부 *"아직 준비가 안 됐다"*를 말한다.

    071:9   POST /api/predict-batch    모델 없음
    071:54  POST /api/deploy           학습된 모델 없음
    083:5   POST /api/predict/single   Run cross-validation first
    084:5   POST /api/predict/batch    Run cross-validation first
    086:16  POST /api/deploy/stable    먼저 모델 비교를 실행한 뒤 공유 모델을 만들어주세요

**순서를 건너뛴 사람이 무엇을 보는가**는 이 제품에서 가장 자주 밟히는 갈래 중
하나인데, 성공 경로에만 검사가 있었다.

### 닿는 것만 골랐다는 것이 요점이다

같은 47개에서 Agent Mode의 404 다섯도 닫으려 했는데, 재보니 **닿을 수 없었다** —
위층의 소유권 검사와 헬퍼의 반환값이 서로를 배제해서 그 가지는 살아날 수 없다.
경위는 `test_an_agent_run_that_isnt_there.py`에 있다.

*"검사가 없다"에는 안 쓴 것과 못 쓰는 것이 있고, 세는 도구는 그 둘을 구별하지
못한다.* 그래서 **쓰기 전에 두드려 봤다.** 안 그랬으면 닿지 않는 가지에 대고
검사를 짜다가, 통과시키려고 억지 상태를 만들었을 것이다.

### 상태를 비우고 되돌린다

이 다섯은 전부 "아직 아무것도 안 했다"를 조건으로 한다. 그래서 공용 `STATE`를
비우고 시작하고 **끝나면 되돌린다** — 안 되돌리면 뒤에 오는 검사들이 자기가 만들지
않은 빈 상태를 보게 된다.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

# (라벨, 메서드, 경로, 요청, 답에 있어야 할 말)
SKIPPED_STEPS = [
    ("071:9  predict-batch",  "POST", "/api/predict-batch",  "csv",  "모델"),
    ("071:54 deploy",         "POST", "/api/deploy",         "json", "모델"),
    ("083:5  predict/single", "POST", "/api/predict/single", "json", "cross-validation"),
    ("084:5  predict/batch",  "POST", "/api/predict/batch",  "csv",  "cross-validation"),
    ("086:16 deploy/stable",  "POST", "/api/deploy/stable",  "json", "모델 비교"),
]


@pytest.fixture
def nothing_done_yet():
    """공용 분석 상태를 비우고 시작해 되돌린다."""
    before = dict(modelmate.STATE)
    modelmate.STATE.clear()
    yield
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


@pytest.fixture
def client():
    return TestClient(modelmate.app, raise_server_exceptions=False)


def send(client, method, path, kind):
    if kind == "csv":
        return client.request(method, path, files={
            "file": ("a.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")})
    return client.request(method, path, json={"features": {"a": 1}})


class TestSkippingTheStepIsRefused:
    @pytest.mark.parametrize("label, method, path, kind, _word", SKIPPED_STEPS)
    def test_it_is_a_four_hundred(self, client, nothing_done_yet, label, method,
                                  path, kind, _word):
        response = send(client, method, path, kind)
        assert response.status_code == 400, (
            f"{label}: 준비가 안 됐는데 400이 아니다 — {response.status_code} "
            f"{response.text[:140]}")

    @pytest.mark.parametrize("label, method, path, kind, word", SKIPPED_STEPS)
    def test_it_says_what_to_do_first(self, client, nothing_done_yet, label,
                                      method, path, kind, word):
        """400이 왔다는 것과 **무엇을 먼저 하라는지**는 다르다. 이 제품의 사용자는
        비전문가이고, "잘못된 요청입니다"는 다음 행동을 알려주지 않는다."""
        response = send(client, method, path, kind)
        assert word in response.text, (
            f"{label}의 400이 무엇을 먼저 할지 말하지 않는다: {response.text[:140]}")

    @pytest.mark.parametrize("label, method, path, kind, _word", SKIPPED_STEPS)
    def test_it_does_not_fall_over(self, client, nothing_done_yet, label, method,
                                   path, kind, _word):
        """**500이 아니다.** 준비가 안 된 것은 서버의 잘못이 아니고, 500으로
        답하면 사용자는 자기가 고칠 수 있는 것을 못 고친다."""
        response = send(client, method, path, kind)
        assert response.status_code < 500, f"{label} -> {response.status_code}"


class TestTheStateReallyWasEmpty:
    """**대조가 먼저다.** 상태가 안 비워졌으면 위 열다섯은 다른 이유로 400을 받고,
    이 파일은 자기가 이름 붙인 갈래를 확인하지 못한다 — 앞 회차에 남아 있던 DB 행
    때문에 옆의 이유로 통과하던 검사를 하나 찾았다."""

    def test_the_bucket_is_clear(self, nothing_done_yet):
        assert not modelmate.STATE.get("model")
        assert not modelmate.STATE.get("cv_results")

    def test_and_it_is_put_back(self):
        """픽스처가 되돌리는지 본다. 안 되돌리면 뒤에 오는 검사들이 자기가 만들지
        않은 빈 상태를 본다 — 이 저장소가 이미 한 번 겪은 모양이다."""
        marker = "__state_restore_probe__"
        modelmate.STATE[marker] = 1
        try:
            before = dict(modelmate.STATE)
            saved = dict(modelmate.STATE)
            modelmate.STATE.clear()
            modelmate.STATE.update(saved)
            assert modelmate.STATE == before
            assert modelmate.STATE.get(marker) == 1
        finally:
            modelmate.STATE.pop(marker, None)
