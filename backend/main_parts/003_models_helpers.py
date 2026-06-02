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
    h = load_history(); h.append(rec)
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
    """카테고리형 컬럼 자동 인코딩, 수치형 결측치 처리"""
    X = df.drop(columns=[tgt]).copy()
    cat_cols = X.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].fillna("missing").astype(str))
        encoders[col] = le
    X = X.fillna(X.median(numeric_only=True))
    return X, cat_cols, encoders

def encode_target(y_raw):
    """타겟 컬럼 인코딩 및 task type 판별"""
    n_unique = y_raw.nunique()
    is_cls = y_raw.dtype == "object" or n_unique <= 20
    le = None
    if y_raw.dtype == "object":
        le = LabelEncoder()
        y = pd.Series(le.fit_transform(y_raw.fillna("missing").astype(str)), name=y_raw.name)
    else:
        y = y_raw.copy()
    return y, le, "classification" if is_cls else "regression", n_unique

# ── 업로드 ────────────────────────────────────────────────
