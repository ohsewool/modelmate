def normalize_trials(value):
    try:
        n = int(value)
    except Exception:
        n = 30
    return max(5, min(n, 50))

def unsupported_optuna_result(best_name, before, metric_name, n_trials):
    return {
        "status": "skipped",
        "reason": f"{best_name} does not have a configured Optuna search space.",
        "best_params": {},
        "before_score": before,
        "after_score": before,
        "before_roc": before,
        "after_roc": before,
        "improvement": 0.0,
        "metric_name": metric_name,
        "n_trials": n_trials,
    }

def optuna_result(best_params, before, after, metric_name, n_trials):
    return {
        "status": "ok",
        "best_params": best_params,
        "before_score": before,
        "after_score": after,
        "before_roc": before,
        "after_roc": after,
        "improvement": round((after - before) * 100, 2),
        "metric_name": metric_name,
        "n_trials": n_trials,
    }
