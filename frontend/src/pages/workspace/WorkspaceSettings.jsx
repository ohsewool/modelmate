import { useEffect, useState } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'
import { LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'

function UsageRow({ label, current, limit }) {
  const pct = limit ? Math.min(100, Math.round((Number(current || 0) / Number(limit)) * 100)) : 0
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
        <strong>{label}</strong><span style={{ color: 'var(--text-2)' }}>{current || 0} / {limit}</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function WorkspaceSettings() {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/me/usage').catch(() => ({ data: null })),
      api.get('/session').catch(() => ({ data: null })),
    ]).then(([usageRes, sessionRes]) => { setUsage(usageRes.data); setSession(sessionRes.data) })
  }, [])

  if (!usage) return <div style={{ padding: 24 }}><LoadingState label="Loading settings." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 980 }}>
      <WorkspacePageHeader title="Settings" description="Review account, plan, usage, and product policy documents. Billing is not connected in this MVP." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
        <section className="card">
          <p className="section-title">Account</p>
          <p><strong>{user?.name || 'Guest demo'}</strong></p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{user?.email || 'Temporary demo session'}</p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Session: {session?.mode || '-'}</p>
        </section>
        <section className="card">
          <p className="section-title">Current plan</p>
          <h2 style={{ margin: 0, fontSize: 24 }}>{usage.plan}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>{usage.upgrade?.message || 'Plan changes are handled manually during the beta MVP.'}</p>
        </section>
      </div>
      <section className="card" style={{ marginTop: 18, display: 'grid', gap: 14 }}>
        <p className="section-title">Usage</p>
        <UsageRow label="Projects" current={usage.usage?.projects} limit={usage.limits?.max_projects} />
        <UsageRow label="Datasets" current={usage.usage?.datasets} limit={usage.limits?.max_datasets} />
        <UsageRow label="Jobs today" current={usage.usage?.jobs_today} limit={usage.limits?.max_jobs_per_day} />
        <UsageRow label="Prediction API calls" current={usage.usage?.prediction_api_calls_today} limit={usage.limits?.max_prediction_api_calls_per_day} />
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <p className="section-title">Docs and policies</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">Privacy</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/security-notes.md" target="_blank" rel="noreferrer">Security notes</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/usage-limits.md" target="_blank" rel="noreferrer">Usage limits</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/prediction-api.md" target="_blank" rel="noreferrer">Prediction API</a>
        </div>
      </section>
    </div>
  )
}
