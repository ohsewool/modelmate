from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, r2_score, mean_squared_error, mean_absolute_error
from sklearn.preprocessing import LabelEncoder
from pydantic import BaseModel
import json, os, io, asyncio
from datetime import datetime

try:
    import shap; SHAP_OK = True
except: SHAP_OK = False

try:
    import optuna; optuna.logging.set_verbosity(optuna.logging.WARNING); OPTUNA_OK = True
except: OPTUNA_OK = False

try:
    import google.generativeai as genai
    _GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if _GEMINI_KEY:
        genai.configure(api_key=_GEMINI_KEY)
        _GEMINI_MODEL = genai.GenerativeModel("gemini-2.0-flash")
        GEMINI_OK = True
    else:
        GEMINI_OK = False
except:
    GEMINI_OK = False

def _call_gemini_sync(prompt: str) -> str:
    try:
        r = _GEMINI_MODEL.generate_content(prompt)
        return r.text.strip()
    except:
        return ""

async def ask_gemini(prompt: str) -> str:
    if not GEMINI_OK: return ""
    return await asyncio.to_thread(_call_gemini_sync, prompt)

app = FastAPI(title="ModelMate API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

HISTORY_FILE = "experiment_history.json"
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
STATE: dict = {}

MODELS = {
    "Random Forest":       lambda: RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":   lambda: GradientBoostingClassifier(random_state=42),
    "Logistic Regression": lambda: LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree":       lambda: DecisionTreeClassifier(random_state=42),
}

REGRESSION_MODELS = {
    "Random Forest":    lambda: RandomForestRegressor(n_estimators=100, random_state=42),
    "Gradient Boosting":lambda: GradientBoostingRegressor(random_state=42),
    "Ridge Regression": lambda: Ridge(),
    "Decision Tree":    lambda: DecisionTreeRegressor(random_state=42),
}

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(rec):
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
        if "col_labels" not in result:
            result["col_labels"] = {}
        STATE["col_labels"] = result["col_labels"]
        return result
    except:
        return {"target_suggestion": df.columns[-1], "drop_suggestions": [],
                "dataset_summary": raw[:300] if raw else "", "task_type": "classification",
                "col_labels": {}, "gemini_used": True}

# ── 타깃 확정 & EDA ───────────────────────────────────────
@app.post("/api/set-target")
async def set_target(body: dict):
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "파일 없음")
    tgt = body["target_col"]
    if tgt not in df.columns: raise HTTPException(400, f"컬럼 없음: {tgt}")

    # 제외 컬럼 처리
    drop_cols = [c for c in body.get("drop_cols", []) if c in df.columns and c != tgt]
    df_use = df.drop(columns=drop_cols) if drop_cols else df
    STATE["drop_cols"] = drop_cols
    if body.get("col_labels"):
        STATE["col_labels"] = body["col_labels"]

    # 피처 인코딩
    X, cat_cols, encoders = encode_features(df_use, tgt)

    # 타겟 인코딩 + task type
    y_raw = df[tgt]
    y, target_le, task_type, n_unique = encode_target(y_raw)

    STATE.update({
        "target_col": tgt, "X": X, "y": y,
        "task_type": task_type,
        "cat_cols": cat_cols, "encoders": encoders,
        "target_encoder": target_le,
        "n_unique_target": n_unique,
    })

    # 상관관계 (수치형 컬럼만)
    num_df = X.copy(); num_df[tgt] = y
    cols = X.columns.tolist()
    corr_mat = num_df.corr(numeric_only=True).fillna(0)
    corr_data = [{"x": r, "y": c, "v": round(float(corr_mat.loc[r, c]), 3)}
                 for r in cols for c in cols if r in corr_mat.index and c in corr_mat.columns]

    # 분포 (최대 6개 피처, 이진/다중 분류 모두 지원)
    dists = {}
    unique_vals = sorted(y.unique())
    is_binary = len(unique_vals) == 2
    for col in X.columns[:6]:
        h, b = np.histogram(X[col].dropna(), bins=20)
        entry = {
            "bins": [round(float(v), 3) for v in b[:-1]],
            "total": [int(v) for v in h],
        }
        if is_binary:
            v0, v1 = unique_vals[0], unique_vals[1]
            norm_h, _ = np.histogram(X[col][y == v0].dropna(), bins=b)
            fail_h, _ = np.histogram(X[col][y == v1].dropna(), bins=b)
            entry["normal"] = [int(v) for v in norm_h]
            entry["failure"] = [int(v) for v in fail_h]
        else:
            entry["normal"] = [int(v) for v in h]
            entry["failure"] = [0] * len(h)
        dists[col] = entry

    class_dist = y.value_counts().to_dict()
    pos_rate = float(y.mean()) * 100 if task_type == "classification" and is_binary else 0
    # 타겟 레이블 복원 (표시용)
    label_map = {}
    if target_le is not None:
        label_map = {int(i): str(c) for i, c in enumerate(target_le.classes_)}

    return {
        "n_samples": len(X), "n_features": len(X.columns),
        "failure_rate": round(pos_rate, 2),
        "missing_total": int(df_use.isnull().sum().sum()),
        "dropped_cols": drop_cols,
        "features": X.columns.tolist(),
        "cat_cols": cat_cols,
        "corr_data": corr_data, "corr_cols": cols,
        "distributions": dists,
        "class_distribution": {str(k): int(v) for k, v in class_dist.items()},
        "label_map": label_map,
        "task_type": task_type,
        "n_unique_target": n_unique,
        "stats": df.describe(include="all").fillna(0).round(3).to_dict(),
    }

