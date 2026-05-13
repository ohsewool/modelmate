from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.preprocessing import LabelEncoder
from pydantic import BaseModel
import json, os, io
from datetime import datetime

try:
    import shap; SHAP_OK = True
except: SHAP_OK = False

try:
    import optuna; optuna.logging.set_verbosity(optuna.logging.WARNING); OPTUNA_OK = True
except: OPTUNA_OK = False

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

    return {
        "columns": df.columns.tolist(),
        "shape": list(df.shape),
        "converted": is_txt, "separator": sep,
        "preview": df.head(8).fillna("").to_dict("records"),
        "default_target": df.columns[-1],
        "missing_total": int(df.isnull().sum().sum()),
        "cat_cols": cat_cols,
        "num_cols": num_cols,
    }

# ── 타깃 확정 & EDA ───────────────────────────────────────
@app.post("/api/set-target")
async def set_target(body: dict):
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "파일 없음")
    tgt = body["target_col"]
    if tgt not in df.columns: raise HTTPException(400, f"컬럼 없음: {tgt}")

    # 피처 인코딩
    X, cat_cols, encoders = encode_features(df, tgt)

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
        "missing_total": int(df.isnull().sum().sum()),
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
                  "task_type": STATE.get("task_type", "classification")})
    return {"results": results, "best_model": best_name,
            "feature_importance": fi,
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
    if X is None: raise HTTPException(400, "CV 먼저 실행")
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
    pred = int(model.predict(X.iloc[[ai]])[0])
    prob = model.predict_proba(X.iloc[[ai]])[0].tolist() if hasattr(model, "predict_proba") else [0, 0]
    local = sorted([{"feature": c, "shap_value": round(float(v), 4), "value": round(float(row[c]), 4)}
                    for c, v in zip(X.columns, sv[idx])],
                   key=lambda x: abs(x["shap_value"]), reverse=True)
    return {"local": local, "prediction": pred, "probability": prob, "sample_index": ai}

# ── 예측 ─────────────────────────────────────────────────
@app.get("/api/predictions")
async def get_predictions():
    preds = STATE.get("predictions"); X = STATE.get("X"); y = STATE.get("y")
    model = STATE.get("best_model")
    if preds is None: raise HTTPException(400, "예측 없음")
    has_proba = hasattr(model, "predict_proba")
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    if has_proba and is_binary:
        probs = model.predict_proba(X)[:, 1].tolist()
    elif has_proba:
        probs = model.predict_proba(X).max(axis=1).tolist()
    else:
        probs = [float(p) for p in preds]
    risk = sorted([{"id": i, "probability": round(float(pr), 4)}
                   for i, (p, pr) in enumerate(zip(preds, probs)) if p == 1],
                  key=lambda x: x["probability"], reverse=True)
    actual = y.values.tolist()
    wrong = [{"idx": i, "actual": int(actual[i]), "predicted": int(preds[i]),
               "probability": round(float(probs[i]), 4),
               "features": {c: round(float(X.iloc[i][c]), 4) for c in X.columns}}
             for i in range(len(preds)) if preds[i] != actual[i]][:3]
    fc = sum(1 for p in preds if p == 1)
    return {
        "total": len(preds), "failure_count": fc,
        "failure_rate": round(fc / len(preds) * 100, 2),
        "high_risk": sum(1 for p in probs if p >= 0.8),
        "risk_items": risk[:50], "misclassified": wrong,
        "accuracy": round(float(accuracy_score(y, preds)), 4),
        "f1": round(float(f1_score(y, preds, average="weighted")), 4),
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
    }

# ── HTML 리포트 ───────────────────────────────────────────
@app.get("/api/report/html", response_class=HTMLResponse)
async def html_report():
    cv = STATE.get("cv_results"); name = STATE.get("best_model_name")
    opt = STATE.get("optuna_result"); X = STATE.get("X"); y = STATE.get("y")
    preds = STATE.get("predictions"); cat_cols = STATE.get("cat_cols", [])
    task_type = STATE.get("task_type", "classification")
    if cv is None: raise HTTPException(400, "CV 먼저 실행")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    rows = "".join(f"<tr><td>{r['model']}</td><td>{r['accuracy']}</td>"
                   f"<td>{r['f1']}</td><td>{r['roc_auc']}</td></tr>" for r in cv)
    opt_sec = (f"<h2>Optuna 튜닝</h2><p>ROC-AUC: {opt['before_roc']} → "
               f"<b>{opt['after_roc']}</b> (+{opt['improvement']}%)</p>" if opt else "")
    perf_sec = (f"<h2>최종 성능</h2><p>Accuracy: {accuracy_score(y, preds):.4f}"
                f" | F1: {f1_score(y, preds, average='weighted'):.4f}</p>" if preds else "")
    enc_sec = (f"<h2>자동 인코딩 컬럼</h2><p>{', '.join(cat_cols)}</p>" if cat_cols else "")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<title>ModelMate Report</title>
<style>
  body{{font-family:'Segoe UI',sans-serif;max-width:960px;margin:40px auto;
        background:#f8fafc;color:#1e293b}}
  h1{{background:linear-gradient(135deg,#4f46e5,#0ea5e9);-webkit-background-clip:text;
      -webkit-text-fill-color:transparent;font-size:2rem;margin-bottom:4px}}
  h2{{color:#0f172a;margin-top:32px;font-size:1.1rem;border-left:3px solid #4f46e5;
      padding-left:12px}}
  table{{width:100%;border-collapse:collapse;margin:16px 0;border-radius:10px;
          overflow:hidden;box-shadow:0 2px 12px #0001}}
  th{{background:#4f46e5;color:white;padding:12px;text-align:left;font-size:.88rem}}
  td{{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:.88rem}}
  tr:first-child td{{font-weight:700;background:#f0f4ff}}
  .card{{display:inline-block;background:white;border:1px solid #e2e8f0;
          padding:16px 24px;border-radius:12px;margin:6px;
          box-shadow:0 1px 4px #0001;min-width:130px}}
  .cl{{font-size:.72rem;color:#64748b;text-transform:uppercase;letter-spacing:1px}}
  .cv{{font-size:1.7rem;font-weight:700;color:#4f46e5;margin-top:4px}}
  .footer{{margin-top:48px;color:#94a3b8;font-size:.78rem;text-align:center;
            border-top:1px solid #e2e8f0;padding-top:24px}}
</style></head><body>
  <h1>🤖 ModelMate Report</h1>
  <p style="color:#64748b;margin-top:0">생성: {now} | 작업 유형: {task_type}</p>
  <div class="card"><div class="cl">행 수</div><div class="cv">{len(X):,}</div></div>
  <div class="card"><div class="cl">피처 수</div><div class="cv">{len(X.columns)}</div></div>
  <div class="card"><div class="cl">인코딩 컬럼</div><div class="cv">{len(cat_cols)}</div></div>
  <div class="card"><div class="cl">최고 모델</div>
    <div class="cv" style="font-size:.95rem;margin-top:8px">{name}</div></div>
  {enc_sec}
  <h2>모델 비교 (3-fold CV)</h2>
  <table><tr><th>모델</th><th>Accuracy</th><th>F1</th><th>ROC-AUC</th></tr>{rows}</table>
  {opt_sec}{perf_sec}
  <div class="footer">Generated by ModelMate — {now}</div>
</body></html>"""

# ── 정적 파일 서빙 (React 빌드) ───────────────────────────
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
