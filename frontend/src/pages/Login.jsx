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

      {/* 오른쪽 — 앱 미리보기 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '48px 48px',
        background: '#f5f3ff',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 도트 패턴 */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.4 }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#c4b5fd" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div style={{ position:'relative', width:'100%', maxWidth:400 }}>

          {/* 상단 라벨 */}
          <p style={{ fontSize:12, fontWeight:600, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 16px' }}>
            분석 결과 미리보기
          </p>

          {/* 카드 1 — 모델 성능 */}
          <div style={{
            background:'#fff', borderRadius:16, padding:'18px 20px',
            boxShadow:'0 4px 24px rgba(99,102,241,0.12)', marginBottom:12,
            border:'1px solid #ede9fe',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>모델 성능 비교</span>
              <span style={{ fontSize:11, color:'#10b981', fontWeight:600, background:'#f0fdf4', padding:'2px 8px', borderRadius:99 }}>✓ 완료</span>
            </div>
            {[
              { name:'Random Forest', score:0.94, color:'#6366f1' },
              { name:'Gradient Boosting', score:0.91, color:'#7c3aed' },
              { name:'Logistic Regression', score:0.83, color:'#a78bfa' },
            ].map((m,i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#6b7280' }}>{m.name}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:m.color }}>{m.score}</span>
                </div>
                <div style={{ height:6, borderRadius:99, background:'#f3f4f6' }}>
                  <div style={{ height:'100%', width:`${m.score*100}%`, borderRadius:99, background:m.color, transition:'width 1s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* 카드 2 — 피처 중요도 */}
          <div style={{
            background:'#fff', borderRadius:16, padding:'18px 20px',
            boxShadow:'0 4px 24px rgba(99,102,241,0.12)', marginBottom:12,
            border:'1px solid #ede9fe',
          }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:14 }}>주요 영향 요인</span>
            {[
              { name:'나이', pct:38 },
              { name:'소득 수준', pct:27 },
              { name:'사용 기간', pct:21 },
              { name:'지역', pct:14 },
            ].map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < 3 ? 8 : 0 }}>
                <span style={{ fontSize:11, color:'#6b7280', width:64, flexShrink:0 }}>{f.name}</span>
                <div style={{ flex:1, height:8, borderRadius:99, background:'#f3f4f6' }}>
                  <div style={{ height:'100%', width:`${f.pct}%`, borderRadius:99, background:'linear-gradient(90deg,#6366f1,#a78bfa)' }} />
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:'#6366f1', width:28, textAlign:'right', flexShrink:0 }}>{f.pct}%</span>
              </div>
            ))}
          </div>

          {/* 카드 3 — KPI 요약 */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10,
          }}>
            {[
              { label:'정확도', value:'94.2%', color:'#6366f1' },
              { label:'데이터', value:'10,234행', color:'#7c3aed' },
              { label:'소요 시간', value:'12초', color:'#059669' },
            ].map((k,i) => (
              <div key={i} style={{
                background:'#fff', borderRadius:12, padding:'14px 12px', textAlign:'center',
                boxShadow:'0 2px 12px rgba(99,102,241,0.08)', border:'1px solid #ede9fe',
              }}>
                <p style={{ fontSize:17, fontWeight:800, color:k.color, margin:'0 0 4px' }}>{k.value}</p>
                <p style={{ fontSize:10, color:'#9ca3af', margin:0, fontWeight:500 }}>{k.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