# ── CV ────────────────────────────────────────────────────
@app.post("/api/run-cv")
async def run_cv():
    X, y = STATE.get("X"), STATE.get("y")
    if X is None: raise HTTPException(400, "데이터 없음")
    task_type = STATE.get("task_type", "classification")

    if task_type == "regression":
        kf = KFold(n_splits=3, shuffle=True, random_state=42)
        results = []
        for name, fn in REGRESSION_MODELS.items():
            m = fn()
            try:
                r2   = float(cross_val_score(m, X, y, cv=kf, scoring="r2").mean())
                rmse = float(-cross_val_score(m, X, y, cv=kf, scoring="neg_root_mean_squared_error").mean())
                mae  = float(-cross_val_score(m, X, y, cv=kf, scoring="neg_mean_absolute_error").mean())
            except:
                r2, rmse, mae = 0.0, 0.0, 0.0
            results.append({"model": name, "r2": round(r2, 4), "rmse": round(rmse, 4), "mae": round(mae, 4)})
        results.sort(key=lambda x: x["r2"], reverse=True)
        best_name = results[0]["model"]
        bm = REGRESSION_MODELS[best_name](); bm.fit(X, y)
        preds = bm.predict(X).tolist()
        STATE.update({"cv_results": results, "best_model_name": best_name,
                      "best_model": bm, "predictions": preds,
                      "optuna_result": None, "shap_values": None})
        fi = []
        if hasattr(bm, "feature_importances_"):
            fi = sorted([{"feature": c, "importance": round(float(v), 4)}
                         for c, v in zip(X.columns, bm.feature_importances_)],
                        key=lambda x: x["importance"], reverse=True)
        save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                      "data_shape": list(X.shape), "target": STATE["target_col"],
                      "best_model": best_name, "results": results, "optuna_applied": False,
                      "task_type": "regression"})
        return {"results": results, "best_model": best_name,
                "feature_importance": fi, "task_type": "regression",
                "final_r2":   round(float(r2_score(y, preds)), 4),
                "final_rmse": round(float(np.sqrt(mean_squared_error(y, preds))), 4)}

    # ── 분류 ───────────────────────────────────────────────
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    results = []
    for name, fn in MODELS.items():
        m = fn()
        acc = float(cross_val_score(m, X, y, cv=cv, scoring="accuracy").mean())
        f1  = float(cross_val_score(m, X, y, cv=cv, scoring="f1_weighted").mean())
        scoring = "roc_auc" if is_binary else "roc_auc_ovr_weighted"
        try:
            roc = float(cross_val_score(m, X, y, cv=cv, scoring=scoring).mean())
        except:
            roc = acc
        results.append({"model": name,
                        "accuracy": round(acc, 4), "f1": round(f1, 4), "roc_auc": round(roc, 4)})
    results.sort(key=lambda x: x["roc_auc"], reverse=True)
    best_name = results[0]["model"]
    bm = MODELS[best_name](); bm.fit(X, y)
    preds = bm.predict(X).tolist()
    STATE.update({"cv_results": results, "best_model_name": best_name,
                  "best_model": bm, "predictions": preds,
                  "optuna_result": None, "shap_values": None})
    fi = []
    if hasattr(bm, "feature_importances_"):
        fi = sorted([{"feature": c, "importance": round(float(v), 4)}
                     for c, v in zip(X.columns, bm.feature_importances_)],
                    key=lambda x: x["importance"], reverse=True)
    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": results, "optuna_applied": False,
                  "task_type": "classification"})
    return {"results": results, "best_model": best_name,
            "feature_importance": fi, "task_type": "classification",
            "final_accuracy": round(float(accuracy_score(y, preds)), 4),
            "final_f1": round(float(f1_score(y, preds, average="weighted")), 4)}

