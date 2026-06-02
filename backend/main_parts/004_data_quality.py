import re
import warnings

def decode_upload_bytes(data: bytes):
    for enc in ("utf-8-sig", "utf-8", "cp949", "euc-kr", "latin1"):
        try:
            return data.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace"), "utf-8-replace"

def read_table_text(raw: str, filename: str = ""):
    if filename.lower().endswith(".txt"):
        return auto_parse(raw)
    try:
        return pd.read_csv(io.StringIO(raw)), "comma"
    except Exception:
        df, sep = auto_parse(raw)
        if df is None:
            raise
        return df, sep

def looks_like_datetime(series):
    if str(series.dtype).startswith("datetime"):
        return True
    if pd.api.types.is_numeric_dtype(series):
        return False
    sample = series.dropna().astype(str).head(50)
    if len(sample) < 5:
        return False
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        parsed = pd.to_datetime(sample, errors="coerce")
    return float(parsed.notna().mean()) >= 0.8

def suggested_feature_drops(df, target_col=None):
    n = max(len(df), 1)
    drops, reasons = [], {}
    id_words = {"id", "idx", "index", "no", "num", "code", "key",
                "name", "uuid", "uid", "serial", "number"}
    for col in df.columns:
        if col == target_col:
            continue
        s = df[col]
        compact = col.lower().replace(" ", "").replace("_", "").replace("-", "")
        parts = [p for p in re.split(r"[^a-zA-Z0-9]+", col.lower()) if p]
        unique_ratio = s.nunique(dropna=True) / n
        reason = None
        if s.nunique(dropna=True) <= 1:
            reason = "constant column"
        elif compact in id_words or any(p in id_words for p in parts):
            reason = "identifier-like column"
        elif compact.endswith("id") and len(compact) <= 7:
            reason = "identifier-like column"
        elif looks_like_datetime(s):
            reason = "datetime column"
        elif n >= 20 and unique_ratio > 0.95 and (s.dtype == "object" or not pd.api.types.is_numeric_dtype(s)):
            reason = "high-cardinality text column"
        else:
            numeric = pd.to_numeric(s, errors="coerce")
            if n >= 10 and numeric.notna().mean() > 0.9 and numeric.is_monotonic_increasing:
                diffs = numeric.dropna().diff().dropna()
                if len(diffs) and (diffs == 1).mean() > 0.9:
                    reason = "sequential identifier"
        if reason:
            drops.append(col)
            reasons[col] = reason
    return drops, reasons

def make_cv_failure(name, task_type, err):
    base = {"model": name, "status": "failed", "error_message": str(err)[:160]}
    if task_type == "regression":
        return {**base, "r2": None, "rmse": None, "mae": None}
    return {**base, "accuracy": None, "f1": None, "roc_auc": None}
