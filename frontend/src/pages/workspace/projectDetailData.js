import api from '../../api'
import { fmt, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

export const PROJECT_TABS = [
  { id: 'overview', label: '개요' },
  { id: 'runs', label: '실행 기록' },
  { id: 'report', label: '보고서' },
  { id: 'api', label: '예측 API' },
  { id: 'dataset', label: '데이터셋' },
  { id: 'settings', label: '설정' },
]

export async function loadProjectDetail(projectId) {
  const [projectRes, jobsRes, tokensRes, usageRes] = await Promise.all([
    api.get(`/projects/${projectId}`),
    api.get(`/projects/${projectId}/jobs`).catch(() => ({ data: [] })),
    api.get(`/projects/${projectId}/prediction-tokens`).catch(() => ({ data: null })),
    api.get('/me/usage').catch(() => ({ data: null })),
  ])
  return {
    project: projectRes.data,
    jobs: jobsRes.data || [],
    tokens: tokensRes.data,
    usage: usageRes.data,
  }
}

export function projectPrimaryAction(project) {
  const dataset = activeDataset(project)
  if (!dataset) return { label: '새 데이터로 분석', path: '/new', disabled: false }
  if (dataset.deleted_at || dataset.delete_status === 'deleted') return { label: '삭제된 데이터셋', path: null, disabled: true }
  if (project.last_run_id) return { label: '같은 설정으로 재실행', runId: project.last_run_id, disabled: false }
  return { label: '분석 시작', path: '/new', disabled: false }
}

export function activeDataset(project) {
  return (project.datasets || []).find(item => !item.deleted_at && item.delete_status !== 'deleted') || project.dataset_summary || null
}

export function latestRun(project) {
  return (project.analysis_runs || [])[0] || null
}

export function latestReport(project) {
  return (project.available_reports || [])[0] || null
}

export function projectSummaryText(project) {
  const target = projectTarget(project)
  const dataset = projectDatasetName(project)
  if (!target || target === '-') return `${dataset} 데이터셋을 기반으로 저장된 분석 프로젝트입니다.`
  return `${dataset} 데이터셋에서 ${target} 예측을 관리하는 프로젝트입니다.`
}

export function runMetric(run) {
  return run?.metric_value === undefined || run?.metric_value === null
    ? '-'
    : `${run.metric_name || 'metric'}: ${Number(run.metric_value).toFixed(4)}`
}

export function projectMetric(project) {
  return primaryMetric(project)
}

export function runFromProject(project, runId) {
  return (project.analysis_runs || []).find(item => item.analysis_run_id === runId) || null
}

export function makeRunTimeline(run, project, jobs = []) {
  const job = jobs.find(item => item.analysis_run_id === run?.analysis_run_id || item.source_run_id === run?.analysis_run_id)
  const status = run?.status || job?.status || 'unknown'
  const failed = status === 'failed'
  const unavailable = '아직 상세 실행 로그가 저장되지 않았습니다.'
  return [
    {
      name: 'Goal / plan',
      status: run?.goal ? 'succeeded' : 'unknown',
      observation: run?.goal || unavailable,
      decision: run?.target ? `${run.target} 예측 흐름으로 진행` : '저장된 목표 정보가 부족합니다.',
      timestamp: run?.created_at,
    },
    {
      name: 'Data profiling',
      status: project?.dataset_summary ? 'succeeded' : 'unknown',
      observation: project?.dataset_summary ? `${fmt(project.dataset_summary.rows || project.dataset_summary.row_count)} rows, ${fmt(project.dataset_summary.columns || project.dataset_summary.column_count)} columns` : unavailable,
      decision: project?.dataset_summary?.deleted_at ? '데이터셋 삭제로 재실행 제한' : '학습 가능한 데이터셋으로 기록됨',
    },
    {
      name: 'Schema validation',
      status: project?.known_warnings?.length ? 'warning' : 'succeeded',
      observation: project?.known_warnings?.[0] || '차단 이슈 없이 저장된 프로젝트입니다.',
      decision: project?.known_warnings?.length ? '검토 후 진행 필요' : '다음 단계 진행 가능',
    },
    {
      name: 'Target recommendation',
      status: run?.target ? 'succeeded' : 'unknown',
      observation: run?.target ? `Target: ${run.target}` : unavailable,
      decision: run?.task_type ? `Task type: ${run.task_type}` : '작업 유형 정보가 없습니다.',
    },
    {
      name: 'Leakage check',
      status: run?.warnings_count ? 'warning' : 'unknown',
      observation: run?.warnings_count ? `${run.warnings_count} warning(s) recorded` : unavailable,
      decision: run?.warnings_count ? '특징/누수 경고 검토 필요' : '저장된 상세 경고 없음',
    },
    {
      name: 'Model training',
      status: failed ? 'failed' : run?.best_model ? 'succeeded' : status,
      observation: run?.best_model ? `Best model: ${run.best_model}` : (job?.progress_message || unavailable),
      decision: failed ? '학습이 완료되지 않았습니다.' : '후보 모델 결과 저장됨',
      error: failed ? (run?.failure_message || job?.error_message) : '',
      timestamp: job?.finished_at || job?.failed_at,
    },
    {
      name: 'Evaluation',
      status: run?.metric_value !== null && run?.metric_value !== undefined ? 'succeeded' : 'unknown',
      observation: runMetric(run),
      decision: run?.metric_value !== null && run?.metric_value !== undefined ? '성능 지표를 보고서/비교 화면에서 확인 가능' : unavailable,
    },
    {
      name: 'Explanation / XAI',
      status: run?.best_model ? 'unknown' : 'unknown',
      observation: unavailable,
      decision: '이전 설명 화면에서 가능한 범위의 근거를 확인합니다.',
    },
    {
      name: 'Validation / trust check',
      status: run?.warnings_count ? 'warning' : 'unknown',
      observation: run?.warnings_count ? '경고가 있는 결과입니다.' : unavailable,
      decision: run?.warnings_count ? '보고서에서 제한사항 확인 필요' : '추가 검토 정보 없음',
    },
    {
      name: 'Report generation',
      status: run?.report_id ? 'succeeded' : 'unknown',
      observation: run?.report_id ? `Report metadata: ${run.report_id}` : unavailable,
      decision: run?.report_id ? '보고서 탭에서 요약 확인 가능' : '성공한 실행 후 보고서를 확인하세요.',
    },
    {
      name: 'API readiness',
      status: project?.has_prediction_api ? 'ready' : 'unknown',
      observation: project?.has_prediction_api ? 'Prediction API metadata exists.' : 'API token is not ready yet.',
      decision: project?.has_prediction_api ? 'API 탭에서 토큰 상태 확인' : '모델 공유 후 API를 만들 수 있습니다.',
    },
  ]
}

export function failureMessage(run, project) {
  const dataset = activeDataset(project)
  if (dataset?.deleted_at || dataset?.delete_status === 'deleted') {
    return {
      title: '데이터셋이 삭제되어 재실행할 수 없습니다.',
      cause: '원본 CSV가 필요한 재분석과 API 사용이 제한됩니다.',
      action: '새 데이터셋을 업로드해 다시 분석하세요.',
    }
  }
  if (run?.status === 'failed') {
    return {
      title: '분석을 완료하지 못했습니다.',
      cause: run.failure_message || '데이터 형식, 타깃 컬럼, 학습 설정 중 하나에서 문제가 발생했습니다.',
      action: run.can_rerun ? '설정을 확인한 뒤 같은 프로젝트에서 재실행할 수 있습니다.' : '새 분석으로 돌아가 데이터와 타깃을 다시 선택하세요.',
    }
  }
  return null
}
