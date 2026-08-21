"""분석을 시작하는 경로마다 한도 검사가 붙어 있는가.

`/api/run-cv`는 **어떤 `enforce_*`도 부르지 않았다.** 세기는 했다 —
`_record_workspace_analysis_result`가 `record_sync_training_job`을 거쳐
`jobs_today`를 올린다 — 그런데 막는 것이 없었다.

**재현했다**(2026-08-22, 포트 8771). 무료 플랜 한도 5인 계정으로 CSV를 올리고
타깃을 정한 뒤 `/api/run-cv`를 8번 불렀다. **8번 전부 200**이고 `jobs_today`는
8까지 올라갔다. 사용량 화면은 한도를 넘겼다고 표시하는데 아무것도 거절하지 않는다.
고친 뒤 같은 절차로 5회 200, 6회부터 429(`limit_key: max_jobs_per_day`).

모델을 실제로 학습·비교하는, **한도가 존재하는 이유인 바로 그 엔드포인트**다.
빠른 분석과 에이전트 모드는 이 계산을 자기 입구에서 검사한 뒤 시작하지만, 같은
계산을 직접 부르는 문은 열려 있었다.

이 파일은 소스를 읽는다. 라우트를 띄우고 8번 돌리는 것은 회당 수십 초가 걸리고,
확인하려는 것은 **검사가 배선돼 있는가**다. 실제 429는 위 실측과
`scripts/run_usage_limits_smoke.py`가 본다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"

# 분석 계산을 시작하는 경로. 여기 없는 문이 생기면 이 파일은 침묵한다 - 그래서
# 목록을 좁게 두고, 넓히는 것은 의식적인 결정이 되게 한다.
ANALYSIS_ROUTES = {
    "/api/run-cv": "020_run_cv.part",
    "/api/quick-analysis/start": "099_quick_analysis.part",
}

ENFORCERS = ("enforce_training_job_limits", "claim_analysis_job")


def handler_source(part_name: str, route: str) -> str:
    """라우트 데코레이터부터 다음 데코레이터 직전까지."""
    text = (PARTS / part_name).read_text(encoding="utf-8-sig")
    start = text.index(f'@app.post("{route}")')
    rest = text[start + 1:]
    end = rest.find("\n@app.")
    return text[start:] if end == -1 else text[start:start + 1 + end]


class TestEveryAnalysisRouteChecksBeforeItComputes:
    @pytest.mark.parametrize("route,part_name", sorted(ANALYSIS_ROUTES.items()))
    def test_the_handler_calls_an_enforcer(self, route, part_name):
        source = handler_source(part_name, route)
        assert any(name in source for name in ENFORCERS), (
            f"{route}가 한도 검사를 부르지 않는다 — 세기만 하고 막지 않는 상태다."
        )

    def test_run_cv_checks_before_touching_the_data(self):
        """검사가 계산 **뒤에** 있으면 비싼 일은 이미 끝난 뒤다."""
        source = handler_source("020_run_cv.part", "/api/run-cv")
        assert source.index("enforce_training_job_limits") < source.index('STATE.get("X")')


class TestCountingAndDecidingHappenTogether:
    def test_the_claim_helpers_are_the_counting_path(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        for name in ("def claim_analysis_job", "def claim_prediction_api_call"):
            assert name in source

    def test_they_go_through_the_atomic_claim(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        for name in ("claim_analysis_job", "claim_prediction_api_call"):
            body = source[source.index(f"def {name}"):]
            body = body[:body.index("\ndef ", 1)] if "\ndef " in body[1:] else body
            assert "claim_daily_usage" in body, name

    def test_an_admin_is_not_counted(self):
        """관리자는 무제한이다. 세면 아무도 보지 않는 숫자가 쌓인다."""
        assert modelmate.claim_analysis_job({"sub": None}) is None
        assert modelmate.claim_prediction_api_call(None) is None


class TestTheRouteListIsNotVacuous:
    """라우트를 하나도 못 찾았거나 핸들러를 빈 문자열로 잘랐어도 "전부 통과"가 나온다."""

    def test_the_handlers_were_actually_read(self):
        for route, part_name in ANALYSIS_ROUTES.items():
            source = handler_source(part_name, route)
            assert len(source) > 200, route
            assert route in source

    def test_the_slice_stops_at_the_next_route(self):
        """다음 라우트까지 삼키면 옆 핸들러의 검사를 자기 것으로 착각한다."""
        source = handler_source("020_run_cv.part", "/api/run-cv")
        assert source.count("@app.post(") == 1

    def test_a_route_without_an_enforcer_would_be_caught(self):
        """검출이 성립하는지. 검사 없는 핸들러를 만들어 같은 판정을 걸어본다."""
        invented = '@app.post("/api/invented")\nasync def invented(user=None):\n    return {}\n'
        assert not any(name in invented for name in ENFORCERS)

    def test_the_enforcer_names_still_exist(self):
        """이름이 바뀌면 위 검사들은 무엇을 찾는지도 모른 채 실패하거나 통과한다."""
        for name in ENFORCERS:
            assert callable(getattr(modelmate, name))


class TestTheOldShapeIsGone:
    def test_no_route_counts_without_deciding(self):
        """`increment_daily_usage`를 직접 부르는 곳이 남으면 그 경로는 다시
        세기만 하고 판단하지 않는다. 그것이 이 회차가 고친 것이다."""
        offenders = sorted(
            path.name for path in PARTS.glob("*.part")
            if re.search(r"^\s*increment_daily_usage\(", path.read_text(encoding="utf-8-sig"),
                         re.MULTILINE)
        )
        assert offenders == [], offenders
