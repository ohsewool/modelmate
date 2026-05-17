import { useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const FEATURES = [
  { icon:'🤖', title:'AI 자동 분석', desc:'버튼 하나로 전체 분석 자동 실행. 어떤 모델이 최적인지 AI가 직접 결정합니다.' },
  { icon:'📊', title:'6개 모델 동시 비교', desc:'Random Forest, XGBoost, LightGBM 등 6개 모델을 한 번에 비교해 최고 성능을 찾습니다.' },
  { icon:'⚡', title:'Optuna 자동 튜닝', desc:'수십 번의 시도로 모델 설정을 자동 최적화. 수동으로 찾는 것보다 더 좋은 성능을 냅니다.' },
  { icon:'🔍', title:'SHAP 설명 (XAI)', desc:'왜 이렇게 예측했는지 근거를 보여줍니다. 어떤 항목이 결과에 영향을 미쳤는지 확인하세요.' },
  { icon:'🔮', title:'새 데이터 예측', desc:'학습된 모델로 새 데이터를 즉시 예측. 직접 입력하거나 CSV를 통째로 올릴 수 있습니다.' },
  { icon:'🚀', title:'API 배포', desc:'모델에 고유 URL을 부여해 외부 시스템에서 바로 호출. 실제 서비스에 AI를 연결하세요.' },
]

const STEPS = [
  { n:'1', icon:'📂', title:'CSV 파일 업로드', desc:'엑셀에서 CSV로 저장한 파일을 올리세요. AI가 컬럼을 자동으로 분석합니다.' },
  { n:'2', icon:'🤖', title:'AI 자동 분석 실행', desc:'버튼 하나로 모델 비교, 튜닝, 설명까지 자동으로 완료됩니다.' },
  { n:'3', icon:'🎯', title:'예측 & 배포', desc:'새 데이터를 예측하거나 API로 배포해 실제 서비스에 활용하세요.' },
]

const USECASES = ['집값 예측','고객 이탈 예측','장비 고장 감지','매출 예측','의료 진단','불량품 탐지','합격 여부 예측','신용 위험 평가']

const MOCK_MODELS = [
  { name:'LightGBM',        roc:'0.961', acc:'91.2%', best:true  },
  { name:'XGBoost',         roc:'0.958', acc:'90.8%', best:false },
  { name:'Random Forest',   roc:'0.947', acc:'89.3%', best:false },
  { name:'Gradient Boosting',roc:'0.941',acc:'88.7%', best:false },
]

export default function Home() {
  const nav = useNavigate()
  const { dark, toggle } = useTheme()

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'inherit', overflowX:'hidden' }}>

      {/* ── Navbar ────────────────────────────────────────── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 32px', height:56,
        background:'rgba(var(--surface-rgb, 255,255,255), 0.85)',
        backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontWeight:800, fontSize:15, color:'var(--text)' }}>ModelMate</span>
          <span style={{ fontSize:10, fontWeight:600, color:'#6366f1', background:'rgba(99,102,241,0.1)', padding:'2px 7px', borderRadius:99, marginLeft:2 }}>Beta</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={toggle} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {dark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
            }
          </button>
          <button onClick={() => nav('/upload')} style={{
            padding:'7px 18px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff',
            boxShadow:'0 2px 8px rgba(99,102,241,0.3)',
          }}>
            시작하기 →
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div style={{ position:'relative', overflow:'hidden', padding:'100px 24px 80px', textAlign:'center' }}>
        {/* 배경 orbs */}
        <div style={{ position:'absolute', top:-120, left:'10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-60, right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-100, left:'30%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ position:'relative', maxWidth:760, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', marginBottom:24 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:12, fontWeight:600, color:'#6366f1' }}>코딩 지식 없이도 사용 가능한 AutoML</span>
          </div>

          <h1 style={{ fontSize:'clamp(36px,6vw,64px)', fontWeight:900, color:'var(--text)', margin:'0 0 20px', letterSpacing:'-0.03em', lineHeight:1.1 }}>
            데이터를 올리면<br />
            <span style={{ background:'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              AI가 알아서 분석
            </span>
          </h1>
          <p style={{ fontSize:'clamp(15px,2vw,19px)', color:'var(--text-3)', margin:'0 0 40px', lineHeight:1.7, maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            CSV 파일 하나면 충분합니다. 6개 AI 모델을 동시에 비교하고,<br/>최고 성능 모델을 자동으로 골라 API로 배포까지 해드립니다.
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:64 }}>
            <button onClick={() => nav('/upload')} style={{
              padding:'14px 32px', borderRadius:12, border:'none', cursor:'pointer', fontSize:15, fontWeight:700,
              background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff',
              boxShadow:'0 4px 20px rgba(99,102,241,0.4)', transition:'all 0.2s',
              display:'inline-flex', alignItems:'center', gap:8,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(99,102,241,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.4)' }}>
              무료로 시작하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => nav('/login')} style={{
              padding:'14px 28px', borderRadius:12, cursor:'pointer', fontSize:15, fontWeight:600,
              background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)',
              transition:'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.color='#6366f1' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-2)' }}>
              로그인
            </button>
          </div>

          {/* ── 미니 제품 프리뷰 ── */}
          <div style={{
            maxWidth:620, margin:'0 auto',
            background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20,
            boxShadow:'0 24px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)',
            overflow:'hidden',
          }}>
            {/* 프리뷰 상단 바 */}
            <div style={{ padding:'10px 16px', background:'var(--surface-alt)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57' }} />
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#febc2e' }} />
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#28c840' }} />
              <span style={{ fontSize:11, color:'var(--text-label)', margin:'0 auto' }}>Model Lab — AI 모델 4가지 비교</span>
            </div>
            {/* 프리뷰 본문 */}
            <div style={{ padding:'20px 24px' }}>
              <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                {[['🏆 최고 모델','LightGBM'],['📈 종합 정확도','96.1%'],['✅ 정답률','91.2%']].map(([l,v]) => (
                  <div key={l} style={{ flex:1, minWidth:120, background:'var(--surface-alt)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:10, color:'var(--text-label)', margin:'0 0 3px', fontWeight:600 }}>{l}</p>
                    <p style={{ fontSize:16, fontWeight:800, color:'#6366f1', margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>
              {MOCK_MODELS.map((m, i) => (
                <div key={m.name} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, marginBottom:4,
                  background: m.best ? 'rgba(99,102,241,0.06)' : 'transparent',
                  border: m.best ? '1px solid rgba(99,102,241,0.15)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize:11, fontWeight:700, color: m.best ? '#6366f1' : 'var(--text-label)', width:20, textAlign:'right' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                  </span>
                  <span style={{ fontSize:12, fontWeight: m.best ? 700 : 500, color: m.best ? '#6366f1' : 'var(--text-2)', flex:1, textAlign:'left' }}>{m.name}</span>
                  <div style={{ width:120, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ width:`${parseFloat(m.roc)*100}%`, height:'100%', background: m.best ? 'linear-gradient(90deg,#6366f1,#7c3aed)' : 'var(--border)', borderRadius:99, transition:'width 1s ease' }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color: m.best ? '#6366f1' : 'var(--text-3)', width:36 }}>{m.roc}</span>
                  <span style={{ fontSize:11, color:'var(--text-label)', width:40 }}>{m.acc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 숫자로 보는 ModelMate ─────────────────────────── */}
      <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'32px 24px' }}>
        <div style={{ maxWidth:800, margin:'0 auto', display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:20 }}>
          {[
            ['6개','AI 모델 동시 비교'],
            ['분류 + 회귀','두 가지 문제 유형 지원'],
            ['SHAP','예측 근거 자동 설명'],
            ['REST API','학습 모델 즉시 배포'],
          ].map(([big, small]) => (
            <div key={big} style={{ textAlign:'center' }}>
              <p style={{ fontSize:22, fontWeight:800, color:'#6366f1', margin:'0 0 4px' }}>{big}</p>
              <p style={{ fontSize:12, color:'var(--text-label)', margin:0, fontWeight:500 }}>{small}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 사용 예시 태그 ─────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:'64px auto 0', padding:'0 24px', textAlign:'center' }}>
        <p style={{ fontSize:12, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16 }}>이런 분야에 활용할 수 있어요</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
          {USECASES.map(u => (
            <span key={u} style={{ padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:500, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)' }}>
              {u}
            </span>
          ))}
        </div>
      </div>

      {/* ── 기능 카드 ─────────────────────────────────────── */}
      <div style={{ maxWidth:900, margin:'80px auto', padding:'0 24px' }}>
        <p style={{ fontSize:12, fontWeight:600, color:'#6366f1', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Features</p>
        <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, color:'var(--text)', textAlign:'center', margin:'0 0 48px', letterSpacing:'-0.02em' }}>
          완전한 ML 파이프라인,<br/>한 곳에서
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'24px',
              transition:'all 0.2s', cursor:'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'var(--text-3)', margin:0, lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 사용 방법 ─────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'80px 24px' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#6366f1', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>How it works</p>
          <h2 style={{ fontSize:'clamp(24px,4vw,34px)', fontWeight:800, color:'var(--text)', textAlign:'center', margin:'0 0 56px', letterSpacing:'-0.02em' }}>
            딱 3단계로 끝납니다
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display:'flex', gap:24 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{
                    width:52, height:52, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,#6366f1,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:800, fontSize:20,
                    boxShadow:'0 4px 16px rgba(99,102,241,0.35)',
                  }}>{s.n}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width:2, flex:1, minHeight:36, background:'linear-gradient(to bottom, #6366f1, var(--border))', margin:'8px 0', opacity:0.3 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 44 : 0, paddingTop:12 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
                  <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:'0 0 8px' }}>{s.title}</h3>
                  <p style={{ fontSize:14, color:'var(--text-3)', margin:0, lineHeight:1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── vs 경쟁사 ─────────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:'80px auto', padding:'0 24px' }}>
        <h2 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:800, color:'var(--text)', textAlign:'center', margin:'0 0 32px', letterSpacing:'-0.02em' }}>
          다른 도구와 비교하면?
        </h2>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--surface-alt)', borderBottom:'1px solid var(--border)' }}>
                <th style={{ padding:'12px 20px', textAlign:'left', fontWeight:600, color:'var(--text-label)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>기능</th>
                {['ModelMate','Obviously AI','DataRobot'].map(n => (
                  <th key={n} style={{ padding:'12px 16px', textAlign:'center', fontWeight:700, color: n === 'ModelMate' ? '#6366f1' : 'var(--text-2)', fontSize:12 }}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['다중 모델 비교', '✅', '✅', '✅'],
                ['SHAP 설명 (XAI)', '✅', '❌', '✅'],
                ['API 배포', '✅', '✅', '✅'],
                ['한국어 지원', '✅', '❌', '❌'],
                ['무료', '✅', '❌', '❌'],
                ['Optuna 자동 튜닝', '✅', '제한적', '✅'],
              ].map(([feat, ...vals], i) => (
                <tr key={feat} style={{ borderBottom:'1px solid var(--border-sub)' }}>
                  <td style={{ padding:'11px 20px', color:'var(--text-2)', fontWeight:500 }}>{feat}</td>
                  {vals.map((v, j) => (
                    <td key={j} style={{ padding:'11px 16px', textAlign:'center', fontWeight: j === 0 ? 700 : 400, color: v === '✅' ? '#059669' : v === '❌' ? '#e11d48' : 'var(--text-label)' }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 최종 CTA ──────────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{
          background:'linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#a855f7 100%)',
          borderRadius:24, padding:'64px 40px', textAlign:'center', position:'relative', overflow:'hidden',
          boxShadow:'0 24px 64px rgba(99,102,241,0.35)',
        }}>
          <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, left:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🚀</div>
            <h2 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:'#fff', margin:'0 0 12px', letterSpacing:'-0.02em' }}>
              지금 바로 시작해보세요
            </h2>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.75)', margin:'0 0 36px', lineHeight:1.6 }}>
              CSV 파일 하나만 있으면 됩니다. 회원가입 없이도 바로 사용할 수 있습니다.
            </p>
            <button onClick={() => nav('/upload')} style={{
              padding:'15px 40px', borderRadius:13, border:'none', cursor:'pointer', fontSize:16, fontWeight:700,
              background:'#ffffff', color:'#6366f1',
              boxShadow:'0 4px 20px rgba(0,0,0,0.2)', transition:'all 0.2s',
              display:'inline-flex', alignItems:'center', gap:8,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)' }}>
              CSV 업로드하기
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'24px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'var(--text-label)', margin:0 }}>
          © 2026 ModelMate &nbsp;·&nbsp; 범용 AutoML 플랫폼 &nbsp;·&nbsp; Built with FastAPI + React
        </p>
      </footer>
    </div>
  )
}
