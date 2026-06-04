export function formatScore(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(4) : '-'
}

export function buildAgentDecision(result) {
  const rows = result?.cv_results || []
  const best = rows[0] || {}
  const score = best.roc_auc ?? best.r2 ?? best.accuracy ?? best.f1
  const tuned = result?.optuna_result
  const xai = result?.shap_global?.[0]?.feature
  const insights = result?.agent_insights
  return {
    title: best.model ? `${best.model} 모델을 우선 추천합니다` : '분석 결과를 기다리는 중입니다',
    model: best.model || '-',
    score,
    tuning: insights?.tuning_status || (tuned ? '개선 확인' : '개선 생략'),
    next: insights?.next_actions?.[0] || insights?.presentation_conclusion || (xai
      ? `${xai} 정보가 중요한 근거로 보입니다. 결과 요약을 확인한 뒤 이유 보기에서 근거를 발표용으로 정리하세요.`
      : '결과 요약을 확인한 뒤, 필요하면 이유 보기에서 예측 근거를 확인하세요.'),
  }
}
