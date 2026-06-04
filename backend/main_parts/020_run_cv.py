@app.post("/api/run-cv")
async def run_cv(user=Depends(get_current_user)):
    X, y = STATE.get("X"), STATE.get("y")
    if X is None: raise HTTPException(400, "데이터 없음")
    task_type = STATE.get("task_type", "classification")
    if task_type == "regression":
        kf = make_cv_for_target(y, "regression")
        results = []
        for name, fn in REGRESSION_MODELS.items():
            m = fn()
            try:
                scores = run_regression_scores(m, X, y, kf)
                results.append({"model": name, "status": "ok",
                                **scores})
            except Exception as e:
                results.append(make_cv_failure(name, "regression", e))
        ok_results = [r for r in results if r.get("status") == "ok"]
        if not ok_results:
            raise HTTPException(500, "All regression models failed")
        ok_results.sort(key=lambda x: x["r2"], reverse=True)
        results = ok_results + [r for r in results if r.get("status") != "ok"]
        best_name = ok_results[0]["model"]
        bm = REGRESSION_MODELS[best_name](); bm.fit(X, y)
        preds = bm.predict(X).tolist()
        STATE.update({"cv_results": results, "best_model_name": best_name,
                      "best_model": bm, "predictions": preds,
                      "optuna_result": None, "shap_values": None})
        fi = []
        if hasattr(bm, "feature_importances_"):
            fi = sorted([{"feature": c, "importance": round(float(v), 4)}
                         for c, v in zip(X.columns, bm.feature_importances_)],
                        key=lambda x: x["importance"], reverse=True)
        target_info = infer_target_category(STATE.get("df"), STATE["target_col"])
        save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                      "data_shape": list(X.shape), "target": STATE["target_col"],
                      "best_model": best_name, "results": results, "optuna_applied": False,
                      "dataset_domain": target_info.get("dataset_domain"),
                      "target_category": target_info.get("target_category"),
                      "task_type": "regression"}, user_id=user["sub"] if user else None)
        return {"results": results, "best_model": best_name,
                "feature_importance": fi, "task_type": "regression",
                "explanations": cv_explanations(best_name, results, "regression"),
                "final_r2":   round(float(r2_score(y, preds)), 4),
                "final_rmse": round(float(np.sqrt(mean_squared_error(y, preds))), 4)}

    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    cv = make_cv_for_target(y, "classification")
    scoring = classification_scoring(n_unique)
    results = []
    for name, fn in MODELS.items():
        try:
            m = fn()
            scores = run_classification_scores(m, X, y, cv, scoring)
            results.append({"model": name, "status": "ok",
                            **scores})
        except Exception as e:
            print(f"[CV SKIP] {name}: {e}")
            results.append(make_cv_failure(name, "classification", e))
    ok_results = [r for r in results if r.get("status") == "ok"]
    if not ok_results:
        raise HTTPException(500, "모든 모델 학습 실패")
    ok_results.sort(key=lambda x: x["roc_auc"], reverse=True)
    results = ok_results + [r for r in results if r.get("status") != "ok"]
    best_name = ok_results[0]["model"]
    try:
        bm = MODELS[best_name](); bm.fit(X, y)
        preds = bm.predict(X).tolist()
    except Exception as e:
        for r in results[1:]:
            try:
                best_name = r["model"]
                bm = MODELS[best_name](); bm.fit(X, y)
                preds = bm.predict(X).tolist()
                break
            except: continue
        else:
            raise HTTPException(500, f"모델 학습 실패: {e}")
    STATE.update({"cv_results": results, "best_model_name": best_name,
                  "best_model": bm, "predictions": preds,
                  "optuna_result": None, "shap_values": None})
    fi = []
    if hasattr(bm, "feature_importances_"):
        fi = sorted([{"feature": c, "importance": round(float(v), 4)}
                     for c, v in zip(X.columns, bm.feature_importances_)],
                    key=lambda x: x["importance"], reverse=True)
    target_info = infer_target_category(STATE.get("df"), STATE["target_col"])
    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": results, "optuna_applied": False,
                  "dataset_domain": target_info.get("dataset_domain"),
                  "target_category": target_info.get("target_category"),
                  "task_type": "classification"}, user_id=user["sub"] if user else None)
    return {"results": results, "best_model": best_name,
            "feature_importance": fi, "task_type": "classification",
            "explanations": cv_explanations(best_name, results, "classification"),
            "final_accuracy": round(float(accuracy_score(y, preds)), 4),
            "final_f1": round(float(f1_score(y, preds, average="weighted")), 4)}

