import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Box, CheckCircle2, Database, FileText, ListChecks } from 'lucide-react'
import api from '../api'
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/workspace-shell/WorkspaceStates'
import { goalContext, goalTargetReason } from '../utils/goalContext'

const STATUS_LABELS = {
  supported: '지원 가능',
  limited: '제한적 지원',
  unsupported: '지원 범위 밖',
  completed: '분석 완료',
  succeeded: '분석 완료',
  success: '분석 완료',
  failed: '실패',
  running: '분석 중',
  planned: '실행 예정',
  pending: '대기 중',
  blocked: '사용자 확인 필요',
  stopped: '중단됨',
  waiting_for_review: '확인이 필요합니다',
}

const REVIEW_REASON_COPY = {
  target_ambiguous: {
    title: '예측할 값을 선택하세요',
    description: '여러 개의 예측 후보가 발견되었습니다. 어떤 값을 예측하고 싶은지 선택하면 분석을 계속 진행합니다.',
    reason: '예측할 값이 명확하지 않습니다. 여러 후보 중 사용자의 선택이 필요합니다.',
  },
  leakage_review_required: {
    title: '데이터 누수 가능성을 확인하세요',
    description: '예측 시점에 알 수 없는 정보가 포함되었을 수 있습니다. 제외하거나 계속 사용할지 확인해 주세요.',
    reason: '데이터 누수 가능성이 있어 확인이 필요합니다. 예측 시점에 알 수 없는 정보가 포함되었을 수 있습니다.',
  },
  metric_review_required: {
    title: '평가 기준을 확인하세요',
    description: '현재 데이터와 문제 유형에 맞는 성능 지표를 사용할지 확인해야 합니다.',
    reason: '평가 기준 확인이 필요합니다. 분류 문제에 맞는 성능 지표를 사용할지 확인해야 합니다.',
  },
  api_readiness_review_required: {
    title: 'API 생성 전 확인하세요',
    description: '모델 성능과 입력 형식이 안정적인지 확인한 뒤 예측 API로 이어갈 수 있습니다.',
    reason: 'API 배포 전 확인이 필요합니다. 모델 성능과 입력 형식이 안정적인지 확인해야 합니다.',
  },
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '정보 없음'
}

function shortId(value) {
  if (!value) return ''
  return String(value).slice(0, 8)
}

function getStepStatus(step) {
  return step?.status || 'planned'
}

function isStepDone(step) {
  return ['completed', 'succeeded', 'success'].includes(getStepStatus(step))
}

function isStepActive(step) {
  return ['running', 'blocked', 'waiting_for_review'].includes(getStepStatus(step)) || step?.requires_human_review
}

function isRunComplete(run) {
  return ['completed', 'succeeded', 'success'].includes(run?.status)
}

function isRunReviewNeeded(run) {
  return run?.status === 'waiting_for_review'
}

function getCompletedStepCount(steps, run) {
  if (isRunComplete(run)) return steps.length
  const stopIndex = steps.findIndex(step => ['failed', 'blocked', 'waiting_for_review'].includes(getStepStatus(step)) || step?.requires_human_review)
  const visibleSteps = stopIndex >= 0 ? steps.slice(0, stopIndex) : steps
  return visibleSteps.filter(isStepDone).length
}

function getCurrentStep(steps, run) {
  if (isRunComplete(run)) return null
  return steps.find(step => ['failed', 'blocked', 'waiting_for_review', 'running'].includes(getStepStatus(step)) || step?.requires_human_review)
    || steps.find(step => !isStepDone(step))
    || steps[steps.length - 1]
}

function isWorkflowComplete(steps, run) {
  if (isRunComplete(run)) return true
  const total = steps?.length || 0
  if (!total) return false
  return getCompletedStepCount(steps, run) >= total
}

function hasPendingReview(reviews) {
  return reviews.some(review => review?.status === 'pending')
}

function targetLabel(target) {
  const value = String(target || '').toLowerCase()
  if (['diabetes', 'outcome'].includes(value)) return '당뇨병 여부'
  return target || '선택한 타깃'
}

function datasetInfo(trace, run) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const columns = dataset.column_count ?? dataset.columns ?? run?.column_count
  return {
    filename: dataset.filename || dataset.original_filename || run?.dataset_name || '연결된 CSV',
    rows: dataset.row_count ?? dataset.rows ?? run?.row_count,
    columns: Array.isArray(columns) ? columns.length : columns,
    target: run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col,
    datasetId: run?.dataset_id,
    projectId: run?.project_id,
  }
}

function traceText(trace) {
  try {
    return JSON.stringify(trace || {}).toLowerCase()
  } catch {
    return ''
  }
}

function traceDatasetColumns(trace) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const candidates = [
    dataset.columns,
    dataset.column_names,
    dataset.column_list,
    dataset.quality_summary?.columns,
    dataset.target_quality?.columns,
    trace?.profile?.columns,
  ]
  for (const item of candidates) {
    if (Array.isArray(item)) return item.map(String)
  }
  return []
}

function isKnownDatasetColumn(trace, column) {
  const columns = traceDatasetColumns(trace)
  if (!columns.length || !column) return true
  return columns.includes(String(column))
}

function traceInvariantWarning(run, trace) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const runDatasetId = run?.dataset_id
  const traceDatasetId = dataset.dataset_id || dataset.id
  if (runDatasetId && traceDatasetId && String(runDatasetId) !== String(traceDatasetId)) {
    return '분석 정보가 현재 CSV와 일치하지 않아 다시 불러옵니다. CSV를 다시 선택해 주세요.'
  }
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col
  if (target && !isKnownDatasetColumn(trace, target)) {
    return '선택한 예측값이 현재 CSV 컬럼과 일치하지 않습니다. CSV를 다시 선택해 주세요.'
  }
  return ''
}

