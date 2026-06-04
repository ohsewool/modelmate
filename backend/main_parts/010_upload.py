@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    raw, encoding = decode_upload_bytes(await file.read())
    is_txt = file.filename.lower().endswith(".txt")
    try:
        df, sep = read_table_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, {
            "message": "표 형태의 CSV로 읽을 수 없습니다.",
            "tips": ["쉼표, 탭, 세미콜론처럼 일정한 구분자가 있는지 확인하세요.", "엑셀 파일은 CSV로 저장한 뒤 다시 올려주세요."],
            "raw_error": str(e),
        })
    if df is None:
        raise HTTPException(400, {"message": "파일 내용을 데이터 표로 변환하지 못했습니다."})
    ok, message, quality = validate_dataset_file(df, file.filename)
    if not ok:
        raise HTTPException(400, {
            "message": message,
            "quality": quality,
            "tips": [
                "첫 행에는 컬럼명이 들어가야 합니다.",
                "예측할 값과 참고할 정보가 각각 하나 이상 있어야 합니다.",
                "잡담, 문서, 긴 문장만 있는 파일은 AutoML 학습용 데이터셋으로 보기 어렵습니다.",
            ],
        })
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