# ── Optuna ────────────────────────────────────────────────
class OptunaReq(BaseModel):
    n_trials: int = 30

@app.post("/api/run-optuna")
async def run_optuna(req: OptunaReq):
    if not OPTUNA_OK: raise HTTPException(400, "optuna 미설치")
    X, y = STATE.get("X"), STATE.get("y")
    best_name = STATE.get("best_model_name")
    task_type = STATE.get("task_type", "classification")
    if X is None: raise HTTPException(400, "CV 먼저 실행")

    if task_type == "regression":
        before = STATE["cv_results"][0]["r2"]
        def obj(trial):
            if best_name == "Random Forest":
                m = RandomForestRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    max_depth=trial.suggest_int("max_depth", 3, 15),
                    min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                    random_state=42)
            elif best_name == "Gradient Boosting":
                m = GradientBoostingRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8), random_state=42)
            else: return before
            try:
                return cross_val_score(m, X, y,
                    cv=KFold(3, shuffle=True, random_state=42), scoring="r2").mean()
            except: return before
        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=req.n_trials, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        tuned = (RandomForestRegressor(**bp) if best_name == "Random Forest"
                 else GradientBoostingRegressor(**bp) if best_name == "Gradient Boosting"
                 else STATE["best_model"])
        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(tuned, X, y,
                cv=KFold(3, shuffle=True, random_state=42), scoring="r2").mean()), 4)
        except: after = before
        result = {"best_params": bp, "before_roc": before, "after_roc": after,
                  "improvement": round((after - before) * 100, 2), "metric_name": "R²"}
    else:
        n_unique = STATE.get("n_unique_target", 2)
        is_binary = n_unique == 2
        scoring = "roc_auc" if is_binary else "roc_auc_ovr_weighted"
        before = STATE["cv_results"][0]["roc_auc"]
        def obj(trial):
            if best_name == "Random Forest":
                m = RandomForestClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    max_depth=trial.suggest_int("max_depth", 3, 15),
                    min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                    random_state=42)
            elif best_name == "Gradient Boosting":
                m = GradientBoostingClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8), random_state=42)
            else: return before
            try:
                return cross_val_score(m, X, y,
                    cv=StratifiedKFold(3, shuffle=True, random_state=42),
                    scoring=scoring).mean()
            except: return before
        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=req.n_trials, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        tuned = (RandomForestClassifier(**bp) if best_name == "Random Forest"
                 else GradientBoostingClassifier(**bp) if best_name == "Gradient Boosting"
                 else STATE["best_model"])
        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(tuned, X, y,
                cv=StratifiedKFold(3, shuffle=True, random_state=42),
                scoring=scoring).mean()), 4)
        except: after = before
        result = {"best_params": bp, "before_roc": before,
                  "after_roc": after, "improvement": round((after - before) * 100, 2)}

    STATE.update({"best_model": tuned,
                  "predictions": tuned.predict(X).tolist(),
                  "optuna_result": result, "shap_values": None})
    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": STATE["cv_results"],
                  "optuna_applied": True, "tuned_roc": after})
    return result

# ── SHAP ─────────────────────────────────────────────────
@app.post("/api/run-shap")
async def run_shap():
    model = STATE.get("best_model"); X = STATE.get("X")
    if model is None: raise HTTPException(400, "CV 먼저 실행")
    if not SHAP_OK:
        if hasattr(model, "feature_importances_"):
            fi = sorted([{"feature": c, "shap_value": round(float(v), 4)}
                         for c, v in zip(X.columns, model.feature_importances_)],
                        key=lambda x: x["shap_value"], reverse=True)
            return {"type": "feature_importance", "global": fi}
        raise HTTPException(400, "SHAP 미설치")
    try:
        exp = shap.TreeExplainer(model)
        samp = X.sample(min(300, len(X)), random_state=42)
        sv = exp.shap_values(samp)
        if isinstance(sv, list): sv = sv[1]
        mean_sv = np.abs(sv).mean(axis=0)
        g = sorted([{"feature": c, "shap_value": round(float(v), 4)}
                    for c, v in zip(X.columns, mean_sv)],
                   key=lambda x: x["shap_value"], reverse=True)
        STATE["shap_values"] = sv.tolist()
        STATE["shap_sample_idx"] = samp.index.tolist()
        return {"type": "shap", "global": g}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/shap-local/{idx}")