function detectTargetDomain(run, trace) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const target = String(run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col || '').toLowerCase()
  const filename = String(dataset.filename || dataset.original_filename || run?.dataset_name || '').toLowerCase()
  const goal = String(run?.user_goal || '').toLowerCase()
  const combined = `${target} ${filename} ${goal}`
  if (/(diabetes|outcome|glucose|bmi|당뇨)/.test(combined)) return 'diabetes'
  if (/(churn|이탈|고객 유지|retention)/.test(combined)) return 'churn'
  if (/(failure|defect|fault|failure_risk|고장|불량)/.test(combined)) return 'failure'
  if (/(sales|revenue|demand|price|매출|수요|가격|수익)/.test(combined)) return 'business'
  return 'general'
}

function domainUsageCopy(domain, target) {
  const targetText = targetLabel(target)
  if (domain === 'diabetes') {
    return {
      use: '당뇨병 위험 가능성을 분류하고, 주요 건강 지표의 영향을 확인하는 데 사용할 수 있습니다.',
      caution: '의료 판단을 대체하지 않으며, 참고용 예측 분석으로 사용해야 합니다.',
    }
  }
  if (domain === 'churn') {
    return {
      use: '이탈 가능성이 높은 고객을 미리 찾고, 유지 전략을 세우는 데 사용할 수 있습니다.',
      caution: '실제 캠페인 적용 전에는 고객군별 편향과 최신 행동 데이터를 함께 확인하세요.',
    }
  }
  if (domain === 'failure') {
    return {
      use: '고장 또는 불량 위험이 높은 대상을 우선 점검하는 데 사용할 수 있습니다.',
      caution: '현장 점검 기준을 대체하기보다 우선순위 선별용 참고 지표로 사용하는 것이 안전합니다.',
    }
  }
  if (domain === 'business') {
    return {
      use: '수요나 매출을 예측해 재고, 운영, 마케팅 계획에 참고할 수 있습니다.',
      caution: '프로모션, 시즌, 가격 정책이 바뀌면 예측 결과도 달라질 수 있습니다.',
    }
  }
  if (!target) {
    return {
      use: '이 CSV는 예측보다 데이터 요약/탐색 보고서에 더 적합할 수 있습니다.',
      caution: '먼저 어떤 값을 예측하고 싶은지 정한 뒤 타깃 컬럼을 다시 선택하는 것을 권장합니다.',
    }
  }
  return {
    use: `${targetText} 값을 예측하고, 어떤 컬럼이 결과에 영향을 주는지 확인하는 데 사용할 수 있습니다.`,
    caution: '모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.',
  }
}

function targetQualityInfo(run, trace) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const quality = run?.target_quality || trace?.target_quality || dataset.target_quality || {}
  const recommended = quality.recommended || {}
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col || recommended.column_name
  const hasMeaningfulTarget = quality.has_meaningful_target
  const noMeaningfulTarget = hasMeaningfulTarget === false || (!target && traceText(trace).includes('명확한 타깃'))
  return {
    target,
    reason: recommended.usefulness_explanation || recommended.reason || quality.message || '데이터 구조와 컬럼 이름을 바탕으로 예측 후보를 검토했습니다.',
    warnings: [
      ...(recommended.warnings || []),
      ...(quality.warnings || []),
      quality.message,
    ].filter(Boolean),
    nextAction: noMeaningfulTarget
      ? '예측을 바로 진행하기보다 데이터 요약 보고서를 먼저 확인하고, 예측 목적에 맞는 값을 다시 정하세요.'
      : '먼저 보고서에서 예측값 추천 이유와 성능을 확인한 뒤 새 데이터 예측 또는 API 생성을 진행하세요.',
    noMeaningfulTarget,
    problemType: recommended.inferred_task_type || quality.problem_type,
    analysisSuitability: quality.analysis_suitability,
    apiReady: quality.api_ready !== false && hasMeaningfulTarget !== false,
  }
}

function isWeakPerformance(trace) {
  const text = traceText(trace)
  return /(threshold_status":"(fail|warning)|metric_review_required|weak|poor|low|성능이 충분히 높지|성능 확인|주의가 필요)/.test(text)
}

function isApiRisky(trace) {
  const text = traceText(trace)
  return /(api_readiness_review_required|deployment.*(hold|blocked|needs_review)|api 배포 전 확인|배포 전 확인)/.test(text)
}

function problemTypeLabel(run, trace) {
  const taskType = run?.task_type || run?.interpreted_goal?.task_type || trace?.task_type || trace?.dataset?.task_type || trace?.dataset_info?.task_type
  if (taskType === 'regression') return '숫자 예측'
  if (taskType === 'classification') return '분류 예측'
  const quality = targetQualityInfo(run, trace)
  if (quality.problemType === 'regression') return '숫자 예측'
  if (quality.problemType === 'classification') return '분류 예측'
  const domain = detectTargetDomain(run, trace)
  const target = datasetInfo(trace, run).target
  if (!target) return '예측값 검토'
  if (domain === 'business') return '회귀 또는 수요 예측'
  return '분류 예측'
}

function infoValue(value) {
  return value === null || value === undefined || value === '' ? '데이터 정보를 불러오지 못했습니다.' : value
}

function collectTopFeatures(trace) {
  const text = traceText(trace)
  const explicit = []
  const visit = value => {
    if (!value || explicit.length >= 5) return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (typeof value !== 'object') return
    const top = value.top_features || value.feature_importance || value.important_features
    if (Array.isArray(top)) {
      top.forEach(item => {
        const name = typeof item === 'string' ? item : item?.feature || item?.name || item?.column
        if (name && !explicit.includes(name) && explicit.length < 5) explicit.push(name)
      })
    }
    Object.values(value).forEach(visit)
  }
  visit(trace)
  if (explicit.length) return explicit.filter(name => isKnownDatasetColumn(trace, name))
  const fallback = ['BMI', 'Glucose', 'Age', 'tenure', 'monthly_fee', 'price', 'demand', 'revenue']
  return fallback.filter(name => text.includes(name.toLowerCase()) && isKnownDatasetColumn(trace, name)).slice(0, 3)
}

