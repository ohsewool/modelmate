import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { CopyButton, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, datasetDisplayName, formatTimestamp, loadWorkspaceJobs, runTypeLabel, taskTypeLabel } from './workspaceData'
import { workflowStepLabel } from '../../utils/userCopy'

function isFailed(job) {
  return job?.status === 'failed' || job?.error_type || job?.error_message
}

function summary(job) { return job?.result_summary || {} }
function jobTarget(job) { return summary(job).target || job?.target || job?.project?.last_target || '예측값 확인 필요' }
function jobTask(job) { return summary(job).task_type || job?.task_type || job?.project?.last_task_type }
function jobModel(job) { return summary(job).best_model || job?.best_model || job?.project?.last_best_model || '모델 결과 확인 필요' }
function jobMetric(job) {
  const data = summary(job)
  const value = data.metric_value ?? job?.project?.last_metric_value
  const name = data.metric_name || job?.project?.last_metric_name
  if (value === null || value === undefined) return '성능 지표 확인 필요'
  const normalized = Number(value)
  return `${name || '주요 지표'}: ${Number.isFinite(normalized) ? normalized.toFixed(4) : value}`
}

function errorInfo(job) {
  const id = job?.error_id || job?.request_id || job?.job_id
  const parts = [
    job.error_type && `코드: ${job.error_type}`,
    id && `ID: ${id}`,
  ].filter(Boolean)
  return parts.join(' / ')
}

