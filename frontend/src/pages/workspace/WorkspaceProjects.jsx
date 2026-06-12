import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

export default function WorkspaceProjects() {
  const nav = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setData({ projects: [] }))
  }, [])

  if (!data) return <div style={{ padding: 24 }}><LoadingState label="Loading projects." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="Projects" description="Review saved analyses, linked datasets, latest runs, and reusable outputs by project." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      {!data.projects.length ? (
        <EmptyState title="No saved projects yet." description="Upload a CSV or use sample data to start a guided predictive analysis." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Project</th><th>Status</th><th>Target</th><th>Dataset</th><th>Latest run</th><th>Best model</th><th>Metric</th><th>Actions</th></tr></thead>
            <tbody>{data.projects.map(project => (
              <tr key={project.id}>
                <td><Link to={`/projects/${project.id}`}><strong>{project.name}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>{project.id}</span></td>
                <td><StatusBadge status={project.archive_status || 'active'} /></td>
                <td>{fmt(projectTarget(project))}</td>
                <td>{projectDatasetName(project)}</td>
                <td>{fmt(project.last_run_id || project.updated_at)}</td>
                <td>{fmt(project.last_best_model)}</td>
                <td>{primaryMetric(project)}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => nav(`/projects/${project.id}`)}>Open</button>
                  <Link to={`/projects/${project.id}?tab=report`}>Reports</Link>
                  <Link to={`/projects/${project.id}?tab=api`}>APIs</Link>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
