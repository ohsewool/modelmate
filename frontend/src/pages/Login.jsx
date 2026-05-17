import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()

  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)

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
    border: '1px solid #e5e7eb', background: '#fff', color: '#111827',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 40%, #e0e7ff 100%)',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* 배경 장식 */}
      <div style={{ position:'absolute', top:-160, left:-160, width:500, height:500, borderRadius:'50%', background:'rgba(99,102,241,0.08)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-100, right:-100, width:400, height:400, borderRadius:'50%', background:'rgba(124,58,237,0.08)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'30%', right:'8%', width:200, height:200, borderRadius:'50%', background:'rgba(167,139,250,0.1)', pointerEvents:'none' }} />

      {/* 로그인 카드 */}
      <div style={{
        width: '100%', maxWidth: 420, position: 'relative',
        background: '#ffffff', borderRadius: 24,
        boxShadow: '0 20px 60px rgba(99,102,241,0.15), 0 4px 16px rgba(0,0,0,0.06)',
        padding: '40px 40px 32px',
      }}>
        {/* 로고 */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, marginBottom: 14,
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99,102,241,0.35)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>ModelMate</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0', fontWeight: 400 }}>
            {mode === 'login' ? '계속하려면 로그인하세요' : '새 계정을 만들어보세요'}
          </p>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 24,
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: mode === m ? '#ffffff' : 'transparent',
              color: mode === m ? '#6366f1' : '#9ca3af',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="홍길동" style={inputStyle} required
                onFocus={e => { e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)' }}
                onBlur={e => { e.target.style.borderColor='#e5e7eb'; e.target.style.boxShadow='none' }} />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com" style={inputStyle} required
              onFocus={e => { e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)' }}
              onBlur={e => { e.target.style.borderColor='#e5e7eb'; e.target.style.boxShadow='none' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? '8자 이상 입력' : '비밀번호 입력'}
                style={{ ...inputStyle, paddingRight: 44 }} required
                onFocus={e => { e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)' }}
                onBlur={e => { e.target.style.borderColor='#e5e7eb'; e.target.style.boxShadow='none' }} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:0,
              }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width:15, height:15, accentColor:'#6366f1' }} />
              <span style={{ fontSize:12, color:'#6b7280' }}>로그인 상태 유지</span>
            </label>
          )}

          {error && (
            <p style={{ fontSize:12, color:'#e11d48', margin:0, padding:'8px 12px', background:'#fff1f2', borderRadius:8, border:'1px solid #fecdd3' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'12px', borderRadius:10, border:'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background:'linear-gradient(135deg, #6366f1, #7c3aed)',
            color:'#fff', fontWeight:700, fontSize:14, fontFamily:'inherit',
            boxShadow:'0 4px 14px rgba(99,102,241,0.35)',
            opacity: loading ? 0.7 : 1, transition:'all 0.15s',
          }}
          onMouseEnter={e => { if(!loading) e.currentTarget.style.transform='translateY(-1px)' }}
          onMouseLeave={e => e.currentTarget.style.transform=''}>
            {loading ? '처리 중...' : mode === 'login' ? '이메일로 로그인' : '회원가입'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
          <div style={{ flex:1, height:1, background:'#f3f4f6' }} />
          <span style={{ fontSize:11, color:'#d1d5db' }}>또는</span>
          <div style={{ flex:1, height:1, background:'#f3f4f6' }} />
        </div>

        {/* Google 로그인 */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google 로그인에 실패했습니다')}
            width="340"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        {/* 로그인 없이 시작 */}
        <button onClick={() => nav('/upload')} style={{
          display:'block', width:'100%', background:'none', border:'none',
          color:'#9ca3af', fontSize:12, cursor:'pointer', textAlign:'center',
          marginTop:20, fontFamily:'inherit',
        }}>
          로그인 없이 시작하기 →
        </button>
      </div>
    </div>
  )
}
