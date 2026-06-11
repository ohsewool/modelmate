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
    message = "예측 근거를 확인할 수 있습니다."
    if top:
        message = f"{top} 정보가 {model_name} 예측에서 가장 큰 영향을 준 근거입니다."
    return {
        "status": "ok",
        "model": model_name,
        "task_type": STATE.get("task_type", "classification"),
        "source": source,
        "explanation_type": "global",
        "summary": message,
        "items": items,
        "limitations": [
            "중요도는 예측에 영향을 준 정도를 보여주지만, 실제 원인이라고 단정할 수는 없습니다.",
            "SHAP 값을 사용할 수 없을 때의 개별 설명은 근사치일 수 있습니다.",
        ],
    }


@app.get("/api/explain/local/{idx}")
async def explain_local(idx: int, limit: int = 8):
    return local_explanation_items(idx, max(1, min(limit, 20)))
