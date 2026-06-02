import { useLocation } from 'react-router-dom'
import PAGE_META from '../pageMeta'

export default function AppHeader({ onMenuClick }) {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || {}
  if (!meta.title) return null

  return (
    <header style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px 0 12px', minHeight: 56,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button onClick={onMenuClick} className="hamburger-btn" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)',
          padding: 6, borderRadius: 8, display: 'none', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }} aria-label="메뉴 열기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, margin: 0 }}>
            {meta.title}
          </h1>
          {meta.desc && (
            <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '2px 0 0', lineHeight: 1.35 }}
               className="header-desc">
              {meta.desc}
            </p>
          )}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
        color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0',
        padding: '5px 10px', borderRadius: 99, flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#10b981',
          display: 'inline-block', animation: 'pulse 2s infinite',
        }} />
        <span className="status-text">정상 작동</span>
      </div>
    </header>
  )
}
