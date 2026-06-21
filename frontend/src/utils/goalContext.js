const CATEGORY_RULES = [
  ['equipment_failure', ['고장', '설비', '장비', '정비', '예방', 'failure', 'machine', 'maintenance', 'fault', 'defect']],
  ['customer_churn', ['고객 이탈', '이탈', '유지', '고객', 'churn', 'retention']],
  ['sales_demand', ['매출', '수요', '판매', '재고', 'revenue', 'sales', 'demand']],
  ['student_result', ['합격', '성적', '학생', '시험', 'passed', 'exam', 'score']],
]

export function detectGoalCategory(goal) {
  const text = String(goal || '').toLowerCase()
  return CATEGORY_RULES.find(([, keywords]) => keywords.some(keyword => text.includes(keyword)))?.[0] || 'general_prediction'
}

export const GOAL_CATEGORY_LABELS = {
  equipment_failure: '설비 고장 예측',
  customer_churn: '고객 이탈 예측',
  sales_demand: '매출·수요 예측',
  student_result: '학생 결과 예측',
  general_prediction: '일반 예측 분석',
}

const CATEGORY_COPY = {
  equipment_failure: {
    interpretation: '설비 고장 가능성을 예측하고, 예방 점검에 참고할 수 있는 주요 요인을 확인하는 분석입니다.',
    actions: ['센서와 상태 컬럼의 변화부터 확인하세요.', '고장 가능성이 높은 조건을 정비 우선순위에 참고하세요.', '운영 적용 전 성능 지표와 주요 요인을 함께 검토하세요.'],
  },
  customer_churn: {
    interpretation: '고객 이탈 가능성이 높은 집단을 찾고 유지 전략에 참고할 요인을 확인하는 분석입니다.',
    actions: ['이탈 가능성이 높은 고객군의 공통 특성을 확인하세요.', '주요 요인을 유지 전략과 고객 접점 개선에 활용하세요.', '실제 캠페인 적용 전 성능과 편향 가능성을 검토하세요.'],
  },
  sales_demand: {
    interpretation: '매출 또는 수요의 변화를 예측해 재고와 운영 계획에 참고하는 분석입니다.',
    actions: ['수요와 매출에 영향을 주는 주요 요인을 확인하세요.', '예측 결과를 재고와 운영 계획의 참고 자료로 사용하세요.', '기간과 계절 조건이 달라질 때 성능을 다시 검증하세요.'],
  },
  student_result: {
    interpretation: '학생 결과에 영향을 주는 학습·출석·평가 요인을 확인하는 분석입니다.',
    actions: ['학습, 출석, 평가 관련 주요 요인을 확인하세요.', '지원이 필요한 대상을 찾는 참고 자료로만 사용하세요.', '학생에 대한 단독 의사결정 근거로 사용하지 마세요.'],
  },
  general_prediction: {
    interpretation: '사용자가 정한 목표와 CSV 구조를 연결해 예측 가능성과 주요 요인을 확인하는 분석입니다.',
    actions: ['추천 예측값과 주요 요인을 먼저 확인하세요.', '성능 지표와 데이터 품질을 함께 검토하세요.', '목표와 맞지 않으면 예측값을 조정해 다시 분석하세요.'],
  },
}

export function goalContext(goal) {
  const category = detectGoalCategory(goal)
  return { category, label: GOAL_CATEGORY_LABELS[category], ...CATEGORY_COPY[category] }
}

export function goalTargetReason(goal, target, matched = true) {
  const context = goalContext(goal)
  if (!matched || !target) {
    return `입력한 ${context.label} 목표와 직접 연결되는 예측값을 확정하기 어렵습니다. 후보를 확인하거나 직접 선택해 주세요.`
  }
  return `사용자 목표를 ${context.label}으로 이해했고, CSV의 '${target}' 컬럼을 목표와 연결되는 예측값으로 검토했습니다.`
}
