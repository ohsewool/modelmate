
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