export default function WorkspaceJobs() {
  const nav = useNavigate()
  const [jobs, setJobs] = useState(null)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [message, setMessage] = useState('')

  async function reload() {
    try { setJobs(await loadWorkspaceJobs()) } catch { setJobs([]) }
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const safeJobs = asArray(jobs).filter(Boolean)
    let next = safeJobs
    if (filter === 'completed') next = next.filter(job => ['succeeded', 'success', 'completed'].includes(job?.status))
    if (filter === 'review') next = next.filter(job => job?.status === 'needs_review')
    if (filter === 'failed') next = next.filter(isFailed)
    if (typeFilter !== 'all') next = next.filter(job => runTypeLabel(job) === typeFilter)
    return next.sort((a, b) => String(b.updated_at || b.finished_at || b.created_at || '').localeCompare(String(a.updated_at || a.finished_at || a.created_at || '')))
  }, [jobs, filter, typeFilter])

  async function rerun(job) {
    if (!job?.job_id || !job.can_rerun) return
    setMessage('')
    try {
      const res = await api.post(`/training/jobs/${job.job_id}/rerun`)
      setMessage(`새 분석 작업을 만들었습니다. 이전 기록은 그대로 유지됩니다. 참조: ${String(res.data?.job_id || '').slice(0, 8)}`)
      await reload()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '다시 실행을 시작하지 못했습니다.')
    }
  }

  if (!jobs) return <div className="workspace-page"><LoadingState label="작업 기록을 불러오는 중입니다." /></div>
  const safeJobs = asArray(jobs).filter(Boolean)
  const activeCount = safeJobs.filter(job => ['created', 'queued', 'running'].includes(job?.status)).length
  const failedCount = safeJobs.filter(isFailed).length
  const completedCount = safeJobs.filter(job => ['succeeded', 'success', 'completed'].includes(job?.status)).length

  return (
    <div className="workspace-page animate-fade-in">
      <WorkspacePageHeader
        title="작업 기록"
        description="분석 진행 상태, 실패 원인, 다음 복구 방법을 확인합니다."
        action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
          <button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작하기</button>
        </div>}
      />

      <div className="workspace-grid four-columns" style={{ marginBottom: 18 }}>
        <section className="metric-card"><p className="section-title">전체 작업</p><strong>{safeJobs.length}</strong></section>
        <section className="metric-card"><p className="section-title">진행 중</p><strong>{activeCount}</strong></section>
        <section className="metric-card"><p className="section-title">완료</p><strong>{completedCount}</strong></section>
        <section className="metric-card"><p className="section-title">실패</p><strong>{failedCount}</strong></section>
      </div>
      {message && <div className="banner-info" style={{ marginBottom: 18 }}><p style={{ margin: 0 }}>{message}</p></div>}

      <section className="card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <p className="section-title" style={{ margin: 0 }}>작업 목록</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="tab-bar" style={{ width: 'fit-content' }}>
            {[
              ['all', '전체 작업'],
              ['completed', '완료'],
              ['review', '검토 필요'],
              ['failed', '실패 작업'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={`tab-item ${filter === id ? 'tab-item-active' : 'tab-item-inactive'}`} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="분석 유형 필터">
            <option value="all">모든 분석 유형</option>
            <option value="새 분석">새 분석</option>
            <option value="빠른 자동 분석">빠른 자동 분석</option>
            <option value="목표 기반 분석">목표 기반 분석</option>
            <option value="다시 실행">다시 실행</option>
          </select>
          </div>
        </div>
        {!filtered.length ? (
          <div className="empty-state" style={{ padding: '44px 16px' }}>
            <strong className="empty-title">{filter === 'failed' ? '아직 실패한 작업이 없습니다.' : '아직 실행한 작업이 없습니다.'}</strong>
            <p className="empty-desc">{filter === 'failed' ? '실패 원인과 복구 안내가 여기에 표시됩니다.' : '분석을 시작하면 진행 상태가 여기에 표시됩니다.'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
              <button className="btn-secondary" onClick={() => nav('/new')}>CSV 올리기</button>
            </div>
          </div>
        ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>데이터셋 / 분석 유형</th>
                <th>목표와 예측값</th>
                <th>상태</th>
                <th>모델 결과</th>
                <th>생성 / 업데이트</th>
                <th>안내</th>
                <th>다음 행동</th>
              </tr>
            </thead>
            <tbody>{filtered.map(job => (
              <tr key={job.job_id}>
                <td>
                  <strong>{datasetDisplayName(job.dataset)}</strong><br />
                  <span style={{ color: 'var(--text-label)' }}>{runTypeLabel(job)}{job.project?.name ? ` · ${job.project.name}` : ''}</span>
                </td>
                <td><strong>{jobTarget(job)}</strong><br /><span style={{ color: 'var(--text-label)' }}>{taskTypeLabel(jobTask(job))}{summary(job).goal ? ` · ${summary(job).goal}` : ''}</span></td>
                <td><StatusBadge status={job.status} /></td>
                <td><strong>{jobModel(job)}</strong><br /><span style={{ color: 'var(--text-label)' }}>{jobMetric(job)}</span></td>
                <td>{formatTimestamp(job.created_at)}<br /><span style={{ color: 'var(--text-label)' }}>업데이트 {formatTimestamp(job.finished_at || job.failed_at || job.started_at || job.created_at)}</span></td>
                <td style={{ minWidth: 240 }}>
                  {isFailed(job) ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <strong style={{ color: '#b91c1c' }}>분석을 완료하지 못했습니다.</strong>
                      <span style={{ color: 'var(--text-2)' }}>{job.error_message || '데이터 형식이나 타깃 컬럼을 확인한 뒤 다시 실행하세요.'}</span>
                      <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{errorInfo(job)}</span>
                      <CopyButton value={errorInfo(job)} label="오류 정보 복사" />
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-2)' }}>{job.current_step ? workflowStepLabel(job.current_step) : (job.progress_message || '저장된 분석 상태를 확인하세요.')}</span>
                  )}
                </td>
                <td><div className="table-actions">
                  {job.project?.id && job.analysis_run_id && <button className="btn-primary" onClick={() => nav(`/projects/${job.project.id}/runs/${job.analysis_run_id}`)}>결과 보기</button>}
                  {job.project?.id && job.project?.has_report && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}?tab=report`)}>보고서 보기</button>}
                  {job.project?.id && job.project?.has_prediction_api && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}?tab=api`)}>예측 API 보기</button>}
                  {job.can_rerun && job.dataset && <button className="btn-secondary" onClick={() => rerun(job)}>다시 실행</button>}
                  {job.project?.id && !job.analysis_run_id && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}?tab=runs`)}>분석 기록 보기</button>}
                </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  )
}