function detectGoalDatasetMismatch(run, trace) {
  const goal = String(run?.user_goal || '').toLowerCase()
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const target = String(run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col || '').toLowerCase()
  const filename = String(dataset.filename || dataset.original_filename || run?.dataset_name || '').toLowerCase()
  const looksDiabetes = ['diabetes', 'outcome'].some(token => target.includes(token) || filename.includes(token))
  const goalLooksChurn = goal.includes('churn') || goal.includes('이탈') || goal.includes('고객')
  if (looksDiabetes && goalLooksChurn) {
    return '현재 CSV는 당뇨병 여부 예측 데이터로 보입니다. 분석 목표를 당뇨병 여부 예측으로 변경하는 것을 권장합니다.'
  }
  return ''
}

function Section({ title, icon, children }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <p className="section-title" style={{ margin: 0 }}>{title}</p>
      </div>
      {children}
    </section>
  )
}

function MetricBox({ label, value }) {
  return (
    <div className="card-compact">
      <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>{label}</p>
      <strong>{value ?? '-'}</strong>
    </div>
  )
}

function normalizeError(err, fallback) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return detail?.message || err.response?.data?.error?.message || fallback
}

function reviewCopy(review) {
  const reason = review?.review_reason || review?.reason || review?.decision_type || review?.review_type
  if (reason && REVIEW_REASON_COPY[reason]) return REVIEW_REASON_COPY[reason]
  const text = `${review?.prompt || ''} ${review?.context_summary || ''}`.toLowerCase()
  if (text.includes('target') || text.includes('타깃') || text.includes('column')) return REVIEW_REASON_COPY.target_ambiguous
  if (text.includes('leakage') || text.includes('누수')) return REVIEW_REASON_COPY.leakage_review_required
  if (text.includes('metric') || text.includes('평가')) return REVIEW_REASON_COPY.metric_review_required
  if (text.includes('api')) return REVIEW_REASON_COPY.api_readiness_review_required
  return {
    title: '사용자 확인이 필요합니다',
    description: '자동으로 결정하기 어려운 지점이 발견되었습니다. 아래 선택지를 확인하면 분석을 계속 진행할 수 있습니다.',
    reason: review?.context_summary || '현재 단계에서 사용자의 확인이 필요합니다.',
  }
}

function optionColumn(option) {
  if (!option) return ''
  if (option.id?.startsWith('select:')) return option.id.split(':').slice(1).join(':')
  const match = String(option.label || '').match(/[A-Za-z0-9_가-힣]+/)
  return match?.[0] || ''
}

function optionLabel(option, index) {
  const column = optionColumn(option)
  if (option.id === 'stop' || option.id === 'reject') return '분석 중단'
  if (option.id === 'retry') return '현재 단계 다시 시도'
  if (option.id === 'approve' || option.id === 'continue') return '확인하고 계속 실행'
  if (option.id === 'exclude') return '의심 컬럼 제외하고 계속'
  if (option.id?.startsWith('select:')) return `${column} 값을 예측하기`
  return option.label || `선택지 ${index + 1}`
}

function summaryState(run, trace, reviews, steps = []) {
  const quality = targetQualityInfo(run, trace)
  const reviewNeeded = isRunReviewNeeded(run) || hasPendingReview(reviews)
  const workflowComplete = isWorkflowComplete(steps, run)
  const complete = workflowComplete && !quality.noMeaningfulTarget
  const failed = run?.status === 'failed'
  if (failed) {
    return {
      tone: 'warning',
      badge: '실패',
      title: '분석을 완료하지 못했습니다.',
      summary: '실패 원인과 재시도 방법을 확인한 뒤 다시 실행할 수 있습니다.',
    }
  }
  if (workflowComplete && reviewNeeded) {
    return {
      tone: 'warning',
      badge: '분석 완료 · 검토 필요',
      title: '분석 완료 · 검토 필요',
      summary: '분석은 완료되었지만 결과를 사용하기 전에 성능과 주요 요인을 확인해 주세요.',
      workflowComplete,
      reviewAfterComplete: true,
    }
  }
  if (reviewNeeded) {
    return {
      tone: 'warning',
      badge: '확인이 필요합니다',
      title: '사용자 확인이 필요합니다.',
      summary: '다음 분석 단계로 진행하기 전에 선택을 확인해 주세요.',
      workflowComplete,
      reviewAfterComplete: false,
    }
  }
  if (quality.noMeaningfulTarget) {
    return {
      tone: 'warning',
      badge: '검토 필요',
      title: '명확한 예측값을 찾기 어렵습니다.',
      summary: '이 CSV는 바로 모델 학습으로 가기보다 데이터 요약과 예측값 검토가 먼저 필요합니다.',
    }
  }
  if (complete) {
    const target = targetLabel(quality.target || datasetInfo(trace, run).target)
    return {
      tone: 'success',
      badge: '분석 완료',
      title: `${target} 예측 분석이 완료되었습니다.`,
      summary: '보고서에서 성능과 주의사항을 확인한 뒤 새 데이터 예측 또는 예측 API 생성으로 이어갈 수 있습니다.',
      workflowComplete,
      reviewAfterComplete: false,
    }
  }
  return {
    tone: 'neutral',
    badge: '분석 중',
    title: '분석을 진행하고 있습니다.',
    summary: 'CSV 구조와 예측 목표를 확인하면서 다음 분석 단계를 준비하고 있습니다.',
    workflowComplete,
    reviewAfterComplete: false,
  }
}

