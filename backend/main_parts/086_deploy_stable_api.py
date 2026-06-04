        str(target_enc.inverse_transform([int(pred)])[0]) if target_enc else str(int(pred))
    )
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_in)[0]
        classes = target_enc.classes_.tolist() if target_enc else list(range(len(proba)))
        result["probabilities"] = {str(c): safe_round(p) for c, p in zip(classes, proba)}
        result["confidence"] = safe_round(float(proba.max()))
    return result


@app.post("/api/deploy/stable")
async def deploy_model_stable(body: dict):
    import uuid
    model, X = STATE.get("best_model"), STATE.get("X")
    if model is None or X is None:
        raise HTTPException(400, "먼저 모델 비교를 실행한 뒤 공유 모델을 만들어주세요.")
    model_id = str(uuid.uuid4())[:8]
    task_type = STATE.get("task_type", "classification")
    name = body.get("name") or f"ModelMate {STATE.get('best_model_name', 'model')}"
    encoders = STATE.get("encoders", {})
    cat_cols = STATE.get("cat_cols", [])
    col_labels = STATE.get("col_labels", {})
    features_meta = deployed_features_meta(X, encoders, cat_cols, col_labels)
    metrics = best_metrics_snapshot()
    bundle = {
        "model": model,
        "encoders": encoders,
        "target_encoder": STATE.get("target_encoder"),
        "feature_names": X.columns.tolist(),
        "feature_defaults": deployed_feature_defaults(X, cat_cols),
        "features_meta": features_meta,
        "cat_cols": cat_cols,
        "task_type": task_type,
        "target_col": STATE.get("target_col"),
        "best_model_name": STATE.get("best_model_name"),
        "metrics": metrics,
    }
    joblib.dump(bundle, deployed_model_path(model_id))
    conn = get_db()
    conn.execute(
        "INSERT INTO deployed_models (id,name,task_type,best_model_name,target_col,features,metrics,created_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (model_id, name, task_type, STATE.get("best_model_name"), STATE.get("target_col"),
         json.dumps(features_meta, ensure_ascii=False), json.dumps(metrics, ensure_ascii=False),
         datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return {
        "status": "ok",
        "model_id": model_id,
        "name": name,
        "task_type": task_type,
        "features": features_meta,
        "predict_url": f"/api/v2/{model_id}/predict",
    }


@app.post("/api/v2/{model_id}/predict")
async def v2_predict(model_id: str, body: dict):
    fp = deployed_model_path(model_id)
    if not os.path.exists(fp):
        raise HTTPException(404, f"Model not found: {model_id}")
    bundle = joblib.load(fp)
    features = body.get("features", body)
    if not isinstance(features, dict):
        raise HTTPException(400, "예측 요청은 features 객체 형태로 보내야 합니다.")
    X_in, warnings_out = build_deployed_row(bundle, features)
    result = deployed_prediction_payload(bundle, X_in)
    result.update({
        "status": "ok",
        "model_id": model_id,
        "input_features": X_in.iloc[0].to_dict(),
        "input_warnings": warnings_out,
        "target_col": bundle.get("target_col"),
        "best_model_name": bundle.get("best_model_name"),
    })
    return result
