import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    if (user) nav('/upload')
  }, [user])

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential })
      login(data.token, data.user)
      nav('/upload')
    } catch(e) {
      console.error('로그인 실패', e)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* 왼쪽 — 로그인 */}
      <div style={{
        flex: '0 0 480px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px 64px', background: '#ffffff',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>ModelMate</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 10px', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
          데이터 분석을<br />시작해볼까요?
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 44px', lineHeight: 1.6 }}>
          Google 계정으로 로그인하면 분석 기록이<br />자동으로 저장됩니다.
        </p>

        {/* Google 로그인 버튼 */}
        <div style={{ marginBottom: 16, width: '100%' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.error('로그인 실패')}
            width="352"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '8px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* 로그인 없이 시작 */}
        <button
          onClick={() => nav('/upload')}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: '1px solid #e5e7eb',
            fontSize: 14, fontWeight: 500, color: '#6b7280',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}
        >
          로그인 없이 시작하기
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 40, lineHeight: 1.6 }}>
          로그인 시 <span style={{ color: '#6366f1' }}>이용약관</span> 및{' '}
          <span style={{ color: '#6366f1' }}>개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
        </p>
      </div>

      {/* 오른쪽 — 브랜딩 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 72px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position:'absolute', top:-120, right:-120, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-80, width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'40%', right:'10%', width:180, height:180, borderRadius:'50%', background:'rgba(139,92,246,0.15)', pointerEvents:'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99, marginBottom: 40,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>AI 자동 분석 플랫폼</span>
          </div>

          <h2 style={{
            fontSize: 44, fontWeight: 900, color: '#ffffff', margin: '0 0 20px',
            lineHeight: 1.2, letterSpacing: '-0.03em',
          }}>
            예측은 코딩이<br />아니라 데이터다.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 56px', lineHeight: 1.8, maxWidth: 400 }}>
            CSV 파일 하나만 있으면 AI가 자동으로 분석하고,
            어떤 항목이 결과에 영향을 주는지 알려드립니다.
            코딩 없이도 전문가 수준의 분석이 가능합니다.
          </p>

          {/* 기능 요약 3가지 */}
          {[
            { icon: '🤖', text: 'AI가 최적 모델 자동 선택' },
            { icon: '📊', text: '예측 근거를 차트로 시각화' },
            { icon: '📄', text: '분석 결과 PDF 보고서 생성' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                {f.icon}
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
