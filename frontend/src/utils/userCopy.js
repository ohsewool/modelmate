const STATUS_LABELS = {
  created: '분석 대기 중', pending: '분석 대기 중', planned: '실행 예정', queued: '분석 대기 중',
  running: '분석 중', processing: '분석 중', completed: '분석 완료', succeeded: '분석 완료', success: '분석 완료',
  failed: '분석 실패', cancelled: '분석 취소', canceled: '분석 취소', needs_review: '분석 완료 · 검토 필요',
  waiting_for_review: '분석 완료 · 검토 필요', review_required: '검토 필요', ready: '준비 완료', active: '사용 가능',
  revoked: '폐기됨', disabled: '사용 중지', deleted: '삭제됨', archived: '보관됨', warning: '주의 필요', blocked: '사용자 확인 필요',
  unavailable: '사용 불가', expired: '만료됨', usage_limited: '사용량 한도 도달', contacted: '연락 완료', closed: '종료', unknown: '확인 필요',
}

const WORKFLOW_STEP_LABELS = {
  csv_upload: 'CSV 업로드', data_profile: 'CSV 구조 분석', data_profiling: 'CSV 구조 분석', schema_validation: 'CSV 형식 확인',
  target_select: '예측값 선택', target_recommendation: '예측값 추천', leakage_check: '데이터 누수 점검', automl_training: '모델 학습',
  model_training: '모델 학습', model_comparison: '모델 비교', evaluation: '성능 지표 확인', explain: '결과 설명',
  xai_explanation: '중요 요인 확인', report_generation: '보고서 생성', deployment_check: '예측 API 연결 점검', job_pending: '분석 대기 중',
  data_profile_tool: 'CSV 구조 분석', schema_validation_tool: 'CSV 형식 확인', target_recommendation_tool: '예측값 추천',
  leakage_check_tool: '데이터 누수 점검', automl_training_tool: '모델 학습', evaluation_tool: '성능 지표 확인',
  xai_explainer_tool: '중요 요인 확인', validation_tool: '결과 검증', report_writer_tool: '보고서 생성', deployment_check_tool: '예측 API 연결 점검',
}

export function userStatusLabel(status) {
  return STATUS_LABELS[String(status || 'unknown').toLowerCase()] || '확인 필요'
}

export function workflowStepLabel(step) {
  if (!step) return '현재 단계 확인 중'
  return WORKFLOW_STEP_LABELS[String(step).toLowerCase()] || String(step).replaceAll('_', ' ')
}

export function apiReasonLabel(reason) {
  if (!reason) return '검토 후 API 연결 가능'
  const key = String(reason).toLowerCase()
  if (key.includes('deleted')) return '연결된 자료가 삭제되어 API를 사용할 수 없습니다.'
  if (key.includes('model') || key.includes('not_ready')) return '모델 결과를 확인한 뒤 API를 연결할 수 있습니다.'
  return '검토 후 API 연결 가능'
}

export function safeDisplay(value, fallback = '확인 필요') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback
  if (['undefined', 'null', 'nan'].includes(String(value).trim().toLowerCase())) return fallback
  return value
}
