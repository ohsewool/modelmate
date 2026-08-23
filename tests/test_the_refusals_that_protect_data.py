"""거절인데 한 번도 터진 적 없는 것들 — 그중 **데이터를 지키는 것들**.

`HTTPException` 발생 지점 102개 중 CI(pytest + 스모크 열다섯)에서 **한 번도 안 터지는
것이 68개**였다. 한 회차에 다 할 수는 없어서 종류로 잘랐다.

    400 × 35   입력 모양이 틀렸다        — 대부분 사용자가 다시 보내면 그만이다
    404 × 18   없거나 남의 것이다        — 소유권 쪽은 이미 검사가 있다
    409 ×  5   **지금 하면 안 된다**      ← 여기
    410 ×  2   **꺼진 API다**            ← 여기
    413 ×  1   **너무 크다**             ← 여기
    500 ×  6   서버가 졌다

**409·410·413을 골랐다.** 입력 검증이 아니라 **상태를 지키는 거절**이라서다. 여기가
틀리면 사용자는 잘못된 요청을 고치는 게 아니라 **돌고 있는 작업이 딸린 데이터셋을
지우거나, 꺼놨다고 믿은 예측 API가 계속 응답한다.**

`Depends`를 거치지 않고 핸들러를 직접 부른다. 확인하려는 것은 "이 핸들러가 무엇을
거절하는가"이지 FastAPI의 의존성 주입이 아니다.
"""

from __future__ import annotations

import asyncio
import io
import json
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi import HTTPException, UploadFile  # noqa: E402
from starlette.datastructures import Headers  # noqa: E402

STAMP = "2026-08-23T00:00:00"


def call(handler, *args, **kwargs):
    result = handler(*args, **kwargs)
    return asyncio.run(result) if asyncio.iscoroutine(result) else result


def run_sql(statement, parameters=()):
    conn = modelmate.get_db()
    try:
        cursor = conn.execute(statement, parameters)
        conn.commit()
        return cursor
    finally:
        conn.close()


def query(statement, parameters=()):
    conn = modelmate.get_db()
    try:
        return conn.execute(statement, parameters).fetchall()
    finally:
        conn.close()


@pytest.fixture
def owner():
    """검사마다 다른 사용자를 쓴다. 같은 사용자를 나눠 쓰면 앞 검사가 남긴 행이
    다음 검사의 전제를 바꾼다 — 이 저장소가 `experiments` 픽스처에서 이미 겪었다."""
    return {"sub": f"refusal-{uuid.uuid4().hex[:8]}",
            "email": f"{uuid.uuid4().hex[:8]}@refusal.test", "role": "user"}


@pytest.fixture
def project(owner):
    project_id = f"p-{uuid.uuid4().hex[:8]}"
    run_sql("INSERT INTO projects (id,user_id,name,description,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?)",
            (project_id, owner["sub"], "거절 검사용", "", STAMP, STAMP))
    return project_id


@pytest.fixture
def dataset(owner, project):
    dataset_id = f"d-{uuid.uuid4().hex[:8]}"
    run_sql("INSERT INTO datasets (id,project_id,user_id,filename,created_at) "
            "VALUES (?,?,?,?,?)",
            (dataset_id, project, owner["sub"], "x.csv", STAMP))
    return dataset_id


def running_job(owner, *, project_id=None, dataset_id=None):
    job_id = f"j-{uuid.uuid4().hex[:8]}"
    modelmate.ensure_training_jobs_table()
    run_sql("INSERT INTO training_jobs (job_id,user_id,project_id,dataset_id,status,created_at) "
            "VALUES (?,?,?,?,?,?)",
            (job_id, owner["sub"], project_id, dataset_id, "running", STAMP))
    return job_id


def deployed_model(user_id, *, disabled=False):
    model_id = f"m-{uuid.uuid4().hex[:8]}"
    run_sql("INSERT INTO deployed_models "
            "(id,user_id,name,task_type,created_at,disabled_at,disabled_reason) "
            "VALUES (?,?,?,?,?,?,?)",
            (model_id, user_id, "거절 검사용", "classification", STAMP,
             STAMP if disabled else None,
             "테스트에서 껐다" if disabled else None))
    return model_id


