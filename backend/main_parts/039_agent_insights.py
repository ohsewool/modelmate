def _score_comment(score):
    if score is None:
        return "아직 대표 점수가 계산되지 않았습니다."
    if score >= 0.9:
        return "현재 데이터에서는 매우 안정적인 성능으로 보입니다."
    if score >= 0.8:
        return "발표 시연에 쓰기 좋은 수준의 성능입니다."
    if score >= 0.65:
        return "사용 가능하지만 데이터 품질이나 변수 구성을 더 확인하면 좋습니다."
    return "점수가 낮아 데이터 품질, 맞힐 값, 제외 컬럼을 다시 확인하는 편이 좋습니다."


def _model_comment(model_name, task_type):
    name = str(model_name or "")
    if "Logistic" in name:
        return "단순한 기준선을 잘 보여줘서 결과 설명이 비교적 쉽습니다."
    if "Random Forest" in name:
        return "여러 판단 기준을 묶어 보므로 복잡한 데이터에서도 안정적인 편입니다."
    if "Gradient" in name:
        return "이전 모델의 부족한 부분을 이어서 보완하는 방식이라 성능 개선에 유리합니다."
    if "Decision Tree" in name:
        return "조건을 나누는 방식이라 비전공자에게 설명하기 쉽습니다."
    if task_type == "regression":
        return "숫자 값을 예측하는 문제에 맞춰 선택된 모델입니다."
    return "현재 데이터의 분류 구조에 맞춰 가장 높은 점수를 보인 모델입니다."


def _risk_notes(df, X, score, target_info):
    notes = []
    if df is not None:
        if len(df) < 100:
            notes.append("데이터 행이 적어 새 데이터에서는 결과가 흔들릴 수 있습니다.")
        missing = int(df.isna().sum().sum())
        if missing:
            notes.append(f"결측값 {missing}개가 있어 전처리 결과를 확인해야 합니다.")
    if X is not None and X.shape[1] < 3:
        notes.append("사용 정보가 적어 모델이 볼 수 있는 근거가 제한적입니다.")
    if score is not None and score < 0.65:
        notes.append("대표 점수가 낮아 타겟 선택이나 제외 컬럼을 다시 보는 것이 좋습니다.")
    if target_info.get("target_category_confidence") == "낮음":
        notes.append("맞힐 값의 업무 의미가 불확실해 발표 때 직접 설명을 보강해야 합니다.")
    return notes[:4] or ["현재 흐름에서는 큰 위험 신호가 보이지 않습니다."]


def _next_actions(df, X, score, optuna_result, target_info, top_feature):
    actions = []
    if df is not None and len(df) < 100:
        actions.append("발표 전 같은 형식의 데이터를 더 모아 모델 안정성을 다시 확인하세요.")
    if score is not None and score < 0.65:
        actions.append("맞힐 값과 제외 컬럼을 다시 점검한 뒤 모델 비교를 한 번 더 실행하세요.")
    if target_info.get("target_category_confidence") == "낮음":
        actions.append("맞힐 값이 실제 업무에서 무엇을 의미하는지 발표자가 직접 한 문장으로 보강하세요.")
    if optuna_result and optuna_result.get("applied"):
        actions.append("개선된 모델을 기준으로 이유 보기와 결과 요약을 발표 자료에 반영하세요.")
    elif optuna_result:
        actions.append("튜닝으로 큰 개선이 없었으므로 현재 모델을 안정적인 기준 모델로 설명하세요.")
    if top_feature:
        actions.append(f"{top_feature}가 왜 중요한지 실제 데이터 의미와 연결해 설명하세요.")
    if X is not None and X.shape[1] < 3:
        actions.append("참고 정보가 적으므로 추가 컬럼을 넣었을 때 성능이 달라지는지 확인하세요.")
    return actions[:4] or ["현재 결과 요약을 저장하고, 새 데이터 예측 화면에서 같은 흐름을 시연하세요."]


