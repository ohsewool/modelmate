import { useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

export default function Home() {
  const nav = useNavigate()
  const { dark, toggle } = useTheme()

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'inherit', overflowX:'hidden' }}>
      <style>{`
        @keyframes gradientMove {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-20px) scale(1.05); }
          66%      { transform: translate(-20px,10px) scale(0.98); }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(-8px) rotate(1.5deg); }
          50%      { transform: translateY(6px) rotate(1.5deg); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(32px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hero-cta { animation: fadeUp .7s ease both; }
        .hero-sub { animation: fadeUp .7s .15s ease both; }
        .hero-btn { animation: fadeUp .7s .3s ease both; }
        .hero-mock { animation: fadeUp .8s .5s ease both; }
        .feat-card:hover {
          border-color: rgba(99,102,241,0.4) !important;
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* ── Navbar ────────────────────────────── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        height:52, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        backdropFilter:'blur(16px)',
        background:'rgba(2,8,23,0.7)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'-0.01em' }}>ModelMate</span>
          <span style={{ fontSize:9, fontWeight:700, color:'#818cf8', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', padding:'1px 6px', borderRadius:99 }}>BETA</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={toggle} style={{ background:'none', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, width:30, height:30, cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
            {dark
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
            }
          </button>
          <button onClick={() => nav('/upload')} style={{
            padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
            background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff',
            boxShadow:'0 0 20px rgba(99,102,241,0.4)',
          }}>
            시작하기
          </button>
        </div>
      </nav>

      {/* ── Hero (다크) ───────────────────────── */}
      <section style={{
        minHeight:'100vh', position:'relative', overflow:'hidden',
        background:'#020817',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'120px 24px 80px', textAlign:'center',
      }}>
        {/* 배경 glow */}
        <div style={{ position:'absolute', top:'15%', left:'20%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', pointerEvents:'none', animation:'gradientMove 12s ease-in-out infinite' }} />
        <div style={{ position:'absolute', top:'30%', right:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)', pointerEvents:'none', animation:'gradientMove 15s ease-in-out infinite reverse' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'30%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 65%)', pointerEvents:'none', animation:'gradientMove 18s ease-in-out infinite' }} />

        {/* 플로팅 카드 A */}
        <div className="hero-mock" style={{
          position:'absolute', top:'18%', left:'calc(50% - 480px)',
          background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(99,102,241,0.25)', borderRadius:14,
          padding:'14px 18px', width:200, animation:'floatA 6s ease-in-out infinite',
          boxShadow:'0 20px 48px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize:10, color:'#64748b', margin:'0 0 8px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>최고 성능</p>
          <p style={{ fontSize:15, fontWeight:800, color:'#e2e8f0', margin:'0 0 6px' }}>🏆 LightGBM</p>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ width:'96%', height:'100%', background:'linear-gradient(90deg,#6366f1,#7c3aed)', borderRadius:99 }} />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:'#818cf8' }}>0.961</span>
          </div>
        </div>

        {/* 플로팅 카드 B */}
        <div className="hero-mock" style={{
          position:'absolute', top:'22%', right:'calc(50% - 480px)',
          background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(16,185,129,0.25)', borderRadius:14,
          padding:'14px 18px', width:180, animation:'floatB 7s ease-in-out infinite',
          boxShadow:'0 20px 48px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize:10, color:'#64748b', margin:'0 0 8px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>예측 결과</p>
          <p style={{ fontSize:22, fontWeight:900, color:'#34d399', margin:'0 0 2px' }}>정상 🟢</p>
          <p style={{ fontSize:11, color:'#64748b', margin:0 }}>확신도 94.2%</p>
        </div>

        {/* 플로팅 카드 C */}
        <div className="hero-mock" style={{
          position:'absolute', bottom:'22%', left:'calc(50% - 420px)',
          background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(245,158,11,0.2)', borderRadius:14,
          padding:'12px 16px', width:170, animation:'floatA 8s 2s ease-in-out infinite',
          boxShadow:'0 20px 48px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize:10, color:'#64748b', margin:'0 0 6px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>Optuna 튜닝</p>
          <p style={{ fontSize:13, fontWeight:700, color:'#fbbf24', margin:0 }}>+3.2% 개선 ⚡</p>
        </div>

        {/* 메인 텍스트 */}
        <div style={{ position:'relative', maxWidth:680 }}>
          <div className="hero-cta" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', marginBottom:28 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#6366f1', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:11, fontWeight:600, color:'#818cf8' }}>코딩 없이 사용하는 AutoML 플랫폼</span>
          </div>

          <h1 className="hero-cta" style={{
            fontSize:'clamp(42px,7vw,80px)', fontWeight:900, color:'#f1f5f9',
            margin:'0 0 20px', letterSpacing:'-0.04em', lineHeight:1.05,
          }}>
            CSV 올리면<br />
            <span style={{ background:'linear-gradient(135deg,#6366f1,#a855f7,#0ea5e9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              AI가 끝냅니다
            </span>
          </h1>

          <p className="hero-sub" style={{ fontSize:'clamp(15px,2.2vw,19px)', color:'#64748b', margin:'0 0 40px', lineHeight:1.7, maxWidth:500, marginLeft:'auto', marginRight:'auto' }}>
            6개 AI 모델을 동시에 비교하고, 최적 설정을 자동으로 찾아<br />
            API로 배포까지 — 전문 지식 없이도 가능합니다
          </p>

          <div className="hero-btn" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/upload')} style={{
              padding:'14px 32px', borderRadius:11, border:'none', cursor:'pointer', fontSize:15, fontWeight:700,
              background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff',
              boxShadow:'0 0 32px rgba(99,102,241,0.5)', transition:'all .2s',
              display:'inline-flex', alignItems:'center', gap:8,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 48px rgba(99,102,241,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 32px rgba(99,102,241,0.5)' }}>
              무료로 시작하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior:'smooth' }) }} style={{
              padding:'14px 24px', borderRadius:11, cursor:'pointer', fontSize:14, fontWeight:600,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8',
              transition:'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8' }}>
              기능 보기 ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── 통계 바 ───────────────────────────── */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'28px 24px' }}>
        <div style={{ maxWidth:720, margin:'0 auto', display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:24 }}>
          {[['6개','동시 비교 모델'],['분류 + 회귀','두 가지 문제 유형'],['SHAP 내장','예측 이유 자동 설명'],['REST API','원클릭 모델 배포']].map(([n,l]) => (
            <div key={n} style={{ textAlign:'center' }}>
              <p style={{ fontSize:18, fontWeight:800, color:'#6366f1', margin:'0 0 3px' }}>{n}</p>
              <p style={{ fontSize:12, color:'var(--text-label)', margin:0 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 기능 ──────────────────────────────── */}
      <section id="features" style={{ padding:'96px 24px', background:'var(--bg)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 10px' }}>Features</p>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.03em', lineHeight:1.2 }}>
              전체 ML 파이프라인,<br />한 화면에서
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px,1fr))', gap:14 }}>
            {[
              { icon:'🤖', color:'#6366f1', bg:'rgba(99,102,241,0.08)',  title:'AI 자동 분석',    desc:'버튼 하나로 데이터 분석, 모델 선택, 튜닝까지 자동 완료' },
              { icon:'📊', color:'#0ea5e9', bg:'rgba(14,165,233,0.08)',  title:'6개 모델 비교',   desc:'XGBoost·LightGBM 등 최신 모델을 동시에 비교해 최적을 선택' },
              { icon:'⚡', color:'#f59e0b', bg:'rgba(245,158,11,0.08)',  title:'Optuna 자동 튜닝', desc:'수십 번 시도로 하이퍼파라미터를 자동 최적화해 성능 극대화' },
              { icon:'🔍', color:'#8b5cf6', bg:'rgba(139,92,246,0.08)', title:'SHAP 설명 (XAI)', desc:'왜 이렇게 예측했는지 근거를 시각적으로 보여줍니다' },
              { icon:'🔮', color:'#10b981', bg:'rgba(16,185,129,0.08)', title:'새 데이터 예측',  desc:'학습된 모델로 새 데이터를 즉시 예측 — 폼 입력 또는 CSV 업로드' },
              { icon:'🚀', color:'#e11d48', bg:'rgba(225,29,72,0.08)',  title:'API 배포',        desc:'모델에 URL을 부여해 어디서든 HTTP 요청으로 예측 가능' },
            ].map(f => (
              <div key={f.title} className="feat-card" style={{
                background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16,
                padding:'24px', transition:'all .2s', cursor:'default',
              }}>
                <div style={{ width:44, height:44, borderRadius:12, background:f.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'var(--text-3)', margin:0, lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────── */}
      <section style={{ padding:'80px 24px', background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 10px' }}>How it works</p>
            <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.03em' }}>3단계로 끝납니다</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { n:'1', icon:'📂', c:'#6366f1', title:'CSV 업로드', desc:'엑셀에서 CSV로 저장한 파일을 그대로 올리세요. AI가 컬럼을 분석하고 어떤 항목을 예측할지 추천합니다.' },
              { n:'2', icon:'🤖', c:'#7c3aed', title:'AI 자동 분석', desc:'버튼 하나로 6개 모델 비교 → 최적 모델 선택 → 하이퍼파라미터 튜닝 → SHAP 설명까지 자동으로 완료됩니다.' },
              { n:'3', icon:'🚀', c:'#0ea5e9', title:'예측 & 배포', desc:'새 데이터를 예측하거나, API 엔드포인트를 생성해 실제 시스템에 AI를 연결하세요.' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display:'flex', gap:24 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:s.c, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:20, boxShadow:`0 4px 20px ${s.c}50` }}>
                    {s.n}
                  </div>
                  {i < arr.length - 1 && <div style={{ width:2, flex:1, minHeight:32, background:`linear-gradient(to bottom, ${s.c}60, transparent)`, margin:'8px 0' }} />}
                </div>
                <div style={{ paddingBottom: i < arr.length-1 ? 48 : 0, paddingTop:12 }}>
                  <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                  <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:'0 0 8px' }}>{s.title}</h3>
                  <p style={{ fontSize:14, color:'var(--text-3)', margin:0, lineHeight:1.75 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 사용 분야 ────────────────────────── */}
      <section style={{ padding:'64px 24px', background:'var(--bg)' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:12, color:'var(--text-label)', fontWeight:600, margin:'0 0 20px' }}>이런 분야에 바로 활용할 수 있어요</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {['집값 예측','고객 이탈','장비 고장 감지','매출 예측','의료 진단','불량품 탐지','신용 위험','합격 여부 예측','수요 예측','사기 탐지'].map(u => (
              <span key={u} style={{ padding:'7px 16px', borderRadius:99, fontSize:13, fontWeight:500, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{u}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────── */}
      <section style={{ padding:'80px 24px 96px', background:'#020817' }}>
        <div style={{ maxWidth:640, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, color:'#f1f5f9', margin:'0 0 16px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
            지금 바로<br />
            <span style={{ background:'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              시작해보세요
            </span>
          </h2>
          <p style={{ fontSize:15, color:'#64748b', margin:'0 0 40px', lineHeight:1.7 }}>
            CSV 파일 하나면 충분합니다.<br />회원가입 없이도 바로 사용할 수 있습니다.
          </p>
          <button onClick={() => nav('/upload')} style={{
            padding:'16px 40px', borderRadius:13, border:'none', cursor:'pointer', fontSize:16, fontWeight:800,
            background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff',
            boxShadow:'0 0 48px rgba(99,102,241,0.5)', transition:'all .2s',
            display:'inline-flex', alignItems:'center', gap:10,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 0 64px rgba(99,102,241,0.65)' }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 48px rgba(99,102,241,0.5)' }}>
            CSV 업로드하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p style={{ fontSize:12, color:'#334155', marginTop:16 }}>무료 · 회원가입 불필요 · 데이터 미저장</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer style={{ background:'#020817', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'20px 24px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#1e293b', margin:0 }}>© 2026 ModelMate · AutoML Platform · Built with FastAPI + React</p>
      </footer>
    </div>
  )
}
