@app.post("/api/run-agent")
async def run_agent(demo: bool = False, user=Depends(get_current_user)):
    X, y = STATE.get("X"), STATE.get("y")
    if X is None:
        raise HTTPException(400, "데이터가 없습니다. 먼저 업로드하고 맞히려는 값을 선택하세요.")

    task_type = STATE.get("task_type", "classification")
    n_unique = STATE.get("n_unique_target", 2)
    cv = make_cv_for_target(y, task_type)

    results = []
    model_map = REGRESSION_MODELS if task_type == "regression" else MODELS
    scoring = classification_scoring(n_unique)
    for name, fn in model_map.items():
        model = fn()
        if task_type == "regression":
            scores = run_regression_scores(model, X, y, cv)
            results.append({"model": name, "status": "ok", **scores})
        else:
            scores = run_classification_scores(model, X, y, cv, scoring)
            results.append({"model": name, "status": "ok", **scores})

    results.sort(key=lambda x: x["r2"] if task_type == "regression" else x["roc_auc"], reverse=True)
    best_name = results[0]["model"]
    best_score = results[0]["r2"] if task_type == "regression" else results[0]["roc_auc"]
    best_model = model_map[best_name]()
    best_model.fit(X, y)
    preds = best_model.predict(X).tolist()

    feature_importance = []
    if hasattr(best_model, "feature_importances_"):
        feature_importance = sorted(
            [{"feature": col, "importance": round(float(val), 4)}
             for col, val in zip(X.columns, best_model.feature_importances_)],
            key=lambda item: item["importance"],
            reverse=True,
        )

    STATE.update({
        "cv_results": results,
        "best_model_name": best_name,
        "best_model": best_model,
        "predictions": preds,
        "optuna_result": None,
        "shap_values": None,
    })

    score_name = "R2" if task_type == "regression" else "ROC-AUC"
    cv_comment = await ask_gemini(
        f"최고 모델은 {best_name}, {score_name}는 {best_score}입니다. "
        f"결과를 비전공자에게 2문장으로 설명하세요: {json.dumps(results, ensure_ascii=False)}",
        demo=demo,
    ) or f"{best_name} 모델이 가장 좋은 {score_name} 점수를 보였습니다. 테스트 모드에서는 외부 AI 호출 없이 결과만 요약합니다."

    target_info = infer_target_category(STATE.get("df"), STATE["target_col"])
    steps = [{
        "step": 1,
        "name": "데이터 의미 판단",
        "status": "done",
        "data": {
            "domain": target_info.get("dataset_domain"),
            "target_label": target_info.get("target_category"),
            "target_reason": target_info.get("target_category_reason"),
        },
        "comment": (
            f"이 데이터는 {target_info.get('dataset_domain')}에 가까우며, "
            f"맞힐 값은 {target_info.get('target_category')}로 해석했습니다."
        ),
    }, {
        "step": 2,
        "name": "모델 비교",
        "status": "done",
        "data": {"results": results, "feature_importance": feature_importance[:5]},
        "comment": cv_comment,
    }]

    tunable = task_type == "classification" and best_name in ["Random Forest", "Gradient Boosting"]
    run_optuna = best_score < 0.85 and OPTUNA_OK and tunable
    decision_comment = await ask_gemini(
        f"{best_name} 모델의 {score_name} {best_score} 기준으로 Optuna 진행 여부를 짧게 설명하세요.",
        demo=demo,
    ) or ("성능을 더 확인하기 위해 자동 개선을 진행합니다." if run_optuna else "현재 모델은 자동 개선보다 기존 결과를 확인하는 것이 더 안정적이라 개선은 생략합니다.")

    steps.append({
        "step": 3,
        "name": "성능 개선 판단",
        "status": "done",
        "decision": "optuna_run" if run_optuna else "optuna_skip",
        "comment": decision_comment,
    })

    optuna_result = None
    if run_optuna:
        before = best_score

        def objective(trial):
            if best_name == "Random Forest":
                model = RandomForestClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 200),
                    max_depth=trial.suggest_int("max_depth", 3, 12),
                    min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                    random_state=42,
                )
            elif best_name == "Gradient Boosting":
                model = GradientBoostingClassifier(
                    n_estimators=trial.suggest_int("n_estimators", 50, 200),
                    learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                    max_depth=trial.suggest_int("max_depth", 2, 6),
                    random_state=42,
                )
            else:
                return before
            try:
                return cross_val_score(model, X, y, cv=cv, scoring=scoring).mean()
            except Exception:
                return before

        study = optuna.create_study(direction="maximize")
        await asyncio.to_thread(study.optimize, objective, n_trials=10, show_progress_bar=False)
        after = round(float(study.best_value), 4)
        improved = after > round(float(before), 4)
        optuna_result = {
            "best_params": study.best_params,
            "before_roc": before,
            "after_roc": after,
            "improvement": round((after - before) * 100, 2),
            "applied": improved,
            "status": "improved" if improved else "kept_original",
            "status_label": "개선 적용" if improved else "기존 모델 유지",
            "reason": (
                "자동 개선 후 점수가 더 좋아져 개선 결과를 참고합니다."
                if improved else
                "자동 개선을 시도했지만 기존 모델 점수가 더 안정적이라 기존 결과를 유지합니다."
            ),
        }
        STATE["optuna_result"] = optuna_result
        steps.append({
            "step": 4,
            "name": "성능 자동 개선",
            "status": "done",
            "data": optuna_result,
            "comment": optuna_result["reason"],
        })

    shap_global = []
    model = STATE["best_model"]
    if SHAP_OK:
        try:
            explainer = shap.TreeExplainer(model)
            sample = X.sample(min(200, len(X)), random_state=42)
            shap_values = explainer.shap_values(sample)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]
            mean_values = np.abs(shap_values).mean(axis=0)
            shap_global = sorted(
                [{"feature": col, "shap_value": round(float(val), 4)}
                 for col, val in zip(X.columns, mean_values)],
                key=lambda item: item["shap_value"],
                reverse=True,
            )
            STATE["shap_values"] = shap_values.tolist()
            STATE["shap_sample_idx"] = sample.index.tolist()
        except Exception:
            pass
    if not shap_global and hasattr(model, "feature_importances_"):
        shap_global = sorted(
            [{"feature": col, "shap_value": round(float(val), 4)}
             for col, val in zip(X.columns, model.feature_importances_)],
            key=lambda item: item["shap_value"],
            reverse=True,
        )

    top_feature = shap_global[0]["feature"] if shap_global else "주요 정보"
    shap_comment = await ask_gemini(
        f"주요 예측 근거는 {json.dumps(shap_global[:5], ensure_ascii=False)}입니다. 한글 2문장으로 설명하세요.",
        demo=demo,
    ) or f"{top_feature}가 예측에 가장 큰 영향을 준 정보로 확인되었습니다."

    steps.append({
        "step": 5,
        "name": "예측 이유 분석",
        "status": "done",
        "data": {"global": shap_global[:6]},
        "comment": shap_comment,
    })

    final_score = optuna_result["after_roc"] if optuna_result and optuna_result.get("applied") else best_score
    agent_insights = build_agent_insights(best_name, final_score, optuna_result, top_feature)
    final_comment = await ask_gemini(
        f"최종 모델 {best_name}, 점수 {final_score}, 주요 정보 {top_feature}. 발표용 한글 요약 2문장.",
        demo=demo,
    ) or agent_insights["presentation_conclusion"]

    steps.append({
        "step": 6,
        "name": "분석 완료",
        "status": "done",
        "comment": final_comment,
    })

    save_history({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_shape": list(X.shape),
        "target": STATE["target_col"],
        "best_model": best_name,
        "results": results,
        "optuna_applied": bool(optuna_result and optuna_result.get("applied")),
        "agent_run": True,
        "dataset_domain": agent_insights.get("domain"),
        "target_category": agent_insights.get("target_label"),
        "presentation_conclusion": agent_insights.get("presentation_conclusion"),
        "next_actions": agent_insights.get("next_actions", []),
        "task_type": STATE.get("task_type", "classification"),
    }, user_id=user["sub"] if user else None)

    return {
        "steps": steps,
        "cv_results": results,
        "best_model": best_name,
        "optuna_result": optuna_result,
        "shap_global": shap_global[:8],
        "agent_insights": agent_insights,
        "gemini_used": GEMINI_OK and not demo,
        "demo_mode": demo,
    }
