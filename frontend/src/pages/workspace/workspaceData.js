import api from '../../api'

export function asArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.projects)) return value.projects
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.datasets)) return value.datasets
  if (Array.isArray(value?.reports)) return value.reports
  if (Array.isArray(value?.jobs)) return value.jobs
  if (Array.isArray(value?.tokens)) return value.tokens
  return []
}

export async function loadWorkspaceOverview() {
  const [projectsRes, historyRes, datasetsRes, usageRes, deployedRes] = await Promise.all([
    api.get('/projects').catch(() => ({ data: [] })),
    api.get('/history').catch(() => ({ data: [] })),
    api.get('/datasets').catch(() => ({ data: [] })),
    api.get('/me/usage').catch(() => ({ data: null })),
    api.get('/deployed').catch(() => ({ data: [] })),
  ])
  const projects = asArray(projectsRes.data)
  const jobs = await loadJobsForProjects(projects.slice(0, 12))
  const reports = await loadReportsForProjects(projects.slice(0, 12))
  return {
    projects,
    history: asArray(historyRes.data),
    datasets: asArray(datasetsRes.data),
    usage: usageRes.data,
    deployed: asArray(deployedRes.data),
    jobs,
    reports,
  }
}

export async function loadJobsForProjects(projects) {
  const nested = await Promise.all(asArray(projects).filter(project => project?.id).map(project =>
    api.get(`/projects/${project.id}/jobs`)
      .then(res => (res.data || []).map(job => ({ ...job, project })))
      .catch(() => [])
  ))
  return nested.flat().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export async function loadWorkspaceJobs() {
  const [direct, projectsRes, datasetsRes] = await Promise.all([
    api.get('/jobs').catch(() => null),
    api.get('/projects').catch(() => ({ data: [] })),
    api.get('/datasets').catch(() => ({ data: [] })),
  ])
  if (direct?.data) {
    const directJobs = asArray(direct.data)
    if (directJobs.length || Array.isArray(direct.data)) {
      const projects = asArray(projectsRes.data)
      const datasets = asArray(datasetsRes.data)
      const projectMap = new Map(projects.filter(item => item?.id).map(item => [String(item.id), item]))
      const datasetMap = new Map(datasets.filter(item => item?.id || item?.dataset_id).map(item => [String(item.id || item.dataset_id), item]))
      return directJobs.map(job => ({
        ...job,
        project: job.project || projectMap.get(String(job.project_id || '')) || null,
        dataset: datasetMap.get(String(job.dataset_id || '')) || null,
      })).sort((a, b) => String(b.updated_at || b.finished_at || b.created_at || '').localeCompare(String(a.updated_at || a.finished_at || a.created_at || '')))
    }
  }
  return loadJobsForProjects(asArray(projectsRes.data))
}

export async function loadReportsForProjects(projects) {
  const nested = await Promise.all(asArray(projects).filter(project => project?.id).map(project =>
    api.get(`/projects/${project.id}/reports`)
      .then(res => (res.data || []).map(report => ({ ...report, project })))
      .catch(() => [])
  ))
  return nested.flat().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export async function loadWorkspaceReports() {
  const direct = await api.get('/reports').catch(() => null)
  if (direct?.data) {
    const directReports = asArray(direct.data)
    if (directReports.length || Array.isArray(direct.data)) return directReports
  }
  const projectsRes = await api.get('/projects').catch(() => ({ data: [] }))
  return loadReportsForProjects(asArray(projectsRes.data))
}

export async function loadPredictionApiRows(projects) {
  return Promise.all(asArray(projects).filter(project => project?.id).map(project =>
    api.get(`/projects/${project.id}/prediction-tokens`)
      .then(res => ({ project, availability: res.data?.availability || null, tokens: asArray(res.data?.tokens) }))
      .catch(() => ({ project, availability: null, tokens: [] }))
  ))
}

export function primaryMetric(item) {
  if (item?.last_metric_value !== undefined && item?.last_metric_value !== null) {
    const name = item.last_metric_name ? `${item.last_metric_name}: ` : ''
    return `${name}${Number(item.last_metric_value).toFixed(4)}`
  }
  const first = item?.results?.[0] || {}
  const value = item?.tuned_score ?? first.roc_auc ?? first.r2 ?? first.accuracy
  return value === undefined || value === null ? '확인 필요' : Number(value).toFixed ? Number(value).toFixed(4) : value
}

export function projectDatasetName(project) {
  return project?.dataset_name || project?.dataset_summary?.filename || project?.latest_dataset?.filename || '데이터셋 없음'
}

export function projectTarget(project) {
  return project?.last_target || project?.dataset_summary?.target_col || project?.latest_run?.target || project?.latest_dataset?.target_col
}

export function fmt(value) {
  if (value === null || value === undefined || value === '') return '확인 필요'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

export function formatTimestamp(value) {
  if (!value) return '기록 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export function taskTypeLabel(value) {
  return ({ classification: '분류 예측', regression: '수치 예측' }[value] || '유형 확인 필요')
}

export function runTypeLabel(item) {
  const value = item?.run_type || item?.result_summary?.run_type || item?.source || item?.artifact_refs?.source
  if (value === 'goal_based_analysis' || value === 'agent_trace') return '목표 기반 분석'
  if (value === 'quick_analysis' || value === 'quick_auto_analysis') return '빠른 자동 분석'
  if (item?.rerun_of || item?.source_run_id) return '다시 실행'
  return '새 분석'
}

export function datasetDisplayName(dataset) {
  return dataset?.original_filename || dataset?.filename || 'CSV 이름 확인 필요'
}
