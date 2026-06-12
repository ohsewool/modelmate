export function StatusBadge({ status }) {
  const value = status || 'unknown'
  const styles = {
    queued: 'badge-blue',
    running: 'badge-cyan',
    succeeded: 'badge-green',
    failed: 'badge-red',
    cancelled: 'badge-amber',
    ready: 'badge-green',
    active: 'badge-green',
    disabled: 'badge-amber',
    deleted: 'badge-red',
    warning: 'badge-amber',
  }
  const labels = {
    queued: 'Queued',
    running: 'Running',
    succeeded: 'Succeeded',
    failed: 'Failed',
    cancelled: 'Cancelled',
    ready: 'Ready',
    active: 'Active',
    disabled: 'Disabled',
    deleted: 'Deleted',
    warning: 'Warning',
    unknown: 'Needs check',
  }
  return <span className={`badge ${styles[value] || 'badge-blue'}`}>{labels[value] || value}</span>
}

export function WorkspacePageHeader({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
      <div>
        {eyebrow && <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 850, color: '#2563eb' }}>{eyebrow}</p>}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: 0 }}>{title}</h1>
        {description && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center', display: 'grid', placeItems: 'center', gap: 10 }}>
      <strong style={{ fontSize: 16, color: 'var(--text)' }}>{title}</strong>
      {description && <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{description}</p>}
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Loading workspace data.' }) {
  return (
    <div className="card" style={{ padding: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
      <span className="spinner-lg" />
      <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>{label}</p>
    </div>
  )
}

export function ErrorState({ message = 'Could not load this workspace data.' }) {
  return <div className="banner-warning"><p style={{ margin: 0, fontSize: 13 }}>{message}</p></div>
}