function SummaryHero({ run, trace, reviews, steps, onContinue, actionLoading }) {
  const info = datasetInfo(trace, run)
  const state = summaryState(run, trace, reviews, steps)
  const completedCount = getCompletedStepCount(steps, run)
  const current = getCurrentStep(steps, run)
  const complete = state.workflowComplete
  const canContinue = !complete && (isRunReviewNeeded(run) || hasPendingReview(reviews))
  return (
    <section className="workspace-hero" style={{ alignItems: 'stretch' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <span className="status-pill" style={{ width: 'fit-content' }}>{state.badge}</span>
        <div>
          <p className="eyebrow">목표 기반 분석 결과</p>
          <h1>{state.title}</h1>
          <p>{state.summary}</p>
        </div>
        <div className="workspace-grid four-columns">
          <MetricBox label="연결 CSV" value={info.filename} />
          <MetricBox label="예측할 값" value={info.target ? targetLabel(info.target) : '확인 필요'} />
          <MetricBox label="문제 유형" value={problemTypeLabel(run, trace)} />
          <MetricBox label="진행" value={complete ? `${steps.length || completedCount}/${steps.length || completedCount}` : `${completedCount}/${steps.length || 0}`} />
        </div>
        {!complete && current && (
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            현재 단계: <strong>{friendlyStepName(current)}</strong>
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'flex-end' }}>
        <Link className="btn btn-secondary" to="/agent-mode">목표 기반 분석으로 돌아가기</Link>
        {state.reviewAfterComplete && (
          <>
            <Link className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>검토 완료하고 결과 보기</Link>
            <a className="btn btn-secondary" href="#advanced-trace">상세 실행 기록 보기</a>
          </>
        )}
        {!state.reviewAfterComplete && complete && (
          <>
            <Link className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>결과 보고서 보기</Link>
            <Link className="btn btn-secondary" to="/prediction-apis">예측 API 만들기</Link>
          </>
        )}
        {canContinue && (
          <button className="btn btn-primary" type="button" onClick={onContinue} disabled={actionLoading || !run?.dataset_id}>
            <CheckCircle2 size={16} /> {actionLoading ? '진행 중' : '확인하고 계속 실행'}
          </button>
        )}
      </div>
    </section>
  )
}

function CoreResultCards({ trace, run }) {
  const quality = targetQualityInfo(run, trace)
  const target = quality.target || datasetInfo(trace, run).target
  const topFeatures = collectTopFeatures(trace)
  const weak = isWeakPerformance(trace)
  const apiRisk = isApiRisky(trace)
  const performanceText = quality.noMeaningfulTarget
    ? '아직 계산되지 않았습니다.'
    : weak
      ? '주의해서 확인해야 합니다.'
      : isRunComplete(run)
        ? '보고서에서 확인할 수 있습니다.'
        : '분석을 계속하면 확인할 수 있습니다.'
  const factorText = topFeatures.length
    ? topFeatures.join(', ')
    : isRunComplete(run)
      ? '보고서 또는 고급 실행 기록에서 확인'
      : '아직 계산되지 않았습니다.'
  const cautionText = quality.noMeaningfulTarget
    ? '이 데이터에서는 명확한 예측 타깃을 찾기 어렵습니다.'
    : apiRisk
      ? '예측 API 생성 전 확인이 필요합니다.'
      : quality.warnings.length
        ? `${quality.warnings.length}개 주의사항`
        : '현재 큰 주의사항 없음'
  return (
    <div className="workspace-grid four-columns">
      <MetricBox label="예측할 값" value={target ? targetLabel(target) : '타깃 확인 필요'} />
      <MetricBox label="예측 성능" value={performanceText} />
      <MetricBox label="중요 요인" value={factorText} />
      <MetricBox label="주의사항" value={cautionText} />
    </div>
  )
}

function friendlyStepName(step) {
  const text = `${step?.name || ''} ${step?.tool_name || ''}`.toLowerCase()
  if (/profile|data_profile|데이터/.test(text)) return '데이터 확인'
  if (/schema|validation|검증/.test(text)) return 'CSV 형식 검증'
  if (/target|타깃|목표/.test(text)) return '예측 목표 정리'
  if (/leakage|누수/.test(text)) return '데이터 누수 점검'
  if (/train|automl|model|모델/.test(text)) return '모델 준비'
  if (/evaluat|metric|성능/.test(text)) return '성능 확인'
  if (/explain|xai|shap|요인/.test(text)) return '요인 설명'
  if (/report|보고/.test(text)) return '보고서 준비'
  if (/deploy|api/.test(text)) return 'API 준비'
  return step?.name || '분석 단계'
}

function friendlyStepPurpose(step) {
  const label = friendlyStepName(step)
  const copy = {
    '데이터 확인': 'CSV의 행, 컬럼, 결측치, 기본 구조를 확인합니다.',
    'CSV 형식 검증': '학습에 사용할 수 있는 컬럼과 위험 요소를 점검합니다.',
    '예측 목표 정리': '무엇을 예측할지 후보를 찾고 사용자의 확인이 필요한지 판단합니다.',
    '데이터 누수 점검': '예측 시점에 알 수 없는 정보가 포함됐는지 확인합니다.',
    '모델 준비': '선택한 타깃을 기준으로 모델 학습 또는 비교를 준비합니다.',
    '성능 확인': '모델 결과를 사용할 수 있는 수준인지 확인합니다.',
    '요인 설명': '예측에 영향을 준 주요 컬럼을 정리합니다.',
    '보고서 준비': '근거 기반 보고서에 넣을 내용을 구성합니다.',
    'API 준비': '예측 API로 재사용할 수 있는 상태인지 확인합니다.',
  }
  return copy[label] || step?.purpose || '분석 흐름에 필요한 작업을 수행합니다.'
}

function ProgressSummary({ steps, run, trace }) {
  const completedCount = getCompletedStepCount(steps, run)
  const current = getCurrentStep(steps, run)
  const next = steps.find(step => step.order > (current?.order || 0) && !isStepDone(step))
  const quality = targetQualityInfo(run, trace)
  const complete = isWorkflowComplete(steps, run) && !quality.noMeaningfulTarget
  const displayStatus = complete && isRunReviewNeeded(run) ? '분석 완료 · 검토 필요' : statusLabel(run?.status)
  return (
    <Section title="진행 요약" icon={<ListChecks size={18} />}>
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          현재 상태는 <strong>{displayStatus}</strong>입니다.
          {` ${completedCount}/${steps.length || 0}개 단계가 완료되었습니다.`}
        </p>
        {complete ? (
          <>
            <div className="alert alert-success" style={{ margin: 0 }}>
              분석이 완료되었습니다. 이제 결과 보고서, 예측 API, 새 데이터 예측으로 이어갈 수 있습니다.
            </div>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>다음 단계: 결과 확인</p>
          </>
        ) : steps.filter(isStepDone).slice(-2).map(step => (
          <div key={step.plan_step_id} className="alert alert-success" style={{ margin: 0 }}>
            {step.order}단계 완료: {step.name}
          </div>
        ))}
        {!complete && current && (
          <div className="alert alert-warning" style={{ margin: 0 }}>
            현재 단계: {friendlyStepName(current)}
          </div>
        )}
        {!complete && next && <p style={{ margin: 0, color: 'var(--text-2)' }}>다음 단계: {friendlyStepName(next)}</p>}
      </div>
    </Section>
  )
}

function ConnectedCsvCard({ trace, run }) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const filename = dataset.filename || dataset.original_filename || run?.dataset_name || '연결된 CSV 데이터셋'
  const rows = dataset.row_count ?? dataset.rows ?? run?.row_count
  const cols = dataset.column_count ?? dataset.columns ?? run?.column_count
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col
  return (
    <Section title="연결된 CSV" icon={<Database size={18} />}>
      <div className="workspace-grid four-columns">
        <MetricBox label="파일" value={filename} />
        <MetricBox label="데이터 행" value={infoValue(rows)} />
        <MetricBox label="컬럼" value={infoValue(cols)} />
        <MetricBox label="선택 예측값" value={target || '확인 필요'} />
      </div>
      {!run?.dataset_id && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          이 분석 실행에는 CSV 데이터셋이 연결되어 있지 않아 실제 실행을 계속할 수 없습니다. 목표 기반 분석에서 데이터셋을 선택해 새 분석 실행을 만들어 주세요.
        </div>
      )}
      {run?.dataset_id && (
        <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
          상세 정보: 데이터 연결 {shortId(run.dataset_id)}
          {run.project_id ? ` · 프로젝트: ${shortId(run.project_id)}` : ''}
        </p>
      )}
    </Section>
  )
}

