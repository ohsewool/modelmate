"""바쁜 프로젝트에 작업을 요청하면 **다른 작업이 돌아온다** — 그걸 안 보면 엉뚱한 것을 검사한다.

CI가 같은 커밋에서 셋을 실패했다. 런타임 코드는 한 줄도 안 바뀐 커밋이었다.

    a job with no dataset reports can_rerun false   → can_rerun: true
    and says why before anyone presses the button   → rerun_blocked_reason: None
    and the endpoint refuses it for the same reason → 200 (409이어야 한다)

세 줄 다 "`can_rerun`이 거짓말한다"는 옛 결함이 돌아왔다고 말한다. **아니었다.**

`POST /api/training/jobs`는 언제나 새 작업을 만들지 않는다. 그 프로젝트에
`created`/`queued`/`running` 작업이 하나라도 있으면 **그 작업을 돌려준다**
(`duplicate_guard: True`). 스모크는 바로 앞에서 재실행을 두 번 걸었고, 그 작업이
끝나기 전에 데이터셋 없는 작업을 요청했다. 돌려받은 것은 **데이터셋이 붙은 남의
작업**이었고, 그것이 끝나자 `can_rerun: true`가 됐다.

창은 이 기계에서 0.12초였다. 그래서 로컬에서는 스무 번을 돌려도 초록불이고
러너에서는 빨간불이다. **틀린 답보다 나쁜 것은 같은 커밋에서 색이 바뀌는 답이다** —
사람은 그걸 읽는 대신 다시 돌린다.

여기서 고정하는 것은 그 전제다. 스모크는 *"내가 요청한 그 작업을 돌려받았다"*를
한 번도 확인하지 않았다. 응답에는 `duplicate_guard: True`가 처음부터 들어 있었다.
**아무도 안 봤을 뿐이다.**
"""

from __future__ import annotations

import re
import sys
import uuid
from datetime import datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

SMOKE = ROOT / "scripts" / "run_failure_recovery_smoke.py"


class Body:
    """`TrainingJobBody`가 요구하는 것만 가진 최소 몸통."""

    def __init__(self, project_id=None, dataset_id=None, run_config=None):
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.analysis_run_id = None
        self.run_config = run_config