def _agent_priority(df, X, score, target_info, evidence):
    focus = []
    if target_info.get("target_category_confidence") == "낮음":
        focus.append("맞힐 값 의미 확인")
    if df is not None and len(df) < 100:
        focus.append("데이터 수 보강")
    if X is not None and X.shape[1] < 3:
        focus.append("참고 정보 추가")
    if score is not None and score < 0.65:
        focus.append("모델 비교 재실행")
    if evidence.get("gap_label") == "접전":
        focus.append("1위/2위 모델 차이 설명")
    if score is not None and score >= 0.8 and len(focus) <= 1:
        return {
            "level": "바로 진행",
            "summary": "현재 결과는 발표 흐름에 바로 사용할 수 있습니다.",
            "focus": focus or ["결과 요약 저장", "새 데이터 예측 시연"],
        }
    if len(focus) <= 2:
        return {
            "level": "검토 후 진행",
            "summary": "분석은 가능하지만 발표 전에 핵심 확인 사항을 짚는 것이 좋습니다.",
            "focus": focus or ["맞힐 값과 제외 컬럼 확인"],
        }
    return {
        "level": "보류 후 재점검",
        "summary": "결과를 바로 쓰기보다 데이터 의미와 입력 정보를 먼저 보강하는 편이 안전합니다.",
        "focus": focus[:4],
    }


def _commercial_readiness(df, X, score, target_info, evidence):
    blockers = []
    strengths = []
    if df is not None and len(df) >= 300:
        strengths.append("시연에 충분한 데이터 행을 확보했습니다.")
    elif df is not None and len(df) < 100:
        blockers.append("데이터 행이 적어 상용 설명에는 보강이 필요합니다.")
    if X is not None and X.shape[1] >= 4:
        strengths.append("모델이 참고할 입력 정보가 여러 개 있습니다.")
    elif X is not None:
        blockers.append("입력 정보가 적어 예측 근거가 약해 보일 수 있습니다.")
    if score is not None and score >= 0.75:
        strengths.append("대표 성능이 발표 시연에 무리 없는 수준입니다.")
    elif score is not None and score < 0.65:
        blockers.append("대표 성능이 낮아 결과 신뢰 설명이 필요합니다.")
    if target_info.get("target_category_confidence") == "높음":
        strengths.append("맞힐 값의 업무 의미가 비교적 명확합니다.")
    elif target_info.get("target_category_confidence") == "낮음":
        blockers.append("맞힐 값의 업무 의미를 사람이 확인해야 합니다.")
    if evidence.get("gap_label") == "접전":
        blockers.append("상위 모델 점수 차이가 작아 선택 이유를 함께 설명해야 합니다.")
    level = "상용 시연 가능"
    if len(blockers) >= 3:
        level = "검증 후 시연"
    elif blockers:
        level = "보완 후 시연"
    return {
        "level": level,
        "strengths": strengths[:3] or ["CSV 업로드부터 모델 선택까지 한 흐름으로 이어집니다."],
        "blockers": blockers[:3],
        "summary": "실제 서비스처럼 보여주려면 데이터 의미, 성능, 재사용 흐름을 함께 설명하는 것이 좋습니다.",
    }


def _model_evidence(cv_results, task_type):
    rows = [r for r in (cv_results or []) if r.get("status") == "ok"]
    metric = "r2" if task_type == "regression" else "roc_auc"
    rows = [r for r in rows if r.get(metric) is not None]
    if not rows:
        return {
            "summary": "검증 점수를 기준으로 추천 모델을 선택했습니다.",
            "gap_label": "비교 정보 없음",
            "runner_up": None,
        }
    rows = sorted(rows, key=lambda r: r.get(metric), reverse=True)
    best = rows[0]
    runner = rows[1] if len(rows) > 1 else None
    if not runner:
        return {
            "summary": f"{best['model']}이 현재 비교 가능한 모델 중 가장 높은 점수를 보였습니다.",
            "gap_label": "단일 후보",
            "runner_up": None,
        }
    gap = round(float(best.get(metric)) - float(runner.get(metric)), 4)
    if gap >= 0.05:
        gap_label = "차이 큼"
    elif gap >= 0.01:
        gap_label = "차이 있음"
    else:
        gap_label = "접전"
    return {
        "summary": f"{best['model']}이 {runner['model']}보다 {metric.upper()} 기준 {gap:.4f} 앞섰습니다.",
        "gap_label": gap_label,
        "runner_up": runner.get("model"),
        "metric": metric.upper(),
        "gap": gap,
    }


