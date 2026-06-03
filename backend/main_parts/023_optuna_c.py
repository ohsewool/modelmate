        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(
                tuned, X, y,
                cv=StratifiedKFold(3, shuffle=True, random_state=42),
                scoring=scoring,
            ).mean()), 4)
        except Exception:
            after = before
        result = optuna_result(best_params, before, after, metric_name, n_trials)

    state_update = {
        "optuna_result": result,
        "shap_values": None,
    }
    if result.get("status") == "improved":
        state_update.update({
            "best_model": tuned,
            "predictions": tuned.predict(X).tolist(),
        })
    STATE.update(state_update)
    save_history({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_shape": list(X.shape),
        "target": STATE["target_col"],
        "best_model": best_name,
        "results": STATE["cv_results"],
        "optuna_applied": True,
        "tuned_score": after,
        "tuned_metric": metric_name,
    }, user_id=user["sub"] if user else None)
    return result
