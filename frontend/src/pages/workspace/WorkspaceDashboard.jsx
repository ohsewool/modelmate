import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

function MetricCard({ label, value, sub }) {
  return <div className="card"><p className="section-title">{label}</p><strong style={{ fontSize: 26 }}>{value}</strong><p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 12 }}>{sub}</p></div>
}

export default function WorkspaceDashboard() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setError('Could not load workspace overview.'))
  }, [])

  if (error) return <div style={{ padding: 24 }}><div className="banner-warning">{error}</div></div>
  if (!data) return <div style={{ padding: 24 }}><LoadingState /></div>

  const recentProjects = data.projects.slice(0, 5)
  const activeJobs = data.jobs.filter(job => ['created', 'queued', 'running'].includes(job.status)).slice(0, 4)
  const latestRun = data.history[0]

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="A calm overview of your saved projects, active jobs, reports, and reusable prediction APIs."
        action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>}
      />
      {data.projects.length === 0 ? (
        <EmptyState title="No saved projects yet." description="Upload a CSV or start with sample data to create your first analysis project." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }} className="admin-stat-grid">
            <MetricCard label="Projects" value={data.projects.length} sub="Saved analysis spaces" />
            <MetricCard label="Datasets" value={data.datasets.length} sub="Active uploads" />
            <MetricCard label="Jobs today" value={data.usage?.usage?.jobs_today ?? 0} sub={`${data.usage?.plan || 'free'} plan`} />
            <MetricCard label="Prediction APIs" value={data.deployed.length} sub="Shared model records" />
          </div>
          <section className="card">
            <p className="section-title">Recent projects</p>
            <table className="data-table">
              <tbody>{recentProjects.map(project => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong><br /><span style={{ color: 'var(--text-label)' }}>{projectDatasetName(project)}</span></td>
                  <td>{fmt(projectTarget(project))}</td>
                  <td>{fmt(project.last_best_model)}</td>
                  <td>{primaryMetric(project)}</td>
                  <td><Link to={`/projects/${project.id}`}>Open</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
            <section className="card">
              <p className="section-title">Active jobs</p>
              {activeJobs.length ? activeJobs.map(job => (
                <p key={job.job_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{job.project?.name || job.job_id}</span><StatusBadge status={job.status} />
                </p>
              )) : <p style={{ color: 'var(--text-2)' }}>No jobs are currently running.</p>}
            </section>
            <section className="card">
              <p className="section-title">Recommended next action</p>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{latestRun ? `${fmt(latestRun.target)} results are ready for report review or prediction API reuse.` : 'Start a new analysis to create your first project.'}</p>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
