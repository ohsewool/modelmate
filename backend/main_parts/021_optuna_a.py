# Optuna tuning
class OptunaReq(BaseModel):
    n_trials: int = 30


@app.post("/api/run-optuna")
async def run_optuna(req: OptunaReq):
    if not OPTUNA_OK:
        raise HTTPException(400, "optuna is not installed")

    X, y = STATE.get("X"), STATE.get("y")
    best_name = STATE.get("best_model_name")
    task_type = STATE.get("task_type", "classification")
    if X is None or not best_name or not STATE.get("cv_results"):
        raise HTTPException(400, "Run cross-validation first")

    n_trials = normalize_trials(req.n_trials)
    tunable_models = {"Random Forest", "Gradient Boosting", "XGBoost", "LightGBM"}

    if task_type == "regression":
        before = STATE["cv_results"][0]["r2"]
        metric_name = "R2"
        if best_name not in tunable_models:
            result = unsupported_optuna_result(best_name, before, metric_name, n_trials)
            STATE["optuna_result"] = result
            return result

        def obj(trial):
            if best_name == "Random Forest":
                model = RandomForestRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    max_depth=trial.suggest_int("max_depth", 3, 15),
                    min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                    random_state=42,
                )
            elif best_name == "Gradient Boosting":
                model = GradientBoostingRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    random_state=42,
                )
            elif best_name == "XGBoost" and XGB_OK:
                model = XGBRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    subsample=trial.suggest_float("subsample", 0.6, 1.0),
                    random_state=42, verbosity=0, n_jobs=-1,
                )
            elif best_name == "LightGBM" and LGBM_OK:
                model = LGBMRegressor(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    num_leaves=trial.suggest_int("num_leaves", 20, 100),
                    random_state=42, verbosity=-1, n_jobs=-1,
                )
            else:
                return before

            try:
                return cross_val_score(
                    model, X, y,
                    cv=KFold(3, shuffle=True, random_state=42),
                    scoring="r2",
                ).mean()
            except Exception:
                return before

        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=n_trials, show_progress_bar=False)
        best_params = {**study.best_params, "random_state": 42}
        if best_name == "Random Forest":
            tuned = RandomForestRegressor(**best_params)
        elif best_name == "Gradient Boosting":
            tuned = GradientBoostingRegressor(**best_params)
        elif best_name == "XGBoost" and XGB_OK:
            tuned = XGBRegressor(**best_params, verbosity=0, n_jobs=-1)
