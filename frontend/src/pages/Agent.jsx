import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const ICONS = ['🔍', '🤔', '⚡', '🧮', '✅']

function StepCard({ s, i, total }) {
  const isLast = i === total - 1
  return (
    <div className="card animate-slide-up" style={{
      borderColor: isLast ? 'rgba(99,102,241,0.35)' : 'var(--border)',
      background: isLast
        ? 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.03))'
        : 'var(--surface)',
    }}>
      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        <div style={{
          width:38, height:38, borderRadius:11, flexShrink:0,
          background: isLast ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
          border: isLast ? 'none' : '1px solid rgba(99,102,241,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          boxShadow: isLast ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
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
            background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.12)',
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
                }}>
                  <span style={{ fontSize:11, color:'var(--text-2)', flex:1 }}>{r.model}</span>
                  <span style={{ fontSize:10, color:'var(--text-label)' }}>F1</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', width:36, textAlign:'right' }}>{r.f1}</span>
                  <span style={{ fontSize:10, color:'var(--text-label)' }}>ROC-AUC</span>
                  <span style={{ fontSize:12, fontWeight:700, color: j===0?'#4f46e5':'var(--text-2)', width:40, textAlign:'right' }}>{r.roc_auc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Optuna 결과 */}
          {s.data?.before_roc !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ padding:'10px 20px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface-alt)', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--text-label)', margin:'0 0 4px' }}>튜닝 전</p>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--text)', margin:0 }}>{s.data.before_roc}</p>
              </div>
              <span style={{ color:'var(--text-label)', fontSize:20 }}>→</span>
              <div style={{ padding:'10px 20px', borderRadius:10, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--text-label)', margin:'0 0 4px' }}>튜닝 후</p>
                <p style={{ fontSize:16, fontWeight:700, color:'#10b981', margin:0 }}>{s.data.after_roc}</p>
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

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>

      {/* 시작 카드 */}
      {!result && (
        <div className="card" style={{ textAlign:'center', padding:'64px 40px' }}>
          <div style={{
            width:72, height:72, borderRadius:22, margin:'0 auto 24px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px rgba(99,102,241,0.4)', fontSize:36,
          }}>🤖</div>

          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', margin:'0 0 10px' }}>
            Agentic AutoML
          </h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:'0 0 6px' }}>
            버튼 하나로 전체 분석을 자동 실행합니다
          </p>
          <p style={{ fontSize:12, color:'var(--text-label)', margin:'0 0 32px' }}>
            CV → 성능 평가 → (필요 시) Optuna → SHAP → AI 해석
          </p>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <div className="spinner-lg" />
              <p style={{ color:'var(--text-2)', fontSize:13 }}>AI 분석 중... 1~2분 소요됩니다</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:320 }}>
                {['모델 비교 (CV)','성능 평가 및 전략 결정','SHAP 분석','AI 코멘트 생성'].map((t,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="spinner" style={{ flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text-2)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={runAgent} className="btn-primary"
              style={{ padding:'14px 40px', fontSize:15, margin:'0 auto' }}>
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
          {/* 상단 배너 */}
          <div style={{
            borderRadius:16, padding:'16px 24px',
            background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.05))',
            border:'1px solid rgba(99,102,241,0.25)',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24 }}>🤖</span>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>분석 완료</p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                  최고 모델: <b>{result.best_model}</b> · ROC-AUC: <b style={{ color:'#4f46e5' }}>{result.cv_results?.[0]?.roc_auc}</b>
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
