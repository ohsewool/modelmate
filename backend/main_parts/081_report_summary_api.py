@app.get("/api/report/summary")
async def report_summary():
    df = STATE.get("df")
    cv = STATE.get("cv_results")
    model = STATE.get("best_model")
    preds = STATE.get("predictions")
    if df is None:
        raise HTTPException(400, "Upload a dataset first")

    dataset = summarize_dataset_state()
    preprocessing = summarize_preprocessing_state()
    model_selection = summarize_model_results()
    optimization = summarize_optuna_state()
    feature_evidence = summarize_feature_evidence()
    task_type = STATE.get("task_type", "classification")

    final_metrics = {}
    if model is not None and preds is not None and STATE.get("y") is not None:
        y = STATE["y"]
        if task_type == "regression":
            preds_arr = np.array(preds)
            final_metrics = {
                "r2": safe_round(r2_score(y, preds_arr)),
                "rmse": safe_round(np.sqrt(mean_squared_error(y, preds_arr))),
                "mae": safe_round(mean_absolute_error(y, preds_arr)),
            }
        else:
            final_metrics = {
                "accuracy": safe_round(accuracy_score(y, preds)),
                "f1": safe_round(f1_score(y, preds, average="weighted")),
            }

    readiness = {
        "dataset_uploaded": df is not None,
        "target_selected": STATE.get("target_col") is not None,
        "cv_completed": cv is not None,
        "model_ready": model is not None,
        "optuna_checked": STATE.get("optuna_result") is not None,
    }
    completed = sum(1 for ok in readiness.values() if ok)
    total = len(readiness)

    best_model = STATE.get("best_model_name")
    target = STATE.get("target_col")
    summary_line = "Dataset is loaded."
    if best_model and target:
        summary_line = f"{best_model} was selected for target '{target}'."
    if optimization.get("status") == "ok":
        summary_line += f" Optuna tuning used {optimization.get('n_trials')} trials."
    elif optimization.get("status") == "skipped":
        summary_line += " Optuna was skipped because the selected model is not tunable."

    return {
        "status": "ok",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "readiness": readiness,
        "readiness_score": round(completed / total, 2),
        "executive_summary": summary_line,
        "dataset": dataset,
        "preprocessing": preprocessing,
        "model_selection": model_selection,
        "optimization": optimization,
        "final_metrics": final_metrics,
        "feature_evidence": feature_evidence,
        "presentation_points": [
            "The system accepts a general CSV dataset.",
            "It removes risky identifier/date columns before training.",
            "It compares multiple models with cross-validation.",
            "It exposes tuning and explanation results through APIs.",
        ],
    }
