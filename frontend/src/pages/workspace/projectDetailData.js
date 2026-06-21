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

export function activeDataset(project) {
  return (project?.datasets || []).find(item => !item.deleted_at && item.delete_status !== 'deleted') || project?.dataset_summary || null
}

export function datasetForRun(project, run) {
  const datasets = (project?.datasets || []).filter(Boolean)
  if (run?.dataset_id) {
    return datasets.find(item => String(item.dataset_id || item.id) === String(run.dataset_id)) || null
  }
  return datasets.length === 1 ? datasets[0] : null
}

export function runIdentityWarning(project, run) {
  if (!run) return '분석 실행 정보를 찾을 수 없습니다.'
  const dataset = datasetForRun(project, run)
  if (!run.dataset_id && (project?.datasets || []).length > 1) return '이전 분석에 사용한 데이터셋 참조가 없어 현재 프로젝트의 다른 결과와 섞이지 않도록 상세 결과를 제한합니다.'
  if (run.dataset_id && !dataset) return '현재 분석 기록과 일치하지 않는 결과는 표시하지 않습니다.'
  if (run.project_id && String(run.project_id) !== String(project?.id || project?.project_id)) return '현재 분석 기록과 일치하지 않는 결과는 표시하지 않습니다.'
  return ''
}

export function latestRun(project) {
  return (project?.analysis_runs || [])[0] || null
}

export function latestReport(project) {
  return (project?.available_reports || [])[0] || null
}

export function projectPrimaryAction(project) {
  const dataset = activeDataset(project)
  if (!dataset) return { label: '데이터로 분석', path: '/new', disabled: false }
  if (dataset.deleted_at || dataset.delete_status === 'deleted') return { label: '삭제된 데이터셋', path: null, disabled: true }
  if (project.last_run_id) {
    const run = latestRun(project)
    const runDataset = datasetForRun(project, run)
    if (!runDataset || runIdentityWarning(project, run)) return { label: '실행 기록 확인', path: `/projects/${project.id}?tab=runs`, disabled: false }
    return { label: '같은 설정으로 재실행', runId: project.last_run_id, disabled: false }
  }
  return { label: '분석 시작', path: '/new', disabled: false }
}

export function projectSummaryText(project) {
  const target = projectTarget(project)
  const dataset = projectDatasetName(project)
  if (!target || target === '-') return `${dataset} 데이터셋을 기반으로 저장된 분석 프로젝트입니다.`
  return `${dataset} 데이터셋에서 ${target} 예측 흐름을 관리하는 프로젝트입니다.`
}

export function runMetric(run) {
  return run?.metric_value === undefined || run?.metric_value === null
    ? '성능 지표 확인 필요'
    : `${run.metric_name || 'metric'}: ${Number(run.metric_value).toFixed(4)}`
}

export function projectMetric(project) {
  return primaryMetric(project)
}

export function runFromProject(project, runId) {
  return (project?.analysis_runs || []).find(item => item.analysis_run_id === runId) || null
}

