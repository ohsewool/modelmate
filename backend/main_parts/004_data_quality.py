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

def validate_dataset_file(df, filename: str = ""):
    """Reject files that parse as text but are not useful tabular datasets."""
    allowed_ext = (".csv", ".txt", ".tsv")
    lowered = (filename or "").lower()
    if lowered and not lowered.endswith(allowed_ext):
        return False, "CSV, TSV, TXT 형식의 데이터 파일만 업로드할 수 있습니다.", {}

    if df is None or df.empty:
        return False, "데이터가 비어 있습니다. 행과 열이 있는 CSV 파일을 올려주세요.", {}

    rows, cols = df.shape
    reasons = []
    if rows < 5:
        reasons.append("행이 너무 적음")
    if cols < 2:
        reasons.append("열이 2개 미만")

    col_names = [str(c).strip() for c in df.columns]
    if any(not c or c.lower().startswith("unnamed:") for c in col_names):
        unnamed = sum(1 for c in col_names if not c or c.lower().startswith("unnamed:"))
        if unnamed >= max(1, cols // 2):
            reasons.append("컬럼명이 대부분 비어 있음")
    if len(set(col_names)) != len(col_names):
        reasons.append("중복 컬럼명 있음")

    non_empty_cols = int((df.notna().sum(axis=0) > 0).sum())
    varying_cols = int((df.nunique(dropna=True) > 1).sum())
    numeric_cols = len(df.select_dtypes(include=["number"]).columns)
    object_cols = len(df.select_dtypes(include=["object", "category"]).columns)
    if non_empty_cols < 2:
        reasons.append("값이 있는 열이 2개 미만")
    if varying_cols < 2:
        reasons.append("변화가 있는 열이 2개 미만")

    text_sample = df.select_dtypes(include=["object", "category"]).head(80).astype(str)
    text_values = [
        str(v).strip()
        for v in text_sample.to_numpy().ravel().tolist()
        if pd.notna(v) and str(v).strip() and str(v).strip().lower() not in {"nan", "none"}
    ]
    long_text_ratio = 0.0
    avg_text_len = 0.0
    if text_values:
        lengths = [len(v) for v in text_values]
        avg_text_len = sum(lengths) / len(lengths)
        long_text_ratio = sum(1 for n in lengths if n >= 60) / len(lengths)

    if cols <= 2 and numeric_cols == 0 and text_values and (avg_text_len >= 40 or long_text_ratio >= 0.35):
        reasons.append("문장형 텍스트가 대부분")
    if lowered.endswith(".txt") and numeric_cols == 0 and object_cols == cols and text_values and avg_text_len >= 25:
        reasons.append("TXT 문서형 내용에 가까움")
    if object_cols == cols and numeric_cols == 0 and text_values and avg_text_len >= 80:
        reasons.append("표 데이터보다 문서/대화 내용에 가까움")
    if cols >= 3 and object_cols >= max(3, cols - 1) and numeric_cols <= 1 and text_values:
        if avg_text_len >= 35 or long_text_ratio >= 0.35:
            reasons.append("긴 설명 열이 대부분")
    date_like_cols = 0
    for col in df.columns:
        series = df[col]
        if isinstance(series, pd.DataFrame):
            continue
        if looks_like_datetime(series):
            date_like_cols += 1
    if cols >= 2 and date_like_cols == cols:
        reasons.append("날짜 컬럼만 있음")

    id_like_cols = 0
    id_tokens = ["id", "code", "serial", "name", "address", "uuid", "uid", "번호", "이름", "주소"]
    for col in df.columns:
        name = str(col).lower()
        series = df[col]
        if isinstance(series, pd.DataFrame):
            continue
        unique_ratio = series.nunique(dropna=True) / max(rows, 1)
        if unique_ratio >= 0.9 and any(token in name for token in id_tokens):
            id_like_cols += 1
    if cols >= 3 and id_like_cols >= max(3, cols - 1):
        reasons.append("ID/이름 위주의 비예측형 목록")

    score = 100
    score -= 35 if rows < 5 else 0
    score -= 30 if cols < 2 else 0
    score -= 20 if varying_cols < 2 else 0
    score -= 20 if non_empty_cols < 2 else 0
    score -= 25 if "문장형 텍스트가 대부분" in reasons else 0
    score -= 25 if "TXT 문서형 내용에 가까움" in reasons else 0
    score -= 25 if "표 데이터보다 문서/대화 내용에 가까움" in reasons else 0
    score -= 20 if "긴 설명 열이 대부분" in reasons else 0
    score -= 25 if "날짜 컬럼만 있음" in reasons else 0
    score -= 30 if "ID/이름 위주의 비예측형 목록" in reasons else 0
    score = max(0, score)

    info = {
        "rows": int(rows),
        "columns": int(cols),
        "non_empty_columns": non_empty_cols,
        "varying_columns": varying_cols,
        "numeric_columns": int(numeric_cols),
        "text_columns": int(object_cols),
        "avg_text_length": round(avg_text_len, 2),
        "long_text_ratio": round(long_text_ratio, 3),
        "score": int(score),
        "reasons": reasons,
    }
    info.update(prediction_readiness_profile(df, info))

    if reasons:
        msg = "데이터셋으로 보기 어렵습니다: " + ", ".join(reasons) + ". 행/열이 있는 CSV 데이터셋을 올려주세요."
        return False, msg, info
    return True, "업로드 가능한 데이터셋입니다.", info

def prediction_readiness_profile(df, info):
    rows = int(info.get("rows") or 0)
    cols = int(info.get("columns") or 0)
    numeric = int(info.get("numeric_columns") or 0)
    text_cols = int(info.get("text_columns") or 0)
    varying = int(info.get("varying_columns") or 0)
    warnings_list = []
    if rows < 30:
        warnings_list.append("행 수가 적어 점수 변동이 클 수 있습니다.")
    if numeric == 0 and text_cols >= max(2, cols - 1):
        warnings_list.append("숫자 정보가 없어 분류는 가능하지만 근거가 약할 수 있습니다.")
    if varying <= max(2, cols // 2):
        warnings_list.append("변화 있는 열이 적어 모델이 배울 패턴이 제한적입니다.")
    high_id_like = 0
    for col in df.columns:
        s = df[col]
        if isinstance(s, pd.DataFrame):
            continue
        unique_ratio = s.nunique(dropna=True) / max(rows, 1)
        name = str(col).lower()
        if unique_ratio > 0.9 and any(tok in name for tok in ["id", "code", "번호", "명", "주소", "name"]):
            high_id_like += 1
    if high_id_like >= max(2, cols // 3):
        warnings_list.append("식별자나 이름처럼 외우기 쉬운 열이 많아 제외 확인이 필요합니다.")
    if not warnings_list:
        label = "학습 가능"
        guide = "예측할 값과 참고 정보가 있어 모델 비교를 진행할 수 있습니다."
    elif len(warnings_list) <= 2:
        label = "검토 권장"
        guide = "분석은 가능하지만 맞힐 값과 제외 열을 한 번 확인하는 것이 좋습니다."
    else:
        label = "주의 필요"
        guide = "업로드는 가능하지만 발표에서는 데이터 의미와 한계를 먼저 설명하세요."
    return {
        "readiness_label": label,
        "readiness_guide": guide,
        "warnings": warnings_list,
    }

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
    target_compact = str(target_col or "").lower().replace(" ", "").replace("_", "").replace("-", "")
    target_base = target_compact
    for suffix in ["코드명", "codename", "labelname", "name", "명", "label"]:
        if target_base.endswith(suffix):
            target_base = target_base[:-len(suffix)]
    for col in df.columns:
        if col == target_col:
            continue
        s = df[col]
        col_text = str(col).lower()
        compact = col_text.replace(" ", "").replace("_", "").replace("-", "")
        parts = [p for p in re.split(r"[^a-zA-Z0-9]+", col_text) if p]
        unique_ratio = s.nunique(dropna=True) / n
        reason = None
        if s.nunique(dropna=True) <= 1:
            reason = "constant column"
        elif compact in id_words or any(p in id_words for p in parts):
            reason = "identifier-like column"
        elif compact.endswith("id") and len(compact) <= 7:
            reason = "identifier-like column"
        elif target_base and compact in {target_base, target_base + "코드", target_base + "code", target_base + "id"}:
            reason = "target-leakage-like column"
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
