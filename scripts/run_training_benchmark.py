import asyncio
import importlib
import json
import sys
import warnings
from pathlib import Path

import pandas as pd
from sklearn.datasets import load_breast_cancer, load_diabetes, load_iris, load_linnerud, load_wine
from sklearn.datasets import make_classification, make_regression

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
m = importlib.import_module("backend.main")
warnings.filterwarnings("ignore")
m.save_history = lambda *args, **kwargs: None


def sklearn_cases():
    cases = []
    for name, loader, target in [
        ("sk_iris", load_iris, "target"),
        ("sk_wine", load_wine, "target"),
        ("sk_breast_cancer", load_breast_cancer, "target"),
        ("sk_diabetes_regression", load_diabetes, "target"),
        ("sk_linnerud_weight", load_linnerud, "Weight"),
    ]:
        bunch = loader(as_frame=True)
        df = bunch.frame.copy()
        if name == "sk_linnerud_weight":
            df = pd.concat([bunch.data, bunch.target[["Weight"]]], axis=1)
        cases.append((name, df, target))
    X, y = make_classification(n_samples=180, n_features=8, random_state=42)
    cases.append(("synthetic_fault", pd.DataFrame(X).assign(failure=y), "failure"))
    X, y = make_regression(n_samples=180, n_features=6, noise=10, random_state=42)
    cases.append(("synthetic_sales", pd.DataFrame(X).assign(sales=y), "sales"))
    return cases


def real_csv_cases():
    rows = []
    for path in sorted((ROOT / "tmp_datasets").glob("*.csv")):
        raw, _ = m.decode_upload_bytes(path.read_bytes())
        df, _ = m.read_table_text(raw, path.name)
        rows.append((path.stem, df, m.infer_default_target(df)))
    return rows


async def train_case(name, df, target):
    m.STATE.clear()
    m.STATE["df"] = df
    target = target if target in df.columns else m.infer_default_target(df)
    info = m.infer_target_category(df, target)
    await m.set_target({"target_col": target, "drop_cols": [], "col_labels": {}})
    cv = await m.run_cv(user=None)
    best = (cv.get("results") or [{}])[0]
    score = best.get("roc_auc", best.get("r2"))
    return {
        "name": name,
        "shape": list(df.shape),
        "target": str(target),
        "domain": info["dataset_domain"],
        "purpose": info["target_category"],
        "task_type": cv["task_type"],
        "best_model": cv["best_model"],
        "score": score,
        "status": "pass",
    }


async def main():
    results = []
    for name, df, target in sklearn_cases() + real_csv_cases():
        try:
            results.append(await train_case(name, df, target))
        except Exception as e:
            results.append({"name": name, "target": str(target), "status": "fail", "error": f"{type(e).__name__}: {e}"})
    summary = {
        "total_cases": len(results),
        "passed_cases": sum(r["status"] == "pass" for r in results),
        "failed_cases": sum(r["status"] == "fail" for r in results),
    }
    payload = {"summary": summary, "results": results}
    (ROOT / "training_benchmark_results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if summary["failed_cases"]:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
