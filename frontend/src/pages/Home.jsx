import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon: '📂', color: '#6366f1', bg: '#eff6ff', border: '#c7d2fe',
    title: '자동 EDA',
    desc: 'CSV 업로드 한 번으로 분포, 상관관계, 결측치까지 자동 분석',
  },
  {
    icon: '🏆', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
    title: '4개 모델 비교',
    desc: 'Random Forest · Gradient Boosting · Logistic Regression · Decision Tree 3-fold 교차검증',
  },
  {
    icon: '🧮', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    title: 'SHAP 설명',
    desc: '어떤 피처가 예측에 영향을 미쳤는지 전역·개별 설명 제공',
  },
  {
    icon: '⚡', color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    title: 'Optuna 튜닝',
    desc: '최고 성능 모델에 한해 자동 하이퍼파라미터 최적화 수행',
  },
  {
    icon: '🔧', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3',
    title: '예측 우선순위',
    desc: '예측 확률 기반 고위험 샘플 순위화 및 긴급·주의·관찰 카드 제공',
  },
  {
    icon: '📊', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
    title: '분석 보고서',
    desc: '전체 분석 결과를 HTML 보고서로 자동 생성 및 다운로드',
  },
]

const STATS = [
  { value: '4', label: '비교 모델 수' },
  { value: '3-fold', label: '교차검증' },
  { value: 'SHAP', label: '설명가능 AI' },
  { value: 'Optuna', label: '자동 튜닝' },
]

export default function Home() {
  const nav = useNavigate()

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 60%, #a855f7 100%)',
        padding: '80px 40px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

        <div style={{ position:'relative', maxWidth:680, margin:'0 auto' }}>
          {/* 로고 */}
          <div style={{
            width:72, height:72, borderRadius:20, margin:'0 auto 24px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(10px)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>

          <h1 style={{ fontSize:48, fontWeight:800, color:'#ffffff', margin:'0 0 16px', letterSpacing:'-0.02em', lineHeight:1.1 }}>
            ModelMate
          </h1>
          <p style={{ fontSize:18, color:'rgba(255,255,255,0.8)', margin:'0 0 8px', fontWeight:400 }}>
            CSV 업로드 한 번으로 자동 머신러닝 분석 · 예측 모델 생성
          </p>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.55)', margin:'0 0 40px' }}>
            분류 · 회귀 · SHAP 설명 · Agentic AutoML 플랫폼
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/upload')} style={{
              padding:'14px 32px', borderRadius:12, border:'none', cursor:'pointer',
              background:'#ffffff', color:'#6366f1', fontWeight:700, fontSize:15,
              boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
              transition:'all 0.2s', display:'flex', alignItems:'center', gap:8,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)' }}
            >
              시작하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => nav('/model-lab')} style={{
              padding:'14px 28px', borderRadius:12, cursor:'pointer',
              background:'rgba(255,255,255,0.1)', color:'#ffffff', fontWeight:600, fontSize:14,
              border:'1px solid rgba(255,255,255,0.25)',
              transition:'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
            >
              Model Lab 바로가기
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth:900, margin:'-32px auto 0', padding:'0 40px', position:'relative', zIndex:10 }}>
        <div style={{
          background:'var(--surface)', borderRadius:20, padding:'24px 32px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.1)',
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0,
          border:'1px solid var(--border)',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              textAlign:'center', padding:'8px 0',
              borderRight: i < STATS.length-1 ? '1px solid var(--border-sub)' : 'none',
            }}>
              <p style={{ fontSize:28, fontWeight:800, color:'#6366f1', margin:'0 0 4px', letterSpacing:'-0.02em' }}>{s.value}</p>
              <p style={{ fontSize:12, color:'var(--text-label)', margin:0, fontWeight:500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:900, margin:'60px auto', padding:'0 40px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>Features</p>
          <h2 style={{ fontSize:30, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.02em' }}>주요 기능</h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background:'var(--surface)', border:`1px solid var(--border)`,
              borderRadius:16, padding:24,
              boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
              transition:'all 0.2s', cursor:'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor=f.border }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor='var(--border)' }}
            >
              <div style={{
                width:44, height:44, borderRadius:12, marginBottom:16,
                background:f.bg, border:`1px solid ${f.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'var(--text-3)', margin:0, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 40px' }}>
        <div style={{
          background:'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          borderRadius:20, padding:'48px 40px', textAlign:'center',
          boxShadow:'0 8px 32px rgba(99,102,241,0.3)',
        }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:'#ffffff', margin:'0 0 12px' }}>
            지금 바로 분석을 시작해보세요
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', margin:'0 0 28px' }}>
            CSV 파일을 업로드하면 자동으로 모델 학습 · 예측 · SHAP 설명까지 제공합니다
          </p>
          <button onClick={() => nav('/upload')} style={{
            padding:'14px 36px', borderRadius:12, border:'none', cursor:'pointer',
            background:'#ffffff', color:'#6366f1', fontWeight:700, fontSize:15,
            boxShadow:'0 4px 16px rgba(0,0,0,0.15)', transition:'all 0.2s',
            display:'inline-flex', alignItems:'center', gap:8,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)' }}
          >
            데이터 업로드 시작
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
