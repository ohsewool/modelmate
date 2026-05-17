import { useState, useEffect } from 'react'
import api from '../api'

const ITEMS = [
  ['🗂️', '데이터 요약', '샘플 수, 피처 수, 타깃 비율, 결측치'],
  ['🏆', '모델 성능 비교', '4개 모델 Accuracy / F1 / ROC-AUC'],
  ['📈', '최고 모델 상세', '교차검증 상세 지표'],
  ['⚡', 'Optuna 튜닝 결과', '튜닝 전후 성능 비교'],
  ['🔍', 'SHAP 피처 중요도', '전역 피처 중요도 순위'],
  ['🔧', '예측 우선순위', '고위험 샘플 Top 10'],
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
      const a = document.createElement('a'); a.href = url; a.download = 'ModelMate_Report.html'; a.click()
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

          {/* 상단 그라디언트 헤더 배너 */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #6d28d9 100%)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 배경 장식 */}
            <div style={{ position:'absolute', top:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-20, left:60, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:20 }}>
              <div style={{
                width:64, height:64, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,0.25)',
                boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
              }}>
                <span style={{ fontSize:30 }}>📄</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.65)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.12em' }}>
                  분석 리포트
                </p>
                <h2 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.02em' }}>보고서 내보내기</h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.78)', margin:0, lineHeight:1.5 }}>
                  PDF로 저장하거나 공유할 수 있습니다 &nbsp;·&nbsp;
                  최고 모델 <strong style={{ color:'#fff' }}>{state.best_model?.split(' ')[0]}</strong>의 전체 분석 결과가 포함됩니다
                </p>
              </div>
              <div style={{
                flexShrink:0, display:'flex', flexDirection:'column', gap:8,
              }}>
                {/* 브라우저에서 열기 버튼 */}
                <button onClick={() => window.open('/api/report/html', '_blank')} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
                  borderRadius:10, border:'1px solid rgba(255,255,255,0.3)',
                  background:'rgba(255,255,255,0.15)', backdropFilter:'blur(4px)',
                  color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                  transition:'all 0.2s', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  브라우저에서 열기
                </button>
                {/* 다운로드 버튼 */}
                <button onClick={downloadReport} disabled={loading} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
                  borderRadius:10, border:'1px solid rgba(255,255,255,0.5)',
                  background:'rgba(255,255,255,0.92)', backdropFilter:'blur(4px)',
                  color:'#4f46e5', fontSize:13, fontWeight:800, cursor:'pointer',
                  transition:'all 0.2s', whiteSpace:'nowrap',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = '#fff')}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}>
                  {loading ? <span className="spinner" style={{ borderTopColor:'#4f46e5' }} /> : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                  {loading ? '생성 중...' : 'PDF 다운로드'}
                </button>
              </div>
            </div>
          </div>

          {/* 설명 텍스트 배너 */}
          <div style={{
            display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:14,
            background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(124,58,237,0.04))',
            border:'1px solid rgba(99,102,241,0.15)',
          }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.1))',
              border:'1px solid rgba(99,102,241,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            }}>💡</div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>보고서 활용 방법</p>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.6 }}>
                브라우저에서 열기 후 <strong>Ctrl+P (또는 Cmd+P)</strong>를 눌러 PDF로 저장하거나 공유할 수 있습니다.
                또는 PDF 다운로드 버튼으로 HTML 파일을 저장하세요.
              </p>
            </div>
          </div>

          {/* 포함 항목 */}
          <div className="card">
            <p className="section-title">보고서 포함 항목</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {ITEMS.map(([icon, title, desc], idx) => (
                <div key={title} style={{
                  display:'flex', alignItems:'flex-start', gap:12,
                  borderRadius:12, padding:16,
                  border:'1px solid rgba(99,102,241,0.08)',
                  background:'rgba(99,102,241,0.03)',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.2)'; e.currentTarget.style.background='rgba(99,102,241,0.07)'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.08)'; e.currentTarget.style.background='rgba(99,102,241,0.03)'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(124,58,237,0.08))',
                    border:'1px solid rgba(99,102,241,0.15)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                  }}>{icon}</div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>{title}</p>
                    <p style={{ fontSize:11, color:'var(--text-2)', margin:0, lineHeight:1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 현재 결과 요약 */}
          <div className="card">
            <p className="section-title">현재 분석 결과 요약</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              <div style={{
                borderRadius:14, padding:'18px 16px', textAlign:'center',
                border:'1px solid var(--border)', background:'var(--bg)',
                transition:'all 0.15s',
              }}>
                <p style={{ fontSize:10, color:'var(--text-2)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>최고 모델</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--text)', margin:'0 0 4px' }}>🏆 {state.best_model?.split(' ')[0]}</p>
                <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>Best Performer</p>
              </div>
              <div style={{
                borderRadius:14, padding:'18px 16px', textAlign:'center',
                border:'1px solid rgba(99,102,241,0.25)',
                background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.04))',
              }}>
                <p style={{ fontSize:10, color:'var(--text-2)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>ROC-AUC</p>
                <p style={{ fontSize:36, fontWeight:900, color:'#4f46e5', fontVariantNumeric:'tabular-nums', margin:'0 0 4px', lineHeight:1 }}>
                  {state.cv_results?.[0]?.roc_auc ?? '—'}
                </p>
                <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>종합 예측 정확도</p>
              </div>
              <div style={{
                borderRadius:14, padding:'18px 16px', textAlign:'center',
                border:`1px solid ${state.optuna_result ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                background: state.optuna_result
                  ? 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))'
                  : 'var(--bg)',
              }}>
                <p style={{ fontSize:10, color:'var(--text-2)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>Optuna 튜닝</p>
                <p style={{ fontSize:state.optuna_result ? 24 : 18, fontWeight:800, color: state.optuna_result ? '#059669' : 'var(--text)', margin:'0 0 4px', lineHeight:1 }}>
                  {state.optuna_result ? `+${state.optuna_result.improvement}%` : '미실행'}
                </p>
                <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>
                  {state.optuna_result ? '성능 개선' : 'Model Lab에서 실행 가능'}
                </p>
              </div>
            </div>
          </div>

          {/* 하단 다운로드 CTA */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center',
            padding:'20px 24px', borderRadius:16,
            background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(124,58,237,0.04))',
            border:'1px solid rgba(99,102,241,0.15)',
          }}>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>보고서를 팀과 공유하세요</p>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                PDF로 저장하거나 공유할 수 있습니다. 브라우저에서 Ctrl+P → PDF로 저장을 선택하세요.
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0 }}>
              <button onClick={() => window.open('/api/report/html', '_blank')} className="btn-secondary" style={{ whiteSpace:'nowrap' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                미리보기
              </button>
              <button onClick={downloadReport} disabled={loading} className="btn-primary"
                style={{ whiteSpace:'nowrap', background:'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                {loading ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
                {loading ? '생성 중...' : 'PDF 다운로드'}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