@pytest.fixture
def busy_project():
    """한 프로젝트에 `running` 작업을 하나 꽂아두고, 끝나면 지운다."""
    user_id = f"busy-{uuid.uuid4().hex[:8]}"
    project_id = f"proj-{uuid.uuid4().hex[:8]}"
    job_id = str(uuid.uuid4())
    now = datetime.now().isoformat(timespec="seconds")

    modelmate.ensure_training_jobs_table()
    conn = modelmate.get_db()
    try:
        # 프로젝트가 실재해야 한다 — 생성 경로는 소유권부터 확인하고, 없는
        # 프로젝트면 404로 끝나 정작 보려는 갈래에 닿지 못한다.
        conn.execute(
            "INSERT INTO projects (id,user_id,name,description,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?)",
            (project_id, user_id, "busy", "진행 중인 작업이 있는 프로젝트", now, now))
        conn.execute(
            "INSERT INTO training_jobs "
            "(job_id,user_id,project_id,dataset_id,status,created_at,queued_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (job_id, user_id, project_id, "dataset-abc", "running", now, now))
        conn.commit()
    finally:
        conn.close()

    yield {"user_id": user_id, "project_id": project_id, "job_id": job_id}

    conn = modelmate.get_db()
    try:
        conn.execute("DELETE FROM training_jobs WHERE user_id=?", (user_id,))
        conn.execute("DELETE FROM projects WHERE user_id=?", (user_id,))
        conn.commit()
    finally:
        conn.close()


class TestTheApiHandsBackTheRunningJob:
    """스모크가 밟은 갈래. **문서가 아니라 동작으로 고정한다.**"""

    def test_an_active_job_is_found(self, busy_project):
        found = modelmate._find_active_training_job(
            busy_project["user_id"], busy_project["project_id"])
        assert found is not None, (
            "진행 중인 작업을 못 찾으면 아래 검사들은 아무것도 확인하지 않는다")
        assert found["job_id"] == busy_project["job_id"]

    def test_a_new_request_gets_that_job_instead(self, busy_project):
        """**요청한 것과 다른 것이 돌아온다.** 데이터셋 없는 작업을 달라고 했는데
        데이터셋이 붙은 진행 중 작업이 온다."""
        returned = modelmate._create_training_job_record(
            {"sub": busy_project["user_id"]}, None,
            Body(project_id=busy_project["project_id"],
                 run_config={"smoke_force_failure": True}))
        assert returned["job_id"] == busy_project["job_id"]
        assert returned["dataset_id"] == "dataset-abc"

    def test_and_it_says_so(self, busy_project):
        """**신호는 처음부터 있었다.** 이 필드를 읽었으면 세 검사가 헷갈리지 않았다."""
        returned = modelmate._create_training_job_record(
            {"sub": busy_project["user_id"]}, None,
            Body(project_id=busy_project["project_id"],
                 run_config={"smoke_force_failure": True}))
        assert returned.get("duplicate_guard") is True

    def test_a_project_of_its_own_is_never_busy(self, busy_project):
        """스모크의 고침. **다른 프로젝트에는 진행 중인 작업이 있을 수 없다.**"""
        assert modelmate._find_active_training_job(
            busy_project["user_id"], f"proj-{uuid.uuid4().hex[:8]}") is None

    def test_no_project_means_no_guard_either(self, busy_project):
        """`_find_active_training_job`은 `project_id`가 없으면 바로 None을 낸다 —
        경합이 프로젝트 단위라는 것을 여기 적어둔다."""
        assert modelmate._find_active_training_job(busy_project["user_id"], None) is None


class TestTheFinishedJobLooksRerunnable:
    """왜 하필 저 세 줄이 실패했는가. **끝난 뒤에야 초록불처럼 보인다.**"""

    def test_while_it_runs_the_reason_is_a_different_one(self):
        blocker = modelmate._rerun_blocker({"status": "running", "dataset_id": "d"})
        assert blocker["error_type"] == "job_not_in_a_rerunnable_state"

    def test_once_it_settles_it_can_be_rerun(self):
        """스모크는 `failed`가 될 때까지 기다린다. 그 시점에 이 작업은 데이터셋이
        있으므로 **막을 이유가 없다** — 그래서 `can_rerun: true`, 이유는 `None`."""
        assert modelmate._rerun_blocker({"status": "failed", "dataset_id": "d"}) is None

    def test_the_real_dataset_less_job_is_still_blocked(self):
        """되돌림 방향. 진짜 데이터셋 없는 작업은 여전히 막힌다 — 옛 결함은 돌아오지
        않았고, 스모크가 다른 작업을 보고 있었을 뿐이다."""
        blocker = modelmate._rerun_blocker({"status": "failed", "dataset_id": None})
        assert blocker["error_type"] == "job_dataset_reference_missing"


class TestTheSmokeChecksWhatItGotBack:
    """고침이 조용히 되돌아가지 않게. 스크립트를 읽는다."""

    @pytest.fixture(scope="class")
    def block(cls):
        text = SMOKE.read_text(encoding="utf-8")
        start = text.index("dataset_less = request(")
        end = text.index("project_detail = request(", start)
        return text[start:end]

    def test_it_uses_a_project_of_its_own(self, block):
        assert "solo_id" in block, (
            "데이터셋 없는 작업이 다시 원래 프로젝트를 쓰면 경합이 돌아온다")
        assert not re.search(r'"project_id":\s*project_id', block), (
            "원래 프로젝트에는 재실행이 진행 중일 수 있다")

    def test_it_checks_the_guard(self, block):
        assert "duplicate_guard" in block, (
            "돌려받은 것이 요청한 그 작업인지 확인하지 않으면, 세 검사는 아무 작업에 "
            "대한 주장이 된다")

    def test_it_checks_the_dataset_is_really_absent(self, block):
        assert 'state_json.get("dataset_id")' in block, (
            "'데이터셋이 없다'가 이 시나리오의 전제인데 그것을 확인하는 줄이 없다")
