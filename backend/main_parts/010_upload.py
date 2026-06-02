@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    raw = (await file.read()).decode("utf-8", errors="replace")
    is_txt = file.filename.lower().endswith(".txt")
    if is_txt:
        df, sep = auto_parse(raw)
    else:
        df = pd.read_csv(io.StringIO(raw)); sep = "쉼표"
    if df is None:
        raise HTTPException(400, "파일 파싱 실패")
    STATE["df"] = df
    STATE.pop("X", None); STATE.pop("y", None)
    STATE.pop("cv_results", None); STATE.pop("best_model", None)

    # 카테고리/수치 컬럼 분류
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    num_cols = df.select_dtypes(include=["number"]).columns.tolist()

    # ID성 컬럼 자동 감지
    id_keywords = {"id", "idx", "index", "no", "num", "code", "key",
                   "번호", "이름", "name", "uuid", "uid", "serial"}
    n = len(df)
    suggested_drop = []
    for col in df.columns:
        col_lower = col.lower().replace(" ", "").replace("_", "").replace("-", "")
        # 이름 기반
        name_match = any(kw in col_lower for kw in id_keywords)
        # 고유값 비율 기반 (80% 이상)
        uniq_ratio = df[col].nunique() / n
        # 순차 정수 여부
        is_seq = False
        if df[col].dtype in [np.int64, np.int32, np.float64]:
            diffs = df[col].dropna().diff().dropna()
            is_seq = (diffs == 1).mean() > 0.9
        if name_match or uniq_ratio > 0.8 or is_seq:
            suggested_drop.append(col)

    return {
        "columns": df.columns.tolist(),
        "shape": list(df.shape),
        "converted": is_txt, "separator": sep,
        "preview": df.head(8).fillna("").to_dict("records"),
        "default_target": df.columns[-1],
        "missing_total": int(df.isnull().sum().sum()),
        "cat_cols": cat_cols,
        "num_cols": num_cols,
        "suggested_drop": suggested_drop,
    }

# ── Gemini 컬럼 분석 ─────────────────────────────────────
