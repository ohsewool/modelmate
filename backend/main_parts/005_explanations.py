def explain_task(task_type, n_unique):
    if task_type == "classification":
        return f"Target has {n_unique} unique value(s), so it was treated as a classification problem."
    return f"Target has {n_unique} unique values, so it was treated as a regression problem."

def explain_drop(reason):
    mapping = {
        "constant column": "Dropped because it has only one distinct value.",
        "identifier-like column": "Dropped because it looks like an ID or identifier column.",
        "high-cardinality text column": "Dropped because it has too many unique text values.",
        "datetime column": "Dropped from the base feature set because it is datetime-like.",
        "sequential identifier": "Dropped because it looks like a sequential row number.",
    }
    return mapping.get(reason, reason)

def preprocess_explanations(task_type, n_unique, n_features):
    auto_reasons = STATE.get("auto_drop_reasons", {})
    manual = {c: "Manually excluded by the user." for c in STATE.get("drop_cols", [])}
    reasons = {**{c: explain_drop(r) for c, r in auto_reasons.items()}, **manual}
    return {
        "task_reason": explain_task(task_type, n_unique),
        "drop_reasons": reasons,
        "preprocess_summary": f"Training data was prepared with {n_features} feature column(s).",
    }

def cv_explanations(best_name, results, task_type):
    metric = "r2" if task_type == "regression" else "roc_auc"
    failed = [r for r in results if r.get("status") == "failed"]
    best = next((r for r in results if r.get("model") == best_name), {})
    score = best.get(metric)
    reason = f"{best_name} was selected because it had the highest {metric} score."
    if score is not None:
        reason = f"{reason} Best {metric}: {score}."
    return {"best_model_reason": reason, "failed_model_count": len(failed)}
