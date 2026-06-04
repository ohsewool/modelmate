def make_cv_for_target(y, task_type="classification", desired=3):
    n = int(len(y))
    if n < 2:
        raise ValueError("학습할 데이터가 너무 적습니다.")
    if task_type == "regression":
        return KFold(n_splits=max(2, min(desired, n)), shuffle=True, random_state=42)
    counts = pd.Series(y).value_counts()
    min_class = int(counts.min()) if len(counts) else 0
    if min_class < 2:
        raise ValueError("일부 정답 값의 데이터가 1개뿐이라 교차검증을 할 수 없습니다.")
    return StratifiedKFold(n_splits=max(2, min(desired, min_class)), shuffle=True, random_state=42)


def classification_scoring(n_unique):
    return "roc_auc" if n_unique == 2 else "roc_auc_ovr_weighted"


def run_regression_scores(model, X, y, cv):
    r2 = float(cross_val_score(model, X, y, cv=cv, scoring="r2").mean())
    rmse = float(-cross_val_score(model, X, y, cv=cv, scoring="neg_root_mean_squared_error").mean())
    mae = float(-cross_val_score(model, X, y, cv=cv, scoring="neg_mean_absolute_error").mean())
    return {"r2": round(r2, 4), "rmse": round(rmse, 4), "mae": round(mae, 4)}


def run_classification_scores(model, X, y, cv, scoring):
    acc = float(cross_val_score(model, X, y, cv=cv, scoring="accuracy").mean())
    f1 = float(cross_val_score(model, X, y, cv=cv, scoring="f1_weighted").mean())
    try:
        roc = float(cross_val_score(model, X, y, cv=cv, scoring=scoring).mean())
    except Exception:
        roc = acc
    return {"accuracy": round(acc, 4), "f1": round(f1, 4), "roc_auc": round(roc, 4)}
