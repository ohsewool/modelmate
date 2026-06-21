import { userStatusLabel } from '../../utils/userCopy'

export function statusLabel(status) {
  return userStatusLabel(status)
}

export function StatusBadge({ status }) {
  const value = status || 'unknown'
  const styles = {
    created: 'badge-blue',
    pending: 'badge-blue',
    planned: 'badge-blue',
    queued: 'badge-blue',
    running: 'badge-cyan',
    completed: 'badge-green',
    succeeded: 'badge-green',
    success: 'badge-green',
    failed: 'badge-red',
    cancelled: 'badge-amber',
    canceled: 'badge-amber',
    needs_review: 'badge-amber',
    waiting_for_review: 'badge-amber',
    review_required: 'badge-amber',
    ready: 'badge-green',
    active: 'badge-green',
    revoked: 'badge-amber',
    disabled: 'badge-amber',
    deleted: 'badge-red',
    archived: 'badge-blue',
    warning: 'badge-amber',
    blocked: 'badge-red',
    unavailable: 'badge-amber',
    expired: 'badge-amber',
    usage_limited: 'badge-red',
    contacted: 'badge-cyan',
    closed: 'badge-blue',
  }
  return <span className={`badge ${styles[value] || 'badge-blue'}`}>{statusLabel(value)}</span>
}

export function WorkspacePageHeader({ eyebrow, title, description, action }) {
  return (
    <section className="workspace-hero" style={{ marginBottom: 18 }}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="workspace-hero-actions">{action}</div>}
    </section>
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

export function LoadingState({ label = '워크스페이스 정보를 불러오는 중입니다.' }) {
  return (
    <div className="card" style={{ padding: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
      <span className="spinner-lg" />
      <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>{label}</p>
    </div>
  )
}

export function ErrorState({ message = '워크스페이스 정보를 불러오지 못했습니다.', requestId, errorId, action }) {
  return (
    <div className="banner-warning" style={{ display: 'grid', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13 }}>{message}</p>
      {(requestId || errorId) && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)' }}>
          {errorId && <>error ID: {errorId}</>}
          {errorId && requestId && ' / '}
          {requestId && <>request ID: {requestId}</>}
        </p>
      )}
      {action}
    </div>
  )
}

export function CopyButton({ value, label = '정보 복사' }) {
  if (!value) return null
  return (
    <button className="btn-secondary" type="button" onClick={() => navigator.clipboard?.writeText(String(value))}>
      {label}
    </button>
  )
}
