"""워크스페이스 목록이 남의 것을 보여주지 않는가.

프런트가 부르는데 CI가 한 줄도 실행하지 않는 라우트 스물넷 중 네 개가 **목록 읽기**다 —
프로젝트, 실험 기록, 리포트, 학습 작업. 넷 다 `WHERE user_id=?`로 자기 것만 고른다고
쓰여 있고, **그 조건이 실제로 거는지는 확인된 적이 없었다.**

이 저장소가 이미 겪은 실패의 반대편이다. 요청 격리를 고치기 전에는 A가 올린 데이터셋을
B의 다음 요청이 분석했다 — `STATE` 하나를 프로세스가 공유했기 때문이다. 그건 고쳤고,
**DB 쪽 범위**는 각 질의의 `WHERE`에 달려 있다. 조건 하나가 빠지면 목록 하나가 남의
작업 제목을 보여준다.

거부만 확인하면 전부 빈 목록을 주는 구현도 통과한다. 그래서 **본인은 보이고 남은
안 보이는** 것을 한 검사 안에서 함께 본다.

`Depends`를 거치지 않고 핸들러를 직접 부른다. 확인하려는 것은 "이 질의가 누구의 행을
고르는가"이지 FastAPI가 의존성을 주입하는가가 아니다.
"""

import asyncio
import json
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException  # noqa: E402

MINE = {"sub": "scoped-owner", "email": "owner@example.test", "role": "user"}
THEIRS = {"sub": "scoped-stranger", "email": "stranger@example.test", "role": "user"}
STAMP = "2026-08-23T00:00:00"


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


def has_table(name: str) -> bool:
    conn = modelmate.get_db()
    try:
        return conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
        ).fetchone() is not None
    finally:
        conn.close()


@pytest.fixture
def rows():
    """두 사용자의 행을 만들고 끝나면 지운다."""
    made = []

    def make(table, key, **columns):
        given = columns.pop(key, ...) if key in columns else ...
        identifier = given if given is not ... else f"scoped-{uuid.uuid4().hex[:10]}"
        if identifier is not None:
            columns[key] = identifier
        conn = modelmate.get_db()
        try:
            names = ", ".join(columns)
            marks = ", ".join("?" for _ in columns)
            cursor = conn.execute(f"INSERT INTO {table} ({names}) VALUES ({marks})",
                                  tuple(columns.values()))
            if identifier is None:              # sqlite가 부여한 값을 받아온다
                identifier = cursor.lastrowid
            conn.commit()
        finally:
            conn.close()
        made.append((table, key, identifier))
        return identifier

    yield make
    conn = modelmate.get_db()
    try:
        for table, key, identifier in reversed(made):
            conn.execute(f"DELETE FROM {table} WHERE {key}=?", (identifier,))
        conn.commit()
    finally:
        conn.close()


def titles(listing) -> set[str]:
    """목록이 무엇을 담았든 이름/제목처럼 보이는 값을 모은다."""
    items = listing if isinstance(listing, list) else (
        listing.get("projects") or listing.get("items") or listing.get("jobs")
        or listing.get("reports") or listing.get("history") or [])
    found = set()
    for item in items:
        if isinstance(item, dict):
            for key in ("name", "title", "project_name", "id", "job_id", "report_id"):
                if item.get(key):
                    found.add(str(item[key]))
    return found


class TestAListingShowsOnlyYourOwnRows:
    def test_projects(self, rows):
        mine = rows("projects", "id", user_id=MINE["sub"], name="mine-project")
        theirs = rows("projects", "id", user_id=THEIRS["sub"], name="theirs-project")
        seen = titles(call(modelmate.list_projects, user=MINE))
        assert mine in seen or "mine-project" in seen
        assert theirs not in seen and "theirs-project" not in seen

    @pytest.mark.skipif(not has_table("training_jobs"),
                        reason="training_jobs는 학습 경로가 처음 쓸 때 만들어진다")
    def test_training_jobs(self, rows):
        mine = rows("training_jobs", "job_id", user_id=MINE["sub"], created_at=STAMP,
                    status="queued")
        theirs = rows("training_jobs", "job_id", user_id=THEIRS["sub"], created_at=STAMP,
                      status="queued")
        seen = titles(call(modelmate.list_workspace_jobs, user=MINE))
        assert mine in seen
        assert theirs not in seen

    def test_reports(self, rows):
        """리포트는 프로젝트를 거쳐 모인다. 프로젝트 범위가 새면 리포트도 샌다."""
        rows("projects", "id", user_id=THEIRS["sub"], name="theirs-report-project")
        listing = call(modelmate.list_workspace_reports, user=MINE)
        assert "theirs-report-project" not in titles(listing)


