import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../../api'
import { CopyButton, EmptyState, ErrorState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { datasetDisplayName, fmt, formatTimestamp, runTypeLabel, taskTypeLabel } from './workspaceData'
import { datasetForRun, failureMessage, loadProjectDetail, makeRunTimeline, runFromProject, runIdentityWarning, runMetric } from './projectDetailData'

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
  const dataset = run && project ? datasetForRun(project, run) : null
  const identityWarning = run && project ? runIdentityWarning(project, run) : ''
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

  if (state.loading) return <div className="workspace-page"><LoadingState label="실행 상세를 불러오는 중입니다." /></div>
  if (state.error) return <div className="workspace-page"><ErrorState message={state.error} /></div>
  if (!project || !run) return <div className="workspace-page"><EmptyState title="실행 기록이 없습니다." description="프로젝트의 실행 기록 목록으로 돌아가세요." action={<Link className="btn-primary" to={`/projects/${projectId}?tab=runs`}>실행 기록 보기</Link>} /></div>

  return (
    <div className="workspace-page animate-fade-in">
      <WorkspacePageHeader
        eyebrow="실행 상세"
        title="분석 실행 상세"
        description={`${project.name} · ${dataset ? datasetDisplayName(dataset) : '연결 데이터셋 확인 필요'} · ${runTypeLabel(run)}`}
        action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><StatusBadge status={run.status} /><Link className="btn-secondary" to={`/projects/${projectId}?tab=runs`}>프로젝트로 돌아가기</Link></div>}
      />
      {identityWarning && <div className="banner-warning" style={{ marginBottom: 14 }}><AlertTriangle size={16} /><p style={{ margin: 0 }}>{identityWarning}</p></div>}
      {message && <div className="banner-warning" style={{ marginBottom: 14 }}><p style={{ margin: 0 }}>{message}</p></div>}
      <div className="workspace-summary-grid" style={{ marginBottom: 18 }}>
        <div className="card-compact"><p className="section-title">상태</p><StatusBadge status={run.status} /></div>
        <div className="card-compact"><p className="section-title">분석 유형</p><strong>{runTypeLabel(run)}</strong></div>
        <div className="card-compact"><p className="section-title">데이터셋</p><strong>{dataset ? datasetDisplayName(dataset) : '참조 확인 필요'}</strong></div>
        <div className="card-compact"><p className="section-title">타깃</p><strong>{fmt(run.target)}</strong></div>
        <div className="card-compact"><p className="section-title">문제 유형</p><strong>{taskTypeLabel(run.task_type)}</strong></div>
        <div className="card-compact"><p className="section-title">모델</p><strong>{fmt(run.best_model)}</strong></div>
        <div className="card-compact"><p className="section-title">지표</p><strong>{runMetric(run)}</strong></div>
        <div className="card-compact"><p className="section-title">업데이트</p><strong style={{ fontSize: 14 }}>{formatTimestamp(run.updated_at || run.created_at)}</strong></div>
      </div>
      {run.goal && <section className="card" style={{ marginBottom: 18 }}><p className="section-title">분석 목표</p><p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{run.goal}</p></section>}
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
            <button className="btn-primary" type="button" disabled={!run.can_rerun || !!identityWarning || !dataset} onClick={rerun}><RefreshCw size={15} /> 같은 설정으로 다시 실행</button>
            {dataset && <button className="btn-secondary" type="button" onClick={() => nav(`/agent-mode?dataset_id=${encodeURIComponent(dataset.dataset_id || dataset.id)}&project_id=${encodeURIComponent(projectId)}`)}>타깃 변경 후 분석</button>}
            <button className="btn-secondary" type="button" onClick={() => nav('/new')}>새 데이터셋 업로드</button>
            <CopyButton value={idText} label="오류 정보 복사" />
          </div>
        </section>
      )}
      {!failure && <section className="card" style={{ marginBottom: 18 }}><p className="section-title">다음 행동</p><div className="workspace-hero-actions" style={{ justifyContent: 'flex-start' }}>
        {run.report_id && <Link className="btn-primary" to={`/projects/${projectId}?tab=report&run_id=${encodeURIComponent(run.analysis_run_id)}`}>보고서 보기</Link>}
        <Link className="btn-secondary" to={`/projects/${projectId}?tab=api`}>예측 API 상태 보기</Link>
        <button className="btn-secondary" type="button" disabled={!run.can_rerun || !!identityWarning || !dataset} onClick={rerun}>같은 설정으로 다시 실행</button>
        {dataset && <button className="btn-secondary" type="button" onClick={() => nav(`/agent-mode?dataset_id=${encodeURIComponent(dataset.dataset_id || dataset.id)}&project_id=${encodeURIComponent(projectId)}`)}>타깃 변경 후 분석</button>}
      </div></section>}
      <section className="card">
        <p className="section-title">상세 실행 기록</p>
        <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 13 }}>저장된 실행 정보를 기반으로 표시합니다. 없는 단계는 명확히 표시합니다.</p>
        <Timeline items={timeline} />
      </section>
    </div>
  )
}