export function makeRunTimeline(run, project, jobs = []) {
  const runDataset = datasetForRun(project, run)
  const job = jobs.find(item => item.analysis_run_id === run?.analysis_run_id || item.source_run_id === run?.analysis_run_id)
  const status = run?.status || job?.status || 'unknown'
  const failed = status === 'failed'
  const unavailable = '아직 상세 실행 로그가 저장되지 않았습니다.'
  return [
    {
      name: '목표와 계획',
      status: run?.goal ? 'succeeded' : 'unknown',
      observation: run?.goal || unavailable,
      decision: run?.target ? `${run.target} 예측 흐름으로 진행` : '저장된 목표 정보가 부족합니다.',
      timestamp: run?.created_at,
    },
    {
      name: '데이터 구조 분석',
      status: runDataset ? 'succeeded' : 'unknown',
      observation: runDataset ? `${runDataset.original_filename || runDataset.filename} · ${fmt(runDataset.rows || runDataset.row_count)}행 / ${fmt(runDataset.columns || runDataset.column_count)}열` : unavailable,
      decision: runDataset?.deleted_at ? '데이터셋 삭제로 재실행 제한' : (runDataset ? '이 실행에 연결된 데이터셋 확인' : '데이터셋 참조 확인 필요'),
    },
    {
      name: '스키마 검증',
      status: project?.known_warnings?.length ? 'warning' : 'succeeded',
      observation: project?.known_warnings?.[0] || '차단 이슈 없이 저장된 프로젝트입니다.',
      decision: project?.known_warnings?.length ? '검토 후 진행 필요' : '다음 단계 진행 가능',
    },
    {
      name: '타깃 추천',
      status: run?.target ? 'succeeded' : 'unknown',
      observation: run?.target ? `타깃: ${run.target}` : unavailable,
      decision: run?.task_type ? `작업 유형: ${run.task_type}` : '작업 유형 정보가 없습니다.',
    },
    {
      name: '누수 가능성 평가',
      status: run?.warnings_count ? 'warning' : 'unknown',
      observation: run?.warnings_count ? `${run.warnings_count}개 경고가 기록되었습니다.` : unavailable,
      decision: run?.warnings_count ? '결과 해석 전 경고 검토 필요' : '저장된 상세 경고 없음',
    },
    {
      name: '모델 학습',
      status: failed ? 'failed' : run?.best_model ? 'succeeded' : status,
      observation: run?.best_model ? `추천 모델: ${run.best_model}` : (job?.progress_message || unavailable),
      decision: failed ? '학습을 완료하지 못했습니다.' : '후보 모델 결과 저장됨',
      error: failed ? (run?.failure_message || job?.error_message) : '',
      timestamp: job?.finished_at || job?.failed_at,
    },
    {
      name: '성능 평가',
      status: run?.metric_value !== null && run?.metric_value !== undefined ? 'succeeded' : 'unknown',
      observation: runMetric(run),
      decision: run?.metric_value !== null && run?.metric_value !== undefined ? '성능 지표를 보고서와 비교 화면에서 확인할 수 있습니다.' : unavailable,
    },
    {
      name: '설명 가능성 / XAI',
      status: 'unknown',
      observation: unavailable,
      decision: '설명 화면에서 가능한 범위의 근거를 확인합니다.',
    },
    {
      name: '보고서 생성',
      status: run?.report_id ? 'succeeded' : 'unknown',
      observation: run?.report_id ? `보고서 메타데이터: ${run.report_id}` : unavailable,
      decision: run?.report_id ? '보고서 탭에서 요약 확인 가능' : '성공한 실행 후 보고서를 확인하세요.',
    },
    {
      name: 'API 준비 상태',
      status: project?.has_prediction_api ? 'ready' : 'unknown',
      observation: project?.has_prediction_api ? '예측 API 메타데이터가 있습니다.' : 'API 인증 정보가 아직 준비되지 않았습니다.',
      decision: project?.has_prediction_api ? 'API 탭에서 인증 상태 확인' : '모델 공유 후 API를 만들 수 있습니다.',
    },
  ]
}

export function failureMessage(run, project) {
  const dataset = datasetForRun(project, run)
  if (dataset?.deleted_at || dataset?.delete_status === 'deleted') {
    return {
      title: '데이터셋이 삭제되어 다시 실행할 수 없습니다.',
      cause: '원본 CSV가 필요한 재실행과 API 사용이 제한됩니다.',
      action: '새 데이터셋을 업로드해 다시 분석하세요.',
    }
  }
  if (run?.status === 'failed') {
    return {
      title: '분석을 완료하지 못했습니다.',
      cause: run.failure_message || '데이터 형식, 타깃 컬럼, 학습 설정 중 하나에서 문제가 발생했습니다.',
      action: run.can_rerun ? '설정을 확인한 뒤 같은 프로젝트에서 다시 실행할 수 있습니다.' : '새 분석으로 돌아가 데이터와 타깃을 다시 선택하세요.',
    }
  }
  return null
}
