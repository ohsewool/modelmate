            "baseline": numeric_score(X[col].mean()),
            "direction": "high" if delta > 0 else "low" if delta < 0 else "neutral",
            "contribution": numeric_score(contribution),
            "source": source,
        })
    items.sort(key=lambda row: abs(row["contribution"] or 0), reverse=True)
    payload = prediction_payload(model, X.iloc[[idx]])
    return {**payload, "sample_index": idx, "features": items[:limit], "source": source}


@app.get("/api/explain/summary")
async def explain_summary(limit: int = 10):
    source, items = global_explanation_items(max(1, min(limit, 20)))
    model_name = STATE.get("best_model_name")
    top = items[0]["feature"] if items else None
    message = "Feature explanation is ready."
    if top:
        message = f"{top} is the strongest signal for {model_name}."
    return {
        "status": "ok",
        "model": model_name,
        "task_type": STATE.get("task_type", "classification"),
        "source": source,
        "explanation_type": "global",
        "summary": message,
        "items": items,
        "limitations": [
            "Feature importance shows signal strength, not guaranteed causality.",
            "Local explanations are approximations when SHAP values are unavailable.",
        ],
    }


@app.get("/api/explain/local/{idx}")
async def explain_local(idx: int, limit: int = 8):
    return local_explanation_items(idx, max(1, min(limit, 20)))
