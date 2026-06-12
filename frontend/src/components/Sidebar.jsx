import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import api from '../api'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import UsagePlanCard from './UsagePlanCard'

const CORE_NAV = [
  { to: '/upload', icon: UploadIcon, label: '데이터 넣기', step: 1 },
  { to: '/model-lab', icon: FlaskIcon, label: '모델 고르기', step: 2 },
  { to: '/report', icon: DocIcon, label: '결과 요약', step: 3 },
  { to: '/xai', icon: EyeIcon, label: '이유 보기', step: 4 },
]

const OPTIONAL_NAV = [
  { to: '/agent', icon: AgentIcon, label: 'AI 한 번에 실행', desc: '모델 비교부터 이유 분석까지 자동 진행', tag: 'AI' },
  { to: '/predict', icon: PredictIcon, label: '새 데이터 예측', desc: '학습한 모델에 새 값을 넣어 결과 확인' },
  { to: '/deploy', icon: DeployIcon, label: '모델 공유', desc: '예측 요청 URL 생성' },
  { to: '/history', icon: ChartIcon, label: '내 작업공간', desc: '실험과 공유 모델 관리' },
]

export default function Sidebar({ isOpen, onClose }) {
  const [state, setState] = useState({})
  const { dark, toggle } = useTheme()
  const { user, login, logout } = useAuth()

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential })
      login(data.token, data.user)
    } catch (e) {
      console.error('Google login failed', e)
    }
  }

  useEffect(() => {
    const fetchState = () => api.get('/state').then(r => setState(r.data)).catch(() => {})
    fetchState()
    const id = setInterval(fetchState, 3000)
    return () => clearInterval(id)
  }, [])

  const currentStep = state.has_model ? 4 : state.has_data ? 2 : 1

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 40, display: 'none',
        }} className="mobile-overlay" />
      )}

      <aside style={{
        width: 236, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        transition: 'background 0.2s, border-color 0.2s, transform 0.3s',
        zIndex: 50,
      }} className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" onClick={onClose} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}>
              <DeployIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', lineHeight: 1.2 }}>ModelMate</div>
              <div style={{ fontSize: 11, color: 'var(--text-label)', marginTop: 2 }}>CSV로 만드는 예측 AI</div>
            </div>
          </NavLink>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={toggle} className="theme-toggle" title={dark ? '밝은 화면' : '어두운 화면'}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={onClose} className="sidebar-close-btn" style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-label)',
              padding: 4, borderRadius: 6, display: 'none',
            }} aria-label="메뉴 닫기">
              <CloseIcon />
            </button>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <p style={{ padding: '0 10px', marginBottom: 8, fontSize: 10, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center' }}>
            분석 흐름
          </p>
          {CORE_NAV.map(({ to, icon: Icon, label, step, tag }, idx) => (
            <div key={to}>
              <NavItem to={to} icon={Icon} label={label} done={step < currentStep} tag={tag} centered onClose={onClose} />
              {idx < CORE_NAV.length - 1 && <FlowArrow done={step < currentStep} />}
            </div>
          ))}

          <p style={{ padding: '14px 10px 6px', margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            추가 도구
          </p>
          {OPTIONAL_NAV.map(({ to, icon: Icon, label, desc, tag }) => (
            <NavItem key={to} to={to} icon={Icon} label={label} desc={desc} tag={tag} optional onClose={onClose} />
          ))}
        </nav>

        <div style={{ margin: '0 10px 8px', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface-alt)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-sub)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>현재 상태</p>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatusRow label="데이터" active={state.has_data} value={state.data_shape ? `${state.data_shape[0].toLocaleString()}행` : '아직 없음'} />
            <StatusRow label="모델" active={state.has_model} value={state.best_model ? state.best_model.split(' ')[0] : '아직 없음'} />
            {state.cv_results && <StatusRow label="성능 확인" active value="완료" accent />}
          </div>
        </div>

        <UsagePlanCard />

        <div style={{ margin: '0 10px 12px' }}>
          {user ? (
            <div style={{ borderRadius: 12, border: '1px solid var(--border)', padding: '10px 12px', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {user.picture
                ? <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{user.name?.[0]}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text-label)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                {user.role === 'admin' && <p style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 800, margin: '2px 0 0' }}>관리자</p>}
                {user.is_guest && <p style={{ fontSize: 10, color: '#7c3aed', fontWeight: 800, margin: '2px 0 0' }}>게스트 데모</p>}
              </div>
              <button onClick={logout} title="로그아웃" style={{
                width: 28, height: 28, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-label)', padding: 6,
                borderRadius: 6, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ width: 16, height: 16, display: 'block' }}><LogoutIcon /></span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>로그인</p>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.error('Google login failed')}
                size="medium"
                width="214"
                text="signin_with"
                shape="rectangular"
              />
              <NavLink to="/login" onClick={onClose} style={{
                height: 34, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-2)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 750,
              }}>
                이메일 로그인
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function NavItem({ to, icon: Icon, label, desc, done, tag, optional, centered, onClose }) {
  return (
    <NavLink key={to} to={to} onClick={onClose} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: centered ? 'center' : 'flex-start', gap: 10,
          padding: '9px 10px', borderRadius: 10, marginBottom: 2,
          fontSize: 13, fontWeight: isActive ? 800 : 600, cursor: 'pointer',
          transition: 'all 0.15s',
          color: isActive ? '#2563eb' : done ? '#059669' : optional ? 'var(--text-label)' : 'var(--text-3)',
          background: isActive ? 'rgba(37,99,235,0.09)' : 'transparent',
          boxShadow: isActive ? '0 0 0 1px rgba(37,99,235,0.16)' : 'none',
        }}>
          <span style={{ width: 16, height: 16, flexShrink: 0 }}>
            {done && !isActive ? <CheckIcon /> : <Icon />}
          </span>
          <span style={{ flex: centered ? '0 1 auto' : 1, minWidth: 0, textAlign: centered ? 'center' : 'left' }}>
            <span style={{ display: 'block' }}>{label}</span>
            {desc && <span style={{ display: 'block', marginTop: 2, fontSize: 10, fontWeight: 600, color: 'var(--text-label)', lineHeight: 1.25 }}>{desc}</span>}
          </span>
          {tag && <span style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.12)', padding: '2px 6px', borderRadius: 4 }}>{tag}</span>}
        </div>
      )}
    </NavLink>
  )
}

