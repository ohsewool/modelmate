import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()

  const [mode,      setMode]      = useState('login') // 'login' | 'signup'
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [name,      setName]      = useState('')
  const [remember,  setRemember]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showPw,    setShowPw]    = useState(false)

  useEffect(() => { if (user) nav('/upload') }, [user])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const body = mode === 'login' ? { email, password } : { email, password, name }
      const { data } = await api.post(endpoint, body)
      login(data.token, data.user)
      nav('/upload')
    } catch(e) {
      setError(e.response?.data?.detail || '오류가 발생했습니다')
    }
    setLoading(false)
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential })
      login(data.token, data.user)
      nav('/upload')
    } catch(e) { setError('Google 로그인에 실패했습니다') }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
    border: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* 왼쪽 — 로그인 폼 */}
      <div style={{
        flex: '0 0 460px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: '#ffffff', overflowY: 'auto',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>ModelMate</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {mode === 'login' ? '오늘의 분석을\n시작합니다.' : '회원가입'}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 32px' }}>
          {mode === 'login'
            ? '로그인하여 분석 기록을 저장하고 관리하세요.'
            : '계정을 만들고 모든 기능을 이용해보세요.'}
        </p>

        {/* 폼 */}
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>이름</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="홍길동" style={inputStyle} required
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>이메일</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com" style={inputStyle} required
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상 입력" style={{ ...inputStyle, paddingRight: 44 }} required
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
              }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: '#6366f1' }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>로그인 상태 유지</span>
            </label>
          )}

          {error && (
            <p style={{ fontSize: 13, color: '#e11d48', margin: 0, padding: '8px 12px', background: '#fff1f2', borderRadius: 6 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff',
            fontWeight: 700, fontSize: 14, marginTop: 4, opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s', fontFamily: 'inherit',
          }}>
            {loading ? '처리 중...' : mode === 'login' ? '이메일로 로그인' : '회원가입'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* Google 로그인 */}
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google 로그인에 실패했습니다')}
          width="348"
          size="large"
          text="signin_with"
          shape="rectangular"
        />

        {/* 모드 전환 */}
        <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 24 }}>
          {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>

        {/* 로그인 없이 시작 */}
        <button onClick={() => nav('/upload')} style={{
          background: 'none', border: 'none', color: '#9ca3af', fontSize: 12,
          cursor: 'pointer', textAlign: 'center', marginTop: 8, width: '100%',
          textDecoration: 'underline', fontFamily: 'inherit',
        }}>
          로그인 없이 시작하기
        </button>
      </div>

      {/* 오른쪽 — 브랜딩 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 72px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-120, right:-120, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-80, width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99, marginBottom: 40,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>AI 자동 분석 플랫폼</span>
          </div>

          <h2 style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', margin: '0 0 20px', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
            예측은 코딩이<br />아니라 데이터다.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 52px', lineHeight: 1.8, maxWidth: 380 }}>
            CSV 파일 하나만 있으면 AI가 자동으로 분석하고,
            어떤 항목이 결과에 영향을 주는지 알려드립니다.
          </p>

          {[
            { icon: '🤖', text: 'AI가 최적 모델 자동 선택' },
            { icon: '📊', text: '예측 근거를 차트로 시각화' },
            { icon: '📄', text: '분석 결과 PDF 보고서 생성' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}>{f.icon}</div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
