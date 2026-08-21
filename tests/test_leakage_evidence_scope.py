"""권고를 따른 실행과 무시한 실행이 검증에서 갈려야 한다.

갈리지 않고 있었다. 누출 검사는 컬럼 셋을 빼라고 하고, 그대로 빼고 학습하면
AUC가 1.000에서 0.778로 내려가는데 — 그게 이 데모의 요지다 — **검증은 두 실행을
똑같이 `invalid`로 판정했다.** 증거 묶음에 넘어가는 누출 정보가 학습이 실제로 쓴
컬럼이 아니라 **원본 데이터셋 전체**의 것이었기 때문이다.

`automl_training_tool`은 학습 뒤 `used_features`로 다시 검사해 `leakage_scope`를
붙인다. 그 재검사는 정확히 갈린다(적용 `low`, 무시 `high`). 만들어 놓고 아무도
읽지 않았다 — 이 프로젝트가 반복해서 만나는 "장치 둘이 어긋나는데 대조하는 게
없음"이다.

**안전장치가 순응한 사용자를 벌하면 사람들은 그것을 끈다.** 권고를 따랐는데도
차단되면 따를 이유가 없어진다.

여기서 한 번 더 걸렸다: 위험도만 재검사 값으로 바꾸고 컬럼 목록은 원본을 두었더니
아무것도 달라지지 않았다. `_has_high_leakage`가 컬럼 목록을 **먼저** 보기 때문이다.
절반만 고친 것은 안 고친 것이고, 그래서 아래 테스트들은 둘을 함께 확인한다.
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.tools.automl_training import automl_training_tool  # noqa: E402
from backend.tools.leakage_check import leakage_check_tool  # noqa: E402
from backend.tools.report_writer import report_writer_tool  # noqa: E402
from backend.tools.validation import validation_tool  # noqa: E402

pytest.importorskip("sklearn")

LEAKY = ROOT / "sample_data" / "generated" / "customer_churn_leaky.csv"
TARGET = "churn"


@pytest.fixture(scope="module")
def findings():
    if not LEAKY.exists():
        pytest.skip("데모 데이터가 없다 — scripts/make_demo_data.py")
    return leakage_check_tool({"dataframe": pd.read_csv(LEAKY), "target_column": TARGET})


def train(findings, *, apply_advice: bool):
    dropped = ["customer_id"] + (findings["excluded_feature_candidates"] if apply_advice else [])
    return automl_training_tool({"file_path": str(LEAKY), "target_column": TARGET,
                                 "excluded_columns": dropped})


def evidence_from(trained, findings):
    """데모와 제품이 만드는 것과 같은 모양의 증거 묶음.

    누출 정보는 한 덩어리로 학습된 모델을 서술한다.
    """
    scoped = trained.get("leakage_scope") == "used_features"
    columns = trained.get("suspicious_columns") if scoped else findings["suspicious_columns"]
    return {
        "selected_target": TARGET,
        "task_type": trained["task_type"],
        "model_summary": {"best_model": trained["best_model"]["name"]},
        "metric_summary": {"evaluated_metric": trained["best_model"]["metric"]["label"],
                           "best_metric_value": trained["best_model"]["metric"]["value"]},
        "explanation_summary": "상위 특징",
        "threshold_status": "warning",
        "training_success": True,
        "suspicious_columns": columns,
        "leakage_risk": trained.get("leakage_risk") if scoped else findings["leakage_risk"],
        "leakage_warnings": [c["reason"] for c in columns if c["severity"] == "high"],
        "data_quality_warnings": [],
        "limitations": [],
        "source_tool_calls": ["data_profile_tool", "schema_validation_tool",
                              "leakage_check_tool"],
    }


class TestTheRecheckActuallyDiscriminates:
    """재검사가 두 경우를 가르지 못하면 아래 테스트는 전부 무의미하다."""

    def test_applying_the_advice_clears_the_leakage(self, findings):
        trained = train(findings, apply_advice=True)
        assert trained["leakage_scope"] == "used_features"
        assert trained["leakage_risk"] == "low"

    def test_ignoring_it_does_not(self, findings):
        trained = train(findings, apply_advice=False)
        assert trained["leakage_scope"] == "used_features"
        assert trained["leakage_risk"] == "high"

    def test_the_dataset_wide_finding_is_high_either_way(self, findings):
        """원본 값은 두 경우에 같다. 그래서 그것을 넘기면 구분이 사라진다 —
        이것이 결함의 원인이었다."""
        assert findings["leakage_risk"] == "high"

    def test_the_score_moves_the_way_the_readme_says(self, findings):
        assert train(findings, apply_advice=True)["best_model"]["metric"]["value"] == \
            pytest.approx(0.7782, abs=0.001)
        assert train(findings, apply_advice=False)["best_model"]["metric"]["value"] == \
            pytest.approx(1.0, abs=0.001)


class TestValidationSeparatesTheTwoRuns:
    def test_following_the_advice_is_not_blocked(self, findings):
        """고친 것. 순응한 사용자를 벌하는 관문은 꺼지는 관문이다."""
        result = validation_tool({"evidence_bundle": evidence_from(
            train(findings, apply_advice=True), findings)})
        assert not result.get("blocking_issues")
        assert result["validation_status"] != "invalid"

    def test_ignoring_it_is_blocked(self, findings):
        result = validation_tool({"evidence_bundle": evidence_from(
            train(findings, apply_advice=False), findings)})
        assert any("leakage" in issue.lower() for issue in result["blocking_issues"])

    def test_passing_the_dataset_wide_finding_blocks_both(self, findings):
        """되돌아가면 무슨 일이 벌어지는지 고정한다. 이 테스트가 통과한다는 것은
        원인 진단이 맞다는 뜻이다."""
        trained = train(findings, apply_advice=True)
        stale = evidence_from(trained, findings)
        stale["suspicious_columns"] = findings["suspicious_columns"]
        stale["leakage_risk"] = findings["leakage_risk"]
        assert validation_tool({"evidence_bundle": stale})["blocking_issues"]

    def test_changing_only_the_risk_is_not_enough(self, findings):
        """절반만 고친 판. `_has_high_leakage`가 컬럼 목록을 먼저 보므로 위험도만
        바꾸면 아무것도 달라지지 않는다 — 실제로 그렇게 고쳤다가 알았다."""
        trained = train(findings, apply_advice=True)
        half = evidence_from(trained, findings)
        half["suspicious_columns"] = findings["suspicious_columns"]
        assert validation_tool({"evidence_bundle": half})["blocking_issues"]


class TestABlockedReportSaysSo:
    """검증이 "보고서를 쓰기 전에 고치라"고 하는데 보고서가 그 말을 하지 않았다.
    차단된 실행과 정상 실행의 한계 고지가 글자 하나까지 같았고, 보고서만 받은
    사람은 둘을 구분할 수 없었다."""

    def _report(self, findings, *, apply_advice):
        evidence = evidence_from(train(findings, apply_advice=apply_advice), findings)
        validation = validation_tool({"evidence_bundle": evidence})
        return report_writer_tool({"evidence_bundle": evidence,
                                   "validation_result": validation})

    def test_a_blocked_report_announces_it_in_the_summary(self, findings):
        assert "차단" in self._report(findings, apply_advice=False)["summary"]

    def test_and_names_the_reason_in_the_limitations(self, findings):
        limitations = self._report(findings, apply_advice=False)["limitations"]
        assert any("leakage" in text.lower() for text in limitations)

    def test_a_clean_report_says_neither(self, findings):
        report = self._report(findings, apply_advice=True)
        assert "차단" not in report["summary"]
        assert not any("leakage" in text.lower() for text in report["limitations"])

    def test_the_two_reports_are_distinguishable(self, findings):
        """요지. 예전에는 두 보고서의 한계 고지가 동일했다."""
        blocked = self._report(findings, apply_advice=False)
        clean = self._report(findings, apply_advice=True)
        assert blocked["limitations"] != clean["limitations"]
        assert blocked["summary"] != clean["summary"]
