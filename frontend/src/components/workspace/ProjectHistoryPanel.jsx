import { useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import api from '../../api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

const fmtMetric = item => {
  if (!item?.last_metric_name) return 'No metric yet'
  const numericValue = Number(item.last_metric_value)
  const value = Number.isFinite(numericValue) ? numericValue.toFixed(4) : '-'
  return `${item.last_metric_name} ${value}`
}

export default function ProjectHistoryPanel({ projects = [], user, onRerun }) {
  const [detail, setDetail] = useState(null)
  const [loadingId, setLoadingId] = useState('')
  const [message, setMessage] = useState('')

  async function openProject(project) {
    setLoadingId(project.id)
    setMessage('')
    try {
      const { data } = await api.get(`/projects/${project.id}`)
      setDetail(data)
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Could not open this project.')
    } finally {
      setLoadingId('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your saved projects</CardTitle>
        <CardDescription>Reopen past analyses, review reports, and rerun workflows.</CardDescription>
      </CardHeader>
      <CardContent>
        {!user?.is_guest && !projects.length && (
          <div className="empty-state" style={{ padding: '34px 16px' }}>
            <p className="empty-title">No saved projects yet</p>
            <p className="empty-desc">Upload a CSV while signed in to save project history here.</p>
          </div>
        )}
        {user?.is_guest && (
          <div className="banner-warning" style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>Sign in to save projects and reopen analysis history.</p>
          </div>
        )}
        {message && (
          <div className="banner-warning" style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>{message}</p>
          </div>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {projects.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project)}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 13, borderRadius: 12, border: '1px solid var(--border-sub)', background: detail?.id === project.id ? '#eff6ff' : 'var(--surface-alt)', textAlign: 'left', cursor: 'pointer' }}
            >
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                  <b style={{ color: 'var(--text)' }}>{project.name}</b>
                  <Badge variant={project.last_status === 'failed' ? 'danger' : project.last_status ? 'success' : 'secondary'}>
                    {project.last_status || 'no runs'}
                  </Badge>
                  {project.last_job_status && (
                    <Badge variant={project.last_job_status === 'failed' ? 'danger' : project.last_job_status === 'succeeded' ? 'success' : 'secondary'}>
                      job {project.last_job_status}
                    </Badge>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
                  {project.dataset_name || 'No dataset'} / {project.last_target || 'No target'} / {project.last_best_model || 'No model'} / {fmtMetric(project)}
                </p>
                {project.last_job_progress_message && (
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
                    Latest job: {project.last_job_progress_message}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
                {loadingId === project.id ? 'Opening...' : String(project.updated_at || '').slice(0, 10)}
              </span>
            </button>
          ))}
        </div>
        {detail && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: '1px solid #bfdbfe', background: '#f8fbff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div>
                <b style={{ color: 'var(--text)' }}>{detail.name}</b>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                  {detail.run_count} runs / {detail.datasets?.length || 0} datasets / {detail.has_prediction_api ? 'Prediction API linked' : 'No prediction API'}
                </p>
                {detail.last_job_status && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
                    Latest job: {detail.last_job_status} / {detail.last_job_progress_message || 'No message'}
                  </p>
                )}
                {detail.last_error_type && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b91c1c' }}>
                    {detail.last_error_type}: {detail.last_error_message || 'Training failed.'}
                  </p>
                )}
                {detail.last_recommended_next_action && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#047857' }}>
                    Next: {detail.last_recommended_next_action}
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => onRerun?.(detail)}>
                <RefreshCw size={14} /> Rerun
              </Button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(detail.analysis_runs || []).slice(0, 5).map(run => (
                <div key={run.analysis_run_id} style={{ padding: 10, borderRadius: 10, background: 'white', border: '1px solid var(--border-sub)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <b style={{ fontSize: 13 }}>{run.target || run.goal || 'Saved run'}</b>
                    <Badge variant={run.status === 'failed' ? 'danger' : 'secondary'}>{run.status}</Badge>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                    {run.task_type || 'trace'} / {run.best_model || 'No model'} / {run.metric_name || 'Metric'} {run.metric_value ?? '-'}
                  </p>
                </div>
              ))}
              {!(detail.analysis_runs || []).length && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>No analysis runs are linked yet.</p>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(detail.available_reports || []).length ? detail.available_reports.slice(0, 3).map(report => (
                <Badge key={report.report_id} variant="default"><FileText size={12} /> {report.title}</Badge>
              )) : <Badge variant="secondary">Report is not available for this run yet.</Badge>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