def _agent_judgment(df, X, target_col, target_info, evidence, risks, actions):
    rows = int(len(df)) if df is not None else 0
    cols = int(df.shape[1]) if df is not None else 0
    used = int(X.shape[1]) if X is not None else 0
    excluded = max(cols - used - 1, 0) if cols else 0
    confidence = target_info.get("dataset_domain_confidence") or target_info.get("target_category_confidence") or "중간"
    return {
        "headline": f"{target_info.get('dataset_domain', '도메인 확인 필요')} 데이터로 보고 {target_col or '목표값'} 예측 문제를 구성했습니다.",
        "confidence": confidence,
        "dataset_basis": [
            f"데이터 크기: {rows:,}행, {cols:,}개 컬럼",
            f"모델 입력으로 {used}개 정보를 사용",
            f"예측 방해 가능성이 있는 정보 {excluded}개 제외",
        ],
        "target_basis": [
            target_info.get("target_category_reason", "컬럼 구조를 기준으로 맞힐 값을 판단했습니다."),
            f"예측 목적: {target_info.get('target_category', '목적 확인 필요')}",
        ],
        "model_basis": [
            evidence.get("summary", "검증 점수를 기준으로 추천 모델을 선택했습니다."),
            f"선택 근거 강도: {evidence.get('gap_label', '비교 정보 없음')}",
        ],
        "risk_basis": risks[:2],
        "next_basis": actions[:2],
    }


def build_agent_insights(best_name=None, best_score=None, optuna_result=None, top_feature=None, cv_results=None):
    df = STATE.get("df")
    X = STATE.get("X")
    target_col = STATE.get("target_col")
    task_type = STATE.get("task_type", "classification")
    target_info = infer_target_category(df, target_col) if df is not None and target_col in df.columns else {}
    domain = target_info.get("dataset_domain", "도메인 확인 필요")
    target_label = target_info.get("target_category", "목적 확인 필요")
    target_reason = target_info.get("target_category_reason", "데이터 구조만으로는 의미를 단정하기 어렵습니다.")
    tuning_status = "개선 생략"
    if optuna_result:
        tuning_status = optuna_result.get("status_label", "개선 확인")
    conclusion = (
        f"이 데이터는 {domain}에 가까우며, {target_label} 문제로 분석했습니다. "
        f"{best_name or '선택 모델'}은 {top_feature or '주요 정보'}를 근거로 예측 결과를 설명할 수 있습니다."
    )
    evidence = _model_evidence(cv_results, task_type)
    priority = _agent_priority(df, X, best_score, target_info, evidence)
    readiness = _commercial_readiness(df, X, best_score, target_info, evidence)
    risks = _risk_notes(df, X, best_score, target_info)
    actions = _next_actions(df, X, best_score, optuna_result, target_info, top_feature)
    return {
        "domain": domain,
        "target_label": target_label,
        "target_reason": target_reason,
        "model_reason": _model_comment(best_name, task_type),
        "model_evidence": evidence,
        "agent_judgment": _agent_judgment(df, X, target_col, target_info, evidence, risks, actions),
        "agent_priority": priority,
        "commercial_readiness": readiness,
        "score_comment": _score_comment(best_score),
        "tuning_status": tuning_status,
        "risk_notes": risks,
        "next_actions": actions,
        "presentation_conclusion": conclusion,
    }
