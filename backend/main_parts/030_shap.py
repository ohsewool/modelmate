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
        samp = X.sample(min(300, len(X)), random_state=42)
        try:
            exp = shap.TreeExplainer(model)
            sv = exp.shap_values(samp)
            if isinstance(sv, list): sv = sv[1] if len(sv) > 1 else sv[0]
            mean_sv = np.abs(sv).mean(axis=0)
            shap_type = "shap"
        except Exception:
            # 트리 기반이 아닌 모델 (Logistic Regression, Ridge 등): 계수 기반 중요도
            if hasattr(model, "coef_"):
                coef = np.abs(model.coef_)
                mean_sv = coef.mean(axis=0) if coef.ndim > 1 else coef[0]
            elif hasattr(model, "feature_importances_"):
                mean_sv = model.feature_importances_
            else:
                mean_sv = np.ones(len(X.columns))
            sv = None
            shap_type = "feature_importance"
        g = sorted([{"feature": c, "shap_value": round(float(v), 4)}
                    for c, v in zip(X.columns, mean_sv)],
                   key=lambda x: x["shap_value"], reverse=True)
        if sv is not None:
            STATE["shap_values"] = sv.tolist()
        STATE["shap_sample_idx"] = samp.index.tolist()
        return {"type": shap_type, "global": g}
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
