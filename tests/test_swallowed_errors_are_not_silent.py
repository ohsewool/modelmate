"""삼킨 예외가 어디까지 조용한가.

앞 회차에 `auth_logout`에서 하나 나왔다 — 바깥이 `except Exception: pass`라
**세션 취소가 실패해도 `ok: True`였고 어디에도 남지 않았다.** 그때처럼, 고친 뒤
나머지를 셌다.

    예외 객체를 아예 버리는 처리기 (다섯 저장소 `src`/`backend`)   44개
    그중 `pass`로 흘려보내는 것                                    8개  ← 전부 modelmate
    타입 없는 `except:`                                            2개  ← 전부 modelmate

**형제 저장소 넷은 0개다.** 세어보고 아무것도 없었다는 것도 결과다.

여덟 중 넷은 남겼다. `automl_training.py`의 재검사 실패는 "누출 없음"으로 읽히지
않도록 **일부러** 필드를 비우고 그 이유가 주석에 있다. `.jwt_secret` 쓰기 실패는
읽기 전용 파일시스템을 견디는 것이고 배포 경로는 위에서 이미 막혔다. `float(score)`는
실패가 아니라 거르개다. SHAP 실패는 `explanation_type`으로 바깥에 보인다.
**의도해서 삼킨 것과 잊고 삼킨 것을 같은 수로 묶으면 고칠 것을 못 고른다.**

넷을 고쳤고, 이 파일은 그 넷을 지킨다.
"""

from __future__ import annotations

import ast
import sqlite3
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"
BACKEND = ROOT / "backend"


def production_sources():
    for path in sorted(BACKEND.rglob("*.py")) + sorted(PARTS.glob("*.part")):
        yield path


class TestNoHandlerCatchesEverything:
    """타입 없는 `except:`는 `KeyboardInterrupt`·`SystemExit`·`MemoryError`도 잡는다.

    둘 있었다. 하나는 CSV 파싱, 하나는 모델을 차례로 학습해 보는 되돌림 고리 —
    **둘 다 오래 걸리는 자리다.** 즉 Ctrl-C를 실제로 누르는 자리이고, 거기서
    Ctrl-C는 중단이 아니라 "읽을 수 없는 파일"이나 "다음 모델"로 읽혔다.
    """

    def test_none_of_them_is_left(self):
        bare = []
        for path in production_sources():
            try:
                tree = ast.parse(path.read_text(encoding="utf-8-sig"))
            except SyntaxError:  # pragma: no cover - 조각이 단독 파싱되지 않으면 건너뛴다
                continue
            for node in ast.walk(tree):
                if isinstance(node, ast.ExceptHandler) and node.type is None:
                    bare.append(f"{path.relative_to(ROOT)}:{node.lineno}")
        assert bare == [], (
            "타입 없는 `except:`가 있다. `except Exception`으로 좁혀라 — "
            f"그대로 두면 Ctrl-C가 실패로 읽힌다:\n  " + "\n  ".join(bare)
        )

    def test_the_scan_would_see_one(self):
        """대조: 검사가 실제로 `except:`를 찾아내는가. 못 찾는 검사도 초록이다."""
        planted = ast.parse("try:\n    pass\nexcept:\n    pass\n")
        found = [n for n in ast.walk(planted)
                 if isinstance(n, ast.ExceptHandler) and n.type is None]
        assert len(found) == 1

    def test_it_read_a_real_number_of_files(self):
        """대조: 파일을 하나도 못 읽으면 빈손으로 통과한다."""
        assert sum(1 for _ in production_sources()) >= 50


