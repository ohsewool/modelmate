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

  if (!jobs) return <div style={{ padding: 24 }}><LoadingState label="Loading jobs." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="Jobs" description="Check training job status, current step, failures, and recovery path." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      {!jobs.length ? (
        <EmptyState title="No jobs yet." description="Training jobs will appear here after a project starts analysis." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Job</th><th>Project</th><th>Status</th><th>Step</th><th>Started</th><th>Finished</th><th>Error</th><th>Actions</th></tr></thead>
            <tbody>{jobs.map(job => (
              <tr key={job.job_id}>
                <td><strong>{job.job_id?.slice(0, 8)}</strong></td>
                <td>{job.project?.id ? <Link to={`/projects/${job.project.id}`}>{job.project?.name || job.project.id}</Link> : '-'}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{fmt(job.current_step)}</td>
                <td>{fmt(job.started_at || job.created_at)}</td>
                <td>{fmt(job.finished_at || job.failed_at)}</td>
                <td>{fmt(job.error_type || job.error_message)}</td>
                <td>{job.project?.id && job.analysis_run_id ? <Link to={`/projects/${job.project.id}/runs/${job.analysis_run_id}`}>Run detail</Link> : <button className="btn-secondary" onClick={() => nav('/history')}>View history</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
