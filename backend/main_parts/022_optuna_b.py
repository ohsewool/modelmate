        elif best_name == "LightGBM" and LGBM_OK:
            tuned = LGBMRegressor(**best_params, verbosity=-1, n_jobs=-1)
        else:
            tuned = STATE["best_model"]

        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(
                tuned, X, y,
                cv=KFold(3, shuffle=True, random_state=42),
                scoring="r2",
            ).mean()), 4)
        except Exception:
            after = before
        result = optuna_result(best_params, before, after, metric_name, n_trials)
    else:
        before = STATE["cv_results"][0]["roc_auc"]
        metric_name = "ROC-AUC"
        if best_name not in tunable_models:
            result = unsupported_optuna_result(best_name, before, metric_name, n_trials)
            STATE["optuna_result"] = result
            return result

        n_unique = STATE.get("n_unique_target", 2)
        scoring = "roc_auc" if n_unique == 2 else "roc_auc_ovr_weighted"

        def obj(trial):
            if best_name == "Random Forest":
                model = RandomForestClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    max_depth=trial.suggest_int("max_depth", 3, 15),
                    min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                    random_state=42,
                )
            elif best_name == "Gradient Boosting":
                model = GradientBoostingClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    random_state=42,
                )
            elif best_name == "XGBoost" and XGB_OK:
                model = XGBClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 300),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 8),
                    subsample=trial.suggest_float("subsample", 0.6, 1.0),
                    random_state=42, eval_metric="logloss", verbosity=0, n_jobs=-1,
                )
            elif best_name == "LightGBM" and LGBM_OK:
                model = LGBMClassifier(
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
                    cv=StratifiedKFold(3, shuffle=True, random_state=42),
                    scoring=scoring,
                ).mean()
            except Exception:
                return before

        study = optuna.create_study(direction="maximize")
        study.optimize(obj, n_trials=n_trials, show_progress_bar=False)
        best_params = {**study.best_params, "random_state": 42}
        if best_name == "Random Forest":
            tuned = RandomForestClassifier(**best_params)
        elif best_name == "Gradient Boosting":
            tuned = GradientBoostingClassifier(**best_params)
        elif best_name == "XGBoost" and XGB_OK:
            tuned = XGBClassifier(**best_params, eval_metric="logloss", verbosity=0, n_jobs=-1)
        elif best_name == "LightGBM" and LGBM_OK:
            tuned = LGBMClassifier(**best_params, verbosity=-1, n_jobs=-1)
        else:
            tuned = STATE["best_model"]
