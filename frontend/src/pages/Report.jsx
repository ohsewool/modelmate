import { useState, useEffect } from 'react'
import api from '../api'

const ITEMS = [
  ['🗂️', '데이터 요약', '샘플 수, 피처 수, 고장률, 결측치'],
  ['🏆', '모델 성능 비교', '4개 모델 Accuracy / F1 / ROC-AUC'],
  ['📈', '최고 모델 상세', '교차검증 상세 지표'],
  ['⚡', 'Optuna 튜닝 결과', '튜닝 전후 성능 비교'],
  ['🔍', 'SHAP 피처 중요도', '전역 피처 중요도 순위'],
  ['🔧', '정비 우선순위', '고장 예측 설비 Top 10'],
]

export default function Report() {
  const [state,   setState]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/state').then(r => setState(r.data)) }, [])

  async function downloadReport() {
    setLoading(true)
    try {
      const res = await api.get('/report/html', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
      const a = document.createElement('a'); a.href = url; a.download = 'FailureAI_Report.html'; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const ready = state?.has_model

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      {!ready ? (
        <div className="card empty-state">
          <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)' }}>
            <span style={{ fontSize:40 }}>📋</span>
          </div>
          <p className="empty-title">보고서를 생성하려면 모델 학습이 필요합니다</p>
          <p className="empty-desc">Model Lab에서 CV 실행 후 다시 오세요.</p>
        </div>
      ) : (
        <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Hero card */}
          <div className="card" style={{
            position:'relative', overflow:'hidden',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
            borderColor: 'rgba(99,102,241,0.2)',
            boxShadow: '0 0 40px rgba(99,102,241,0.08), 0 4px 24px rgba(0,0,0,0.4)',
          }}>
            {/* Glow orb */}
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:20 }}>
              <div style={{
                width:56, height:56, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background:'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow:'0 4px 20px rgba(99,102,241,0.5)',
              }}>
                <span style={{ fontSize:24 }}>📊</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, color:'#1e293b', fontSize:18, margin:'0 0 4px' }}>분석 보고서 준비 완료</p>
                <p style={{ color:'#475569', fontSize:13, margin:'0 0 20px' }}>
                  최고 모델 <span style={{ color:'#1e293b', fontWeight:600 }}>{state.best_model}</span>의
                  학습 결과와 설비 예측 분석이 포함됩니다.
                </p>
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={() => window.open('/api/report/html', '_blank')} className="btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    브라우저에서 열기
                  </button>
                  <button onClick={downloadReport} disabled={loading} className="btn-secondary">
                    {loading ? <span className="spinner" /> : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    )}
                    다운로드
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 포함 항목 */}
          <div className="card">
            <p className="section-title">보고서 포함 항목</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {ITEMS.map(([icon, title, desc]) => (
                <div key={title} style={{
                  display:'flex', alignItems:'flex-start', gap:12,
                  borderRadius:12, padding:16,
                  border:'1px solid rgba(99,102,241,0.08)',
                  background:'rgba(99,102,241,0.03)',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.18)'; e.currentTarget.style.background='rgba(99,102,241,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.08)'; e.currentTarget.style.background='rgba(99,102,241,0.03)' }}
                >
                  <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1e293b', margin:'0 0 2px' }}>{title}</p>
                    <p style={{ fontSize:11, color:'#334155', margin:0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 현재 결과 요약 */}
          <div className="card">
            <p className="section-title">현재 분석 결과</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              <div style={{ borderRadius:12, padding:16, textAlign:'center', border:'1px solid #e2e8f0', background:'#f8fafc' }}>
                <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>최고 모델</p>
                <p style={{ color:'#1e293b', fontWeight:700, margin:0 }}>{state.best_model?.split(' ')[0]}</p>
              </div>
              <div style={{ borderRadius:12, padding:16, textAlign:'center', border:'1px solid rgba(99,102,241,0.2)', background:'rgba(99,102,241,0.06)' }}>
                <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>ROC-AUC</p>
                <p style={{ color:'#4f46e5', fontWeight:700, fontSize:22, fontVariantNumeric:'tabular-nums', margin:0 }}>{state.cv_results?.[0]?.roc_auc ?? '—'}</p>
              </div>
              <div style={{ borderRadius:12, padding:16, textAlign:'center', border:`1px solid ${state.optuna_result ? 'rgba(16,185,129,0.3)' : '#e2e8f0'}`, background: state.optuna_result ? 'rgba(16,185,129,0.06)' : '#f8fafc' }}>
                <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>Optuna</p>
                <p style={{ fontWeight:700, color: state.optuna_result ? '#059669' : '#1e293b', margin:0 }}>
                  {state.optuna_result ? `+${state.optuna_result.improvement}% 개선` : '미실행'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
