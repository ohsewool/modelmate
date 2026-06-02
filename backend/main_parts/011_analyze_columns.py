@app.post("/api/analyze-columns")
async def analyze_columns():
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "데이터 없음")
    n = len(df)

    # 컬럼별 통계 수집
    num_df = df.select_dtypes(include="number")
    corr_with_last = {}
    if len(num_df.columns) >= 2:
        last_num = num_df.columns[-1]
        corr_with_last = num_df.corr()[last_num].drop(last_num).round(3).to_dict()

    col_info = []
    for col in df.columns:
        info = {
            "name":        col,
            "dtype":       str(df[col].dtype),
            "n_unique":    int(df[col].nunique()),
            "unique_ratio": round(df[col].nunique() / n, 3),
            "missing_pct": round(df[col].isnull().mean() * 100, 1),
            "sample":      [str(v) for v in df[col].dropna().head(5).tolist()],
        }
        # 수치형: 기초 통계 + 마지막 컬럼과의 상관관계 추가
        if df[col].dtype in [np.float64, np.int64, np.float32, np.int32]:
            info["mean"] = round(float(df[col].mean()), 3)
            info["std"]  = round(float(df[col].std()),  3)
            if col in corr_with_last:
                info["corr_with_last_col"] = float(corr_with_last[col])
        col_info.append(info)

    prompt = (
        "당신은 머신러닝 데이터 전처리 전문가입니다. "
        f"다음 CSV 데이터({n}행×{len(df.columns)}열)의 컬럼을 분석하고 "
        "반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이).\n\n"
        f"컬럼 정보 (unique_ratio: 전체 대비 고유값 비율, corr_with_last_col: 마지막 컬럼과의 상관관계):\n"
        f"{json.dumps(col_info, ensure_ascii=False, default=str)}\n\n"
        "응답 형식:\n"
        '{"target_suggestion":"타깃으로 가장 적합한 컬럼명",'
        '"drop_suggestions":[{"col":"컬럼명","reason":"제외 이유(한국어 1문장)"}],'
        '"dataset_summary":"데이터셋 특성 요약(한국어 2문장)",'
        '"task_type":"classification 또는 regression",'
        '"col_labels":{"영문컬럼명":"한국어이름(비전공자가 바로 이해할 수 있도록, 3~8글자)"}}\n\n'
        "판단 기준:\n"
        "1. unique_ratio > 0.8 이거나 이름이 ID/번호/코드/serial → 제외 (식별자)\n"
        "2. 타깃 후보와 corr_with_last_col > 0.8 이면서 타깃의 세부 원인으로 보이는 컬럼 → 제외 (데이터 누수)\n"
        "3. missing_pct > 50 → 제외 검토\n"
        "4. 예측에 의미있는 피처 → 포함\n"
        "5. 타깃: 이진/다중 분류값이거나 예측 목적에 가장 명확한 컬럼 1개 추천"
    )

    if not GEMINI_OK:
        suggested = [c["name"] for c in col_info
                     if c["unique_ratio"] > 0.8
                     or any(kw in c["name"].lower() for kw in ["id","idx","no","uid","serial","code","name"])]
        return {
            "target_suggestion": df.columns[-1],
            "drop_suggestions": [{"col": c, "reason": "ID성 컬럼으로 자동 감지됨"} for c in suggested],
            "dataset_summary": f"{n}행 {len(df.columns)}열 데이터입니다. Gemini API 키가 없어 규칙 기반으로 분석했습니다.",
            "task_type": "classification",
            "col_labels": {},
            "gemini_used": False,
        }

    raw = await ask_gemini(prompt)
    try:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        result = json.loads(m.group()) if m else {}
        result["gemini_used"] = True
        result["raw_preview"] = raw[:200] if raw else ""
        if "col_labels" not in result:
            result["col_labels"] = {}
        STATE["col_labels"] = result.get("col_labels", {})
        return result
    except Exception as e:
        return {"target_suggestion": df.columns[-1], "drop_suggestions": [],
                "dataset_summary": raw[:300] if raw else "", "task_type": "classification",
                "col_labels": {}, "gemini_used": True, "parse_error": str(e), "raw_preview": raw[:200] if raw else ""}

# ── 타깃 확정 & EDA ───────────────────────────────────────
