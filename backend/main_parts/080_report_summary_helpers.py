def safe_round(value, digits=4):
    try:
        return round(float(value), digits)
    except Exception:
        return None


def model_score_fields(task_type):
    if task_type == "regression":
        return {"primary": "r2", "secondary": ["rmse", "mae"], "higher_is_better": True}
    return {"primary": "roc_auc", "secondary": ["accuracy", "f1"], "higher_is_better": True}


def summarize_dataset_state():
    df, X = STATE.get("df"), STATE.get("X")
    if df is None:
        return {"loaded": False}
    missing = int(df.isnull().sum().sum())
    return {
        "loaded": True,
        "raw_shape": list(df.shape),
        "training_shape": list(X.shape) if X is not None else None,
        "target_col": STATE.get("target_col"),
        "task_type": STATE.get("task_type"),
        "missing_total": missing,
        "categorical_cols": STATE.get("cat_cols", []),
    }


def summarize_preprocessing_state():
    manual = STATE.get("drop_cols", [])
    auto = STATE.get("auto_drop_cols", [])
    reasons = STATE.get("auto_drop_reasons", {})
    cat_cols = STATE.get("cat_cols", [])
    df = STATE.get("df")
    X = STATE.get("X")
    missing = int(df.isnull().sum().sum()) if df is not None else 0
    training_cols = int(X.shape[1]) if X is not None else 0
    notes = []
    if auto:
        notes.append(f"ID, 날짜, 고유값이 많은 정보 등 {len(auto)}개 컬럼은 예측을 방해할 수 있어 자동 제외했습니다.")
    if manual:
        notes.append(f"사용자가 직접 제외한 정보 {len(manual)}개를 학습에서 뺐습니다.")
    if cat_cols:
        notes.append(f"문자형 정보 {len(cat_cols)}개는 모델이 읽을 수 있는 숫자 코드로 바꿨습니다.")
    if missing:
        notes.append(f"비어 있는 값 {missing}개는 학습이 멈추지 않도록 대표값으로 보정했습니다.")
    if not notes:
        notes.append("추가 제외나 보정 없이 바로 모델 비교가 가능한 형태였습니다.")
    return {
        "manual_drop_cols": manual,
        "auto_drop_cols": auto,
        "auto_drop_reasons": reasons,
        "encoded_categorical_cols": cat_cols,
        "missing_filled": missing,
        "training_feature_count": training_cols,
        "summary": f"최종적으로 모델은 {training_cols}개의 정보를 사용해 학습했습니다.",
        "notes": notes,
        "steps": [
            "예측을 방해할 수 있는 정보 제외",
            "문자형 정보를 숫자로 변환",
            "비어 있는 값 자동 보정",
        ],
    }


def summarize_model_results():
    cv = STATE.get("cv_results") or []
    task_type = STATE.get("task_type", "classification")
    score_info = model_score_fields(task_type)
    best_name = STATE.get("best_model_name")
    return {
        "has_cv": bool(cv),
        "best_model": best_name,
        "task_type": task_type,
        "score_info": score_info,
        "models": cv,
        "failed_model_count": sum(1 for row in cv if row.get("status") == "failed"),
    }


def summarize_optuna_state():
    opt = STATE.get("optuna_result")
    if not opt:
        return {"applied": False}
    status = opt.get("status", "ok")
    return {
        "applied": status == "ok",
        "status": status,
        "metric_name": opt.get("metric_name", "ROC-AUC"),
        "before_score": opt.get("before_score", opt.get("before_roc")),
        "after_score": opt.get("after_score", opt.get("after_roc")),
        "improvement": opt.get("improvement"),
        "n_trials": opt.get("n_trials"),
        "best_params": opt.get("best_params", {}),
        "reason": opt.get("reason"),
    }


def summarize_feature_evidence(limit=8):
    X, model = STATE.get("X"), STATE.get("best_model")
    if X is None or model is None:
        return {"available": False, "items": []}
    values = None
    source = None
    if hasattr(model, "feature_importances_"):
        values = model.feature_importances_
        source = "feature_importance"
    elif hasattr(model, "coef_"):
        coef = np.abs(model.coef_)
        values = coef.mean(axis=0) if getattr(coef, "ndim", 1) > 1 else coef
        source = "model_coefficient"
    if values is None:
        return {"available": False, "items": []}
    items = [
        {"feature": col, "importance": safe_round(val), "source": source}
        for col, val in zip(X.columns, values)
    ]
    items.sort(key=lambda row: row["importance"] or 0, reverse=True)
    return {"available": True, "items": items[:limit]}