class TestOperationalErrorIsNarrowedToAMissingTable:
    """`sqlite3.OperationalError`를 통째로 삼키면 무엇이 같이 삼켜지는가.

    `052_workspace_projects.part`의 세 곳이 "표가 아직 없을 수 있다"를 견디려고
    `except sqlite3.OperationalError: return None`을 쓰고 있었다. 같은 예외 클래스가
    이것들도 나른다 — 아래에서 sqlite로 직접 재현한다.

    **맞는 방법은 같은 파일 200줄 위에 이미 있었다.** `add_column_once`는 예상한
    메시지(`duplicate column name`)만 넘기고 나머지는 올린다.
    """

    @pytest.mark.parametrize("message, is_missing_table", [
        ("no such table: training_jobs", True),
        ("no such column: project_id", False),
        ("database is locked", False),
        ("disk I/O error", False),
    ])
    def test_it_tells_them_apart(self, message, is_missing_table):
        error = sqlite3.OperationalError(message)
        assert modelmate._table_not_created_yet(error) is is_missing_table

    def test_sqlite_really_raises_the_same_class_for_all_three(self, tmp_path):
        """주장을 문장으로 두지 않는다. 세 가지를 실제로 일으킨다."""
        path = tmp_path / "proof.db"
        writer = sqlite3.connect(path)
        writer.execute("CREATE TABLE training_jobs (id INTEGER)")
        writer.commit()

        raised = {}
        reader = sqlite3.connect(path, timeout=0.1)
        for label, statement in [
            ("no such table", "SELECT * FROM nope"),
            ("no such column", "SELECT * FROM training_jobs WHERE project_id=1"),
        ]:
            with pytest.raises(sqlite3.OperationalError) as caught:
                reader.execute(statement).fetchall()
            raised[label] = str(caught.value)

        # 잠금은 **EXCLUSIVE**여야 읽기까지 막는다. `BEGIN IMMEDIATE`로는 읽기가
        # 통과한다 — 처음에 그렇게 재현하려다 초록불을 봤고, 그건 잠금이 없어서가
        # 아니라 sqlite가 읽기를 아직 허용하기 때문이었다.
        writer.execute("BEGIN EXCLUSIVE")
        writer.execute("INSERT INTO training_jobs VALUES (1)")
        with pytest.raises(sqlite3.OperationalError) as caught:
            reader.execute("SELECT * FROM training_jobs").fetchall()
        raised["locked"] = str(caught.value)
        writer.rollback()
        reader.close()
        writer.close()

        assert "no such table" in raised["no such table"]
        assert "no such column" in raised["no such column"]
        assert "locked" in raised["locked"]
        assert not modelmate._table_not_created_yet(
            sqlite3.OperationalError(raised["locked"]))

    @pytest.mark.parametrize("reader", [
        "_project_last_job",
        "_project_job_rollup",
    ])
    def test_a_locked_database_is_not_reported_as_no_jobs(self, reader, tmp_path):
        """**틀린 데이터를 조용히 보여주는 것이 오류를 보여주는 것보다 나쁘다.**

        고치기 전에는 이 셋 다 `None`이나 빈 묶음을 돌려줬다 — 화면에는
        "이 프로젝트에 작업이 없습니다"라고 나온다. 작업이 있는데도.
        """
        class Locked:
            def execute(self, *args, **kwargs):
                raise sqlite3.OperationalError("database is locked")

        with pytest.raises(sqlite3.OperationalError):
            getattr(modelmate, reader)(Locked(), "project-1", "user-1")

    def test_a_missing_table_is_still_tolerated(self):
        """좁히면서 원래 견디던 것까지 깨면 안 된다. **되돌림 방향도 본다.**"""
        class NoTable:
            def execute(self, *args, **kwargs):
                raise sqlite3.OperationalError("no such table: training_jobs")

        assert modelmate._project_last_job(NoTable(), "project-1", "user-1") is None
        rollup = modelmate._project_job_rollup(NoTable(), "project-1", "user-1")
        assert rollup["last_failed_at"] is None

    def test_the_three_call_sites_use_the_helper(self):
        """도우미가 있어도 한 곳이 안 쓰면 그 곳은 그대로 조용하다."""
        source = (PARTS / "052_workspace_projects.part").read_text(encoding="utf-8-sig")
        assert source.count("if not _table_not_created_yet(exc):") == 3
        # 통째로 삼키는 형태가 남아 있지 않은가
        assert "except sqlite3.OperationalError:\n" not in source