async def shap_local(idx: int):
    sv = STATE.get("shap_values"); X = STATE.get("X")
    if sv is None: raise HTTPException(400, "SHAP 미계산")
    s_idx = STATE.get("shap_sample_idx", list(range(len(X))))
    if idx >= len(s_idx): raise HTTPException(400, "범위 초과")
    ai = s_idx[idx]; row = X.iloc[ai]
    model = STATE["best_model"]
    task_type = STATE.get("task_type", "classification")
    if task_type == "regression":
        pred_val = float(model.predict(X.iloc[[ai]])[0])
        pred = round(pred_val, 4)
        prob = [pred_val]
    else:
        pred = int(model.predict(X.iloc[[ai]])[0])
        prob = model.predict_proba(X.iloc[[ai]])[0].tolist() if hasattr(model, "predict_proba") else [0, 0]
    local = sorted([{"feature": c, "shap_value": round(float(v), 4), "value": round(float(row[c]), 4)}
                    for c, v in zip(X.columns, sv[idx])],
                   key=lambda x: abs(x["shap_value"]), reverse=True)
    return {"local": local, "prediction": pred, "probability": prob,
            "sample_index": ai, "task_type": task_type}

# ── 예측 ─────────────────────────────────────────────────
@app.get("/api/predictions")
async def get_predictions():
    preds = STATE.get("predictions"); X = STATE.get("X"); y = STATE.get("y")
    model = STATE.get("best_model")
    task_type = STATE.get("task_type", "classification")
    if preds is None: raise HTTPException(400, "예측 없음")

    if task_type == "regression":
        preds_arr = np.array(preds); y_arr = y.values
        r2   = round(float(r2_score(y_arr, preds_arr)), 4)
        rmse = round(float(np.sqrt(mean_squared_error(y_arr, preds_arr))), 4)
        mae  = round(float(mean_absolute_error(y_arr, preds_arr)), 4)
        residuals = [{"idx": i, "actual": round(float(y_arr[i]), 4),
                      "predicted": round(float(preds[i]), 4),
                      "error": round(float(abs(preds[i] - y_arr[i])), 4)}
                     for i in range(len(preds))]
        residuals.sort(key=lambda x: x["error"], reverse=True)
        return {"total": len(preds), "task_type": "regression",
                "r2": r2, "rmse": rmse, "mae": mae,
                "misclassified": [],
                "risk_items": [], "failure_count": 0,
                "high_risk": 0, "failure_rate": 0,
                "worst_residuals": residuals[:3]}

    has_proba = hasattr(model, "predict_proba")
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    if has_proba and is_binary:
        probs = model.predict_proba(X)[:, 1].tolist()
    elif has_proba:
        probs = model.predict_proba(X).max(axis=1).tolist()
    else:
        probs = [float(p) for p in preds]
    risk_raw = sorted([{"id": i, "probability": round(float(pr), 4)}
                       for i, (p, pr) in enumerate(zip(preds, probs)) if p == 1],
                      key=lambda x: x["probability"], reverse=True)

    # 상위 피처별 이상 여부 추가 (top 10만)
    top_feat_names = []
    feat_stats = {}
    if hasattr(model, "feature_importances_"):
        top_feat_names = [c for c, _ in sorted(
            zip(X.columns, model.feature_importances_),
            key=lambda x: x[1], reverse=True)][:3]
        for col in top_feat_names:
            feat_stats[col] = {"mean": float(X[col].mean()), "std": float(X[col].std())}

    def feat_level(val, col):
        if col not in feat_stats: return "normal"
        m, s = feat_stats[col]["mean"], feat_stats[col]["std"]
        if s == 0: return "normal"
        if val > m + s: return "high"
        if val < m - s: return "low"
        return "normal"

    risk = []
    for item in risk_raw[:50]:
        i = item["id"]
        feat_info = []
        for col in top_feat_names:
            val = float(X.iloc[i][col])
            feat_info.append({"feature": col, "value": round(val, 3),
                              "level": feat_level(val, col)})
        risk.append({**item, "top_features": feat_info})
    actual = y.values.tolist()
    wrong = [{"idx": i, "actual": int(actual[i]), "predicted": int(preds[i]),
               "probability": round(float(probs[i]), 4),
               "features": {c: round(float(X.iloc[i][c]), 4) for c in X.columns}}
             for i in range(len(preds)) if preds[i] != actual[i]][:3]
    fc = sum(1 for p in preds if p == 1)
    return {
        "total": len(preds), "failure_count": fc, "task_type": "classification",
        "failure_rate": round(fc / len(preds) * 100, 2),
        "high_risk": sum(1 for p in probs if p >= 0.8),
        "risk_items": risk[:50], "misclassified": wrong,
        "accuracy": round(float(accuracy_score(y, preds)), 4),
        "f1": round(float(f1_score(y, preds, average="weighted")), 4),
    }

