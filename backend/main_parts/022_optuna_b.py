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
            elif best_name == "XGBoost" and XGB_OK:
                m = XGBClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    subsample=trial.suggest_float("subsample", 0.6, 1.0),
                    random_state=42, eval_metric="logloss", verbosity=0, n_jobs=-1)
            elif best_name == "LightGBM" and LGBM_OK:
                m = LGBMClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    num_leaves=trial.suggest_int("num_leaves", 20, 100),
                    random_state=42, verbosity=-1, n_jobs=-1)
            else: return before
            try:
                return cross_val_score(m, X, y,
                    cv=StratifiedKFold(3, shuffle=True, random_state=42),
                    scoring=scoring).mean()
            except: return before
        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=req.n_trials, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        if best_name == "Random Forest":     tuned = RandomForestClassifier(**bp)
        elif best_name == "Gradient Boosting": tuned = GradientBoostingClassifier(**bp)
        elif best_name == "XGBoost" and XGB_OK:  tuned = XGBClassifier(**bp, eval_metric="logloss", verbosity=0, n_jobs=-1)
        elif best_name == "LightGBM" and LGBM_OK: tuned = LGBMClassifier(**bp, verbosity=-1, n_jobs=-1)
        else: tuned = STATE["best_model"]
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