class TestABadLimitEnvironmentVariableSpeaks:
    """`FREE_MAX_DATASETS=three`을 넣으면 무슨 일이 일어났는가.

    `int()`가 `ValueError`를 냈고 `pass`였다. **운영자는 자기가 넣은 값이 걸려
    있다고 믿고, 실제로는 기본값이 걸린다.** 사용량 제한은 남용을 막는 장치라
    보통 더 헐거운 쪽으로 틀린다.

    응답은 바꾸지 않는다 — 기본값으로 계속 가는 것이 부팅을 거부하는 것보다 낫다.
    바꾼 것은 **아무 흔적이 없던 것**뿐이다.
    """

    @pytest.fixture
    def recorded(self, monkeypatch):
        events = []
        monkeypatch.setattr(modelmate, "record_security_event",
                            lambda *args, **kwargs: events.append((args, kwargs)))
        return events

    def test_a_typo_is_recorded_and_the_default_still_applies(self, monkeypatch, recorded):
        monkeypatch.setenv("FREE_MAX_DATASETS", "three")
        limits = modelmate.get_plan_limits("free")
        assert limits["max_datasets"] == modelmate.PLAN_LIMITS["free"]["max_datasets"]
        assert [args[0] for args, _ in recorded] == ["config.usage_limit_ignored"]
        assert recorded[0][1]["safe_details"]["env_name"] == "FREE_MAX_DATASETS"

    def test_a_good_value_still_applies_and_says_nothing(self, monkeypatch, recorded):
        """대조. 멀쩡한 값에도 기록하면 이 검사는 아무것도 구분하지 못한다."""
        monkeypatch.setenv("FREE_MAX_DATASETS", "7")
        assert modelmate.get_plan_limits("free")["max_datasets"] == 7
        assert recorded == []

    def test_nothing_set_says_nothing(self, monkeypatch, recorded):
        monkeypatch.delenv("FREE_MAX_DATASETS", raising=False)
        modelmate.get_plan_limits("free")
        assert recorded == []


class TestTheRestWasCountedAndLeftOnPurpose:
    """남긴 넷은 **이름으로 둔다.** 세었지만 안 고친 것과 못 본 것은 다르다."""

    LEFT_ON_PURPOSE = {
        ("tools/automl_training.py", "누출 재검사 실패를 '누출 없음'으로 읽히지 않게 비운다"),
        ("main_parts/001_imports_db.part", "읽기 전용 파일시스템에서 .jwt_secret 쓰기 실패"),
        ("main_parts/040_agent_a.part", "SHAP 실패는 explanation_type으로 바깥에 보인다"),
        ("main_parts/045_agent_runs.part", "데이터셋 메타데이터가 없으면 필드가 빠진다"),
        ("main_parts/051_auth_history_debug.part", "float(score)는 실패가 아니라 거르개다"),
    }

    @pytest.mark.parametrize("relative, _reason", sorted(LEFT_ON_PURPOSE))
    def test_each_one_still_exists(self, relative, _reason):
        """고쳤거나 지웠으면 이 목록도 같이 낡는다. 그때 여기서 걸린다."""
        assert (BACKEND / relative).exists()

    def test_each_one_explains_itself_where_it_is(self):
        """일부러 남긴 것은 **그 자리에 이유가 있어야 한다.** 이유가 이 파일에만
        있으면 그 코드를 읽는 사람은 잊고 삼킨 것과 구별할 수 없다."""
        without_comment = []
        for relative, _ in sorted(self.LEFT_ON_PURPOSE):
            source = (BACKEND / relative).read_text(encoding="utf-8-sig")
            tree = ast.parse(source)
            lines = source.splitlines()
            for node in ast.walk(tree):
                if not isinstance(node, ast.ExceptHandler):
                    continue
                if not all(isinstance(s, ast.Pass) for s in node.body):
                    continue
                window = lines[node.lineno - 1:node.body[-1].lineno]
                if not any(line.lstrip().startswith("#") for line in window):
                    without_comment.append(f"{relative}:{node.lineno}")
        assert without_comment == [], (
            "이유 없이 `pass`로 삼키는 곳:\n  " + "\n  ".join(without_comment))