function FinalResultSummary({ trace, run }) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col
  const targetText = targetLabel(target)
  const filename = dataset.filename || dataset.original_filename || run?.dataset_name || '연결된 CSV'
  const rows = dataset.row_count ?? dataset.rows ?? run?.row_count
  const cols = dataset.column_count ?? dataset.columns ?? run?.column_count
  const quality = targetQualityInfo(run, trace)
  const goal = run?.user_goal || run?.interpreted_goal?.goal_text || ''
  const context = goalContext(goal)
  const outputs = [
    '데이터 구조를 확인했습니다.',
    '예측할 값 후보를 찾았습니다.',
    '데이터 누수 가능성을 점검했습니다.',
    '모델 학습과 보고서 생성을 준비했습니다.',
    'API 배포 전 확인 항목을 정리했습니다.',
  ]
  return (
    <Section title="분석 결과" icon={<CheckCircle2 size={18} />}>
      <div className="alert alert-success" style={{ margin: 0 }}>
        이 CSV에 대해 {targetText} 예측 분석이 완료되었습니다.
      </div>
      <div className="card-compact" style={{ display: 'grid', gap: 6 }}>
        <strong>분석 목표</strong>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>{goal || 'CSV에서 의미 있는 예측 목표와 주요 요인을 확인합니다.'}</p>
        <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{context.label} · {context.interpretation}</p>
      </div>
      <div className="workspace-grid four-columns">
        <MetricBox label="CSV" value={filename} />
        <MetricBox label="데이터 행" value={infoValue(rows)} />
        <MetricBox label="컬럼" value={infoValue(cols)} />
        <MetricBox label="예측값" value={targetText} />
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
        {outputs.map(item => <li key={item}>{item}</li>)}
      </ul>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>결과 보고서 보기</Link>
        {quality.apiReady ? (
          <Link className="btn btn-secondary" to="/prediction-apis">예측 API 만들기</Link>
        ) : (
          <button className="btn btn-secondary" type="button" disabled title="예측 API를 만들려면 먼저 예측값을 확정해야 합니다.">
            예측 API는 예측값 확정 후 사용
          </button>
        )}
        <Link className="btn btn-secondary" to="/predict">새 데이터 예측하기</Link>
        <Link className="btn btn-secondary" to="/upload?returnTo=agent-mode">다른 CSV로 분석하기</Link>
        <a className="btn btn-secondary" href="#advanced-trace">고급 실행 기록 보기</a>
      </div>
    </Section>
  )
}

function AgentLlmSummary({ trace }) {
  const reportArtifact = (trace?.artifacts || []).find(item => item.artifact_type === 'report' && item.payload?.llm_summary?.used_llm)
  const data = reportArtifact?.payload?.llm_summary
  if (!data) return null
  return (
    <Section title="AI 분석 요약" icon={<FileText size={18} />}>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>{data.summary}</p>
      <div className="workspace-grid two-columns" style={{ alignItems: 'start' }}>
        {data.goal_interpretation && <div className="card-compact"><strong>목표 기반 해석</strong><p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{data.goal_interpretation}</p></div>}
        {data.model_interpretation && <div className="card-compact"><strong>모델 결과 해석</strong><p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{data.model_interpretation}</p></div>}
        {data.important_factor_explanation && <div className="card-compact"><strong>중요 요인 설명</strong><p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{data.important_factor_explanation}</p></div>}
        {data.review_note && <div className="card-compact"><strong>검토 안내</strong><p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{data.review_note}</p></div>}
      </div>
    </Section>
  )
}

