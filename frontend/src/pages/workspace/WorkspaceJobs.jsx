import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadJobsForProjects } from './workspaceData'
import api from '../../api'

export default function WorkspaceJobs() {
  const nav = useNavigate()
  const [jobs, setJobs] = useState(null)

  useEffect(() => {
    api.get('/projects').then(res => loadJobsForProjects(res.data || [])).then(setJobs).catch(() => setJobs([]))
  }, [])

  if (!jobs) return <div style={{ padding: 24 }}><LoadingState label="작업 상태를 불러오는 중입니다." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="작업" description="분석 작업의 상태, 현재 단계, 실패 원인, 복구 방법을 확인합니다." action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>} />
      {!jobs.length ? (
        <EmptyState title="아직 실행된 작업이 없습니다." description="프로젝트 분석을 시작하면 작업 기록이 여기에 표시됩니다." action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>작업</th><th>프로젝트</th><th>상태</th><th>단계</th><th>시작</th><th>완료</th><th>오류</th><th>작업</th></tr></thead>
            <tbody>{jobs.map(job => (
              <tr key={job.job_id}>
                <td><strong>{job.job_id?.slice(0, 8)}</strong></td>
                <td>{job.project?.id ? <Link to={`/projects/${job.project.id}`}>{job.project?.name || job.project.id}</Link> : '-'}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{fmt(job.current_step)}</td>
                <td>{fmt(job.started_at || job.created_at)}</td>
                <td>{fmt(job.finished_at || job.failed_at)}</td>
                <td>{fmt(job.error_type || job.error_message)}</td>
                <td>{job.project?.id && job.analysis_run_id ? <Link to={`/projects/${job.project.id}/runs/${job.analysis_run_id}`}>실행 상세</Link> : <button className="btn-secondary" onClick={() => nav('/history')}>이력 보기</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
