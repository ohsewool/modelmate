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
    created: '생성됨',
    queued: '대기 중',
    running: '실행 중',
    succeeded: '완료',
    failed: '실패',
    cancelled: '취소됨',
    needs_review: '검토 필요',
    ready: '준비됨',
    active: '활성',
    disabled: '비활성',
    deleted: '삭제됨',
    warning: '주의',
    unknown: '확인 필요',
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

export function LoadingState({ label = '워크스페이스 정보를 불러오는 중입니다.' }) {
  return (
    <div className="card" style={{ padding: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
      <span className="spinner-lg" />
      <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>{label}</p>
    </div>
  )
}

export function ErrorState({ message = '워크스페이스 정보를 불러오지 못했습니다.' }) {
  return <div className="banner-warning"><p style={{ margin: 0, fontSize: 13 }}>{message}</p></div>
}
