import { useLocation } from 'react-router-dom'
import PAGE_META from '../pageMeta'

export default function AppHeader({ onMenuClick }) {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || {}
  if (!meta.title) return null

  return (
    <header style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px 0 12px', height: 56,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onMenuClick} className="hamburger-btn" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)',
          padding: 6, borderRadius: 8, display: 'none', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
          {meta.title}
        </h1>
        {meta.desc && (
          <p style={{ fontSize: 12, color: 'var(--text-label)', margin: 0, display: 'none' }}
             className="header-desc">
            {meta.desc}
          </p>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
        color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0',
        padding: '5px 10px', borderRadius: 99,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#10b981',
          display: 'inline-block', animation: 'pulse 2s infinite',
        }} />
        <span className="status-text">시스템 정상</span>
      </div>
    </header>
  )
}
