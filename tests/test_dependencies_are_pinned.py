"""선언한 의존성이 전부 고정돼 있는가.

`requirements.txt`는 열여섯 개를 **이름으로만** 적고 있었다. 갓 설치하면 그날 최신이
잡히고, 이 저장소가 공개하는 숫자는 어느 한 조합 위에서 나온 것인데 **어느 조합인지
아무 데도 적혀 있지 않았다.** `docs/MODEL_MATE_HANDOFF.md` §6.3이 그것을 위험으로
적어뒀고, 두 달 동안 그대로였다.

**버전은 손으로 적지 않았다.** 개발 기계에는 `shap`과 `optuna`가 설치돼 있지 않아 그
둘은 읽을 수가 없다. 기억이나 짐작으로 적은 핀은 **확인된 것처럼 보이는 추측**이고,
그것은 고정하지 않은 것보다 나쁘다 — 읽는 사람이 검증된 값이라고 믿는다.

그래서 CI의 `tests` 잡에 `pip freeze` 단계를 넣고, 갓 설치가 실제로 무엇을 잡는지
찍어서 그 값을 옮겼다. 개발 기계와 달랐다:

    fastapi   0.140.7  →  0.141.1
    numpy     2.1.2    →  2.4.6
    openai    2.49.0   →  3.3.1

**한쪽에서 통과한 숫자가 다른 쪽에서 같으리라는 보장이 없다**는 것이 고정하는 이유다.

전이 의존은 고정하지 않았다. 전체 잠금은 한 파이썬에서 푼 것이 다른 파이썬에서
풀린다는 보장이 없고, 이 저장소의 CI는 3.11(`tests`)과 3.12(`product`) 둘 다 쓴다.
**확인한 범위까지만 고정한다** — 그 범위를 넘어 적으면 다시 추측이다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / "requirements.txt"

# `name[extra]==version` — extra는 있어도 되고 없어도 된다.
PINNED = re.compile(r"^[A-Za-z0-9._-]+(\[[A-Za-z0-9,._-]+\])?==[0-9][^\s]*$")


def declared() -> list[str]:
    return [line.strip() for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")]


class TestEveryDeclaredDependencyIsPinned:
    def test_no_line_floats(self):
        floating = [line for line in declared() if not PINNED.match(line)]
        assert floating == [], (
            "고정되지 않은 줄:\n  " + "\n  ".join(floating)
            + "\n버전은 손으로 적지 말고 `tests` 잡의 "
              "\"Record what a fresh install actually resolved\" 로그에서 떠와라."
        )

    def test_the_file_was_actually_read(self):
        """빈 파일이면 "고정되지 않은 줄 0개"가 나오면서 아무것도 확인하지 않는다."""
        assert len(declared()) >= 10

    def test_the_pattern_would_catch_a_floating_line(self):
        assert not PINNED.match("fastapi")
        assert not PINNED.match("fastapi>=0.141")
        assert PINNED.match("fastapi==0.141.1")
        assert PINNED.match("uvicorn[standard]==0.52.4")


class TestTheAppStillDeclaresWhatItImports:
    """고정하면서 줄을 잃으면, 설치는 재현되는데 **필요한 것이 빠진 채** 재현된다."""

    @pytest.mark.parametrize("name", [
        "fastapi", "uvicorn", "pandas", "numpy", "joblib", "pydantic",
        "scikit-learn", "shap", "optuna", "python-multipart", "python-jose",
        "xgboost", "lightgbm", "openai", "google-generativeai", "google-auth",
    ])
    def test_it_is_still_declared(self, name):
        assert any(line.split("==")[0].split("[")[0] == name for line in declared()), name

    def test_the_count_did_not_shrink(self):
        assert len(declared()) == 16


class TestTheProvenanceStaysWithTheNumbers:
    """어디서 온 값인지가 사라지면, 다음 사람은 이 숫자들을 손으로 고친다."""

    def test_the_file_records_where_the_versions_came_from(self):
        header = REQUIREMENTS.read_text(encoding="utf-8")
        assert "pip freeze" in header
        assert "3.11.16" in header

    def test_ci_still_records_a_fresh_resolution(self):
        """핀을 갱신할 곳이 그 로그다. 단계가 사라지면 갱신할 근거가 사라진다."""
        workflow = (ROOT / ".github" / "workflows" / "tests.yml").read_text(encoding="utf-8")
        assert "pip freeze" in workflow
        assert "Record what a fresh install actually resolved" in workflow

    def test_the_handoff_document_no_longer_calls_it_open(self):
        document = (ROOT / "docs" / "MODEL_MATE_HANDOFF.md").read_text(encoding="utf-8")
        for line in document.splitlines():
            if "Unpinned Python dependencies" in line:
                assert "RESOLVED" in line, line
