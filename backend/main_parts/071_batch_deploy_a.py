        classes = STATE.get("target_encoder").classes_.tolist() if STATE.get("target_encoder") else None
        result["classes"] = classes
    return result

# ── 배치(CSV) 예측 ─────────────────────────────────────────
@app.post("/api/predict-batch")
async def predict_batch(file: UploadFile = File(...)):
    model = STATE.get("best_model"); X_train = STATE.get("X")
    if model is None: raise HTTPException(400, "모델 없음")
    raw, _ = decode_upload_bytes(await file.read())
    try:
        df_new, _ = read_table_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, f"CSV 파싱 실패: {e}")
    encoders  = STATE.get("encoders", {})
    cat_cols  = STATE.get("cat_cols", [])
    target_col = STATE.get("target_col")
    if target_col and target_col in df_new.columns:
        df_new = df_new.drop(columns=[target_col])
    X_new = df_new.copy()
    for col in cat_cols:
        if col in X_new.columns and col in encoders:
            X_new[col] = X_new[col].fillna("missing").astype(str)
            # 알 수 없는 값 → 첫 번째 클래스로 대체
            known = set(encoders[col].classes_)
            X_new[col] = X_new[col].apply(lambda v: v if v in known else encoders[col].classes_[0])
            X_new[col] = encoders[col].transform(X_new[col])
    for col in X_train.columns:
        if col not in X_new.columns:
            X_new[col] = 0
    X_new = X_new[X_train.columns].fillna(X_train.median(numeric_only=True))
    preds = model.predict(X_new).tolist()
    task_type = STATE.get("task_type", "classification")
    target_enc = STATE.get("target_encoder")
    rows = []
    for i, pred in enumerate(preds):
        row_r = {"row": i + 1}
        if task_type == "regression":
            row_r["prediction"] = round(float(pred), 4)
        else:
            row_r["prediction"] = int(pred)
            row_r["prediction_label"] = str(target_enc.inverse_transform([int(pred)])[0]) if target_enc else str(int(pred))
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(X_new.iloc[[i]])[0]
                row_r["confidence"] = round(float(proba.max()), 4)
        rows.append(row_r)
    return {"count": len(rows), "task_type": task_type, "results": rows}

# ── 모델 배포 ─────────────────────────────────────────────
@app.post("/api/deploy")
async def deploy_model(body: dict):
    import uuid
    model = STATE.get("best_model"); X = STATE.get("X")
    if model is None: raise HTTPException(400, "학습된 모델 없음")

    model_id  = str(uuid.uuid4())[:8]
    name      = body.get("name") or f"모델 ({STATE.get('best_model_name', 'Unknown')})"
    task_type = STATE.get("task_type", "classification")
    encoders  = STATE.get("encoders", {})
    cat_cols  = STATE.get("cat_cols", [])
    col_labels = STATE.get("col_labels", {})

    # 피처 예시값 (코드 스니펫 생성용)
    features_meta = []
    for col in X.columns:
        if col in cat_cols and col in encoders:
            features_meta.append({
                "name": col, "label": col_labels.get(col, col),
                "type": "categorical",
                "example": encoders[col].classes_[0],
                "options": encoders[col].classes_.tolist(),
            })
        else:
            features_meta.append({
                "name": col, "label": col_labels.get(col, col),
                "type": "numeric",
                "example": round(float(X[col].mean()), 3),
            })

    # 모델 번들 저장
    bundle = {
        "model": model,
        "encoders": encoders,
        "target_encoder": STATE.get("target_encoder"),
