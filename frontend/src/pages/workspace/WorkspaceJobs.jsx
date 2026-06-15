import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CopyButton, EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceJobs } from './workspaceData'

function isFailed(job) {
  return job.status === 'failed' || job.error_type || job.error_message
}

function jobTitle(job) {
  return job.run_name || job.analysis_run_id || job.source_run_id || job.job_id?.slice(0, 10) || '분석 작업'
}

function errorInfo(job) {
  const id = job.error_id || job.request_id || job.job_id
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

  useEffect(() => {
    loadWorkspaceJobs().then(setJobs).catch(() => setJobs([]))
  }, [])

  const filtered = useMemo(() => {
    if (!jobs) return []
    if (filter === 'failed') return jobs.filter(isFailed)
    if (filter === 'active') return jobs.filter(job => ['created', 'queued', 'running'].includes(job.status))
    return jobs
  }, [jobs, filter])

  if (!jobs) return <div style={{ padding: 24 }}><LoadingState label="작업 상태를 불러오는 중입니다." /></div>
  const activeCount = jobs.filter(job => ['created', 'queued', 'running'].includes(job.status)).length
  const failedCount = jobs.filter(isFailed).length
  const completedCount = jobs.filter(job => ['succeeded', 'success', 'completed'].includes(job.status)).length

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader
        title="작업"
        description="분석 진행 상태와 복구 안내를 확인합니다."
        action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
          <button className="btn-primary" onClick={() => nav('/new')}>CSV 올리기</button>
        </div>}
      />

      <div className="workspace-grid four-columns" style={{ marginBottom: 18 }}>
        <section className="card-compact"><p className="section-title">전체 작업</p><strong>{jobs.length}</strong></section>
        <section className="card-compact"><p className="section-title">진행 중</p><strong>{activeCount}</strong></section>
        <section className="card-compact"><p className="section-title">완료</p><strong>{completedCount}</strong></section>
        <section className="card-compact"><p className="section-title">실패</p><strong>{failedCount}</strong></section>
      </div>

      <div className="tab-bar" style={{ width: 'fit-content', marginBottom: 18 }}>
        {[
          ['all', '전체 작업'],
          ['active', '진행 중'],
          ['failed', '실패 작업'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`tab-item ${filter === id ? 'tab-item-active' : 'tab-item-inactive'}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState
          title={filter === 'failed' ? '아직 실패한 작업이 없습니다.' : '아직 실행한 작업이 없습니다.'}
          description={filter === 'failed'
            ? '실패 원인과 복구 안내가 여기에 표시됩니다.'
            : '분석을 시작하면 진행 상태가 여기에 표시됩니다.'}
          action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
            <button className="btn-secondary" onClick={() => nav('/new')}>CSV 올리기</button>
          </div>}
        />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>작업</th>
                <th>프로젝트</th>
                <th>상태</th>
                <th>현재 단계</th>
                <th>시작</th>
                <th>완료/실패</th>
                <th>오류와 복구</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>{filtered.map(job => (
              <tr key={job.job_id}>
                <td>
                  <strong>{jobTitle(job)}</strong>
                  <br />
                  <span style={{ color: 'var(--text-label)' }}>Job: {job.job_id?.slice(0, 12) || '-'}</span>
                </td>
                <td>{job.project?.id ? <Link to={`/projects/${job.project.id}`}>{job.project?.name || job.project.id}</Link> : '-'}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{fmt(job.current_step || job.progress_message)}</td>
                <td>{fmt(job.started_at || job.created_at)}</td>
                <td>{fmt(job.finished_at || job.completed_at || job.failed_at)}</td>
                <td style={{ minWidth: 240 }}>
                  {isFailed(job) ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <strong style={{ color: '#b91c1c' }}>분석을 완료하지 못했습니다.</strong>
                      <span style={{ color: 'var(--text-2)' }}>{job.error_message || '데이터 형식이나 타깃 컬럼을 확인한 뒤 다시 실행하세요.'}</span>
                      <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{errorInfo(job)}</span>
                      <CopyButton value={errorInfo(job)} label="오류 정보 복사" />
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-2)' }}>문제 없이 진행 중이거나 완료되었습니다.</span>
                  )}
                </td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {job.project?.id && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}`)}>프로젝트 열기</button>}
                  {job.project?.id && job.analysis_run_id && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}/runs/${job.analysis_run_id}`)}>실행 상세</button>}
                  {job.project?.id && <button className="btn-secondary" onClick={() => nav(`/projects/${job.project.id}?tab=runs`)}>재실행 확인</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