function PostPredictionGuidance({ trace, run, reviews, steps = [], onContinue, onRetry, onStop }) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col
  const quality = targetQualityInfo(run, trace)
  const domain = detectTargetDomain(run, trace)
  const usage = domainUsageCopy(domain, target)
  const weakPerformance = isWeakPerformance(trace)
  const apiRisk = isApiRisky(trace)
  const reviewNeeded = isRunReviewNeeded(run) || hasPendingReview(reviews)
  const workflowComplete = isWorkflowComplete(steps, run)
  const reviewAfterComplete = workflowComplete && reviewNeeded
  const complete = workflowComplete
  const topFeatures = collectTopFeatures(trace)
  const goal = run?.user_goal || run?.interpreted_goal?.goal_text || ''
  const goalInfo = goalContext(goal)

  let interpretation = '모델이 데이터 안에서 예측에 쓸 수 있는 패턴을 찾았습니다.'
  if (quality.noMeaningfulTarget) {
    interpretation = '이 CSV에서는 바로 예측할 만한 명확한 예측값을 찾기 어렵습니다.'
  } else if (reviewAfterComplete) {
    interpretation = '현재 결과는 참고 지표로 사용할 수 있지만, 실제 의사결정 전에는 성능과 주요 요인을 확인하는 것이 좋습니다.'
  } else if (weakPerformance) {
    interpretation = '모델이 어느 정도 예측 가능성을 찾았지만, 성능이 충분히 높지 않을 수 있어 실제 의사결정에는 주의가 필요합니다.'
  } else if (reviewNeeded) {
    interpretation = '자동으로 결정하기 어려운 지점이 발견되었습니다. 확인을 마치면 다음 분석 단계로 이어갈 수 있습니다.'
  } else if (complete) {
    interpretation = '모델이 예측에 사용할 수 있는 구조와 근거를 정리했습니다. 먼저 보고서에서 성능과 주의사항을 확인하는 것을 권장합니다.'
  }

  const actions = []
  if (reviewAfterComplete) {
    actions.push(
      <Link key="report" className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>검토 완료하고 결과 보기</Link>,
      <a key="trace" className="btn btn-secondary" href="#advanced-trace">상세 실행 기록 보기</a>,
      <Link key="goal" className="btn btn-secondary" to="/agent-mode">목표 기반 분석으로 돌아가기</Link>,
      <button key="api-disabled" className="btn btn-secondary" type="button" disabled title="예측 API를 만들기 전에 결과 검토가 필요합니다.">예측 API는 검토 후 사용</button>,
    )
  } else if (reviewNeeded) {
    actions.push(
      <button key="continue" className="btn btn-primary" type="button" onClick={onContinue}>확인하고 계속 실행</button>,
      <a key="target" className="btn btn-secondary" href="#review-panel">예측값 선택</a>,
      <button key="stop" className="btn btn-secondary" type="button" onClick={onStop}>분석 중단</button>,
      <Link key="goal" className="btn btn-secondary" to="/agent-mode">목표 다시 입력</Link>,
    )
  } else if (quality.noMeaningfulTarget) {
    actions.push(
      <Link key="report" className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>데이터 요약 보고서 보기</Link>,
      <Link key="target" className="btn btn-secondary" to="/agent-mode">예측값 다시 선택하기</Link>,
      <Link key="upload" className="btn btn-secondary" to="/upload?returnTo=agent-mode">다른 CSV로 다시 분석하기</Link>,
    )
  } else if (weakPerformance) {
    actions.push(
      <Link key="quality" className="btn btn-primary" to="/projects">데이터 품질 확인하기</Link>,
      <Link key="target" className="btn btn-secondary" to="/agent-mode">예측값 다시 선택하기</Link>,
      <button key="retry" className="btn btn-secondary" type="button" onClick={onRetry}>다른 모델로 재시도</button>,
      <Link key="report" className="btn btn-secondary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>보고서만 보기</Link>,
    )
  } else if (apiRisk) {
    actions.push(
      <Link key="api-check" className="btn btn-primary" to="/prediction-apis">API 배포 전 확인하기</Link>,
      <Link key="report" className="btn btn-secondary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>보고서만 생성하기</Link>,
      <button key="retry" className="btn btn-secondary" type="button" onClick={onRetry}>모델 재학습하기</button>,
    )
  } else {
    actions.push(
      <Link key="report" className="btn btn-primary" to="/reports" state={{ agentRun: run, agentTrace: trace }}>결과 보고서 보기</Link>,
      <a key="factors" className="btn btn-secondary" href="#important-factors">중요 요인 확인하기</a>,
      <Link key="predict" className="btn btn-secondary" to="/predict">새 데이터 예측하기</Link>,
      quality.apiReady
        ? <Link key="api" className="btn btn-secondary" to="/prediction-apis">예측 API 만들기</Link>
        : <button key="api-disabled" className="btn btn-secondary" type="button" disabled>예측값 확정 후 API 사용</button>,
      <Link key="upload" className="btn btn-secondary" to="/upload?returnTo=agent-mode">다른 CSV로 다시 분석하기</Link>,
    )
  }

  return (
    <Section title="다음에 할 일" icon={<ListChecks size={18} />}>
      <div className={quality.noMeaningfulTarget || weakPerformance || apiRisk || reviewNeeded ? 'alert alert-warning' : 'alert alert-success'} style={{ margin: 0 }}>
        {interpretation}
      </div>

      <div className="workspace-grid two-columns" style={{ alignItems: 'start' }}>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>목표 기반 결과 해석</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{goalInfo.interpretation}</p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{goalTargetReason(goal, quality.target || target, !quality.noMeaningfulTarget)}</p>
        </div>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>예측 결과 활용 방법</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{usage.use}</p>
          <p style={{ margin: 0, color: '#92400e', lineHeight: 1.65 }}>{usage.caution}</p>
        </div>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }} id="important-factors">
          <strong>중요 요인 확인</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
            {topFeatures.length
              ? `현재 상세 기록에서 확인된 주요 요인은 ${topFeatures.join(', ')} 순으로 보입니다.`
              : '중요 요인은 보고서 또는 고급 실행 기록에서 확인할 수 있습니다.'}
          </p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>성능과 주요 요인을 함께 확인하세요.</p>
        </div>
      </div>

      <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
        <strong>{goalInfo.label} 다음 행동</strong>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
          {goalInfo.actions.map(action => <li key={action}>{action}</li>)}
        </ul>
      </div>

      <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>추천 예측값 요약</strong>
        <div className="workspace-grid four-columns">
          <MetricBox label="추천 예측값" value={targetLabel(quality.target || target)} />
          <MetricBox label="추천 이유" value={quality.noMeaningfulTarget ? '검토 필요' : '예측 목적과 관련 있음'} />
          <MetricBox label="주의할 점" value={quality.warnings.length ? `${quality.warnings.length}개` : '현재 없음'} />
          <MetricBox label="다음 추천 행동" value={quality.noMeaningfulTarget ? '예측값 검토' : weakPerformance ? '품질 확인' : '보고서 확인'} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{quality.reason}</p>
        {quality.warnings.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', lineHeight: 1.6 }}>
            {quality.warnings.slice(0, 3).map(item => <li key={item}>{item}</li>)}
          </ul>
        )}
        <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13 }}>{quality.nextAction}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>
    </Section>
  )
}

