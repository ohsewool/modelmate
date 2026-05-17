import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    num: '1',
    icon: '📂',
    title: 'CSV 파일 올리기',
    desc: '엑셀에서 CSV로 저장한 파일을 그대로 업로드하세요.\n분석할 데이터를 AI가 자동으로 파악합니다.',
  },
  {
    num: '2',
    icon: '🤖',
    title: 'AI가 자동으로 분석',
    desc: '어떤 항목이 결과에 영향을 미치는지,\n어떤 패턴이 있는지 AI가 스스로 찾아냅니다.',
  },
  {
    num: '3',
    icon: '📊',
    title: '결과 확인 & 보고서',
    desc: '예측 결과와 이유를 한눈에 보고,\nPDF 보고서로 저장할 수 있습니다.',
  },
]

const EXAMPLES = [
  { icon: '🏠', text: '집값 예측' },
  { icon: '🏥', text: '질병 진단' },
  { icon: '👥', text: '고객 이탈 예측' },
  { icon: '📈', text: '매출 예측' },
  { icon: '🎓', text: '합격 여부 예측' },
  { icon: '⚙️', text: '불량품 탐지' },
]

export default function Home() {
  const nav = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'inherit' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 60%, #a855f7 100%)',
        padding: '80px 24px 120px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>

          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            ModelMate
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', margin: '0 0 12px', fontWeight: 500, lineHeight: 1.5 }}>
            데이터를 올리면 AI가 알아서 분석해드려요
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 44px', lineHeight: 1.6 }}>
            코딩 몰라도 괜찮아요. CSV 파일 하나면 충분합니다.
          </p>

          <button
            onClick={() => nav('/login')}
            style={{
              padding: '16px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#ffffff', color: '#6366f1', fontWeight: 700, fontSize: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)' }}
          >
            지금 시작하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* 사용 예시 태그 */}
      <div style={{ maxWidth: 700, margin: '-28px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 16, padding: '20px 28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-label)', margin: '0 0 14px', textAlign: 'center' }}>
            이런 분석에 사용할 수 있어요
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {EXAMPLES.map((e, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)',
              }}>
                {e.icon} {e.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3단계 흐름 */}
      <div style={{ maxWidth: 800, margin: '72px auto', padding: '0 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textAlign: 'center', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How it works</p>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em' }}>
          딱 3단계로 끝나요
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 24, position: 'relative' }}>
              {/* 왼쪽 번호 + 선 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 18,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}>
                  {s.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 32, background: 'var(--border)', margin: '8px 0' }} />
                )}
              </div>

              {/* 내용 */}
              <div style={{ paddingBottom: i < STEPS.length - 1 ? 40 : 0, paddingTop: 10 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 800, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          borderRadius: 20, padding: '48px 40px', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: '0 0 10px' }}>
            CSV 파일 준비됐나요?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 28px', lineHeight: 1.6 }}>
            업로드하면 AI가 자동으로 분석하고 결과를 알려드려요
          </p>
          <button
            onClick={() => nav('/login')}
            style={{
              padding: '14px 36px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#ffffff', color: '#6366f1', fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            파일 업로드하기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

    </div>
  )
}
