import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../../api'
import { CopyButton, EmptyState, ErrorState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, projectDatasetName } from './workspaceData'
import { failureMessage, loadProjectDetail, makeRunTimeline, runFromProject, runMetric } from './projectDetailData'

function Timeline({ items }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map(item => (
        <div key={item.name} className="card-compact" style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong>{item.name}</strong>
            <StatusBadge status={item.status} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{item.observation}</p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>판단: {item.decision}</p>
          {item.error && <div className="banner-danger"><AlertTriangle size={15} /><p style={{ margin: 0, fontSize: 13 }}>{item.error}</p></div>}
        </div>
      ))}
    </div>
  )
}

export default function RunDetail() {
  const { projectId, runId } = useParams()
  const nav = useNavigate()
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [message, setMessage] = useState('')

  async function load() {
    try {
      setState({ loading: false, error: '', data: await loadProjectDetail(projectId) })
    } catch (err) {
      setState({ loading: false, error: err.response?.status === 404 ? '실행 기록을 볼 수 없습니다.' : '실행 상세를 불러오지 못했습니다.', data: null })
    }
  }

  useEffect(() => { setState({ loading: true, error: '', data: null }); load() }, [projectId, runId])

  const project = state.data?.project
  const run = project ? runFromProject(project, runId) : null
  const timeline = useMemo(() => run && project ? makeRunTimeline(run, project, state.data.jobs) : [], [run, project, state.data])
  const failure = run && project ? failureMessage(run, project) : null
  const idText = [run?.error_id && `오류 ID: ${run.error_id}`, run?.request_id && `request ID: ${run.request_id}`].filter(Boolean).join(' / ')

  async function rerun() {
    setMessage('')
    try {
      const res = await api.post(`/projects/${projectId}/runs/${runId}/rerun`)
      setMessage(`재실행 작업을 시작했습니다. Job: ${res.data.job_id || '-'}`)
      await load()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '재실행을 시작하지 못했습니다.')
    }
  }

  if (state.loading) return <div style={{ padding: 24 }}><LoadingState label="실행 상세를 불러오는 중입니다." /></div>
  if (state.error) return <div style={{ padding: 24 }}><ErrorState message={state.error} /></div>
  if (!project || !run) return <div style={{ padding: 24 }}><EmptyState title="실행 기록이 없습니다." description="프로젝트의 실행 기록 목록으로 돌아가세요." action={<Link className="btn-primary" to={`/projects/${projectId}?tab=runs`}>실행 기록 보기</Link>} /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 980 }}>
      <WorkspacePageHeader
        eyebrow="실행 상세"
        title={run.analysis_run_id}
        description={`${project.name} / ${projectDatasetName(project)}`}
        action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><StatusBadge status={run.status} /><Link className="btn-secondary" to={`/projects/${projectId}?tab=runs`}>프로젝트로 돌아가기</Link></div>}
      />
      {message && <div className="banner-warning" style={{ marginBottom: 14 }}><p style={{ margin: 0 }}>{message}</p></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 18 }} className="admin-stat-grid">
        <div className="card-compact"><p className="section-title">상태</p><StatusBadge status={run.status} /></div>
        <div className="card-compact"><p className="section-title">타깃</p><strong>{fmt(run.target)}</strong></div>
        <div className="card-compact"><p className="section-title">모델</p><strong>{fmt(run.best_model)}</strong></div>
        <div className="card-compact"><p className="section-title">지표</p><strong>{runMetric(run)}</strong></div>
        <div className="card-compact"><p className="section-title">경고</p><strong>{run.warnings_count || 0}</strong></div>
      </div>
      {failure && (
        <section className="card" style={{ display: 'grid', gap: 12, borderColor: '#fecdd3', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><AlertTriangle size={18} color="#dc2626" /><strong>{failure.title}</strong></div>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{failure.cause}</p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>다음 행동: {failure.action}</p>
          {idText && <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{idText}</p>}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>기술 정보 보기</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 10, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)' }}>{run.failure_message || '저장된 기술 상세 정보가 없습니다.'}</pre>
          </details>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" type="button" disabled={!run.can_rerun} onClick={rerun}><RefreshCw size={15} /> 다시 실행</button>
            <button className="btn-secondary" type="button" onClick={() => nav('/new')}>새 데이터셋 업로드</button>
            <CopyButton value={idText} label="오류 정보 복사" />
          </div>
        </section>
      )}
      <section className="card">
        <p className="section-title">실행 trace</p>
        <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 13 }}>실제 저장된 실행 메타데이터를 기반으로 표시합니다. 없는 단계는 명확히 표시합니다.</p>
        <Timeline items={timeline} />
      </section>
    </div>
  )
}