# ── Agentic 자동 분석 ────────────────────────────────────
@app.post("/api/run-agent")
async def run_agent():
    X, y = STATE.get("X"), STATE.get("y")
    if X is None: raise HTTPException(400, "데이터 없음. 먼저 업로드 후 타깃을 선택하세요.")

    steps = []
    step_num = 0
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    scoring  = "roc_auc" if is_binary else "roc_auc_ovr_weighted"
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    # ── Step 1: CV ────────────────────────────────────────
    step_num += 1
    results = []
    for name, fn in MODELS.items():
        m = fn()
        acc = float(cross_val_score(m, X, y, cv=cv, scoring="accuracy").mean())
        f1  = float(cross_val_score(m, X, y, cv=cv, scoring="f1_weighted").mean())
        try:   roc = float(cross_val_score(m, X, y, cv=cv, scoring=scoring).mean())
        except: roc = acc
        results.append({"model": name, "accuracy": round(acc,4), "f1": round(f1,4), "roc_auc": round(roc,4)})
    results.sort(key=lambda x: x["roc_auc"], reverse=True)
    best_name = results[0]["model"]
    bm = MODELS[best_name](); bm.fit(X, y)
    preds = bm.predict(X).tolist()
    fi = sorted([{"feature": c, "importance": round(float(v),4)}
                 for c, v in zip(X.columns, bm.feature_importances_)],
                key=lambda x: x["importance"], reverse=True) if hasattr(bm,"feature_importances_") else []
    STATE.update({"cv_results": results, "best_model_name": best_name,
                  "best_model": bm, "predictions": preds,
                  "optuna_result": None, "shap_values": None})

    cv_comment = await ask_gemini(
        f"당신은 AutoML 시스템의 에이전트입니다. 다음 교차검증 결과를 분석하고 한국어로 2~3문장으로 설명하세요.\n"
        f"최고 모델: {best_name}, ROC-AUC: {results[0]['roc_auc']}\n"
        f"전체 결과: {json.dumps(results, ensure_ascii=False)}\n"
        f"타깃 컬럼: {STATE.get('target_col')}, 데이터: {X.shape[0]}행×{X.shape[1]}열\n"
        f"간결하고 전문적으로 해석하세요."
    ) or f"{best_name}이(가) ROC-AUC {results[0]['roc_auc']}로 4개 모델 중 최고 성능을 기록했습니다."

    steps.append({"step": step_num, "name": "모델 비교 (3-fold CV)", "status": "done",
                  "data": {"results": results, "feature_importance": fi[:5]},
                  "comment": cv_comment})

    # ── Step 2: 전략 결정 ─────────────────────────────────
    step_num += 1
    best_roc = results[0]["roc_auc"]
    run_optuna = best_roc < 0.85 and OPTUNA_OK

    decision_comment = await ask_gemini(
        f"AutoML 에이전트입니다. {best_name} 모델의 ROC-AUC {best_roc}를 평가하여 "
        f"Optuna 튜닝 {'진행' if run_optuna else '생략'} 결정을 내렸습니다. "
        f"이 결정 이유를 한국어 1~2문장으로 설명하세요."
    ) or (f"ROC-AUC {best_roc}가 기준치(0.85) 미만이므로 Optuna 튜닝을 진행합니다." if run_optuna
          else f"ROC-AUC {best_roc}가 충분히 높아 추가 튜닝 없이 다음 단계로 진행합니다.")

    steps.append({"step": step_num, "name": "성능 평가 및 전략 결정", "status": "done",
                  "decision": "optuna_run" if run_optuna else "optuna_skip",
                  "comment": decision_comment})

    # ── Step 3: Optuna (조건부) ───────────────────────────
    optuna_result = None
    if run_optuna:
        step_num += 1
        before = best_roc
        def obj(trial):
            if best_name == "Random Forest":
                m = RandomForestClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
                    max_depth=trial.suggest_int("max_depth",3,15),
                    min_samples_split=trial.suggest_int("min_samples_split",2,10),
                    random_state=42)
            elif best_name == "Gradient Boosting":
                m = GradientBoostingClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
                    learning_rate=trial.suggest_float("learning_rate",0.01,0.3),
                    max_depth=trial.suggest_int("max_depth",2,8), random_state=42)
            else: return before
            try: return cross_val_score(m, X, y,
                    cv=StratifiedKFold(3,shuffle=True,random_state=42),scoring=scoring).mean()
            except: return before

        study = optuna.create_study(direction="maximize")
        await asyncio.to_thread(study.optimize, obj, n_trials=20, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        tuned = (RandomForestClassifier(**bp) if best_name=="Random Forest"
                 else GradientBoostingClassifier(**bp) if best_name=="Gradient Boosting"
                 else bm)
        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(tuned, X, y,
                cv=StratifiedKFold(3,shuffle=True,random_state=42),scoring=scoring).mean()),4)
        except: after = before
        optuna_result = {"best_params": bp, "before_roc": before,
                         "after_roc": after, "improvement": round((after-before)*100,2)}
        STATE.update({"best_model": tuned, "predictions": tuned.predict(X).tolist(),
                      "optuna_result": optuna_result, "shap_values": None})

        opt_comment = await ask_gemini(
            f"Optuna 튜닝 결과: ROC-AUC {before} → {after} ({optuna_result['improvement']:+.2f}% 변화)\n"
            f"최적 파라미터: {json.dumps(bp, ensure_ascii=False)}\n"
            f"이 결과를 한국어 2문장으로 해석하세요."
        ) or f"튜닝 결과 ROC-AUC가 {before} → {after}로 {optuna_result['improvement']:+.2f}% 변화했습니다."

        steps.append({"step": step_num, "name": "Optuna 하이퍼파라미터 튜닝", "status": "done",
                      "data": optuna_result, "comment": opt_comment})

    # ── Step 4: SHAP ──────────────────────────────────────
    step_num += 1
    shap_global = []
    model = STATE["best_model"]
    if SHAP_OK:
        try:
            exp = shap.TreeExplainer(model)
            samp = X.sample(min(200, len(X)), random_state=42)
            sv = exp.shap_values(samp)
            if isinstance(sv, list): sv = sv[1]
            mean_sv = np.abs(sv).mean(axis=0)
            shap_global = sorted([{"feature": c, "shap_value": round(float(v),4)}
                                   for c, v in zip(X.columns, mean_sv)],
                                  key=lambda x: x["shap_value"], reverse=True)
            STATE["shap_values"] = sv.tolist()
            STATE["shap_sample_idx"] = samp.index.tolist()
        except: pass
    if not shap_global and hasattr(model, "feature_importances_"):
        shap_global = sorted([{"feature": c, "shap_value": round(float(v),4)}
                               for c, v in zip(X.columns, model.feature_importances_)],
                              key=lambda x: x["shap_value"], reverse=True)

    shap_comment = await ask_gemini(
        f"SHAP 분석 상위 피처: {json.dumps(shap_global[:5], ensure_ascii=False)}\n"
        f"타깃: {STATE.get('target_col')}\n"
        f"이 피처들이 예측에 미치는 영향을 한국어 2~3문장으로 해석하세요."
    ) or f"'{shap_global[0]['feature']}' 피처가 예측에 가장 큰 영향을 미치는 것으로 분석되었습니다." if shap_global else "SHAP 분석이 완료되었습니다."

    steps.append({"step": step_num, "name": "SHAP 설명 분석", "status": "done",
                  "data": {"global": shap_global[:6]}, "comment": shap_comment})

    # ── Step 5: 최종 요약 ─────────────────────────────────
    step_num += 1
    final_roc = optuna_result["after_roc"] if optuna_result else best_roc
    final_comment = await ask_gemini(
        f"ModelMate AutoML 분석 완료. 최종 결과를 요약해주세요.\n"
        f"- 데이터: {X.shape[0]}행×{X.shape[1]}열, 타깃: {STATE.get('target_col')}\n"
        f"- 최고 모델: {best_name}, 최종 ROC-AUC: {final_roc}\n"
        f"- Optuna: {'적용 (' + str(optuna_result['improvement']) + '% 개선)' if optuna_result else '생략'}\n"
        f"- 주요 피처: {', '.join(f['feature'] for f in shap_global[:3])}\n"
        f"사용자에게 전달할 최종 분석 요약을 한국어 3~4문장으로 작성하세요."
    ) or f"분석이 완료되었습니다. {best_name} 모델로 ROC-AUC {final_roc}를 달성했습니다."

    steps.append({"step": step_num, "name": "분석 완료", "status": "done",
                  "comment": final_comment})

    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": results,
                  "optuna_applied": bool(optuna_result), "agent_run": True,
                  "task_type": STATE.get("task_type", "classification")})

    return {"steps": steps, "cv_results": results, "best_model": best_name,
            "optuna_result": optuna_result, "shap_global": shap_global[:8],
            "gemini_used": GEMINI_OK}

