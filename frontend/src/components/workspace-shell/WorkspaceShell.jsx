import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, FileText, KeyRound, ListChecks, LogOut, Menu, MessageSquare, Plus, Settings, X } from 'lucide-react'
import api from '../../api'
import { useAuth } from '../../AuthContext'
import { useTheme } from '../../ThemeContext'
import FeedbackDialog from '../FeedbackDialog'

const NAV = [
  { to: '/dashboard', label: '대시보드', icon: BarChart3 },
  { to: '/projects', label: '프로젝트', icon: Briefcase },
  { to: '/jobs', label: '작업', icon: ListChecks },
  { to: '/reports', label: '보고서', icon: FileText },
  { to: '/prediction-apis', label: '예측 API', icon: KeyRound },
  { to: '/settings', label: '설정', icon: Settings },
]

function isAnalysisRoute(pathname) {
  return ['/upload', '/model-lab', '/report', '/xai', '/agent', '/predict', '/deploy'].includes(pathname)
}

function UsageMini({ usage }) {
  if (!usage || usage.mode === 'guest_demo') return <span style={{ color: 'var(--text-label)' }}>게스트 데모</span>
  const jobs = usage.usage?.jobs_today ?? 0
  const jobLimit = usage.limits?.max_jobs_per_day ?? '-'
  return <span>{usage.plan} 플랜 - 오늘 작업 {jobs}/{jobLimit}</span>
}

export default function WorkspaceShell({ children }) {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    api.get('/me/usage').then(res => setUsage(res.data)).catch(() => setUsage(null))
  }, [pathname])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '248px minmax(0, 1fr)', background: 'var(--bg)' }} className="workspace-shell">
      {open && <button aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="workspace-overlay" />}
      <aside className={`workspace-sidebar ${open ? 'workspace-sidebar-open' : ''}`}>
        <div style={{ padding: 18, borderBottom: '1px solid var(--border-sub)' }}>
          <NavLink to="/dashboard" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#2563eb', color: 'white', fontWeight: 900 }}>M</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>ModelMate</div>
              <div style={{ fontSize: 11, color: 'var(--text-label)' }}>CSV 예측 분석 워크스페이스</div>
            </div>
          </NavLink>
        </div>
        <div style={{ padding: 12 }}>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setOpen(false); nav('/new') }}>
            <Plus size={15} /> 새 분석 시작
          </button>
        </div>
        <nav style={{ padding: '4px 10px', display: 'grid', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div className={`workspace-nav-item ${isActive ? 'workspace-nav-active' : ''}`}>
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
        {isAnalysisRoute(pathname) && (
          <div style={{ margin: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-alt)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 850, color: '#2563eb' }}>분석 흐름</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>업로드, 모델 비교, 보고서 확인, 예측 API 생성까지 현재 분석 흐름에서 이어집니다.</p>
          </div>
        )}
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--border-sub)', display: 'grid', gap: 10 }}>
          <button className="btn-secondary" type="button" onClick={() => setFeedbackOpen(true)} style={{ justifyContent: 'center' }}>
            <MessageSquare size={15} /> 피드백 보내기
          </button>
          <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-alt)', fontSize: 12, color: 'var(--text-2)' }}>
            <UsageMini usage={usage} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="theme-toggle" onClick={toggle} title={dark ? '밝은 화면' : '어두운 화면'}>{dark ? '밝' : '어둠'}</button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || '게스트 데모'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || '샘플 워크스페이스'}</div>
            </div>
            <button className="btn-secondary" style={{ padding: 8 }} onClick={logout} title="로그아웃"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>
      <div style={{ minWidth: 0, display: 'grid', gridTemplateRows: '56px minmax(0, 1fr)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button
            className="hamburger-btn"
            type="button"
            aria-label={open ? '사이드바 닫기' : '사이드바 열기'}
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, padding: 8 }}
          ><Menu size={18} /></button>
          <div style={{ flex: 1, minWidth: 0, color: 'var(--text-2)', fontSize: 13 }}>저장된 프로젝트, 작업, 보고서, 예측 API를 한 곳에서 관리합니다.</div>
          <button className="btn-primary" onClick={() => nav('/new')}><Plus size={15} /> 새 분석</button>
          <button className="btn-secondary workspace-close-mobile" aria-label="사이드바 닫기" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>
        <main style={{ overflowY: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