function FlowArrow({ done }) {
  return (
    <div style={{ height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? '#059669' : 'var(--text-label)', opacity: done ? 0.9 : 0.55 }}>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 1v10" />
        <path d="M2 8l3 3 3-3" />
      </svg>
    </div>
  )
}

function StatusRow({ label, active, value, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? '#10b981' : 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, color: accent ? '#2563eb' : active ? 'var(--text-2)' : 'var(--text-label)' }}>{value}</span>
    </div>
  )
}

function IconBase({ children }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>{children}</svg>
}
function UploadIcon() { return <IconBase><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></IconBase> }
function FlaskIcon() { return <IconBase><path d="M9 3h6m-6 0v6l-6 12a1 1 0 00.9 1.4h12.2a1 1 0 00.9-1.4L15 9V3" /></IconBase> }
function EyeIcon() { return <IconBase><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></IconBase> }
function ChartIcon() { return <IconBase><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></IconBase> }
function DocIcon() { return <IconBase><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></IconBase> }
function CheckIcon() { return <IconBase><polyline points="20,6 9,17 4,12" /></IconBase> }
function AgentIcon() { return <IconBase><circle cx="12" cy="8" r="4" /><path d="M8 8H4a2 2 0 00-2 2v2a2 2 0 002 2h1" /><path d="M16 8h4a2 2 0 012 2v2a2 2 0 01-2 2h-1" /><path d="M9 20h6" /><path d="M12 14v6" /></IconBase> }
function PredictIcon() { return <IconBase><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></IconBase> }
function DeployIcon() { return <IconBase><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></IconBase> }
function SunIcon() { return <IconBase><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></IconBase> }
function MoonIcon() { return <IconBase><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></IconBase> }
function CloseIcon() { return <IconBase><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase> }
function LogoutIcon() { return <IconBase><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></IconBase> }
