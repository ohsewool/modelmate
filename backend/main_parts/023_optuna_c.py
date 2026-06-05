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
    target_info = infer_target_category(STATE.get("df"), STATE["target_col"])
    save_history({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_shape": list(X.shape),
        "target": STATE["target_col"],
        "best_model": best_name,
        "results": STATE["cv_results"],
        "optuna_applied": True,
        "tuned_score": after,
        "tuned_metric": metric_name,
        "dataset_ref": STATE.get("current_dataset"),
        "drop_cols": STATE.get("drop_cols", []),
        "auto_drop_cols": STATE.get("auto_drop_cols", []),
        "dataset_domain": target_info.get("dataset_domain"),
        "target_category": target_info.get("target_category"),
        "task_type": STATE.get("task_type", "classification"),
    }, user_id=user["sub"] if user else None)
    return result
