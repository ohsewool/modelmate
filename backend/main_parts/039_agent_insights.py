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


def build_agent_insights(best_name=None, best_score=None, optuna_result=None, top_feature=None):
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
    return {
        "domain": domain,
        "target_label": target_label,
        "target_reason": target_reason,
        "model_reason": _model_comment(best_name, task_type),
        "score_comment": _score_comment(best_score),
        "tuning_status": tuning_status,
        "risk_notes": _risk_notes(df, X, best_score, target_info),
        "presentation_conclusion": conclusion,
    }
