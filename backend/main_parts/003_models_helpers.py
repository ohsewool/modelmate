REGRESSION_MODELS = {
    "Random Forest":    lambda: RandomForestRegressor(n_estimators=100, random_state=42),
    "Gradient Boosting":lambda: GradientBoostingRegressor(random_state=42),
    "Ridge Regression": lambda: Ridge(),
    "Decision Tree":    lambda: DecisionTreeRegressor(random_state=42),
}
if XGB_OK:
    REGRESSION_MODELS["XGBoost"]  = lambda: XGBRegressor(n_estimators=100, random_state=42, verbosity=0, n_jobs=1)
if LGBM_OK:
    REGRESSION_MODELS["LightGBM"] = lambda: LGBMRegressor(n_estimators=100, random_state=42, verbosity=-1, n_jobs=1)

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(rec, user_id=None):
    if user_id:
        conn = get_db()
        conn.execute(
            "INSERT INTO experiments (user_id, data, created_at) VALUES (?,?,?)",
            (user_id, json.dumps(rec, ensure_ascii=False), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        return
    h = load_history()
    h.append(rec)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(h, f, ensure_ascii=False, indent=2)

def auto_parse(raw):
    seps = [",", "\t", ";", "|"]
    best, score = ",", -1
    lines = [l for l in raw.splitlines() if l.strip()][:5]
    for s in seps:
        counts = [l.count(s) for l in lines]
        if counts and counts[0] > 0 and len(set(counts)) == 1 and counts[0] > score:
            best, score = s, counts[0]
    try:
        df = pd.read_csv(io.StringIO(raw), sep=best)
        if len(df.columns) == 1:
            df = pd.read_csv(io.StringIO(raw), sep=r"\s+", engine="python"); best = "space"
    except: df = None
    return df, {",":"쉼표", "\t":"탭", ";":"세미콜론", "|":"파이프", "space":"공백"}.get(best, best)

def encode_features(df, tgt):
    """카테고리형 컬럼 자동 인코딩 + 범용 전처리."""
    X = df.drop(columns=[tgt]).copy()
    auto_drop, auto_reasons = suggested_feature_drops(df, target_col=tgt)
    STATE["auto_drop_cols"] = auto_drop
    STATE["auto_drop_reasons"] = auto_reasons
    if auto_drop:
        X = X.drop(columns=[c for c in auto_drop if c in X.columns])
    for col in X.columns.tolist():
        if looks_like_datetime(X[col]):
            dt = pd.to_datetime(X[col], errors="coerce")
            X[col + "_year"] = dt.dt.year
            X[col + "_month"] = dt.dt.month
            X[col + "_day"] = dt.dt.day
            X = X.drop(columns=[col])
    cat_cols = X.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].fillna("missing").astype(str))
        encoders[col] = le
    X = X.apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    return X, cat_cols, encoders

def encode_target(y_raw):
    """타겟 컬럼 인코딩 및 task type 판별"""
    n_unique = y_raw.nunique()
    n_rows = max(len(y_raw), 1)
    is_text = pd.api.types.is_object_dtype(y_raw) or pd.api.types.is_string_dtype(y_raw)
    is_small_numeric_code = pd.api.types.is_numeric_dtype(y_raw) and n_unique <= 20 and (n_unique / n_rows) < 0.6
    is_cls = is_text or is_small_numeric_code
    le = None
    if is_text:
        le = LabelEncoder()
        y = pd.Series(le.fit_transform(y_raw.fillna("missing").astype(str)), name=y_raw.name)
    else:
        y = pd.to_numeric(y_raw, errors="coerce").fillna(y_raw.median() if pd.api.types.is_numeric_dtype(y_raw) else 0)
    return y, le, "classification" if is_cls else "regression", n_unique

# ── 업로드 ────────────────────────────────────────────────
