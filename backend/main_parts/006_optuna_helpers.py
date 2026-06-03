def normalize_trials(value):
    try:
        n = int(value)
    except Exception:
        n = 30
    return max(5, min(n, 50))

def unsupported_optuna_result(best_name, before, metric_name, n_trials):
    return {
        "status": "skipped",
        "reason": f"{best_name} 모델은 현재 자동 개선 대상이 아니라 원래 모델을 유지했습니다.",
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
    delta = round((after - before) * 100, 2)
    if after > before:
        status = "improved"
        reason = "자동으로 여러 설정을 시험한 결과 기존보다 더 좋은 조합을 찾았습니다."
    elif after == before:
        status = "no_change"
        reason = "여러 설정을 시험했지만 기존 모델보다 나은 조합을 찾지 못해 원래 모델을 유지했습니다."
    else:
        status = "kept_original"
        reason = "자동 개선 후 점수가 더 낮아져 원래 모델을 유지했습니다."
    return {
        "status": status,
        "reason": reason,
        "best_params": best_params,
        "before_score": before,
        "after_score": after,
        "before_roc": before,
        "after_roc": after,
        "improvement": delta,
        "metric_name": metric_name,
        "n_trials": n_trials,
    }
