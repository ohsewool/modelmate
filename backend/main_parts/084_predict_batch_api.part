@app.post("/api/predict/batch")
async def predict_batch_stable(file: UploadFile = File(...), limit: int = 3):
    model = STATE.get("best_model")
    if model is None:
        raise HTTPException(400, "Run cross-validation first")

    raw, encoding = decode_upload_bytes(await file.read())
    try:
        df_new, separator = read_table_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, f"CSV parsing failed: {e}")

    target_col = STATE.get("target_col")
    dropped_target = False
    if target_col and target_col in df_new.columns:
        df_new = df_new.drop(columns=[target_col])
        dropped_target = True

    max_rows = max(1, min(int(limit), 10))
    results = []
    warnings_total = 0
    for idx, row in df_new.iterrows():
        features = row.to_dict()
        X_input, row_warnings = build_prediction_row(features)
        pred = prediction_result_payload(model, X_input)
        factors = single_prediction_factors(X_input, limit=max_rows)
        warnings_total += len(row_warnings)
        results.append({
            "row": int(idx) + 1,
            "prediction": pred.get("prediction"),
            "prediction_label": pred.get("prediction_label"),
            "probabilities": pred.get("probabilities"),
            "confidence": pred.get("confidence"),
            "input_warnings": row_warnings,
            "top_factors": factors,
        })

    return {
        "status": "ok",
        "count": len(results),
        "task_type": STATE.get("task_type", "classification"),
        "encoding": encoding,
        "separator": separator,
        "dropped_target": dropped_target,
        "warning_count": warnings_total,
        "results": results,
    }
