        "feature_names": X.columns.tolist(),
        "cat_cols": cat_cols,
        "task_type": task_type,
        "target_col": STATE.get("target_col"),
    }
    joblib.dump(bundle, os.path.join(MODELS_DIR, f"{model_id}.pkl"))

    # 메트릭
    cv = STATE.get("cv_results", [])
    metrics = cv[0] if cv else {}

    conn = get_db()
    conn.execute(
        "INSERT INTO deployed_models (id,name,task_type,best_model_name,target_col,features,metrics,created_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (model_id, name, task_type, STATE.get("best_model_name"),
         STATE.get("target_col"),
         json.dumps(features_meta, ensure_ascii=False),
         json.dumps(metrics, ensure_ascii=False),
         datetime.now().isoformat())
    )
    conn.commit(); conn.close()
    return {"model_id": model_id, "name": name}

@app.get("/api/deployed")
async def list_deployed():
    conn = get_db()
    rows = conn.execute("SELECT * FROM deployed_models ORDER BY created_at DESC").fetchall()
    conn.close()
    return [{
        "id": r["id"], "name": r["name"],
        "task_type": r["task_type"], "best_model_name": r["best_model_name"],
        "target_col": r["target_col"],
        "features": json.loads(r["features"]),
        "metrics": json.loads(r["metrics"]),
        "created_at": r["created_at"],
        "file_exists": os.path.exists(os.path.join(MODELS_DIR, f"{r['id']}.pkl")),
    } for r in rows]

@app.delete("/api/deployed/{model_id}")
async def delete_deployed(model_id: str):
    fp = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if os.path.exists(fp): os.remove(fp)
    conn = get_db()
    conn.execute("DELETE FROM deployed_models WHERE id=?", (model_id,))
    conn.commit(); conn.close()
    return {"ok": True}

@app.post("/api/v1/{model_id}/predict")
async def v1_predict(model_id: str, body: dict):
    fp = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if not os.path.exists(fp):
        raise HTTPException(404, f"모델을 찾을 수 없습니다: {model_id}")
    bundle = joblib.load(fp)
    model  = bundle["model"]
    enc    = bundle["encoders"]
    cat_cols = bundle["cat_cols"]
    feats  = bundle["feature_names"]
    task   = bundle["task_type"]
    tgt_enc = bundle["target_encoder"]

    features = body.get("features", {})
    row = {}
    for col in feats:
        val = features.get(col)
        if val is None:
            row[col] = 0
        elif col in cat_cols and col in enc:
            known = set(enc[col].classes_)
            sv = str(val) if str(val) in known else enc[col].classes_[0]
            row[col] = int(enc[col].transform([sv])[0])
        else:
            try:   row[col] = float(val)
            except: row[col] = 0

    X_in = pd.DataFrame([row], columns=feats)
    pred = model.predict(X_in)[0]
    result = {"model_id": model_id, "task_type": task}

    if task == "regression":
        result["prediction"] = round(float(pred), 4)
    else:
        result["prediction"] = int(pred)
        result["prediction_label"] = (
            str(tgt_enc.inverse_transform([int(pred)])[0]) if tgt_enc else str(int(pred))
        )
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X_in)[0]
            classes = tgt_enc.classes_.tolist() if tgt_enc else list(range(len(proba)))
            result["probabilities"] = {str(c): round(float(p), 4) for c, p in zip(classes, proba)}
            result["confidence"] = round(float(proba.max()), 4)
    return result

