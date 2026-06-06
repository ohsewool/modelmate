import asyncio
import json
import os
import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "tmp_workspace_flow_qa.db"
os.environ["DB_PATH"] = str(DB_PATH)
os.environ["MODEL_MATE_DISABLE_GEMINI"] = "1"
sys.path.insert(0, str(ROOT))
import backend.main as m  # noqa: E402


USER = {
    "sub": "qa-user",
    "email": "qa@modelmate.local",
    "name": "QA User",
    "role": "user",
}


def sample_df():
    return pd.DataFrame({
        "machine_id": [f"M{i % 4}" for i in range(36)],
        "temperature": [55 + (i % 9) * 3 for i in range(36)],
        "vibration": [round(0.1 + (i % 6) * 0.15, 3) for i in range(36)],
        "pressure": [101 + (i % 5) * 2 for i in range(36)],
        "defect": ["fault" if i % 5 in (0, 1) else "normal" for i in range(36)],
    })


async def run_flow():
    df = sample_df()
    quality = {"score": 100, "reasons": []}
    domain = m.infer_target_category(df, "defect")
    saved = m.save_dataset_record(USER, "qa_manufacturing.csv", df, "defect", quality, domain)
    assert saved and saved["id"], "dataset metadata was not saved"
    assert m.STATE["current_dataset"]["filename"] == "qa_manufacturing.csv"

    m.STATE["df"] = df
    await m.set_target({"target_col": "defect", "drop_cols": ["machine_id"]})
    await m.run_cv(user=USER)
    history = await m.get_history(user=USER)
    assert history and history[0].get("dataset_ref", {}).get("id") == saved["id"]
    reuse = history[0].get("reuse_config") or {}
    assert reuse.get("target_col") == "defect", "history reuse target was not saved"
    assert "machine_id" in reuse.get("drop_cols", []), "history reuse drop columns were not saved"
    assert reuse.get("best_model"), "history reuse selected model was not saved"
    assert reuse.get("metric", {}).get("label"), "history reuse metric was not saved"

    deployed = await m.deploy_model_stable({"name": "QA saved model"}, user=USER)
    listed = await m.list_deployed(user=USER)
    match = next((row for row in listed if row["id"] == deployed["model_id"]), None)
    assert match, "saved model was not listed"
    assert match["dataset_ref"]["id"] == saved["id"]
    assert match["version_label"].startswith("v")
    assert match.get("storage_status"), "saved model storage status was not reported"
    assert match.get("lifecycle_status") == "사용 가능", "model lifecycle status was not reported"
    assert match.get("feature_count", 0) >= 1, "model feature count was not reported"
    example = {item["name"]: item["example"] for item in deployed["features"]}
    prediction = await m.v2_predict(deployed["model_id"], {"features": example})
    assert prediction["status"] == "ok"
    assert prediction["model_id"] == deployed["model_id"]
    assert prediction["target_col"] == "defect"
    return {
        "dataset_id": saved["id"],
        "history_dataset_id": history[0]["dataset_ref"]["id"],
        "reuse_target": reuse["target_col"],
        "reuse_model": reuse["best_model"],
        "model_id": deployed["model_id"],
        "version_label": match["version_label"],
        "storage_status": match["storage_status"],
        "lifecycle_status": match["lifecycle_status"],
        "feature_count": match["feature_count"],
        "predict_status": prediction["status"],
        "prediction_label": prediction.get("prediction_label", prediction.get("prediction")),
    }


def cleanup(model_id=None):
    if model_id:
        fp = Path(m.MODELS_DIR) / f"{model_id}.pkl"
        if fp.exists():
            fp.unlink()
    if DB_PATH.exists():
        DB_PATH.unlink()


def main():
    model_id = None
    try:
        result = asyncio.run(run_flow())
        model_id = result["model_id"]
        payload = {"status": "pass", "result": result}
        (ROOT / "workspace_flow_qa_results.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    finally:
        cleanup(model_id)


if __name__ == "__main__":
    main()
