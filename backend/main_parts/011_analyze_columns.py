def _column_stats_for_prompt(df, n):
    num_df = df.select_dtypes(include="number")
    corr_with_last = {}
    if len(num_df.columns) >= 2:
        last_num = num_df.columns[-1]
        corr_with_last = num_df.corr()[last_num].drop(last_num).round(3).to_dict()

    col_info = []
    for col in df.columns:
        info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "n_unique": int(df[col].nunique()),
            "unique_ratio": round(df[col].nunique() / max(n, 1), 3),
            "missing_pct": round(df[col].isnull().mean() * 100, 1),
            "sample": [str(v) for v in df[col].dropna().head(5).tolist()],
        }
        if df[col].dtype in [np.float64, np.int64, np.float32, np.int32]:
            info["mean"] = round(float(df[col].mean()), 3)
            info["std"] = round(float(df[col].std()), 3)
            if col in corr_with_last:
                info["corr_with_last_col"] = float(corr_with_last[col])
        col_info.append(info)
    return col_info


def _rule_based_column_analysis(df, col_info, demo=False):
    n = len(df)
    suggested = [
        c["name"] for c in col_info
        if c["unique_ratio"] > 0.8
        or any(kw in c["name"].lower() for kw in ["id", "idx", "no", "uid", "serial", "code", "name"])
    ]
    target_col = df.columns[-1]
    numeric_targets = df[target_col].dtype in [np.float64, np.int64, np.float32, np.int32]
    task_type = "regression" if numeric_targets and df[target_col].nunique() > 12 else "classification"
    return {
        "target_suggestion": target_col,
        "drop_suggestions": [
            {"col": c, "reason": "식별자나 고유값이 많은 컬럼이라 예측에는 제외하는 것이 좋습니다."}
            for c in suggested
        ],
        "dataset_summary": f"{n}행 {len(df.columns)}열 데이터입니다. 외부 AI 호출 없이 규칙 기반으로 분석했습니다.",
        "task_type": task_type,
        "col_labels": {},
        "gemini_used": False,
        "demo_mode": demo,
    }


@app.post("/api/analyze-columns")
async def analyze_columns(demo: bool = False):
    df = STATE.get("df")
    if df is None:
        raise HTTPException(400, "데이터가 없습니다")

    col_info = _column_stats_for_prompt(df, len(df))
    if demo or not GEMINI_OK:
        return _rule_based_column_analysis(df, col_info, demo=demo)

    prompt = (
        "You are a machine-learning data preprocessing expert. "
        "Analyze these CSV columns and return JSON only, no extra text.\n\n"
        f"Column info: {json.dumps(col_info, ensure_ascii=False, default=str)}\n\n"
        "Return schema:\n"
        '{"target_suggestion":"column name",'
        '"drop_suggestions":[{"col":"column name","reason":"short Korean reason"}],'
        '"dataset_summary":"short Korean dataset summary",'
        '"task_type":"classification or regression",'
        '"col_labels":{"original_column":"short Korean label"}}'
    )

    raw = await ask_gemini(prompt)
    try:
        import re
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        result = json.loads(m.group()) if m else {}
        result["gemini_used"] = True
        result["demo_mode"] = False
        result["raw_preview"] = raw[:200] if raw else ""
        if "col_labels" not in result:
            result["col_labels"] = {}
        STATE["col_labels"] = result.get("col_labels", {})
        return result
    except Exception as e:
        fallback = _rule_based_column_analysis(df, col_info, demo=False)
        fallback.update({"parse_error": str(e), "raw_preview": raw[:200] if raw else ""})
        return fallback
