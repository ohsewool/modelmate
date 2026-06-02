@app.post("/api/run-cv")
async def run_cv():
    X, y = STATE.get("X"), STATE.get("y")
    if X is None: raise HTTPException(400, "데이터 없음")
    task_type = STATE.get("task_type", "classification")
    if task_type == "regression":
        kf = KFold(n_splits=3, shuffle=True, random_state=42)
        results = []
        for name, fn in REGRESSION_MODELS.items():
            m = fn()
            try:
                r2   = float(cross_val_score(m, X, y, cv=kf, scoring="r2").mean())
                rmse = float(-cross_val_score(m, X, y, cv=kf, scoring="neg_root_mean_squared_error").mean())
                mae  = float(-cross_val_score(m, X, y, cv=kf, scoring="neg_mean_absolute_error").mean())
                results.append({"model": name, "status": "ok",
                                "r2": round(r2, 4), "rmse": round(rmse, 4), "mae": round(mae, 4)})
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
        save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                      "data_shape": list(X.shape), "target": STATE["target_col"],
                      "best_model": best_name, "results": results, "optuna_applied": False,
                      "task_type": "regression"})
        return {"results": results, "best_model": best_name,
                "feature_importance": fi, "task_type": "regression",
                "final_r2":   round(float(r2_score(y, preds)), 4),
                "final_rmse": round(float(np.sqrt(mean_squared_error(y, preds))), 4)}

    # ── 분류 ───────────────────────────────────────────────
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    scoring = "roc_auc" if is_binary else "roc_auc_ovr_weighted"
    results = []
    for name, fn in MODELS.items():
        try:
            m = fn()
            acc = float(cross_val_score(m, X, y, cv=cv, scoring="accuracy").mean())
            f1  = float(cross_val_score(m, X, y, cv=cv, scoring="f1_weighted").mean())
            try:
                roc = float(cross_val_score(m, X, y, cv=cv, scoring=scoring).mean())
            except:
                roc = acc
            results.append({"model": name, "status": "ok",
                            "accuracy": round(acc, 4), "f1": round(f1, 4), "roc_auc": round(roc, 4)})
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
        # 최고 모델이 실패하면 다음 모델로 폴백
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
    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": results, "optuna_applied": False,
                  "task_type": "classification"})
    return {"results": results, "best_model": best_name,
            "feature_importance": fi, "task_type": "classification",
            "final_accuracy": round(float(accuracy_score(y, preds)), 4),
            "final_f1": round(float(f1_score(y, preds, average="weighted")), 4)}