function UserPlanTimeline({ steps }) {
  if (!steps?.length) {
    return <EmptyState title="아직 분석 계획이 없습니다." description="분석 실행 계획이 생성되면 여기에 표시됩니다." />
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {steps.map(step => (
        <div key={step.plan_step_id} className="card-compact" style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>{step.order}. {friendlyStepName(step)}</strong>
            <span className="status-pill">{statusLabel(step.status)}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{friendlyStepPurpose(step)}</p>
          {step.requires_human_review && (
            <span style={{ color: '#92400e', fontSize: 12 }}>사용자 확인 필요: {reviewCopy(step).reason}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ReviewPanel({ reviews, run, trace, steps = [], onResolve, onRetry, onStop, onContinue }) {
  if (isWorkflowComplete(steps, run)) return null
  const pending = reviews.filter(review => review.status === 'pending')
  if (!pending.length && run?.status !== 'waiting_for_review') return null

  if (!pending.length) {
    return (
      <section id="review-panel" className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#92400e" />
          <p className="section-title" style={{ margin: 0 }}>사용자 확인이 필요합니다</p>
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          자동으로 넘기기 어려운 지점이 발견되었습니다. 확인하고 계속 실행하면 다음 분석 단계로 이어지고, 필요하면 현재 단계를 다시 시도하거나 분석을 중단할 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={onContinue}>확인하고 계속 실행</button>
          <button className="btn btn-secondary" type="button" onClick={onRetry}>현재 단계 다시 시도</button>
          <button className="btn btn-secondary" type="button" onClick={onStop}>분석 중단</button>
        </div>
      </section>
    )
  }

  return (
    <section id="review-panel" className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>사용자 확인이 필요합니다</p>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          아래 선택을 완료하면 사용자의 의도를 반영해 다음 분석 단계를 계속 진행합니다.
        </p>
      </div>
      {pending.map(review => {
        const copy = reviewCopy(review)
        return (
          <div key={review.id} className="card-compact" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#92400e" />
              <strong>{copy.title}</strong>
            </div>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{copy.description}</p>
            <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13, lineHeight: 1.55 }}>{copy.reason}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {(review.options || [])
                .filter(option => {
                  const column = optionColumn(option)
                  return !column || isKnownDatasetColumn(trace, column)
                })
                .map((option, index) => {
                const column = optionColumn(option)
                return (
                  <div key={option.id} className="card-compact" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{column || optionLabel(option, index)}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-label)', fontSize: 12 }}>
                        {option.reason || option.description || (index === 0 && option.id?.startsWith('select:') ? '추천 후보입니다. 이 값으로 계속합니다.' : '다음 단계로 진행합니다.')}
                      </p>
                    </div>
                    <button
                      className={option.id === 'stop' || option.id === 'reject' ? 'btn btn-secondary' : 'btn btn-primary'}
                      type="button"
                      onClick={() => onResolve(review, option)}
                    >
                      {optionLabel(option, index)}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function DetailList({ title, items, empty, render }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>{title}</strong>
      {items?.length ? items.map(render) : <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13 }}>{empty}</p>}
    </div>
  )
}

function AdvancedTrace({ trace, reviews }) {
  const toolCalls = trace?.tool_calls || []
  const observations = trace?.observations || []
  const decisions = trace?.decisions || []
  const validations = trace?.validations || []
  const artifacts = trace?.artifacts || []
  return (
    <details className="card" style={{ display: 'grid', gap: 12 }}>
      <summary id="advanced-trace" style={{ cursor: 'pointer', fontWeight: 850 }}>고급 실행 기록 보기 · 개발자/검증용 상세 기록</summary>
      <p style={{ margin: '12px 0 0', color: 'var(--text-2)', lineHeight: 1.6 }}>
        개발자와 검증자가 실제 작업 실행, 확인 내용, 판단, 검증 결과, 생성 결과물을 확인하는 영역입니다. 아래 기록은 저장된 상세 실행 데이터를 그대로 표시합니다.
      </p>
      <div className="workspace-grid four-columns" style={{ marginTop: 12 }}>
        <MetricBox label="작업 실행" value={toolCalls.length} />
        <MetricBox label="확인 내용" value={observations.length} />
        <MetricBox label="판단" value={decisions.length} />
        <MetricBox label="생성된 결과" value={artifacts.length} />
      </div>
      <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>검증용 요약입니다. 자세한 기록은 아래에서 확인하세요.</p>
      <div className="workspace-grid two-columns" style={{ alignItems: 'start', marginTop: 12 }}>
        <DetailList
          title="작업 실행"
          items={toolCalls}
          empty="아직 실행된 작업이 없습니다."
          render={call => (
            <div key={call.id} className="card-compact">
              <strong>{call.tool_name}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{call.input_summary || call.status}</p>
            </div>
          )}
        />
        <DetailList
          title="확인 내용"
          items={observations}
          empty="아직 발견 내용이 없습니다."
          render={observation => (
            <div key={observation.id} className="card-compact">
              <strong>{observation.severity || 'info'}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{observation.summary}</p>
            </div>
          )}
        />
        <DetailList
          title="판단"
          items={decisions}
          empty="아직 판단 기록이 없습니다."
          render={decision => (
            <div key={decision.id} className="card-compact">
              <strong>{decision.action}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{decision.reason}</p>
            </div>
          )}
        />
        <DetailList
          title="검증 결과"
          items={validations}
          empty="검증 결과가 없습니다."
          render={validation => (
            <div key={validation.id} className="card-compact">
              <strong>{validation.passed ? '통과' : '확인 필요'} · {validation.severity}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{validation.message}</p>
            </div>
          )}
        />
        <DetailList
          title="생성된 결과물"
          items={artifacts}
          empty="생성된 결과물이 없습니다."
          render={artifact => (
            <div key={artifact.id} className="card-compact">
              <strong>{artifact.artifact_type}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{artifact.title}</p>
              {artifact.route_hint && <Link to={artifact.route_hint}>열기</Link>}
            </div>
          )}
        />
        <DetailList
          title="사용자 확인 기록"
          items={reviews}
          empty="사용자 확인 기록이 없습니다."
          render={review => (
            <div key={review.id} className="card-compact">
              <strong>{review.status}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{review.prompt || review.context_summary}</p>
            </div>
          )}
        />
      </div>
    </details>
  )
}

export default function AgentRunDetail() {
  const params = useParams()
  const agentRunId = params.agentRunId || params.id
  const [trace, setTrace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadTrace()
  }, [agentRunId])

  async function loadTrace() {
    setLoading(true)
    setError('')
    setWarning('')
    if (!agentRunId) {
      setError('분석 실행을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    try {
      const traceResponse = await api.get(`/agent-runs/${agentRunId}/trace`)
      setTrace(traceResponse.data)
      try {
        const reviewsResponse = await api.get(`/agent-runs/${agentRunId}/reviews`)
        setReviews(reviewsResponse.data?.reviews || [])
      } catch {
        setReviews([])
        setWarning('검토 요청 정보 일부를 불러오지 못했습니다. 저장된 상세 실행 기록은 계속 표시합니다.')
      }
    } catch (err) {
      const message = normalizeError(err, '분석 실행을 찾을 수 없습니다.')
      setError(err.response?.status === 404 ? '분석 실행을 찾을 수 없습니다.' : message)
    } finally {
      setLoading(false)
    }
  }

  async function continueRun() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/execute`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, '분석 실행을 계속 진행하지 못했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function retryStep() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/retry-step`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, '현재 단계 재시도에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function stopRun() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/stop`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, '분석 실행 중단에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function resolveReview(review, option) {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/reviews/${review.id}/resolve`, {
        selected_option: option.id,
        user_note: optionLabel(option, 0),
      })
      if (option.id === 'retry') {
        await retryStep()
      } else if (option.id === 'stop' || option.id === 'reject') {
        await stopRun()
      } else if (option.id === 'approve' || option.id === 'continue' || option.id === 'exclude' || option.id?.startsWith('select:')) {
        await continueRun()
      } else {
        await loadTrace()
      }
    } catch (err) {
      setError(normalizeError(err, '사용자 확인 처리에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  const run = trace?.analysis_run || trace?.run
  const planSteps = trace?.plan_steps || trace?.steps || []
  const detailQuality = targetQualityInfo(run, trace)
  const reviewPending = isRunReviewNeeded(run) || reviews.some(review => review.status === 'pending')
  const complete = isRunComplete(run) && !detailQuality.noMeaningfulTarget && !reviewPending
  const mismatchWarning = detectGoalDatasetMismatch(run, trace)
  const invariantWarning = traceInvariantWarning(run, trace)

  if (loading) return <LoadingState label="상세 실행 기록을 불러오는 중입니다." />
  if (error && !trace) {
    return (
      <ErrorState
        message={error || '분석 실행을 찾을 수 없습니다.'}
        action={<button className="btn-secondary" type="button" onClick={loadTrace}>다시 불러오기</button>}
      />
    )
  }

  return (
    <main className="workspace-page" style={{ display: 'grid', gap: 20 }}>
      <SummaryHero run={run} trace={trace} reviews={reviews} steps={planSteps} onContinue={continueRun} actionLoading={actionLoading} />

      {warning && <div className="alert alert-warning"><AlertTriangle size={16} /> {warning}</div>}
      {error && <div className="alert alert-warning"><AlertTriangle size={16} /> {error}</div>}
      {mismatchWarning && <div className="alert alert-warning"><AlertTriangle size={16} /> {mismatchWarning}</div>}
      {invariantWarning && <div className="alert alert-warning"><AlertTriangle size={16} /> {invariantWarning}</div>}

      <CoreResultCards trace={trace} run={run} />

      {complete && <FinalResultSummary trace={trace} run={run} />}
      <AgentLlmSummary trace={trace} />

      <ReviewPanel
        reviews={reviews}
        run={run}
        trace={trace}
        steps={planSteps}
        onResolve={resolveReview}
        onRetry={retryStep}
        onStop={stopRun}
        onContinue={continueRun}
      />

      <PostPredictionGuidance
        trace={trace}
        run={run}
        reviews={reviews}
        steps={planSteps}
        onContinue={continueRun}
        onRetry={retryStep}
        onStop={stopRun}
      />

      <ConnectedCsvCard trace={trace} run={run} />
      <ProgressSummary steps={planSteps} run={run} trace={trace} />

      <Section title="진행 타임라인" icon={<Box size={18} />}>
        <UserPlanTimeline steps={planSteps} />
      </Section>

      <Section title="고급 실행 기록 요약" icon={<FileText size={18} />}>
        <div className="workspace-grid four-columns">
          <MetricBox label="작업 실행" value={trace?.tool_calls?.length || 0} />
          <MetricBox label="확인 내용" value={trace?.observations?.length || 0} />
          <MetricBox label="판단" value={trace?.decisions?.length || 0} />
          <MetricBox label="생성된 결과" value={trace?.artifacts?.length || 0} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          위 숫자는 검증과 포트폴리오 확인을 위한 실행 기록 요약입니다. 사용자가 봐야 할 핵심 결과는 상단의 분석 결과와 다음 행동입니다.
        </p>
      </Section>

      <AdvancedTrace trace={trace} reviews={reviews} />
    </main>
  )
}