class TestADisabledPredictionApiIsGone:
    """`410 Gone`. 소유자가 예측 API를 끄면 그 뒤 호출은 거절돼야 한다.

    **두 라우트가 같은 질문에 답한다** — `/api/v1/{id}/predict`와
    `/api/v2/{id}/predict`. 둘 다 자기 몫으로 `disabled_at`을 본다. 한쪽만
    검사하면 다른 쪽이 조용히 갈라지고, 그때 **껐다고 믿은 API가 옛 경로로 계속
    응답한다.** 이 저장소가 `can_rerun`에서 이미 겪은 모양이라 둘을 함께 본다.
    """

    @pytest.mark.parametrize("handler", ["v1_predict", "v2_predict"])
    def test_a_disabled_model_is_refused(self, handler, owner):
        model_id = deployed_model(owner["sub"], disabled=True)
        with pytest.raises(HTTPException) as refused:
            call(getattr(modelmate, handler), model_id=model_id, body={})
        assert refused.value.status_code == 410
        assert refused.value.detail["error_type"] == "prediction_api_disabled"

    @pytest.mark.parametrize("handler", ["v1_predict", "v2_predict"])
    def test_an_enabled_model_falls_through_to_the_missing_file(self, handler, owner):
        """**되돌림 방향인데 `!=`로 썼던 자리다.**

        원래는 `assert raised.status_code != 410`이었다. 그러면 **무엇이 왔는지는
        묻지 않는다** — 404든 500이든 599든 통과한다. 도구로 재보니 이 검사가
        지나는 `404`(모델 파일 없음)를 아무도 확인하지 않고 있었다.

        켜져 있는 모델은 410을 지나 **디스크의 `.pkl`을 찾으러 가고**, 픽스처는
        DB 행만 만들었으니 거기서 404가 나온다. 그것이 이 경로의 정답이다.
        """
        model_id = deployed_model(owner["sub"], disabled=False)
        with pytest.raises(HTTPException) as raised:
            call(getattr(modelmate, handler), model_id=model_id, body={})
        assert raised.value.status_code == 404, "켜진 모델이 410으로 막힌다"
        assert model_id in str(raised.value.detail)

    def test_the_twins_agree_on_a_missing_file_too(self, owner):
        """쌍둥이는 **꺼진 경우만이 아니라 파일이 없는 경우에도** 같아야 한다."""
        model_id = deployed_model(owner["sub"], disabled=False)
        codes = []
        for handler in ("v1_predict", "v2_predict"):
            with pytest.raises(HTTPException) as raised:
                call(getattr(modelmate, handler), model_id=model_id, body={})
            codes.append(raised.value.status_code)
        assert codes[0] == codes[1], f"v1과 v2가 다르게 답한다: {codes}"

    def test_the_twins_agree(self, owner):
        """같은 모델에 두 라우트가 **같은 답**을 하는가."""
        model_id = deployed_model(owner["sub"], disabled=True)
        codes = []
        for handler in ("v1_predict", "v2_predict"):
            with pytest.raises(HTTPException) as refused:
                call(getattr(modelmate, handler), model_id=model_id, body={})
            codes.append((refused.value.status_code,
                          refused.value.detail["error_type"]))
        assert codes[0] == codes[1], f"v1과 v2가 다르게 답한다: {codes}"


