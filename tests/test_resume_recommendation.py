"""배선되지 않은 모듈이 문서에는 현재 기능으로 적혀 있었다.

커버리지로 훑었더니 `backend/agents/resume.py`가 **0%**였다. 백엔드 어디에서도
import하지 않고, `main_parts/*.part` 어디에도 없고, 테스트도 없다. 그런데
`docs/agent-architecture.md`와 `docs/agent-roadmap.md`는 그것을 현재 구성 요소로
설명하고 import 예제까지 싣고 있었다.

이 프로젝트가 처음 만난 결함이 정확히 이 모양이다 — `access.py`에 권한 헬퍼가 전부
있었고 `ledger.py`가 하나도 import하지 않았다. 그때는 docstring이 "에이전트는 이
전이를 할 수 없다"고 말하고 있었다.

다만 이번 것은 그때와 다르다. **모듈 자신은 정직하다**: 첫 줄이 "Resume flow
skeleton for PR-12"이고, 하지 않는 것을 나열한다. 어긋난 것은 문서 쪽이다. 그래서
코드를 배선하는 대신 문서를 사실에 맞췄다 — 제품의 재개 경로는 이미 rerun
엔드포인트가 담당하고, 쓰지 않는 두 번째 경로를 배선하면 같은 질문에 답하는 장치가
둘이 된다. 이 저장소가 반복해서 고쳐온 모양이 그것이다.

**연결은 이미 한쪽에 있었다.** `review_queue.PROCEEDING_ACTIONS`에
`continue_with_reviewer_context`·`clarify_resolution`·`collect_resolution`이 들어
있는데, 셋 다 `resume.py`가 만드는 계획 동작이다. 소비자가 호출되지 않는 생산자를
이미 수용하고 있었다. 배선하기로 결정하는 날 그 어휘가 어긋나 있으면 조용히 틀리므로,
아래 테스트가 둘을 맞춰둔다.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.agents.resume import (  # noqa: E402
    build_resume_recommendation,
    resolve_review_item,
)
from backend.agents.review_queue import PROCEEDING_ACTIONS  # noqa: E402

ITEM = {"review_id": "r1", "reason_code": "leakage_risk", "severity": "blocking"}


def recommendation(resolution: str | None):
    item = ITEM if resolution is None else resolve_review_item(ITEM, resolution, "메모")
    return build_resume_recommendation(item)


class TestResolutionIsRecorded:
    def test_resolving_marks_the_item_and_keeps_the_note(self):
        resolved = resolve_review_item(ITEM, "approved", "괜찮음")
        assert resolved["status"] == "resolved"
        assert resolved["resolution"] == "approved"
        assert resolved["reviewer_note"] == "괜찮음"

    def test_the_original_item_is_not_mutated(self):
        """검토 항목은 기록이다. 제자리에서 고치면 무엇이 언제 결정됐는지 사라진다."""
        resolve_review_item(ITEM, "approved", "괜찮음")
        assert "status" not in ITEM

    def test_a_resolution_time_is_stamped(self):
        assert resolve_review_item(ITEM, "approved")["resolved_at"]


class TestTheRecommendationFollowsTheResolution:
    def test_an_unresolved_item_waits(self):
        found = recommendation(None)
        assert found["status"] == "pending_review"
        assert "Wait for reviewer" in found["next_action"]

    @pytest.mark.parametrize("resolution", ["dismissed", "accept_risk", "approved"])
    def test_an_accepting_resolution_resumes(self, resolution):
        assert recommendation(resolution)["status"] == "ready_to_resume"

    @pytest.mark.parametrize("resolution", ["fix_required", "rerun_needed", "change_target"])
    def test_a_rejecting_resolution_replans(self, resolution):
        """다시 계획하지 않고 도구부터 다시 돌리면, 검토가 지적한 것이 그대로 남는다."""
        assert recommendation(resolution)["status"] == "needs_replan"

    def test_an_unknown_resolution_asks_rather_than_guesses(self):
        """`accepted`는 어느 목록에도 없다. 사람이 쓴 말이 목록 밖일 때 진행하는
        쪽으로 추측하면, 검토를 통과한 적 없는 실행이 진행된다."""
        found = recommendation("accepted")
        assert found["status"] == "needs_clarification"

    def test_the_recommendation_states_what_it_does_not_do(self):
        limitations = recommendation("approved")["limitations"]
        assert any("No automatic retraining" in text for text in limitations)


class TestItsVocabularyMatchesTheReviewQueue:
    """호출되지 않는 생산자를 소비자가 이미 수용하고 있다.

    배선하기로 결정하는 날 어휘가 어긋나 있으면, 재개 계획이 만든 동작을 검토
    대기열이 "검토가 필요한 것"으로 다시 집어 무한히 도는 고리가 생긴다.
    """

    @pytest.mark.parametrize("resolution", [None, "approved", "fix_required", "accepted"])
    def test_every_plan_action_is_one_the_queue_lets_proceed(self, resolution):
        actions = [step["action"] for step in recommendation(resolution)["resume_plan"]]
        assert actions, "계획이 비어 있으면 이 검사는 아무것도 확인하지 않는다"
        assert set(actions) <= PROCEEDING_ACTIONS, (
            f"{set(actions) - PROCEEDING_ACTIONS}가 review_queue의 진행 허용 목록에 없다"
        )

    def test_the_queue_list_is_not_empty(self):
        """`PROCEEDING_ACTIONS = set()`이면 위 검사가 모든 것을 잡고, 반대로
        모든 문자열을 담고 있으면 아무것도 안 잡는다."""
        assert 5 < len(PROCEEDING_ACTIONS) < 50


class TestNothingCallsThisYet:
    """사실을 고정한다. 배선되는 날 이 테스트가 실패하고, 그때 문서를 함께 고치게
    된다 — 지금 문서가 어긋나 있던 것이 정확히 그 반대의 사고였다."""

    def test_the_backend_does_not_import_it(self):
        wired = [
            path.name
            for path in sorted((ROOT / "backend").rglob("*"))
            if path.suffix in {".py", ".part"} and path.name != "resume.py"
            and "agents.resume" in path.read_text(encoding="utf-8-sig", errors="replace")
        ]
        assert not wired, f"이제 배선됐다: {wired}. 문서와 이 테스트를 함께 고칠 것"

    def test_the_module_says_so_itself(self):
        """모듈은 정직했다. 어긋난 것은 문서 쪽이었다."""
        import backend.agents.resume as module

        assert "skeleton" in module.__doc__.lower()
