def numeric_score(value, digits=4):
    try:
        return round(float(value), digits)
    except Exception:
        return None


def normalize_importances(values):
    arr = np.asarray(values, dtype=float).reshape(-1)
    total = float(np.abs(arr).sum())
    if total <= 0:
        return arr
    return arr / total


def coefficient_importance(model):
    if not hasattr(model, "coef_"):
        return None
    coef = np.abs(model.coef_)
    return coef.mean(axis=0) if getattr(coef, "ndim", 1) > 1 else coef


def correlation_importance(X, y):
    vals = []
    for col in X.columns:
        try:
            corr = pd.Series(X[col]).corr(pd.Series(y))
            vals.append(abs(float(corr)) if not pd.isna(corr) else 0.0)
        except Exception:
            vals.append(0.0)
    return np.array(vals, dtype=float)


def global_explanation_source(model, X, y):
    if hasattr(model, "feature_importances_"):
        return "feature_importance", np.asarray(model.feature_importances_, dtype=float)
    coef = coefficient_importance(model)
    if coef is not None:
        return "model_coefficient", np.asarray(coef, dtype=float)
    return "target_correlation", correlation_importance(X, y)


def global_explanation_items(limit=10):
    model, X, y = STATE.get("best_model"), STATE.get("X"), STATE.get("y")
    if model is None or X is None or y is None:
        raise HTTPException(400, "Run cross-validation first")
    source, values = global_explanation_source(model, X, y)
    norm = normalize_importances(values)
    items = []
    for col, raw, score in zip(X.columns, values, norm):
        items.append({
            "feature": col,
            "importance": numeric_score(score),
            "raw_importance": numeric_score(raw),
            "source": source,
        })
    items.sort(key=lambda row: abs(row["importance"] or 0), reverse=True)
    return source, items[:limit]


def prediction_payload(model, X_row):
    task_type = STATE.get("task_type", "classification")
    pred = model.predict(X_row)[0]
    if task_type == "regression":
        return {"prediction": numeric_score(pred), "task_type": task_type}
    result = {"prediction": int(pred), "task_type": task_type}
    target_enc = STATE.get("target_encoder")
    if target_enc is not None:
        result["prediction_label"] = str(target_enc.inverse_transform([int(pred)])[0])
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_row)[0]
        classes = target_enc.classes_.tolist() if target_enc is not None else list(range(len(proba)))
        result["probabilities"] = {str(c): numeric_score(p) for c, p in zip(classes, proba)}
        result["confidence"] = numeric_score(float(np.max(proba)))
    return result


def local_explanation_items(idx, limit=8):
    model, X, y = STATE.get("best_model"), STATE.get("X"), STATE.get("y")
    if model is None or X is None or y is None:
        raise HTTPException(400, "Run cross-validation first")
    if idx < 0 or idx >= len(X):
        raise HTTPException(400, "Sample index out of range")
    source, global_values = global_explanation_source(model, X, y)
    row = X.iloc[idx]
    centered = (row - X.mean(numeric_only=True)).fillna(0)
    spread = X.std(numeric_only=True).replace(0, 1).fillna(1)
    normalized_delta = centered.divide(spread, fill_value=0).fillna(0)
    weights = normalize_importances(global_values)
    items = []
    for col, delta, weight in zip(X.columns, normalized_delta.reindex(X.columns).fillna(0), weights):
        contribution = float(delta) * float(weight)
        items.append({
            "feature": col,
            "value": numeric_score(row[col]),