class TestDeletingWhileSomethingIsRunning:
    """`409 Conflict`. 돌고 있는 학습 작업이 딸려 있으면 지우지 않는다.

    지워지면 작업은 없어진 데이터셋을 읽으려 하고, 사용자는 **자기가 방금 시작한
    학습이 왜 죽었는지** 모른다.
    """

    def test_a_dataset_with_a_running_job_is_refused(self, owner, project, dataset):
        running_job(owner, project_id=project, dataset_id=dataset)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.delete_dataset, dataset_id=dataset, user=owner)
        assert refused.value.status_code == 409
        assert refused.value.detail["error_type"] == "active_job_exists"
        assert query("SELECT 1 FROM datasets WHERE id=?", (dataset,)), \
            "거절했는데 지워졌다"

    def test_a_project_with_a_running_job_is_refused(self, owner, project):
        running_job(owner, project_id=project)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.delete_project, project_id=project, user=owner)
        assert refused.value.status_code == 409
        assert refused.value.detail["error_type"] == "active_job_exists"
        assert query("SELECT 1 FROM projects WHERE id=?", (project,)), \
            "거절했는데 지워졌다"

    def deleted(self, dataset_id):
        """**행이 사라지는지 묻지 않는다.** 처음엔 그렇게 썼고 두 검사가 빨간불이었다 —
        코드가 틀린 게 아니라 이 삭제가 **소프트 삭제**였다. `deleted_at`을 찍고
        `retention_status='deleted_retained'`로 남긴다. 픽스처가 아니라 내 가정이
        틀렸을 때 검사를 고치는 게 아니라 **가정을 고쳐야 한다.**"""
        rows = query("SELECT deleted_at, delete_status FROM datasets WHERE id=?",
                     (dataset_id,))
        assert rows, "행 자체가 사라졌다 — 보존 정책이 바뀌었으면 이 검사도 바꿔라"
        return rows[0]["deleted_at"] is not None

    def test_a_finished_job_does_not_block(self, owner, project, dataset):
        """**되돌림 방향.** 아무 작업이나 막는 구현도 위 둘은 통과한다.
        끝난 작업은 막지 않아야 한다 — 아니면 데이터셋을 영영 못 지운다."""
        job_id = running_job(owner, project_id=project, dataset_id=dataset)
        run_sql("UPDATE training_jobs SET status='succeeded' WHERE job_id=?", (job_id,))
        call(modelmate.delete_dataset, dataset_id=dataset, user=owner)
        assert self.deleted(dataset)

    def test_someone_elses_running_job_does_not_block_me(self, owner, project, dataset):
        """조건은 `dataset_id=? AND user_id=?`다. `user_id`가 빠지면 **남의 작업이
        내 삭제를 막는다** — 조용히, 그리고 내가 할 수 있는 일이 없다."""
        stranger = {"sub": f"other-{uuid.uuid4().hex[:8]}",
                    "email": "o@refusal.test", "role": "user"}
        running_job(stranger, project_id=project, dataset_id=dataset)
        call(modelmate.delete_dataset, dataset_id=dataset, user=owner)
        assert self.deleted(dataset)

    def test_deleting_a_dataset_shuts_off_the_prediction_api_that_used_it(
            self, owner, project, dataset):
        """**여기가 두 거절이 만나는 자리다.**

        데이터셋을 지우면 그것을 쓰던 배포 모델이 `disabled_at`을 받는다. 그다음
        그 모델로 예측을 부르면 위의 `410`이 나온다. 두 조각을 따로 확인하면
        **사슬이 끊겨도 둘 다 초록불**이다 — 사용자가 겪는 것은 사슬이다.
        """
        model_id = deployed_model(owner["sub"])
        run_sql("UPDATE deployed_models SET dataset_ref=? WHERE id=?",
                (f'{{"dataset_id": "{dataset}"}}', model_id))
        call(modelmate.delete_dataset, dataset_id=dataset, user=owner)
        assert self.deleted(dataset)

        row = query("SELECT disabled_at, disabled_reason FROM deployed_models WHERE id=?",
                    (model_id,))[0]
        assert row["disabled_at"], "데이터셋을 지웠는데 모델이 살아 있다"
        assert row["disabled_reason"] == "linked_dataset_deleted"

        for handler in ("v1_predict", "v2_predict"):
            with pytest.raises(HTTPException) as refused:
                call(getattr(modelmate, handler), model_id=model_id, body={})
            assert refused.value.status_code == 410, handler


