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
            elif best_name == "XGBoost" and XGB_OK:
                m = XGBRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    subsample=trial.suggest_float("subsample", 0.6, 1.0),
                    random_state=42, verbosity=0, n_jobs=-1)
            elif best_name == "LightGBM" and LGBM_OK:
                m = LGBMRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    num_leaves=trial.suggest_int("num_leaves", 20, 100),
                    random_state=42, verbosity=-1, n_jobs=-1)
            else: return before
            try:
                return cross_val_score(m, X, y,
                    cv=KFold(3, shuffle=True, random_state=42), scoring="r2").mean()
            except: return before
        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=req.n_trials, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        if best_name == "Random Forest":       tuned = RandomForestRegressor(**bp)
        elif best_name == "Gradient Boosting": tuned = GradientBoostingRegressor(**bp)
        elif best_name == "XGBoost" and XGB_OK:   tuned = XGBRegressor(**bp, verbosity=0, n_jobs=-1)
        elif best_name == "LightGBM" and LGBM_OK: tuned = LGBMRegressor(**bp, verbosity=-1, n_jobs=-1)
        else: tuned = STATE["best_model"]
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
