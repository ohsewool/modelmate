def build_prediction_row(features):
    X_train = STATE.get("X")
    if X_train is None:
        raise HTTPException(400, "Run cross-validation first")
    encoders = STATE.get("encoders", {})
    cat_cols = set(STATE.get("cat_cols", []))
    warnings_out = []
    row = {}
    for col in X_train.columns:
        raw = features.get(col)
        if raw is None or raw == "":
            default = 0 if col in cat_cols else float(X_train[col].mean())
            row[col] = default
            warnings_out.append({"feature": col, "type": "missing", "used": safe_round(default)})
        elif col in cat_cols and col in encoders:
            known = set(encoders[col].classes_)
            text = str(raw)
            if text not in known:
                text = encoders[col].classes_[0]
                warnings_out.append({"feature": col, "type": "unknown_category", "used": text})
            row[col] = int(encoders[col].transform([text])[0])
        else:
            try:
                row[col] = float(raw)
            except Exception:
                default = float(X_train[col].mean())
                row[col] = default
                warnings_out.append({"feature": col, "type": "invalid_number", "used": safe_round(default)})
    X_input = pd.DataFrame([row], columns=X_train.columns)
    return X_input, warnings_out


def probability_payload(model, X_input):
    if not hasattr(model, "predict_proba"):
        return {}
    proba = model.predict_proba(X_input)[0]
    target_enc = STATE.get("target_encoder")
    labels = target_enc.classes_.tolist() if target_enc is not None else list(range(len(proba)))
    return {
        "probabilities": {str(label): safe_round(p) for label, p in zip(labels, proba)},
        "confidence": safe_round(float(np.max(proba))),
    }


def prediction_result_payload(model, X_input):
    task_type = STATE.get("task_type", "classification")
    pred = model.predict(X_input)[0]
    result = {"task_type": task_type}
    if task_type == "regression":
        result["prediction"] = safe_round(pred)
        return result
    result["prediction"] = int(pred)
    target_enc = STATE.get("target_encoder")
    if target_enc is not None:
        result["prediction_label"] = str(target_enc.inverse_transform([int(pred)])[0])
        result["class_labels"] = target_enc.classes_.tolist()
    else:
        result["prediction_label"] = str(int(pred))
    result.update(probability_payload(model, X_input))
    return result


def single_prediction_factors(X_input, limit=5):
    model, X, y = STATE.get("best_model"), STATE.get("X"), STATE.get("y")
    if model is None or X is None or y is None:
        return []
    source, global_values = global_explanation_source(model, X, y)
    weights = normalize_importances(global_values)
    row = X_input.iloc[0]
    centered = (row - X.mean(numeric_only=True)).fillna(0)
    spread = X.std(numeric_only=True).replace(0, 1).fillna(1)
    delta = centered.divide(spread, fill_value=0).reindex(X.columns).fillna(0)
    items = []
    for col, value, weight in zip(X.columns, delta, weights):
        contribution = float(value) * float(weight)
        items.append({
            "feature": col,
            "value": safe_round(row[col]),
            "baseline": safe_round(X[col].mean()),
            "direction": "high" if value > 0 else "low" if value < 0 else "neutral",
            "contribution": safe_round(contribution),
            "source": source,
        })
    items.sort(key=lambda item: abs(item["contribution"] or 0), reverse=True)
    return items[:limit]
