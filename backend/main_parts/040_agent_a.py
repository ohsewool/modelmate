
# ── Agentic 자동 분석 ────────────────────────────────────
@app.post("/api/run-agent")
async def run_agent():
    X, y = STATE.get("X"), STATE.get("y")
    if X is None: raise HTTPException(400, "데이터 없음. 먼저 업로드 후 타깃을 선택하세요.")

    steps = []
    step_num = 0
    n_unique = STATE.get("n_unique_target", 2)
    is_binary = n_unique == 2
    scoring  = "roc_auc" if is_binary else "roc_auc_ovr_weighted"
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    # ── Step 1: CV ────────────────────────────────────────
    step_num += 1
    results = []
    for name, fn in MODELS.items():
        m = fn()
        acc = float(cross_val_score(m, X, y, cv=cv, scoring="accuracy").mean())
        f1  = float(cross_val_score(m, X, y, cv=cv, scoring="f1_weighted").mean())
        try:   roc = float(cross_val_score(m, X, y, cv=cv, scoring=scoring).mean())
        except: roc = acc
        results.append({"model": name, "accuracy": round(acc,4), "f1": round(f1,4), "roc_auc": round(roc,4)})
    results.sort(key=lambda x: x["roc_auc"], reverse=True)
    best_name = results[0]["model"]
    bm = MODELS[best_name](); bm.fit(X, y)
    preds = bm.predict(X).tolist()
    fi = sorted([{"feature": c, "importance": round(float(v),4)}
                 for c, v in zip(X.columns, bm.feature_importances_)],
                key=lambda x: x["importance"], reverse=True) if hasattr(bm,"feature_importances_") else []
    STATE.update({"cv_results": results, "best_model_name": best_name,
                  "best_model": bm, "predictions": preds,
                  "optuna_result": None, "shap_values": None})

    cv_comment = await ask_gemini(
        f"당신은 AutoML 시스템의 에이전트입니다. 다음 교차검증 결과를 분석하고 한국어로 2~3문장으로 설명하세요.\n"
        f"최고 모델: {best_name}, ROC-AUC: {results[0]['roc_auc']}\n"
        f"전체 결과: {json.dumps(results, ensure_ascii=False)}\n"
        f"타깃 컬럼: {STATE.get('target_col')}, 데이터: {X.shape[0]}행×{X.shape[1]}열\n"
        f"간결하고 전문적으로 해석하세요."
    ) or f"{best_name}이(가) ROC-AUC {results[0]['roc_auc']}로 4개 모델 중 최고 성능을 기록했습니다."

    steps.append({"step": step_num, "name": "모델 비교 (3-fold CV)", "status": "done",
                  "data": {"results": results, "feature_importance": fi[:5]},
                  "comment": cv_comment})

    # ── Step 2: 전략 결정 ─────────────────────────────────
    step_num += 1
    best_roc = results[0]["roc_auc"]
    run_optuna = best_roc < 0.85 and OPTUNA_OK

    decision_comment = await ask_gemini(
        f"AutoML 에이전트입니다. {best_name} 모델의 ROC-AUC {best_roc}를 평가하여 "
        f"Optuna 튜닝 {'진행' if run_optuna else '생략'} 결정을 내렸습니다. "
        f"이 결정 이유를 한국어 1~2문장으로 설명하세요."
    ) or (f"ROC-AUC {best_roc}가 기준치(0.85) 미만이므로 Optuna 튜닝을 진행합니다." if run_optuna
          else f"ROC-AUC {best_roc}가 충분히 높아 추가 튜닝 없이 다음 단계로 진행합니다.")

    steps.append({"step": step_num, "name": "성능 평가 및 전략 결정", "status": "done",
                  "decision": "optuna_run" if run_optuna else "optuna_skip",
                  "comment": decision_comment})

    # ── Step 3: Optuna (조건부) ───────────────────────────
    optuna_result = None
    if run_optuna:
        step_num += 1
        before = best_roc
        def obj(trial):
            if best_name == "Random Forest":
                m = RandomForestClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
                    max_depth=trial.suggest_int("max_depth",3,15),
                    min_samples_split=trial.suggest_int("min_samples_split",2,10),
                    random_state=42)
            elif best_name == "Gradient Boosting":
                m = GradientBoostingClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
                    learning_rate=trial.suggest_float("learning_rate",0.01,0.3),
                    max_depth=trial.suggest_int("max_depth",2,8), random_state=42)
            elif best_name == "XGBoost" and XGB_OK:
                m = XGBClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
                    learning_rate=trial.suggest_float("learning_rate",0.01,0.3),
                    max_depth=trial.suggest_int("max_depth",2,8),
                    subsample=trial.suggest_float("subsample",0.6,1.0),
                    random_state=42, eval_metric="logloss", verbosity=0, n_jobs=-1)
            elif best_name == "LightGBM" and LGBM_OK:
                m = LGBMClassifier(
                    n_estimators=trial.suggest_int("n_estimators",50,300),
