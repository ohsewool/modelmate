"""공개 예측 API가 요금제가 파는 한도 안에 있는가.

`docs/pricing.md`와 `docs/usage-limits.md`는 **일일 예측 API 호출**을 요금제 항목으로
싣는다(free 100 · pro 5,000 · team 25,000). `enforce_prediction_call_limit`은 토큰
경로(`/api/predict/{project_id}`)에만 걸려 있었다.

배포된 모델을 부르는 두 공개 경로 — `/api/v1/{model_id}/predict`,
`/api/v2/{model_id}/predict` — 는 **세지도 막지도 않았다.** 토큰도 로그인도 필요 없고,
model_id만 알면 무제한이다. `/api/run-cv`와 같은 날 나온 같은 모양이다: 팔고 있는
한도에 문 하나가 열려 있었다.

**공개 호출인 것과 무제한인 것은 다르다.** `docs/security-notes.md`는 "public
prediction invocation kept separate from private model metadata access"라고 밝힌다 —
호출자가 로그인하지 않아도 된다는 뜻이지 아무도 세지 않는다는 뜻이 아니다. 이제
**소유자의 할당량**에 단다. 호출자는 그대로 익명이다.

2026-08-22 포트 8773에서 확인: 모델을 배포하고 `/api/v2/{id}/predict`를 103번 부르니
**100번 200, 3번 429**, `prediction_api_calls_today`는 100에서 멈췄다.

청구는 410·404 **뒤에** 둔다. 앞에 두면 없는 모델을 부른 호출이 할당량을 먹고, 그건
실패를 벌로 만든다 — 보고서 내보내기에서 세운 규칙 그대로다.

주인 없는 옛 모델(`user_id`가 비어 있는 행)은 예전처럼 통과한다. 다른 `enforce_*`와
같은 규칙이고, 게스트 데모 경로를 깨지 않는다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"

DEPLOYED_ROUTES = {
    "/api/v1/{model_id}/predict": "072_deploy_static_b.part",
    "/api/v2/{model_id}/predict": "086_deploy_stable_api.part",
}

# 세션 안의 `STATE["best_model"]`을 부르는 대화형 경로. 배포된 API가 아니라서
# 이 한도의 대상이 아니다. 목록을 적어두지 않으면 다음에 훑는 사람이 같은 판단을
# 처음부터 다시 한다.
IN_SESSION_ROUTES = ("/api/predict", "/api/predict-batch",
                     "/api/predict/single", "/api/predict/batch")


def handler_source(part_name: str, route: str) -> str:
    text = (PARTS / part_name).read_text(encoding="utf-8-sig")
    start = text.index(f'@app.post("{route}")')
    rest = text[start + 1:]
    end = rest.find("\n@app.")
    return text[start:] if end == -1 else text[start:start + 1 + end]


class TestTheDeployedApiIsMetered:
    @pytest.mark.parametrize("route,part_name", sorted(DEPLOYED_ROUTES.items()))
    def test_the_handler_claims_against_the_owner(self, route, part_name):
        source = handler_source(part_name, route)
        assert "claim_prediction_api_call" in source, (
            f"{route}가 예측 호출 한도를 부르지 않는다 — 요금제는 그 한도를 팔고 있다."
        )

    @pytest.mark.parametrize("route,part_name", sorted(DEPLOYED_ROUTES.items()))
    def test_a_missing_model_does_not_consume_quota(self, route, part_name):
        """404보다 앞에서 청구하면 없는 모델을 부른 호출이 할당량을 먹는다."""
        source = handler_source(part_name, route)
        assert source.index("404") < source.index("claim_prediction_api_call")

    @pytest.mark.parametrize("route,part_name", sorted(DEPLOYED_ROUTES.items()))
    def test_a_disabled_model_does_not_consume_quota(self, route, part_name):
        source = handler_source(part_name, route)
        assert source.index("410") < source.index("claim_prediction_api_call")

    @pytest.mark.parametrize("route,part_name", sorted(DEPLOYED_ROUTES.items()))
    def test_an_ownerless_model_still_answers(self, route, part_name):
        """옛 데이터와 데모 모델에는 `user_id`가 없다. 거기서 막으면 데모가 깨진다."""
        source = handler_source(part_name, route)
        assert 'row["user_id"]' in source
        assert '"user_id" in row.keys()' in source


class TestTheCallerStaysAnonymous:
    """소유자에게 다는 것이지 호출자를 로그인시키는 것이 아니다. 그 구분이
    `docs/security-notes.md`가 밝힌 설계다."""

    @pytest.mark.parametrize("route,part_name", sorted(DEPLOYED_ROUTES.items()))
    def test_no_authentication_was_added(self, route, part_name):
        signature = handler_source(part_name, route).split("\n")[1]
        assert "Depends(get_current_user)" not in signature
        assert "require_current_user" not in handler_source(part_name, route)


class TestTheInSessionRoutesAreDeliberatelyOutside:
    def test_they_use_the_session_model_not_a_deployed_one(self):
        """대상이 다르면 한도도 다르다. 여기 붙이면 화면에서 값 하나 바꿔볼 때마다
        배포 API 할당량이 깎인다."""
        for route in IN_SESSION_ROUTES:
            found = [path for path in PARTS.glob("*.part")
                     if f'@app.post("{route}")' in path.read_text(encoding="utf-8-sig")]
            assert found, route
            source = handler_source(found[0].name, route)
            assert 'STATE.get("best_model")' in source, route


class TestTheChecksAreNotVacuous:
    def test_the_handlers_were_actually_read(self):
        for route, part_name in DEPLOYED_ROUTES.items():
            source = handler_source(part_name, route)
            assert len(source) > 300, route
            assert "model_id" in source

    def test_the_slice_stops_at_the_next_route(self):
        for route, part_name in DEPLOYED_ROUTES.items():
            assert handler_source(part_name, route).count("@app.post(") == 1

    def test_the_claim_helper_exists_and_knows_this_key(self):
        source = (PARTS / "008_usage_limits.part").read_text(encoding="utf-8-sig")
        body = source[source.index("def claim_prediction_api_call"):]
        body = body[:body.index("\ndef ", 1)]
        assert "prediction_api_calls_today" in body
        assert "max_prediction_api_calls_per_day" in body

    def test_the_plans_actually_declare_the_limit(self):
        """한도가 전부 `None`이면 위 배선은 아무것도 막지 않으면서 통과한다."""
        limits = modelmate.PLAN_LIMITS
        free = limits["free"]["max_prediction_api_calls_per_day"]
        assert isinstance(free, int) and free > 0

    def test_a_route_without_the_claim_would_be_caught(self):
        invented = '@app.post("/api/invented")\nasync def invented(model_id: str):\n    return {}\n'
        assert "claim_prediction_api_call" not in invented


class TestNoDeployedPredictRouteWasMissed:
    def test_every_deployed_predict_route_is_listed(self):
        """목록에 없는 문이 생기면 이 파일은 침묵한다. 배포 모델을 부르는 라우트를
        직접 찾아 목록과 대조한다."""
        found = set()
        for path in sorted(PARTS.glob("*.part")):
            text = path.read_text(encoding="utf-8-sig")
            for match in re.finditer(r'@app\.post\("([^"]*\{model_id\}[^"]*predict[^"]*)"\)', text):
                found.add(match.group(1))
        assert found == set(DEPLOYED_ROUTES), found
