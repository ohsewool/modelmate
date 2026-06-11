def deployed_model_path(model_id):
    return os.path.join(MODELS_DIR, f"{model_id}.pkl")


def deployed_feature_defaults(X, cat_cols):
    defaults = {}
    for col in X.columns:
        if col in cat_cols:
            defaults[col] = 0
        else:
            defaults[col] = safe_round(X[col].mean())
    return defaults


def deployed_features_meta(X, encoders, cat_cols, col_labels):
    meta = []
    for col in X.columns:
        if col in cat_cols and col in encoders:
            meta.append({
                "name": col,
                "label": col_labels.get(col, col),
                "type": "categorical",
                "example": encoders[col].classes_[0],
                "options": encoders[col].classes_.tolist(),
            })
        else:
            meta.append({
                "name": col,
                "label": col_labels.get(col, col),
                "type": "numeric",
                "example": safe_round(X[col].mean(), 3),
                "min": safe_round(X[col].min(), 3),
                "max": safe_round(X[col].max(), 3),
            })
    return meta


def best_metrics_snapshot():
    cv = STATE.get("cv_results") or []
    best = cv[0] if cv else {}
    opt = STATE.get("optuna_result")
    return {
        "best_cv": best,
        "optuna": opt,
        "task_type": STATE.get("task_type", "classification"),
    }


def build_deployed_row(bundle, features):
    encoders = bundle.get("encoders", {})
    cat_cols = set(bundle.get("cat_cols", []))
    feats = bundle.get("feature_names", [])
    defaults = bundle.get("feature_defaults", {})
    warnings_out = []
    row = {}
    for col in feats:
        raw = features.get(col)
        if raw is None or raw == "":
            row[col] = defaults.get(col, 0)
            warnings_out.append({"feature": col, "type": "missing", "used": row[col]})
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
                row[col] = defaults.get(col, 0)
                warnings_out.append({"feature": col, "type": "invalid_number", "used": row[col]})
    return pd.DataFrame([row], columns=feats), warnings_out


def deployed_prediction_payload(bundle, X_in):
    model = bundle["model"]
    task = bundle["task_type"]
    target_enc = bundle.get("target_encoder")
    pred = model.predict(X_in)[0]
    result = {"task_type": task}
    if task == "regression":
        result["prediction"] = safe_round(pred)
        return result
    result["prediction"] = int(pred)
    result["prediction_label"] = (
