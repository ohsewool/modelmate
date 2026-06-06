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
        "INSERT INTO deployed_models (id,name,task_type,best_model_name,target_col,features,metrics,created_at,user_id,dataset_ref)"
        " VALUES (?,?,?,?,?,?,?,?,?,?)",
        (model_id, name, task_type, STATE.get("best_model_name"),
         STATE.get("target_col"),
         json.dumps(features_meta, ensure_ascii=False),
         json.dumps(metrics, ensure_ascii=False),
         datetime.now().isoformat(),
         user["sub"] if user else None,
         json.dumps(STATE.get("current_dataset"), ensure_ascii=False))
    )
    conn.commit(); conn.close()
    return {"model_id": model_id, "name": name}

@app.get("/api/deployed")
async def list_deployed(user=Depends(get_current_user)):
    conn = get_db()
    if user and user.get("role") == "admin":
        rows = conn.execute("SELECT * FROM deployed_models ORDER BY created_at DESC").fetchall()
    elif user:
        rows = conn.execute(
            "SELECT * FROM deployed_models WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC",
            (user["sub"],),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM deployed_models WHERE user_id IS NULL ORDER BY created_at DESC").fetchall()
    conn.close()
    version_counts = {}
    version_by_id = {}
    for r in sorted(rows, key=lambda row: row["created_at"] or ""):
        key = (r["target_col"] or "target", r["best_model_name"] or "model")
        version_counts[key] = version_counts.get(key, 0) + 1
        version_by_id[r["id"]] = f"v{version_counts[key]}"
    out = []
    for r in rows:
        features = json.loads(r["features"])
        metrics = json.loads(r["metrics"])
        dataset_ref = json.loads(r["dataset_ref"]) if r["dataset_ref"] else None
        file_exists = os.path.exists(os.path.join(MODELS_DIR, f"{r['id']}.pkl"))
        metric_src = metrics.get("best_cv") if isinstance(metrics.get("best_cv"), dict) else metrics
        primary_score = metric_src.get("r2") if r["task_type"] == "regression" else metric_src.get("roc_auc", metric_src.get("accuracy"))
        lifecycle_status = "사용 가능" if file_exists else "재생성 필요"
        if file_exists and primary_score is None:
            lifecycle_status = "점수 확인 필요"
        out.append({
            "id": r["id"], "name": r["name"],
            "task_type": r["task_type"], "best_model_name": r["best_model_name"],
            "target_col": r["target_col"],
            "features": features,
            "metrics": metrics,
            "dataset_ref": dataset_ref,
            "owner_scope": "내 모델" if user and r["user_id"] == user.get("sub") else "공용 모델",
            "version_label": version_by_id.get(r["id"], "v1"),
            "created_at": r["created_at"],
            "file_exists": file_exists,
            "storage_status": "사용 가능" if file_exists else "파일 없음",
            "lifecycle_status": lifecycle_status,
            "primary_score": primary_score,
            "feature_count": len(features),
        })
    return out

@app.delete("/api/deployed/{model_id}")
async def delete_deployed(model_id: str, user=Depends(get_current_user)):
    fp = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if os.path.exists(fp): os.remove(fp)
    conn = get_db()
    row = conn.execute("SELECT user_id FROM deployed_models WHERE id=?", (model_id,)).fetchone()
    if row and row["user_id"] and (not user or (user.get("role") != "admin" and row["user_id"] != user.get("sub"))):
        conn.close()
        raise HTTPException(403, "이 모델을 삭제할 권한이 없습니다.")
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

