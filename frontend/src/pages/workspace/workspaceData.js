import api from '../../api'

export async function loadWorkspaceOverview() {
  const [projectsRes, historyRes, datasetsRes, usageRes, deployedRes] = await Promise.all([
    api.get('/projects').catch(() => ({ data: [] })),
    api.get('/history').catch(() => ({ data: [] })),
    api.get('/datasets').catch(() => ({ data: [] })),
    api.get('/me/usage').catch(() => ({ data: null })),
    api.get('/deployed').catch(() => ({ data: [] })),
  ])
  const projects = projectsRes.data || []
  const jobs = await loadJobsForProjects(projects.slice(0, 12))
  const reports = await loadReportsForProjects(projects.slice(0, 12))
  return {
    projects,
    history: historyRes.data || [],
    datasets: datasetsRes.data || [],
    usage: usageRes.data,
    deployed: deployedRes.data || [],
    jobs,
    reports,
  }
}

export async function loadJobsForProjects(projects) {
  const nested = await Promise.all(projects.map(project =>
    api.get(`/projects/${project.id}/jobs`)
      .then(res => (res.data || []).map(job => ({ ...job, project })))
      .catch(() => [])
  ))
  return nested.flat().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export async function loadReportsForProjects(projects) {
  const nested = await Promise.all(projects.map(project =>
    api.get(`/projects/${project.id}/reports`)
      .then(res => (res.data || []).map(report => ({ ...report, project })))
      .catch(() => [])
  ))
  return nested.flat().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export async function loadPredictionApiRows(projects) {
  return Promise.all(projects.map(project =>
    api.get(`/projects/${project.id}/prediction-tokens`)
      .then(res => ({ project, availability: res.data.availability, tokens: res.data.tokens || [] }))
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
  return value === undefined || value === null ? '-' : Number(value).toFixed ? Number(value).toFixed(4) : value
}

export function projectDatasetName(project) {
  return project?.dataset_name || project?.dataset_summary?.filename || project?.latest_dataset?.filename || '데이터셋 없음'
}

export function projectTarget(project) {
  return project?.last_target || project?.dataset_summary?.target_col || project?.latest_run?.target || project?.latest_dataset?.target_col
}

export function fmt(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}