class TestAPredictionTokenNeedsAReadyProject:
    """`409`. 데이터셋과 학습된 공유 모델이 없으면 예측 API 인증 정보를 못 만든다.

    빈 프로젝트에 토큰이 발급되면 **그 토큰으로 부를 수 있는 것이 없는데** 사용자는
    발급됐으니 된 줄 안다.
    """

    def test_an_empty_project_is_refused(self, owner, project):
        with pytest.raises(HTTPException) as refused:
            call(modelmate.create_project_prediction_token,
                 project_id=project, body={}, user=owner)
        assert refused.value.status_code == 409
        assert refused.value.detail["user_friendly_message"]
        assert refused.value.detail["recommended_next_action"], \
            "거절만 하고 무엇을 하라는 말이 없다"

    def test_it_says_why_not_just_no(self, owner, project):
        """이 저장소가 `can_rerun`에서 배운 것 — **거부 사유가 플래그와 함께
        다녀야 한다.** '할 수 없습니다'는 '왜'가 붙어야 행동이 된다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.create_project_prediction_token,
                 project_id=project, body={}, user=owner)
        assert refused.value.detail["error_type"], "사유 코드가 비어 있다"


class TestRerunningARunWithNoDataset:
    """`409`. 원본 데이터셋을 확인할 수 없는 기록은 다시 실행하지 않는다.

    "안전하게 다시 실행할 수 없다"는 말이 맞다 — 다른 데이터로 돌리면 **같은 이름의
    기록이 다른 데이터의 결과**가 된다.

    **처음 쓴 검사는 이 거절에 닿지 못했다.** `in (404, 409)`로 두고 통과시켰는데,
    실제로 나온 것은 늘 404였다 — 픽스처가 만든 행을 `_project_runs`가 아예 못 봤다.
    기록의 프로젝트는 `data.dataset_ref.project_id`에서 오고 `analysis_run_id`는
    JSON이 아니라 **행 번호에서** `experiment-<id>`로 만들어진다. **둘 중 아무거나면
    통과인 단언은 닿지 않은 것을 닿은 것처럼 보이게 한다.**
    """

    def make_run(self, owner, project_id, *, with_dataset):
        reference = {"project_id": project_id}
        if with_dataset:
            reference["dataset_id"] = f"d-{uuid.uuid4().hex[:8]}"
        payload = json.dumps({"dataset_ref": reference, "best_model": "rf"})
        cursor = run_sql(
            "INSERT INTO experiments (user_id, data, created_at) VALUES (?,?,?)",
            (owner["sub"], payload, STAMP))
        return f"experiment-{cursor.lastrowid}"

    def test_the_fixture_is_actually_visible(self, owner, project):
        """**대조가 먼저다.** 기록이 목록에 안 보이면 아래 검사는 404를 받고
        409를 확인한 척한다."""
        run_id = self.make_run(owner, project, with_dataset=False)
        conn = modelmate.get_db()
        try:
            runs = modelmate._project_runs(conn, project, owner["sub"])
        finally:
            conn.close()
        assert run_id in [row.get("analysis_run_id") for row in runs]

    def test_a_run_without_a_dataset_reference_is_refused(self, owner, project):
        run_id = self.make_run(owner, project, with_dataset=False)
        with pytest.raises(HTTPException) as refused:
            call(modelmate.rerun_project_run, project_id=project,
                 analysis_run_id=run_id, background_tasks=None, user=owner)
        assert refused.value.status_code == 409
        assert refused.value.detail["error_type"] == "run_dataset_reference_missing"
        assert refused.value.detail["recommended_next_action"]

    def test_an_unknown_run_is_a_404_not_a_409(self, owner, project):
        """**두 거절을 가른다.** 없는 기록과 데이터셋이 빠진 기록은 사용자가 할 일이
        다르다 — 하나는 목록에서 다시 고르고, 하나는 CSV를 다시 올린다."""
        with pytest.raises(HTTPException) as refused:
            call(modelmate.rerun_project_run, project_id=project,
                 analysis_run_id="experiment-99999999", background_tasks=None, user=owner)
        assert refused.value.status_code == 404


@pytest.fixture
def clean_state():
    """`upload`은 성공하든 거절하든 **공유 `STATE`에 자국을 남긴다**(`analysis_status`).
    이 프로세스의 다른 검사가 그 값을 읽으므로 되돌린다 — 이 저장소가 요청 격리에서
    이미 겪은 모양이고, 검사끼리도 같은 방식으로 샌다."""
    before = dict(modelmate.STATE)
    yield
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestAnOversizedUploadIsRefused:
    """`413`. MVP 한도를 넘는 CSV는 거절한다.

    **처음엔 라우트 본문의 크기 검사를 이 파일에 옮겨 적고 그것을 시험했다.**
    `UploadFile`을 만들기 귀찮다는 이유였는데, 그건 이 저장소가 계속 찾아온
    바로 그 결함이다 — **한 사실을 두 곳에 적고 한 곳만 지키는 것.** 제품의 한도
    계산이 바뀌어도 내 사본은 그대로 통과했을 것이다. 지우고 진짜 라우트를 부른다.

    한도 값도 검사가 정하지 않는다. 코드가 쓰는 `MVP_USAGE_LIMITS`를 읽어서 그보다
    한 바이트 큰 파일을 만든다.
    """

    def limit_mb(self):
        return modelmate.MVP_USAGE_LIMITS["max_csv_file_size_mb"]

    def upload_file(self, raw_bytes):
        buffer = io.BytesIO(raw_bytes)
        buffer.seek(0)
        return UploadFile(filename="big.csv", file=buffer,
                          headers=Headers({"content-type": "text/csv"}))

    def test_the_limit_is_a_real_number(self):
        """대조: 한도가 0이면 아래 검사는 아무것도 확인하지 않는다."""
        assert self.limit_mb() >= 1

    def test_one_row_over_the_limit_is_refused(self, owner, clean_state):
        limit = self.limit_mb() * 1024 * 1024
        oversized = b"a,b\n" + b"1,2\n" * ((limit // 4) + 10)
        assert len(oversized) > limit, "심은 파일이 한도를 안 넘는다"
        with pytest.raises(HTTPException) as refused:
            call(modelmate.upload, file=self.upload_file(oversized), user=owner)
        assert refused.value.status_code == 413
        assert refused.value.detail["code"] == "usage_limit_exceeded"
        assert refused.value.detail["limit_key"] == "max_file_size_mb"
        assert refused.value.detail["limit"] == self.limit_mb()

    def test_a_small_file_is_refused_for_being_no_dataset_not_for_size(
            self, owner, clean_state):
        """**여기도 `!=`로 써뒀던 자리다.**

        원래는 `!= 413`이었다. 그러면 무엇이 왔는지 안 묻는다. 두 줄짜리 CSV는
        크기가 아니라 **데이터셋으로 보기 어렵다는 이유로** 400이 나온다 — 그
        구분이 이 검사의 값이고, `!=`는 그걸 지운다.
        """
        small = b"a,b\n1,2\n3,4\n"
        with pytest.raises(HTTPException) as raised:
            call(modelmate.upload, file=self.upload_file(small), user=owner)
        assert raised.value.status_code == 400
        detail = raised.value.detail
        assert detail.get("code") != "usage_limit_exceeded", "작은 파일에 크기 초과라고 한다"
        assert "tips" in detail, "왜 안 되는지 알려주지 않는다"

class TestChoosingATargetThatIsNotThere:
    """`400`. 없는 컬럼을 타깃으로 고르면 거절한다.

    **도달은 하는데 아무도 확인하지 않던 자리다.** `automl_training_tool`을 지나는
    검사가 여기를 지나가지만, 그 검사는 도구의 `success is False`만 단언한다 —
    도구의 계약이지 이 라우트의 거절이 아니다. **한 줄을 지나는 것과 그 줄을
    확인하는 것은 다르다.**

    거절하지 않으면 무슨 일이 생기는가. 타깃이 없는 채로 학습이 시작되고, 사용자는
    자기가 고른 컬럼이 무시된 결과를 받는다 — 그 결과가 무엇에 대한 예측인지
    화면에는 안 적힌다.
    """

    @pytest.fixture
    def uploaded(self):
        import pandas as pd
        before = dict(modelmate.STATE)
        modelmate.STATE.clear()
        modelmate.STATE["df"] = pd.DataFrame({"나이": [1, 2, 3], "결과": [0, 1, 0]})
        yield
        modelmate.STATE.clear()
        modelmate.STATE.update(before)

    def test_an_unknown_column_is_refused(self, uploaded):
        with pytest.raises(HTTPException) as refused:
            call(modelmate.set_target, body={"target_col": "그런 컬럼 없음"})
        assert refused.value.status_code == 400
        assert "그런 컬럼 없음" in refused.value.detail["user_friendly_message"], (
            "무엇을 고쳐야 하는지 말하지 않는다")

    def test_a_real_column_is_accepted(self, uploaded):
        """**되돌림 방향.** 무엇이든 거절하는 구현도 위 검사는 통과한다.
        그리고 이번에는 `!=`로 쓰지 않는다 — 통과하는지를 직접 본다."""
        result = call(modelmate.set_target, body={"target_col": "결과"})
        assert result, "멀쩡한 컬럼을 골랐는데 아무것도 안 준다"

    def test_without_an_upload_it_says_so(self, uploaded):
        """없는 업로드와 없는 컬럼은 **사용자가 할 일이 다르다** — 하나는 CSV를
        다시 올리고, 하나는 컬럼을 다시 고른다."""
        modelmate.STATE.pop("df")
        with pytest.raises(HTTPException) as refused:
            call(modelmate.set_target, body={"target_col": "결과"})
        assert refused.value.status_code == 400
        assert "업로드" in refused.value.detail["user_friendly_message"]
