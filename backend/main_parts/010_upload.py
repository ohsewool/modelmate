@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    raw, encoding = decode_upload_bytes(await file.read())
    is_txt = file.filename.lower().endswith(".txt")
    try:
        df, sep = read_table_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, f"CSV parsing failed: {e}")
    if df is None:
        raise HTTPException(400, "파일 파싱 실패")
    ok, message, quality = validate_dataset_file(df, file.filename)
    if not ok:
        raise HTTPException(400, message)
    STATE["df"] = df
    STATE.pop("X", None); STATE.pop("y", None)
    STATE.pop("cv_results", None); STATE.pop("best_model", None)

    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    num_cols = df.select_dtypes(include=["number"]).columns.tolist()
    default_target = infer_default_target(df)
    suggested_drop, drop_reasons = suggested_feature_drops(df, target_col=default_target)

    return {
        "columns": df.columns.tolist(),
        "shape": list(df.shape),
        "converted": is_txt, "separator": sep,
        "encoding": encoding,
        "preview": df.head(8).fillna("").to_dict("records"),
        "default_target": default_target,
        "missing_total": int(df.isnull().sum().sum()),
        "dataset_quality": quality,
        "cat_cols": cat_cols,
        "num_cols": num_cols,
        "suggested_drop": suggested_drop,
        "drop_reasons": drop_reasons,
    }

