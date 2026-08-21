"""요청 스코프가 스레드 경계를 넘는가.

`STATE`는 요청마다 다른 버킷을 쓴다. 어느 버킷인지는 `ContextVar` 하나가 정한다.
**`ContextVar`는 스레드 경계를 넘지 않는다** — `ThreadPoolExecutor`가 만든 스레드는
빈 문맥에서 시작하고, 거기서 읽으면 기본 스코프가 나온다.

`automl_training_tool`은 이미 도는 이벤트 루프 안에서 호출되면 코루틴을 스레드로
넘긴다(FastAPI 요청 안이 그렇다). 문맥을 복사해 넘기지 않으면 그 안에서 도는
`set_target`과 `run_cv`가 **요청의 버킷이 아니라 기본 버킷**에 쓴다.

실제로 그랬고, 두 가지로 나타났다.

**보이는 쪽** — Agent Mode가 절반에서 멈췄다. 학습은 "AutoML training completed"로
성공 관측을 남기고, 바로 다음 설명 도구가 "Run AutoML training before explanation."
으로 실패했다. 같은 요청 안에서 한쪽은 썼고 한쪽은 못 읽었다. 그 아래 검증·보고서·
API 준비도까지 전부 실행되지 않았다. 고친 뒤 열 단계가 전부 완료된다.

**조용한 쪽 — 이쪽이 더 나쁘다.** 학습 결과가 공유 기본 버킷에 쌓인다. 요청별 격리를
넣은 이유가 정확히 그 버킷을 없애는 것이었다: 로그인이 붙은 배포에서 A가 올린
데이터를 B의 다음 요청이 분석하던 문제. 이 경로만 그리로 되돌아가 있었고, Agent
Mode가 어디에서도 실행된 적이 없어 아무도 몰랐다.

여기서는 스코프 전파만 본다. 학습을 실제로 돌리는 것은 느리고, 확인하려는 성질은
"버킷을 고르는 이름이 스레드를 넘어 살아남는가" 하나다.
"""

import asyncio
import concurrent.futures
import contextvars
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.scoped_state import (  # noqa: E402
    DEFAULT_SCOPE,
    current_scope,
    reset_scope,
    set_scope,
)
from backend.tools.automl_training import _run_async  # noqa: E402


async def scope_seen_by(runner) -> str:
    """`runner`가 코루틴을 돌린 곳에서 보이는 스코프."""
    async def probe() -> str:
        return current_scope()

    return runner(probe)


class TestTheScopeSurvivesTheHandoff:
    def test_the_worker_thread_sees_the_request_scope(self):
        """고친 것. 예전에는 `__default__`가 나왔다."""
        async def inside_a_request():
            token = set_scope("user-A")
            try:
                return await scope_seen_by(_run_async)
            finally:
                reset_scope(token)

        assert asyncio.run(inside_a_request()) == "user-A"

    def test_two_requests_do_not_see_each_other(self):
        """스코프가 전파되기만 하고 갈리지 않으면 격리가 아니다."""
        async def as_user(name: str) -> str:
            token = set_scope(name)
            try:
                return await scope_seen_by(_run_async)
            finally:
                reset_scope(token)

        assert asyncio.run(as_user("user-A")) != asyncio.run(as_user("user-B"))

    def test_without_a_running_loop_it_still_works(self):
        """루프가 없으면 스레드로 넘기지 않고 그 자리에서 돈다. 그 경로도
        스코프를 지켜야 한다."""
        token = set_scope("user-C")
        try:
            async def probe() -> str:
                return current_scope()

            assert _run_async(probe) == "user-C"
        finally:
            reset_scope(token)

    def test_no_scope_set_means_the_default(self):
        """스코프를 안 정하면 기본이 나오는 것이 맞다 - 그것과 "정했는데 기본이
        나온다"가 다르고, 후자가 결함이었다."""
        async def anonymous():
            return await scope_seen_by(_run_async)

        assert asyncio.run(anonymous()) == DEFAULT_SCOPE


class TestTheCheckIsNotVacuous:
    """스코프가 전파되지 않는 것이 어떤 모습인지 여기 남긴다.

    문맥을 복사하지 않는 판을 그대로 재현한다. 이것이 `user-A`를 돌려주기 시작하면
    파이썬이 바뀐 것이고, 그때는 위 테스트가 아니라 이 파일 전체를 다시 봐야 한다.
    """

    def test_a_plain_thread_loses_the_scope(self):
        async def inside_a_request():
            token = set_scope("user-A")
            try:
                def without_context(factory):
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                        return pool.submit(lambda: asyncio.run(factory())).result()

                return await scope_seen_by(without_context)
            finally:
                reset_scope(token)

        assert asyncio.run(inside_a_request()) == DEFAULT_SCOPE

    def test_copying_the_context_is_what_fixes_it(self):
        async def inside_a_request():
            token = set_scope("user-A")
            try:
                def with_context(factory):
                    context = contextvars.copy_context()
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                        return pool.submit(
                            lambda: context.run(lambda: asyncio.run(factory()))).result()

                return await scope_seen_by(with_context)
            finally:
                reset_scope(token)

        assert asyncio.run(inside_a_request()) == "user-A"

    def test_the_helper_under_test_is_the_one_the_tool_uses(self):
        """`_run_async`를 여기서 다시 정의했다면 이 파일은 자기 자신을 시험한다."""
        import backend.tools.automl_training as module

        assert module._run_async is _run_async

    @pytest.mark.parametrize("name", ["user-A", "user-B", "sub-with-dashes"])
    def test_it_returns_whatever_scope_was_set(self, name):
        async def inside_a_request():
            token = set_scope(name)
            try:
                return await scope_seen_by(_run_async)
            finally:
                reset_scope(token)

        assert asyncio.run(inside_a_request()) == name
