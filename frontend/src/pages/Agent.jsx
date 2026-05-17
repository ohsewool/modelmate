import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const ICONS = ['🔍', '🤔', '⚡', '🧮', '✅']

function StepCard({ s, i, total }) {
  const isLast = i === total - 1
  return (
    <div className="card animate-slide-up" style={{
      borderColor: isLast ? 'rgba(124,58,237,0.35)' : 'var(--border)',
      background: isLast
        ? 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(168,85,247,0.03))'
        : 'var(--surface)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        <div style={{
          width:38, height:38, borderRadius:11, flexShrink:0,
          background: isLast ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)',
          border: isLast ? 'none' : '1px solid rgba(124,58,237,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          boxShadow: isLast ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
        }}>
          {ICONS[i] || '✅'}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-label)', letterSpacing:'0.05em' }}>
              STEP {s.step}
            </span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{s.name}</span>
            <span className="badge badge-green" style={{ fontSize:10 }}>완료</span>
            {s.decision === 'optuna_skip' && <span className="badge badge-amber" style={{ fontSize:10 }}>Optuna 생략</span>}
            {s.decision === 'optuna_run'  && <span className="badge badge-blue"  style={{ fontSize:10 }}>Optuna 실행</span>}
          </div>

          {/* AI 코멘트 */}
          <div style={{
            borderRadius:10, padding:'10px 14px', marginBottom: s.data ? 12 : 0,
            background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.12)',
          }}>
            <p style={{ fontSize:13, color:'var(--text-2)', margin:0, lineHeight:1.7 }}>
              <span style={{ fontSize:12, marginRight:6 }}>🤖</span>{s.comment}
            </p>
          </div>

          {/* CV 결과 */}
          {s.data?.results && (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {s.data.results.slice(0,4).map((r, j) => (
                <div key={j} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'7px 12px',
                  borderRadius:8, background:'var(--surface-alt)', border:'1px solid var(--border)',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.2)'; e.currentTarget.style.background='rgba(124,58,237,0.03)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface-alt)' }}
                >
                  <span style={{ fontSize:11, color:'var(--text-2)', flex:1 }}>{r.model}</span>
                  <span style={{ fontSize:10, color:'var(--text-label)' }}>F1</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', width:36, textAlign:'right' }}>{r.f1}</span>
                  <span style={{ fontSize:10, color:'var(--text-label)' }}>ROC-AUC</span>
                  <span style={{ fontSize:12, fontWeight:700, color: j===0?'#7c3aed':'var(--text-2)', width:40, textAlign:'right' }}>{r.roc_auc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Optuna 결과 */}
          {s.data?.before_roc !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ padding:'10px 20px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface-alt)', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--text-label)', margin:'0 0 4px' }}>튜닝 전</p>
                <p style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>{s.data.before_roc}</p>
              </div>
              <span style={{ color:'var(--text-label)', fontSize:20 }}>→</span>
              <div style={{ padding:'10px 20px', borderRadius:10, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--text-label)', margin:'0 0 4px' }}>튜닝 후</p>
                <p style={{ fontSize:20, fontWeight:700, color:'#10b981', margin:0 }}>{s.data.after_roc}</p>
              </div>
              <span className="badge badge-green" style={{ fontSize:11 }}>{s.data.improvement > 0 ? '+' : ''}{s.data.improvement}%</span>
            </div>
          )}

          {/* SHAP 결과 */}
          {s.data?.global && (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {s.data.global.map((f, j) => (
                <div key={j} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, color:'var(--text-2)', width:130, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.feature}</span>
                  <div className="progress-bar" style={{ flex:1 }}>
                    <div className="progress-fill" style={{ width:`${(f.shap_value / s.data.global[0].shap_value)*100}%` }} />
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-label)', width:40, textAlign:'right', flexShrink:0 }}>{f.shap_value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Agent() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const nav = useNavigate()

  async function runAgent() {
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/run-agent')
      setResult(data)
    } catch(e) { setError(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const LOADING_STEPS = ['모델 비교 (CV)', '성능 평가 및 전략 결정', 'SHAP 분석', 'AI 코멘트 생성']

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>

      {/* 페이지 헤더 배너 */}
      <div style={{
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 28,
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -50, right: -50,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, right: 120,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{ display:'flex', alignItems:'center', gap:16, position:'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>🤖</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Agentic AutoML
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              버튼 하나로 전체 분석 파이프라인을 자동 실행합니다
            </p>
          </div>
        </div>
      </div>

      {/* 시작 카드 */}
      {!result && (
        <div className="card" style={{ textAlign:'center', padding:'64px 40px' }}>
          <div style={{
            width:80, height:80, borderRadius:24, margin:'0 auto 24px',
            background:'linear-gradient(135deg,#7c3aed,#a855f7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 28px rgba(124,58,237,0.4)', fontSize:40,
          }}>🤖</div>

          <h2 style={{ fontSize:24, fontWeight:800, color:'var(--text)', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
            자동 분석 준비 완료
          </h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:'0 0 6px' }}>
            버튼 하나로 전체 분석을 자동 실행합니다
          </p>
          <p style={{ fontSize:12, color:'var(--text-label)', margin:'0 0 32px' }}>
            CV → 성능 평가 → (필요 시) Optuna → SHAP → AI 해석
          </p>

          {/* 파이프라인 스텝 표시 */}
          <div style={{ display:'flex', justifyContent:'center', gap:0, marginBottom:36, flexWrap:'wrap' }}>
            {[
              { icon:'📊', label:'CV 평가' },
              { icon:'🎯', label:'전략 결정' },
              { icon:'⚡', label:'Optuna' },
              { icon:'🧮', label:'SHAP' },
              { icon:'✅', label:'AI 해석' },
            ].map((step, i, arr) => (
              <div key={i} style={{ display:'flex', alignItems:'center' }}>
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  padding:'10px 14px',
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:12,
                    background:'rgba(124,58,237,0.1)',
                    border:'1px solid rgba(124,58,237,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18,
                  }}>{step.icon}</div>
                  <span style={{ fontSize:11, color:'var(--text-2)', whiteSpace:'nowrap' }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width:24, height:1, background:'rgba(124,58,237,0.2)', marginBottom:18 }} />
                )}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
              {/* 커스텀 로딩 */}
              <div style={{ position:'relative', width:64, height:64 }}>
                <div style={{
                  position:'absolute', inset:0, borderRadius:'50%',
                  border:'3px solid rgba(124,58,237,0.15)',
                }} />
                <div style={{
                  position:'absolute', inset:0, borderRadius:'50%',
                  border:'3px solid transparent',
                  borderTopColor:'#7c3aed',
                  animation:'spin 1s linear infinite',
                }} />
                <div style={{
                  position:'absolute', inset:8, borderRadius:'50%',
                  border:'3px solid transparent',
                  borderTopColor:'#a855f7',
                  animation:'spin 0.7s linear infinite reverse',
                }} />
                <div style={{
                  position:'absolute', inset:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22,
                }}>🤖</div>
              </div>
              <div>
                <p style={{ color:'var(--text)', fontSize:15, fontWeight:600, margin:'0 0 4px' }}>AI 분석 중...</p>
                <p style={{ color:'var(--text-2)', fontSize:12, margin:0 }}>1~2분 소요됩니다</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:320 }}>
                {LOADING_STEPS.map((t, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px', borderRadius:10,
                    background:'rgba(124,58,237,0.05)',
                    border:'1px solid rgba(124,58,237,0.12)',
                  }}>
                    <div className="spinner" style={{ flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text-2)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={runAgent} className="btn-primary"
              style={{
                padding:'14px 48px', fontSize:15, margin:'0 auto',
                background:'linear-gradient(135deg,#7c3aed,#a855f7)',
                boxShadow:'0 4px 16px rgba(124,58,237,0.35)',
              }}>
              🤖 자동 분석 시작
            </button>
          )}

          {error && (
            <div style={{ marginTop:20, padding:'12px 16px', borderRadius:10, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)' }}>
              <p style={{ color:'#f43f5e', fontSize:13, margin:0 }}>⚠️ {error}</p>
            </div>
          )}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* 상단 성과 배너 */}
          <div style={{
            borderRadius:16, padding:'20px 24px',
            background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.06))',
            border:'1px solid rgba(124,58,237,0.28)',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{
                width:48, height:48, borderRadius:14,
                background:'linear-gradient(135deg,#7c3aed,#a855f7)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 14px rgba(124,58,237,0.35)', fontSize:24,
              }}>🎉</div>
              <div>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>분석 완료</p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                  최고 모델: <b style={{ color:'var(--text)' }}>{result.best_model}</b>
                  <span style={{ margin:'0 8px', color:'var(--text-label)' }}>·</span>
                  ROC-AUC: <b style={{ color:'#7c3aed', fontSize:15 }}>{result.cv_results?.[0]?.roc_auc}</b>
                  {!result.gemini_used && <span className="badge badge-amber" style={{ marginLeft:8, fontSize:10 }}>AI 코멘트 비활성 (API 키 없음)</span>}
                </p>
              </div>
            </div>
            <button onClick={() => { setResult(null); setError('') }} className="btn-secondary" style={{ fontSize:12 }}>
              🔄 다시 실행
            </button>
          </div>

          {/* 단계별 카드 */}
          {result.steps.map((s, i) => (
            <StepCard key={i} s={s} i={i} total={result.steps.length} />
          ))}

          {/* 이동 버튼 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:4 }}>
            <button onClick={() => nav('/model-lab')} className="btn-secondary" style={{ justifyContent:'center' }}>
              📊 상세 결과
            </button>
            <button onClick={() => nav('/xai')} className="btn-secondary" style={{ justifyContent:'center' }}>
              🧮 XAI 설명
            </button>
            <button onClick={() => nav('/report')} className="btn-primary" style={{ justifyContent:'center' }}>
              📋 보고서 생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
