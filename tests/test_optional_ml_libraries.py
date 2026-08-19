"""xgboost, lightgbm, shap and optuna are optional. Nobody had checked.

`main_parts/002` imports each behind try/except and sets XGB_OK, LGBM_OK,
SHAP_OK, OPTUNA_OK. Those flags are a claim: the product works without them,
with fewer models to compare and a coefficient-based explanation instead of
SHAP. Every environment here had all four installed, so the claim had never
been executed - the same blind spot found in mcp-gateway, where the identical
check turned up a test importing its sibling unguarded.

Here it holds: training still runs, the explanation still ranks features, and
the clean demo dataset reaches the same 0.7782 it does with everything present -
because the model that wins it is Logistic Regression either way.

Run in a subprocess so blocking the imports cannot leak into the rest of the
suite, and with ModuleNotFoundError because that is what Python raises for a
missing module. A bare ImportError produces failures that belong to the harness
rather than the code, a mistake already made once this week.
"""

import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / "sample_data" / "generated" / "customer_churn.csv"

pytestmark = pytest.mark.slow

BLOCK = '''
import sys, warnings
from importlib.abc import MetaPathFinder

BLOCKED = {"xgboost", "lightgbm", "shap", "optuna"}

class Absent(MetaPathFinder):
    def find_spec(self, name, path=None, target=None):
        if name.split(".")[0] in BLOCKED:
            raise ModuleNotFoundError(f"No module named {name!r}", name=name)
        return None

sys.meta_path.insert(0, Absent())
sys.path.insert(0, ".")
warnings.filterwarnings("ignore")
'''


def run(body: str) -> str:
    if not CLEAN.exists():
        pytest.skip("run scripts/make_demo_data.py first")
    pytest.importorskip("google.oauth2", reason="backend.main needs google-auth")
    finished = subprocess.run(
        [sys.executable, "-c", BLOCK + textwrap.dedent(body)],
        cwd=ROOT, capture_output=True, text=True, timeout=600,
    )
    assert finished.returncode == 0, finished.stderr[-1500:]
    return finished.stdout


class TestTheProductRunsWithoutThem:
    def test_the_flags_report_them_absent(self):
        output = run('''
            import backend.main as backend
            print(backend.XGB_OK, backend.LGBM_OK, backend.SHAP_OK, backend.OPTUNA_OK)
        ''')
        assert output.split()[-4:] == ["False", "False", "False", "False"]

    def test_the_remaining_models_are_still_registered(self):
        """Fewer models to compare is the documented cost. No models is a break."""
        output = run('''
            import backend.main as backend
            print(sorted(backend.MODELS))
        ''')
        assert "Logistic Regression" in output and "Random Forest" in output

    def test_training_still_completes(self):
        output = run('''
            from backend.tools.automl_training import automl_training_tool
            result = automl_training_tool({
                "file_path": "sample_data/generated/customer_churn.csv",
                "target_column": "churn", "excluded_columns": ["customer_id"]})
            print(result["success"], result["best_model"]["metric"]["value"])
        ''')
        assert output.split()[0] == "True"

    def test_the_score_is_unchanged_on_the_demo_dataset(self):
        """0.7782 with all four present, and the same without them.

        Not a coincidence worth hiding: Logistic Regression wins this dataset
        either way, so removing the gradient-boosting libraries removes
        candidates that were not going to be chosen. On data where one of them
        won, this number would move - and that is the point of measuring rather
        than asserting the libraries are optional.
        """
        output = run('''
            from backend.tools.automl_training import automl_training_tool
            result = automl_training_tool({
                "file_path": "sample_data/generated/customer_churn.csv",
                "target_column": "churn", "excluded_columns": ["customer_id"]})
            print(result["best_model"]["metric"]["value"])
        ''')
        assert float(output.strip().splitlines()[-1]) == pytest.approx(0.7782, abs=0.001)

    def test_the_explanation_falls_back_rather_than_failing(self):
        """SHAP absent means a coefficient-based ranking, not no explanation."""
        output = run('''
            from backend.tools.automl_training import automl_training_tool
            from backend.tools.shap_explainer import shap_explainer_tool
            automl_training_tool({
                "file_path": "sample_data/generated/customer_churn.csv",
                "target_column": "churn", "excluded_columns": ["customer_id"]})
            explained = shap_explainer_tool({})
            print(explained["success"], explained["explanation_type"])
        ''')
        assert output.split()[0] == "True"
        assert "shap" not in output.split()[1]

    def test_the_leakage_check_is_unaffected(self):
        """It never used any of the four; this pins that it stays that way."""
        output = run('''
            from backend.tools.leakage_check import leakage_check_tool
            found = leakage_check_tool({
                "file_path": "sample_data/generated/customer_churn_leaky.csv",
                "target_column": "churn"})
            print(found["leakage_risk"], len(found["excluded_feature_candidates"]))
        ''')
        assert output.split()[:2] == ["high", "3"]
