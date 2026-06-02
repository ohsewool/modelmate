                    learning_rate=trial.suggest_float("learning_rate",0.01,0.3),
                    max_depth=trial.suggest_int("max_depth",2,8),
                    num_leaves=trial.suggest_int("num_leaves",20,100),
                    random_state=42, verbosity=-1, n_jobs=-1)
            else: return before
            try: return cross_val_score(m, X, y,
                    cv=StratifiedKFold(3,shuffle=True,random_state=42),scoring=scoring).mean()
            except: return before

        study = optuna.create_study(direction="maximize")
        await asyncio.to_thread(study.optimize, obj, n_trials=20, show_progress_bar=False)
        bp = {**study.best_params, "random_state": 42}
        if best_name == "Random Forest":       tuned = RandomForestClassifier(**bp)
        elif best_name == "Gradient Boosting": tuned = GradientBoostingClassifier(**bp)
        elif best_name == "XGBoost" and XGB_OK:   tuned = XGBClassifier(**bp, eval_metric="logloss", verbosity=0, n_jobs=-1)
        elif best_name == "LightGBM" and LGBM_OK: tuned = LGBMClassifier(**bp, verbosity=-1, n_jobs=-1)
        else: tuned = bm
        tuned.fit(X, y)
        try:
            after = round(float(cross_val_score(tuned, X, y,
                cv=StratifiedKFold(3,shuffle=True,random_state=42),scoring=scoring).mean()),4)
        except: after = before
        optuna_result = {"best_params": bp, "before_roc": before,
                         "after_roc": after, "improvement": round((after-before)*100,2)}
        STATE.update({"best_model": tuned, "predictions": tuned.predict(X).tolist(),
                      "optuna_result": optuna_result, "shap_values": None})

        opt_comment = await ask_gemini(
            f"Optuna 튜닝 결과: ROC-AUC {before} → {after} ({optuna_result['improvement']:+.2f}% 변화)\n"
            f"최적 파라미터: {json.dumps(bp, ensure_ascii=False)}\n"
            f"이 결과를 한국어 2문장으로 해석하세요."
        ) or f"튜닝 결과 ROC-AUC가 {before} → {after}로 {optuna_result['improvement']:+.2f}% 변화했습니다."

        steps.append({"step": step_num, "name": "Optuna 하이퍼파라미터 튜닝", "status": "done",
                      "data": optuna_result, "comment": opt_comment})

    # ── Step 4: SHAP ──────────────────────────────────────
    step_num += 1
    shap_global = []
    model = STATE["best_model"]
    if SHAP_OK:
        try:
            exp = shap.TreeExplainer(model)
            samp = X.sample(min(200, len(X)), random_state=42)
            sv = exp.shap_values(samp)
            if isinstance(sv, list): sv = sv[1]
            mean_sv = np.abs(sv).mean(axis=0)
            shap_global = sorted([{"feature": c, "shap_value": round(float(v),4)}
                                   for c, v in zip(X.columns, mean_sv)],
                                  key=lambda x: x["shap_value"], reverse=True)
            STATE["shap_values"] = sv.tolist()
            STATE["shap_sample_idx"] = samp.index.tolist()
        except: pass
    if not shap_global and hasattr(model, "feature_importances_"):
        shap_global = sorted([{"feature": c, "shap_value": round(float(v),4)}
                               for c, v in zip(X.columns, model.feature_importances_)],
                              key=lambda x: x["shap_value"], reverse=True)

    shap_comment = await ask_gemini(
        f"SHAP 분석 상위 피처: {json.dumps(shap_global[:5], ensure_ascii=False)}\n"
        f"타깃: {STATE.get('target_col')}\n"
        f"이 피처들이 예측에 미치는 영향을 한국어 2~3문장으로 해석하세요."
    ) or f"'{shap_global[0]['feature']}' 피처가 예측에 가장 큰 영향을 미치는 것으로 분석되었습니다." if shap_global else "SHAP 분석이 완료되었습니다."

    steps.append({"step": step_num, "name": "SHAP 설명 분석", "status": "done",
                  "data": {"global": shap_global[:6]}, "comment": shap_comment})

    # ── Step 5: 최종 요약 ─────────────────────────────────
    step_num += 1
    final_roc = optuna_result["after_roc"] if optuna_result else best_roc
    final_comment = await ask_gemini(
        f"ModelMate AutoML 분석 완료. 최종 결과를 요약해주세요.\n"
        f"- 데이터: {X.shape[0]}행×{X.shape[1]}열, 타깃: {STATE.get('target_col')}\n"
        f"- 최고 모델: {best_name}, 최종 ROC-AUC: {final_roc}\n"
        f"- Optuna: {'적용 (' + str(optuna_result['improvement']) + '% 개선)' if optuna_result else '생략'}\n"
        f"- 주요 피처: {', '.join(f['feature'] for f in shap_global[:3])}\n"
        f"사용자에게 전달할 최종 분석 요약을 한국어 3~4문장으로 작성하세요."
    ) or f"분석이 완료되었습니다. {best_name} 모델로 ROC-AUC {final_roc}를 달성했습니다."

    steps.append({"step": step_num, "name": "분석 완료", "status": "done",
                  "comment": final_comment})

    save_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "data_shape": list(X.shape), "target": STATE["target_col"],
                  "best_model": best_name, "results": results,
                  "optuna_applied": bool(optuna_result), "agent_run": True,
                  "task_type": STATE.get("task_type", "classification")})

    return {"steps": steps, "cv_results": results, "best_model": best_name,
            "optuna_result": optuna_result, "shap_global": shap_global[:8],
            "gemini_used": GEMINI_OK}
