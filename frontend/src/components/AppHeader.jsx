import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import PAGE_META from '../pageMeta'

export default function AppHeader({ onMenuClick }) {
  const { pathname, search } = useLocation()
  const meta = PAGE_META[pathname] || {}
  const searchParams = new URLSearchParams(search)
  const presenterMode = searchParams.get('presenter') === '1' || sessionStorage.getItem('mm_presenter_mode') === '1'
  const [demoMode, setDemoMode] = useState(presenterMode && localStorage.getItem('mm_demo_mode') === '1')
  if (!meta.title) return null

  function toggleDemoMode() {
    const next = !demoMode
    if (next) localStorage.setItem('mm_demo_mode', '1')
    else localStorage.removeItem('mm_demo_mode')
    setDemoMode(next)
  }

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
      {!presenterMode ? (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
          color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0',
          padding: '5px 10px', borderRadius: 99, flexShrink: 0,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#10b981',
            display: 'inline-block', animation: 'pulse 2s infinite',
          }} />
          <span className="status-text">정상 작동</span>
        </span>
      ) : (
      <button type="button" onClick={toggleDemoMode} title={demoMode ? '데모 모드 끄기' : '데모 모드 켜기'} style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
        color: demoMode ? '#92400e' : '#047857',
        background: demoMode ? '#fffbeb' : '#ecfdf5',
        border: `1px solid ${demoMode ? '#fde68a' : '#a7f3d0'}`,
        padding: '5px 10px', borderRadius: 99, flexShrink: 0, cursor: 'pointer',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: demoMode ? '#f59e0b' : '#10b981',
          display: 'inline-block', animation: 'pulse 2s infinite',
        }} />
        <span className="status-text">{demoMode ? '데모 모드' : '정상 작동'}</span>
      </button>
      )}
    </header>
  )
}
