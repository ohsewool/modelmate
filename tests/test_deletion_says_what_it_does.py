"""삭제가 무엇을 하는지 사용자에게 정확히 말하는가.

데이터셋 삭제는 **소프트 삭제**다. DB 행에 `deleted_at`과
`retention_status='deleted_retained'`가 붙고, 업로드된 CSV는 디스크에 그대로 남는다.
2026-08-22에 확인했다 — 올리고, 지우고(HTTP 200), `DATASETS_DIR`을 다시 보니 파일이
그대로였다.

**그 자체는 정직하게 밝혀져 있었다.** 삭제 영향 응답에 `will_delete_dataset_file:
False`가 들어 있다. 파일이 안 지워진다고 그대로 말한다.

문제는 바로 옆 문장이었다. `retention_note`가 화면 두 곳(`ProjectDetail.jsx`,
`DatasetList.jsx`)에 그대로 표시되는데, 거기 이렇게 적혀 있었다:

    Historical summaries may remain for up to 30 days in this MVP foundation.

**30일 뒤에 사라진다는 뜻으로 읽힌다. 지우는 코드는 없다.** 그리고
`docs/security-diary`가 아니라 이 저장소 자신의 `docs/security-notes.md`가
"not complete data governance, audit logging, **automatic retention enforcement**"
라고 이미 선언하고 있었다. **앱이 사용자에게 하는 말과 저장소가 자기에 대해 하는 말이
어긋났다.**

숫자를 만든 손잡이 둘도 죽어 있었다. `DATASET_RETENTION_DAYS`는 **정의된 줄 말고는
파일 어디에도 나오지 않았고**(계산해놓고 아무도 읽지 않는 값 — 이 프로젝트의 단골),
`DELETED_ARTIFACT_RETENTION_DAYS`는 저 문장의 숫자로만 쓰였다.

**보존 정책을 지어내지 않았다.** 실제로 지우는 것을 만드는 일은 데이터 거버넌스
기능이고 위험이 따른다. 대신 사실을 적었다: 자동 정리는 없고, 파일은 누군가 지울
때까지 남는다. **뒷받침 없는 기한은 없는 것보다 나쁘다** — 없으면 묻고, 있으면 믿는다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PARTS = ROOT / "backend" / "main_parts"
WORKSPACE = (PARTS / "052_workspace_projects.part").read_text(encoding="utf-8-sig")


def executable(text: str) -> str:
    """주석을 걷어낸 나머지. 경위를 적으면서 옛 문구를 인용하기 때문에,
    인용과 사용을 구분하지 않으면 이 파일이 자기 주석에 걸린다 —
    이 저장소들에서 이미 세 번 겪었다."""
    return "\n".join(re.sub(r"#.*$", "", line) for line in text.splitlines())


class TestTheNoteMatchesWhatHappens:
    def test_no_unbacked_deadline_is_shown(self):
        """"최대 N일"은 N일 뒤 사라진다는 뜻으로 읽힌다. 지우는 것이 없으면
        그 문장은 약속이 아니라 오해다."""
        assert "may remain for up to" not in executable(WORKSPACE)

    def test_the_note_says_there_is_no_automatic_removal(self):
        note = WORKSPACE[WORKSPACE.index('"retention_note"'):]
        note = note[:note.index("\n    }")]
        assert "no automatic retention job" in note

    def test_the_note_says_the_file_is_kept(self):
        note = WORKSPACE[WORKSPACE.index('"retention_note"'):]
        note = note[:note.index("\n    }")]
        assert "kept" in note or "stays" in note

    def test_the_impact_still_states_the_file_is_not_deleted(self):
        """이건 원래 정직했던 부분이다. 문장을 고치다 이걸 잃으면 안 된다."""
        assert '"will_delete_dataset_file": False' in executable(WORKSPACE)


class TestTheDeadKnobsAreGone:
    @pytest.mark.parametrize("name", ["DATASET_RETENTION_DAYS",
                                      "DELETED_ARTIFACT_RETENTION_DAYS"])
    def test_the_knob_is_not_read_anymore(self, name):
        """읽고 쓰지 않는 값은 있는 기능을 암시한다. `DATASET_RETENTION_DAYS`는
        정의된 줄 말고는 파일 어디에도 없었다."""
        offenders = [path.name for path in sorted(PARTS.glob("*.part"))
                     if name in executable(path.read_text(encoding="utf-8-sig"))]
        assert offenders == [], offenders

    def test_they_were_never_documented_either(self):
        """`.env.example`에 없었다 — 문서화된 손잡이를 조용히 없앤 것이 아니다."""
        assert "RETENTION" not in (ROOT / ".env.example").read_text(encoding="utf-8")


class TestTheProjectPathSaysTheSameThing:
    """같은 사실을 한쪽만 말하고 있었다. 프로젝트 삭제 응답에는 파일에 대한
    언급이 아예 없었다 — 지우고 `MODELS_DIR`·`DATASETS_DIR`을 확인하니 pkl과 CSV가
    그대로였다."""

    def test_it_states_the_dataset_file_is_kept(self):
        impact = WORKSPACE[WORKSPACE.index('"will_archive_project"'):]
        impact = impact[:impact.index("\n    }")]
        assert '"will_delete_dataset_file": False' in executable(impact)

    def test_it_states_the_model_file_is_kept(self):
        impact = WORKSPACE[WORKSPACE.index('"will_archive_project"'):]
        impact = impact[:impact.index("\n    }")]
        assert '"will_delete_model_file": False' in executable(impact)

    def test_it_points_at_the_one_path_that_does_remove_a_file(self):
        """`/api/deployed/{model_id}`는 실제로 pkl을 지운다. 지우는 방법이 있는데
        말하지 않으면 사용자는 방법이 없다고 믿는다."""
        assert "Deleting a deployed model" in WORKSPACE

    def test_that_path_really_removes_the_file(self):
        deployed = (PARTS / "072_deploy_static_b.part").read_text(encoding="utf-8-sig")
        handler = deployed[deployed.index('@app.delete("/api/deployed/{model_id}")'):]
        handler = handler[:handler.index("@app.post")]
        assert "os.remove(fp)" in executable(handler)


class TestTheDeletionItselfIsUnchanged:
    """문장만 고쳤다. 동작을 바꾸면 그건 다른 작업이고 다른 위험이다."""

    def test_it_is_still_a_soft_delete(self):
        assert "delete_status='deleted'" in executable(WORKSPACE)
        assert "retention_status='deleted_retained'" in executable(WORKSPACE)

    def test_linked_models_are_still_disabled(self):
        assert "linked_dataset_deleted" in executable(WORKSPACE)

    def test_an_active_job_still_blocks_deletion(self):
        assert "active_job_exists" in executable(WORKSPACE)


class TestTheChecksAreNotVacuous:
    def test_the_part_file_was_actually_read(self):
        assert len(WORKSPACE) > 5000
        assert "delete_dataset" in WORKSPACE

    def test_the_comment_stripper_keeps_code(self):
        """전부 지워버리면 위 검사들이 무엇이 있어도 통과한다."""
        stripped = executable(WORKSPACE)
        assert '"retention_note"' in stripped
        assert "DATASET_RETENTION_DAYS" in WORKSPACE  # 경위는 주석에 남아 있다
        assert "DATASET_RETENTION_DAYS" not in stripped

    def test_the_note_is_still_shown_to_the_user(self):
        """문장을 고쳐놓고 화면에서 사라지면 고친 의미가 없다."""
        for name in ("pages/workspace/ProjectDetail.jsx",
                     "components/workspace/DatasetList.jsx"):
            source = (ROOT / "frontend" / "src" / name).read_text(encoding="utf-8")
            assert "retention_note" in source, name
