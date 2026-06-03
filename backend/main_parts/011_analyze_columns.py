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


def infer_target_category(df, target_col):
    series = df[target_col].dropna()
    name = str(target_col).lower()
    values = {str(v).strip().lower() for v in series.head(200).tolist()}
    unique_count = int(series.nunique()) if len(series) else 0
    is_numeric = df[target_col].dtype in [np.float64, np.int64, np.float32, np.int32]
    is_binary_like = unique_count <= 2
    text = " ".join([name, *list(values)[:30]])

    fault_words = ["fault", "failure", "fail", "defect", "error", "abnormal", "ng", "불량", "고장", "이상", "오류"]
    pass_words = ["pass", "passed", "ok", "good", "normal", "accept", "result", "판정", "합격", "양품", "정상"]
    churn_words = ["churn", "leave", "cancel", "retention", "탈퇴", "이탈", "해지"]
    price_words = ["price", "cost", "amount", "sales", "revenue", "fare", "요금", "가격", "금액", "매출"]
    score_words = ["score", "grade", "rating", "rank", "점수", "등급", "평점"]

    if any(word in text for word in fault_words):
        label = "고장/불량 분류" if not is_binary_like else "고장 여부"
        reason = "컬럼명이나 값에 고장, 불량, 이상 상태와 관련된 표현이 보입니다."
    elif any(word in text for word in pass_words) or is_binary_like:
        label = "합격 여부" if is_binary_like else "상태 분류"
        reason = "정답 값이 두 종류에 가깝거나 합격/정상 판정과 관련된 표현이 보입니다."
    elif any(word in text for word in churn_words):
        label = "이탈 여부"
        reason = "고객 이탈이나 해지 여부를 나타내는 표현이 보입니다."
    elif any(word in text for word in price_words):
        label = "금액 예측"
        reason = "가격, 금액, 매출처럼 숫자 크기를 예측하는 컬럼으로 보입니다."
    elif any(word in text for word in score_words):
        label = "점수/등급 예측"
        reason = "점수나 등급을 예측하는 컬럼명으로 보입니다."
    elif is_numeric and unique_count > 12:
        label = "수치 예측"
        reason = "정답 값이 여러 숫자 값으로 나뉘어 연속적인 수치를 예측하는 형태입니다."
    else:
        label = "상태 분류"
        reason = "정답 값이 몇 가지 종류로 나뉘어 있어 분류 문제로 보입니다."

    return {
        "target_category": label,
        "target_category_reason": reason,
        "target_unique_count": unique_count,
    }


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
    target_category = infer_target_category(df, target_col)
    return {
        "target_suggestion": target_col,
        "drop_suggestions": [
            {"col": c, "reason": "식별자나 고유값이 많은 컬럼이라 예측에는 제외하는 것이 좋습니다."}
            for c in suggested
        ],
        "dataset_summary": f"{n}행 {len(df.columns)}열 데이터입니다. {target_category['target_category']} 문제로 보고 분석합니다.",
        "task_type": task_type,
        **target_category,
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
        target_col = result.get("target_suggestion")
        if target_col not in df.columns:
            target_col = df.columns[-1]
        result.update(infer_target_category(df, target_col))
        STATE["col_labels"] = result.get("col_labels", {})
        return result
    except Exception as e:
        fallback = _rule_based_column_analysis(df, col_info, demo=False)
        fallback.update({"parse_error": str(e), "raw_preview": raw[:200] if raw else ""})
        return fallback
