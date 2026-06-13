import { useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import api from '../../api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { statusLabel } from '../workspace-shell/WorkspaceStates'

const fmtMetric = item => {
  if (!item?.last_metric_name) return '아직 지표 없음'
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
      setMessage(error.response?.data?.detail || '프로젝트를 열지 못했습니다. 로그인 상태와 프로젝트 권한을 확인해 주세요.')
    } finally {
      setLoadingId('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>저장된 프로젝트</CardTitle>
        <CardDescription>이전 분석을 다시 열고 보고서, 실행 기록, 재실행 흐름을 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {!user?.is_guest && !projects.length && (
          <div className="empty-state" style={{ padding: '34px 16px' }}>
            <p className="empty-title">아직 저장된 프로젝트가 없습니다.</p>
            <p className="empty-desc">로그인한 상태에서 CSV를 업로드하면 프로젝트 기록이 여기에 저장됩니다.</p>
          </div>
        )}
        {user?.is_guest && (
          <div className="banner-warning" style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>로그인하면 프로젝트와 분석 기록을 저장하고 다시 열어볼 수 있습니다.</p>
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
                    {project.last_status ? statusLabel(project.last_status) : '실행 없음'}
                  </Badge>
                  {project.last_job_status && (
                    <Badge variant={project.last_job_status === 'failed' ? 'danger' : project.last_job_status === 'succeeded' ? 'success' : 'secondary'}>
                      작업 {statusLabel(project.last_job_status)}
                    </Badge>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
                  {project.dataset_name || '데이터셋 없음'} / {project.last_target || '타깃 없음'} / {project.last_best_model || '모델 없음'} / {fmtMetric(project)}
                </p>
                {project.last_job_progress_message && (
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
                    최근 작업: {project.last_job_progress_message}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
                {loadingId === project.id ? '여는 중...' : String(project.updated_at || '').slice(0, 10)}
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
                  실행 {detail.run_count}개 / 데이터셋 {detail.datasets?.length || 0}개 / {detail.has_prediction_api ? '예측 API 연결됨' : '예측 API 없음'}
                </p>
                {detail.last_job_status && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
                    최근 작업: {statusLabel(detail.last_job_status)} / {detail.last_job_progress_message || '저장된 메시지 없음'}
                  </p>
                )}
                {detail.last_error_type && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b91c1c' }}>
                    {detail.last_error_type}: {detail.last_error_message || '분석에 실패했습니다.'}
                  </p>
                )}
                {detail.last_recommended_next_action && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#047857' }}>
                    다음 행동: {detail.last_recommended_next_action}
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => onRerun?.(detail)}>
                <RefreshCw size={14} /> 다시 실행
              </Button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(detail.analysis_runs || []).slice(0, 5).map(run => (
                <div key={run.analysis_run_id} style={{ padding: 10, borderRadius: 10, background: 'white', border: '1px solid var(--border-sub)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <b style={{ fontSize: 13 }}>{run.target || run.goal || '저장된 실행'}</b>
                    <Badge variant={run.status === 'failed' ? 'danger' : 'secondary'}>{statusLabel(run.status)}</Badge>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                    {run.task_type || '실행 추적'} / {run.best_model || '모델 없음'} / {run.metric_name || '지표'} {run.metric_value ?? '-'}
                  </p>
                </div>
              ))}
              {!(detail.analysis_runs || []).length && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>아직 연결된 분석 실행이 없습니다.</p>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(detail.available_reports || []).length ? detail.available_reports.slice(0, 3).map(report => (
                <Badge key={report.report_id} variant="default"><FileText size={12} /> {report.title}</Badge>
              )) : <Badge variant="secondary">아직 이 실행에서 사용할 수 있는 보고서가 없습니다.</Badge>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
