"""SHAP이 아닌 것을 SHAP이라 부르지 않는다 — 도구 카탈로그에서도.

README가 이 규칙을 적어뒀다. 표준화 계수를 SHAP이라 부르던 것을 고치면서
`standardized_coefficient`로 이름을 바꾼 자리다. **그 규칙이 도구 카탈로그까지는
오지 않았다.**

`backend/tools/registry.py`는 `shap_explainer_tool`을 이렇게 소개하고 있었다:

    "Returns SHAP, feature importance, coefficient, or unavailable evidence."

그 모듈에는 **`import shap`이 한 줄도 없다.** SHAP을 반환할 수 없다. 이 문장은
`mock_response.summary`에 있고 `ToolRegistry.describe()`가 그대로 내보내므로,
도구 목록을 읽는 쪽이 그대로 본다 — "SHAP도 나올 수 있다"는 말은 그 설명에 실릴
무게를 정하는 데 쓰인다.

찾은 경위: 의존성을 고정하려고 설치된 버전을 읽다가 **`shap`과 `optuna`가 이 기계에
설치돼 있지 않다**는 것을 봤다. `SHAP_OK=False`인데 스위트도 스모크도 초록이었고,
그 사슬을 따라가니 "SHAP 설명 단계가 완료됐다"고 보고되는 자리가 나왔다.

이름 자체는 그대로 둔다. 저장된 실행 기록(trace)이 그 이름을 참조하고, 이름을 바꾸면
지난 기록이 가리키는 도구가 사라진다. **바꾸는 것은 이름이 아니라 이름이 하는 약속**
이다 — 설명 문구를 사실로 고치고, 스모크가 이름 대신 `explanation_type`을 말하게 했다.
"""

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

MODULE = ROOT / "backend" / "tools" / "shap_explainer.py"
REGISTRY = ROOT / "backend" / "tools" / "registry.py"

PROSE = re.compile(r'("""|\'\'\')(?:.|\n)*?\1')


def executable(text: str) -> str:
    """주석과 독스트링을 걷어낸 나머지. 이 파일도 위에서 옛 문구를 인용하므로,
    구분하지 않으면 인용이 사용으로 읽힌다 — 이 저장소들에서 여덟 번 겪었다."""
    without_prose = PROSE.sub('""', text)
    return "\n".join(re.sub(r"#.*$", "", line) for line in without_prose.splitlines())


class TestTheModuleCannotProduceShap:
    def test_it_never_imports_shap(self):
        body = executable(MODULE.read_text(encoding="utf-8"))
        assert not re.search(r"^\s*import\s+shap\b", body, re.MULTILINE)
        assert not re.search(r"^\s*from\s+shap\b", body, re.MULTILINE)

    def test_the_explanation_types_it_can_return_are_known(self):
        """`explanation_type`은 읽는 사람이 무게를 정하는 값이다. 목록 밖의 값이
        나오면 그 무게를 정할 수 없다."""
        from backend.tools.shap_explainer import shap_explainer_tool

        produced = shap_explainer_tool({"limit": 3})
        assert produced["explanation_type"] in (
            "feature_importance", "standardized_coefficient", "model_coefficient",
            "fallback", "unavailable",
        ), produced["explanation_type"]

    def test_it_never_labels_its_output_shap(self):
        body = executable(MODULE.read_text(encoding="utf-8"))
        assert '"shap"' not in body and "'shap'" not in body


class TestTheCatalogueDoesNotPromiseShap:
    """계획을 세우는 쪽이 읽는 것은 이 설명이다. 여기서 약속하면 그 약속이 계획에
    들어간다.

    소스 텍스트가 아니라 **실제로 등록되는 값**을 본다. 처음엔 소스에서 문자열을
    잘라 봤는데, 설명이 두 줄로 쪼개져 있어 "does not compute SHAP"이 통째로는
    나타나지 않았다 — 검사가 소스의 서식에 걸린 것이지 내용에 걸린 것이 아니었다.
    """

    def summary(self) -> str:
        """`describe()`가 내보내는 `mock_response.summary`.

        이 자리를 `metadata`라고 부를 뻔했다 — 등록 튜플의 세 번째 원소이고
        `{"summary": ..., "risk": ...}` 모양이라 그렇게 보인다. 실제 이름은
        `mock_response`이고, `mock_runner`가 결과에 병합하며 `describe()`가
        그대로 내보낸다. **이름을 확인하지 않고 부르면 다음 사람이 없는 필드를
        찾는다.**
        """
        from backend.tools.registry import build_registry

        for entry in build_registry().describe():
            if entry.get("name") == "shap_explainer_tool":
                return str((entry.get("mock_response") or {}).get("summary", ""))
        raise AssertionError("레지스트리에서 shap_explainer_tool을 찾지 못했다")

    def test_the_summary_does_not_offer_shap_as_a_return(self):
        assert "Returns SHAP," not in self.summary()

    def test_it_says_plainly_that_it_does_not_compute_shap(self):
        assert "does not compute SHAP" in self.summary()

    def test_the_summary_was_actually_read(self):
        """빈 문자열이면 위 두 검사가 아무것도 확인하지 않는다."""
        assert len(self.summary()) > 60


class TestTheSmokeNamesWhatRan:
    """스모크는 단계 **이름**으로 "설명이 돌았다"를 판정했다. 이름이 곧 주장인
    상황에서 이름은 판정 근거가 될 수 없다."""

    def smoke(self) -> str:
        return (ROOT / "scripts" / "run_agent_mode_smoke.py").read_text(encoding="utf-8")

    def test_it_checks_the_explanation_type(self):
        assert "explanation_type" in self.smoke()

    def test_it_still_checks_that_the_step_completed(self):
        """무엇이 나왔는지를 보느라 **돌기는 했는지**를 잃으면 안 된다."""
        body = self.smoke()
        assert "the explanation step actually runs" in body
        assert 'shap_explainer_tool' in body


class TestTheOptionalLibrariesAreDeclaredHonestly:
    """`shap`과 `optuna`는 `requirements.txt`에 있는데 이 개발 환경에는 없다.
    앱은 `SHAP_OK`/`OPTUNA_OK`로 감싸 두었으므로 없어도 돈다 — **그것이 이 검사가
    확인하는 것**이다. 감싸지 않은 import가 생기면 두 라이브러리가 없는 환경에서
    앱이 아예 뜨지 않는다.
    """

    @pytest.mark.parametrize("flag", ["SHAP_OK", "OPTUNA_OK"])
    def test_the_availability_flag_exists(self, flag):
        import backend.main as modelmate

        assert isinstance(getattr(modelmate, flag), bool)

    @pytest.mark.parametrize("name", ["shap", "optuna"])
    def test_no_part_imports_it_unguarded(self, name):
        """`try: import shap` 밖에서 import하면 없는 환경에서 부팅이 죽는다."""
        parts = ROOT / "backend" / "main_parts"
        offenders = []
        for path in sorted(parts.glob("*.part")):
            body = executable(path.read_text(encoding="utf-8-sig"))
            for number, line in enumerate(body.splitlines(), start=1):
                if re.match(rf"\s*import\s+{name}\b", line) and not line.startswith("    "):
                    offenders.append(f"{path.name}:{number}")
        assert offenders == [], offenders

    def test_both_are_still_declared_as_dependencies(self):
        """감싸져 있다고 해서 선택 사항인 것은 아니다. 배포에는 있어야 하고,
        `requirements.txt`가 그것을 말한다."""
        requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")
        assert "shap" in requirements and "optuna" in requirements
