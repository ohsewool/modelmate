import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadPredictionApiRows } from './workspaceData'
import api from '../../api'

function latestUsed(tokens) {
  return tokens.map(token => token.last_used_at).filter(Boolean).sort().at(-1) || '-'
}

export default function WorkspacePredictionApis() {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.get('/projects').then(res => loadPredictionApiRows(res.data || [])).then(setRows).catch(() => setRows([]))
  }, [])

  if (!rows) return <div style={{ padding: 24 }}><LoadingState label="Loading prediction APIs." /></div>

  const visible = rows.filter(row => row.availability || row.tokens.length)
  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="Prediction APIs" description="Review projects that can reuse trained models through project-scoped prediction API tokens." action={<button className="btn-primary" onClick={() => nav('/deploy')}>Manage tokens</button>} />
      {!visible.length ? (
        <EmptyState title="No prediction APIs are ready yet." description="Create or share a model from the existing deploy screen to generate reusable prediction API metadata." action={<button className="btn-primary" onClick={() => nav('/deploy')}>Open deploy screen</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Project</th><th>API status</th><th>Tokens</th><th>Last used</th><th>Calls</th><th>Dataset/model</th><th>Actions</th></tr></thead>
            <tbody>{visible.map(row => {
              const active = row.tokens.filter(token => token.status === 'active')
              const calls = row.tokens.reduce((sum, token) => sum + Number(token.usage_count || 0), 0)
              return (
                <tr key={row.project.id}>
                  <td><Link to={`/projects/${row.project.id}?tab=api`}><strong>{row.project.name}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>{row.project.id}</span></td>
                  <td><StatusBadge status={row.availability?.available ? 'ready' : 'warning'} /></td>
                  <td>{active.length} active / {row.tokens.length} total</td>
                  <td>{latestUsed(row.tokens)}</td>
                  <td>{calls}</td>
                  <td>{row.availability?.dataset_active ? 'Dataset active' : fmt(row.availability?.reason)} - {row.availability?.model_ready ? 'Model ready' : 'Model needed'}</td>
                  <td><button className="btn-secondary" onClick={() => nav(`/projects/${row.project.id}?tab=api`)}>Manage tokens</button></td>
                </tr>
              )
            })}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
