@app.post("/api/predict/single")
async def predict_single_stable(body: dict):
    model = STATE.get("best_model")
    if model is None:
        raise HTTPException(400, "Run cross-validation first")
    features = body.get("features", body)
    if not isinstance(features, dict):
        raise HTTPException(400, "features must be an object")

    X_input, warnings_out = build_prediction_row(features)
    result = prediction_result_payload(model, X_input)
    result.update({
        "status": "ok",
        "input_features": X_input.iloc[0].to_dict(),
        "input_warnings": warnings_out,
        "top_factors": single_prediction_factors(X_input, limit=int(body.get("limit", 5))),
    })
    return result
