import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadReportsForProjects } from './workspaceData'
import api from '../../api'

export default function WorkspaceReports() {
  const nav = useNavigate()
  const [reports, setReports] = useState(null)

  useEffect(() => {
    api.get('/projects').then(res => loadReportsForProjects(res.data || [])).then(setReports).catch(() => setReports([]))
  }, [])

  if (!reports) return <div style={{ padding: 24 }}><LoadingState label="Loading reports." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="Reports" description="Open grounded analysis reports generated from saved project evidence." action={<button className="btn-primary" onClick={() => nav('/report')}>Open current report</button>} />
      {!reports.length ? (
        <EmptyState title="No reports yet." description="Reports become available after a completed analysis run." action={<button className="btn-primary" onClick={() => nav('/new')}>New analysis</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Report</th><th>Project</th><th>Created</th><th>Best model</th><th>Metric</th><th>Preview</th></tr></thead>
            <tbody>{reports.map((report, index) => (
              <tr key={`${report.project?.id}-${report.report_id || index}`}>
                <td><strong>{report.title || 'ModelMate analysis report'}</strong></td>
                <td>{report.project?.name || '-'}</td>
                <td>{fmt(report.created_at || report.generated_at)}</td>
                <td>{fmt(report.best_model || report.model_summary?.best_model)}</td>
                <td>{fmt(report.metric_summary?.best_metric || report.best_metric)}</td>
                <td><button className="btn-secondary" onClick={() => nav('/report')}>View report</button></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