class TestHistoryIsScopedExceptForAdmins:
    """기록만 관리자에게 전체를 보여준다. **그 예외가 의도된 것인지**를 여기 고정한다 —
    조용히 사라지면 관리자가 못 보고, 조용히 넓어지면 모두가 다 본다."""

    def experiments(self, rows, marker):
        """`experiments.id`는 INTEGER PK다 — 다른 표들과 달리 문자열 id를 만들 수
        없어서, 값을 주지 않고 sqlite가 부여하게 둔 뒤 그 값으로 지운다."""
        return rows("experiments", "id", id=None, user_id=THEIRS["sub"],
                    data=json.dumps({"marker": marker}), created_at=STAMP)

    def test_a_user_does_not_see_another_users_experiments(self, rows):
        marker = uuid.uuid4().hex[:10]
        self.experiments(rows, marker)
        assert marker not in json.dumps(call(modelmate.get_history, user=MINE),
                                        ensure_ascii=False)

    def test_an_admin_does(self, rows):
        marker = uuid.uuid4().hex[:10]
        self.experiments(rows, marker)
        admin = {"sub": "scoped-admin", "email": "admin@example.test", "role": "admin"}
        assert marker in json.dumps(call(modelmate.get_history, user=admin),
                                    ensure_ascii=False)

    def test_an_anonymous_caller_sees_nothing_of_either(self, rows):
        marker = uuid.uuid4().hex[:10]
        self.experiments(rows, marker)
        assert marker not in json.dumps(call(modelmate.get_history, user=None),
                                        ensure_ascii=False)


@pytest.fixture
def empty_state():
    """빈 `STATE` 버킷 하나를 이 테스트만의 범위로 연다.

    처음엔 열지 않고 그냥 불렀다. **파일 단독으로는 통과하고 전체 스위트에서는
    실패했다** — 앞선 테스트가 학습을 돌려 기본 버킷에 모델을 남겨두면, "모델이
    없을 때"를 시험한다던 검사가 모델이 있는 상태를 보게 된다.

    전역 상태에 기대는 검사는 **그 상태를 스스로 세워야 한다.** 이 저장소가 요청
    격리를 만들면서 붙인 `set_scope`가 정확히 그 도구다 — 제품 코드가 요청마다
    하는 일을 검사도 한다.
    """
    from backend.scoped_state import reset_scope, set_scope

    token = set_scope(f"test-empty-{uuid.uuid4().hex[:8]}")
    try:
        yield
    finally:
        reset_scope(token)


class TestTheStateReadsRefuseWhenThereIsNoModel:
    """`STATE` 범위 읽기 둘. 요청마다 빈 상태에서 시작하므로 **모델이 없을 때가
    기본값**이고, 그 경로가 한 번도 돌아본 적이 없었다."""

    def test_feature_info_says_there_is_no_model(self, empty_state):
        with pytest.raises(HTTPException) as raised:
            call(modelmate.feature_info)
        assert raised.value.status_code == 400

    def test_the_explanation_summary_also_refuses(self, empty_state):
        """처음엔 이쪽이 **빈 근거**를 돌려줄 것이라 적었다. 아니다 — 400으로
        거부하고 "Run cross-validation first"라고 말한다. 둘 중 어느 쪽인지가
        화면의 동작을 가르므로 **짐작이 아니라 실제 동작**을 고정한다."""
        with pytest.raises(HTTPException) as raised:
            call(modelmate.explain_summary)
        assert raised.value.status_code == 400


class TestTheValidationSummaryHasADefault:
    """저장소 뿌리의 벤치마크 JSON 둘을 읽는다. **갓 클론한 곳에는 그 파일이 없고**,
    그때 무엇을 돌려주는지가 이 검사의 내용이다 — 없는 파일에 터지면 화면이 빈 상태가
    아니라 오류가 된다.

    처음 쓴 단언은 `... or summary`로 끝나서 **무엇이 오든 통과**했다. 대조를 걸기
    전에 스스로 눈에 띄었다: 참인 것을 확인하는 단언과 아무것도 확인하지 않는 단언은
    통과 화면에서 똑같아 보인다."""

    KEYS = ("training", "domain", "domains", "public_institution_cases", "updated")

    def test_it_answers_with_the_shape_the_screen_expects(self):
        summary = call(modelmate.validation_summary)
        for key in self.KEYS:
            assert key in summary, key
        assert set(summary["training"]) >= {"total_cases", "passed_cases", "failed_cases"}

    def test_a_missing_benchmark_file_becomes_zeros_not_an_error(self, tmp_path, monkeypatch):
        """파일이 없는 상태를 만든다. 읽기 함수를 없는 경로로 돌려 **기본값 경로**가
        실제로 도는지 본다 — 이 저장소에는 두 파일이 다 있어서, 그러지 않으면 그
        갈래는 영영 돌지 않는다."""
        real = modelmate._read_json_file
        monkeypatch.setattr(modelmate, "_read_json_file",
                            lambda path, default: real(str(tmp_path / "absent.json"), default))
        summary = call(modelmate.validation_summary)
        assert summary["training"]["total_cases"] == 0
        assert summary["domain"]["checked_cases"] == 0