# ── 컬럼 목록 (부분 재실행용) ─────────────────────────────
@app.get("/api/columns")
async def get_columns():
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "데이터 없음")
    return {
        "columns": df.columns.tolist(),
        "current_target": STATE.get("target_col"),
        "current_drop": STATE.get("drop_cols", []),
    }

# ── 기록 ─────────────────────────────────────────────────
@app.get("/api/history")
async def get_history(): return load_history()

@app.delete("/api/history")
async def clear_history():
    if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)
    return {"ok": True}

# ── 상태 ─────────────────────────────────────────────────
@app.get("/api/state")
async def get_state():
    return {
        "has_data":      STATE.get("df") is not None,
        "has_model":     STATE.get("best_model") is not None,
        "best_model":    STATE.get("best_model_name"),
        "target_col":    STATE.get("target_col"),
        "task_type":     STATE.get("task_type"),
        "cat_cols":      STATE.get("cat_cols", []),
        "cv_results":    STATE.get("cv_results"),
        "optuna_result": STATE.get("optuna_result"),
        "data_shape":    list(STATE["X"].shape) if STATE.get("X") is not None else None,
        "shap_ok":       SHAP_OK,
        "optuna_ok":     OPTUNA_OK,
        "col_labels":    STATE.get("col_labels", {}),
    }

