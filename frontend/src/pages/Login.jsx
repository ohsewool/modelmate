import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../AuthContext'
import api from '../api'
import { Button } from '../components/ui/button'

export default function Login() {
  const { user, login, startGuest } = useAuth()
  const nav = useNavigate()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => { if (user) nav('/upload') }, [user, nav])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const body = mode === 'login' ? { email, password } : { email, password, name }
      const { data } = await api.post(endpoint, body)
      login(data.token, data.user)
      nav(data.user?.role === 'admin' ? '/history' : '/upload')
    } catch (e) {
      setError(e.response?.data?.detail || '로그인을 완료하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential })
      login(data.token, data.user)
      nav(data.user?.role === 'admin' ? '/history' : '/upload')
    } catch (e) {
      setError('Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleGuestStart() {
    setError('')
    setLoading(true)
    try {
      await startGuest()
      nav('/upload')
    } catch (e) {
      setError('게스트 데모 세션을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <div style={{
        width: 'min(960px, 100%)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 0.9fr) minmax(360px, 420px)',
        gap: 28,
        alignItems: 'center',
      }} className="login-grid">
        <section style={{ padding: '16px 0' }}>
          <button onClick={() => nav('/')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, border: 0,
            background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--text)',
            marginBottom: 26,
          }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff' }}>
              <LogoIcon />
            </span>
            <span style={{ fontSize: 18, fontWeight: 900 }}>ModelMate</span>
          </button>
          <p style={{ margin: '0 0 10px', color: '#2563eb', fontSize: 12, fontWeight: 900 }}>GUIDED CSV ANALYSIS</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.08, fontWeight: 950, letterSpacing: 0 }}>
            분석 기록을 저장하고 다시 이어가세요
          </h1>
          <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)', maxWidth: 520 }}>
            로그인하면 CSV 분석, 보고서, 재실행 기록을 내 프로젝트로 보관할 수 있습니다. 바로 확인만 하고 싶다면 게스트 데모로 시작할 수 있습니다.
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 24, maxWidth: 500 }}>
            {['내 프로젝트와 분석 기록 저장', '보고서와 예측 API 재사용', '게스트 데모와 개인 프로젝트 분리'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}>
                <ShieldCheck size={16} color="#059669" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 28, borderRadius: 8, boxShadow: '0 10px 28px rgba(15,23,42,0.08)' }}>
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px', letterSpacing: 0 }}>
              {mode === 'login' ? '로그인' : '계정 만들기'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.55 }}>
              {mode === 'login' ? '저장된 프로젝트와 분석 결과를 다시 열어봅니다.' : '이메일로 ModelMate 프로젝트 공간을 만듭니다.'}
            </p>
          </div>

          <div className="tab-bar" style={{ marginBottom: 20 }}>
            {['login', 'signup'].map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError('') }} className={mode === m ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'} style={{ flex: 1 }}>
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <Field label="이름">
                <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" required />
              </Field>
            )}

            <Field label="이메일">
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" required />
            </Field>

            <Field label="비밀번호">
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? '8자 이상 입력' : '비밀번호 입력'}
                  style={{ paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-3)', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {mode === 'login' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#2563eb' }} />
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>로그인 상태 유지</span>
              </label>
            )}

            {error && (
              <p style={{ fontSize: 12, color: '#b91c1c', margin: 0, padding: '9px 11px', background: '#fff1f2', borderRadius: 8, border: '1px solid #fecdd3', lineHeight: 1.5 }}>{error}</p>
            )}

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading && <span className="spinner" />}
              {mode === 'login' ? '이메일로 로그인' : '이메일로 회원가입'}
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-sub)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-label)' }}>또는</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-sub)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google 로그인에 실패했습니다.')}
              width="340"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <button type="button" onClick={handleGuestStart} disabled={loading} style={{
            width: '100%', marginTop: 14, padding: '11px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-2)',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800,
            fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            게스트 데모로 시작 <ArrowRight size={14} />
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, margin: '10px 0 0', textAlign: 'center' }}>
            게스트 데모는 흐름 확인용입니다. 프로젝트 저장과 재실행은 로그인 후 사용할 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>{label}</span>
      {children}
    </label>
  )
}

function LogoIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
}