# ── HTML 리포트 (PDF 인쇄 지원) ──────────────────────────
@app.get("/api/report/html", response_class=HTMLResponse)
async def html_report(autoprint: bool = False):
    cv = STATE.get("cv_results"); name = STATE.get("best_model_name")
    opt = STATE.get("optuna_result"); X = STATE.get("X"); y = STATE.get("y")
    preds = STATE.get("predictions"); cat_cols = STATE.get("cat_cols", [])
    task_type = STATE.get("task_type", "classification")
    shap_vals = STATE.get("shap_values"); model = STATE.get("best_model")
    if cv is None: raise HTTPException(400, "CV 먼저 실행")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    is_reg = task_type == "regression"

    # 모델 비교 테이블
    if is_reg:
        thead = "<tr><th>모델</th><th>R²</th><th>RMSE</th><th>MAE</th></tr>"
        tbody = "".join(f"<tr{'class=best' if i==0 else ''}><td>{r['model']}</td>"
                        f"<td>{r.get('r2','—')}</td><td>{r.get('rmse','—')}</td>"
                        f"<td>{r.get('mae','—')}</td></tr>"
                        for i, r in enumerate(cv))
    else:
        thead = "<tr><th>모델</th><th>Accuracy</th><th>F1</th><th>ROC-AUC</th></tr>"
        tbody = "".join(f"<tr{'class=best' if i==0 else ''}><td>{r['model']}</td>"
                        f"<td>{r.get('accuracy','—')}</td><td>{r.get('f1','—')}</td>"
                        f"<td>{r.get('roc_auc','—')}</td></tr>"
                        for i, r in enumerate(cv))

    # 주요 성능 지표
    if is_reg and preds:
        preds_arr = np.array(preds); y_arr = y.values
        perf_items = [
            ("R² Score", f"{r2_score(y_arr,preds_arr):.4f}"),
            ("RMSE",     f"{np.sqrt(mean_squared_error(y_arr,preds_arr)):.4f}"),
            ("MAE",      f"{mean_absolute_error(y_arr,preds_arr):.4f}"),
        ]
    elif preds:
        perf_items = [
            ("Accuracy", f"{accuracy_score(y,preds):.4f}"),
            ("F1 Score", f"{f1_score(y,preds,average='weighted'):.4f}"),
        ]
    else:
        perf_items = []

    perf_html = "".join(f"<div class='kpi'><div class='kl'>{k}</div><div class='kv'>{v}</div></div>"
                        for k, v in perf_items)

    # Optuna 섹션
    metric_name = opt.get("metric_name","ROC-AUC") if opt else "ROC-AUC"
    opt_html = (f"<h2>⚡ Optuna 하이퍼파라미터 튜닝</h2>"
                f"<p>{metric_name}: <b>{opt['before_roc']}</b> → <b style='color:#059669'>{opt['after_roc']}</b>"
                f" <span style='color:#059669'>(+{opt['improvement']}% 개선)</span></p>"
                f"<p style='font-size:.85rem;color:#64748b'>최적 파라미터: "
                + ", ".join(f"<b>{k}</b>={v}" for k,v in opt.get('best_params',{}).items())
                + "</p>") if opt else ""

    # 피처 중요도
    fi_html = ""
    if model and hasattr(model, "feature_importances_") and X is not None:
        fi = sorted(zip(X.columns, model.feature_importances_), key=lambda x: x[1], reverse=True)[:8]
        max_fi = fi[0][1] if fi else 1
        bars = "".join(
            f"<div style='display:flex;align-items:center;gap:10px;margin-bottom:6px'>"
            f"<span style='width:140px;font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"
            f"{'⭐ ' if i==0 else ''}{col}</span>"
            f"<div style='flex:1;background:#e2e8f0;border-radius:4px;height:10px'>"
            f"<div style='width:{imp/max_fi*100:.1f}%;background:#6366f1;border-radius:4px;height:10px'></div></div>"
            f"<span style='font-size:.83rem;width:44px;text-align:right;color:#6366f1'>{imp*100:.1f}%</span></div>"
            for i,(col,imp) in enumerate(fi))
        fi_html = f"<h2>📊 피처 중요도 Top 8</h2>{bars}"

    # 인코딩 섹션
    enc_html = (f"<h2>🔤 자동 인코딩 컬럼</h2><p style='font-size:.85rem;color:#475569'>"
                + ", ".join(f"<code>{c}</code>" for c in cat_cols) + "</p>") if cat_cols else ""

    autoprint_script = "<script>window.onload=()=>{window.print();}</script>" if autoprint else ""

    return f"""<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ModelMate 분석 리포트</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Segoe UI','Apple SD Gothic Neo',sans-serif;max-width:900px;
        margin:0 auto;padding:40px 32px;background:#f8fafc;color:#1e293b;line-height:1.6}}
  .header{{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#0ea5e9 100%);
            border-radius:16px;padding:28px 32px;color:white;margin-bottom:28px}}
  .header h1{{font-size:1.6rem;font-weight:800;letter-spacing:-.02em;margin-bottom:4px}}
  .header p{{font-size:.85rem;opacity:.8}}
  h2{{font-size:1rem;font-weight:700;color:#0f172a;margin:28px 0 12px;
      padding-left:12px;border-left:3px solid #6366f1}}
  .kpis{{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px}}
  .kpi{{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:14px 20px;
         min-width:120px;box-shadow:0 1px 4px rgba(0,0,0,.06)}}
  .kl{{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#64748b}}
  .kv{{font-size:1.5rem;font-weight:700;color:#4f46e5;margin-top:2px}}
  table{{width:100%;border-collapse:collapse;margin:12px 0;border-radius:10px;
          overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.06)}}
  th{{background:#6366f1;color:white;padding:11px 14px;text-align:left;font-size:.83rem;font-weight:600}}
  td{{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:.84rem}}
  tr.best td{{font-weight:700;background:#f0f4ff;color:#3730a3}}
  code{{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.8rem;color:#4f46e5}}
  .badge{{display:inline-block;background:#dcfce7;color:#059669;border-radius:6px;
           padding:2px 10px;font-size:.75rem;font-weight:700}}
  .footer{{margin-top:40px;color:#94a3b8;font-size:.75rem;text-align:center;
            border-top:1px solid #e2e8f0;padding-top:20px}}
  .no-print{{text-align:center;margin-bottom:20px}}
  .print-btn{{background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;
               padding:12px 28px;border-radius:10px;font-size:.9rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.35)}}
  .print-btn:hover{{opacity:.9}}
  @media print{{
    body{{background:white;padding:20px 24px}}
    .header{{-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:8px}}
    .no-print{{display:none}}
    th{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    tr.best td{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    .kpi{{box-shadow:none;border:1px solid #cbd5e1}}
    table{{page-break-inside:avoid}}
    h2{{page-break-after:avoid}}
  }}
</style></head><body>

<div class="no-print">
  <button class="print-btn" onclick="window.print()">📄 PDF로 저장 (Ctrl+P → PDF 선택)</button>
</div>

<div class="header">
  <h1>🤖 ModelMate 분석 리포트</h1>
  <p>생성일시: {now} &nbsp;·&nbsp; 작업 유형: {'회귀 (Regression)' if is_reg else '분류 (Classification)'}
     &nbsp;·&nbsp; 타깃: {STATE.get('target_col','—')}</p>
</div>

<h2>📋 데이터 요약</h2>
<div class="kpis">
  <div class="kpi"><div class="kl">데이터 행 수</div><div class="kv">{len(X):,}</div></div>
  <div class="kpi"><div class="kl">피처 수</div><div class="kv">{len(X.columns)}</div></div>
  <div class="kpi"><div class="kl">인코딩 컬럼</div><div class="kv">{len(cat_cols)}</div></div>
  <div class="kpi"><div class="kl">최고 모델</div>
    <div class="kv" style="font-size:1rem;padding-top:4px">{name}</div></div>
  {"<div class='kpi'><div class='kl'>Optuna 튜닝</div><div class='kv'><span class='badge'>적용</span></div></div>" if opt else ""}
</div>

{f'<h2>📈 최종 성능 지표</h2><div class="kpis">{perf_html}</div>' if perf_html else ""}

<h2>🏆 모델 비교 (3-fold CV)</h2>
<table>{thead}{tbody}</table>

{opt_html}
{fi_html}
{enc_html}

<div class="footer">Generated by ModelMate &nbsp;·&nbsp; {now}</div>
{autoprint_script}
</body></html>"""

# ── 정적 파일 서빙 (React 빌드) ───────────────────────────
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
