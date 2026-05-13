import { useState, useEffect } from 'react'
import api from '../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

function getMetrics(h) {
  const br = h.results?.find(r => r.model === h.best_model) || h.results?.[0] || {}
  const isReg = h.task_type === 'regression'
  if (isReg) {
    const finalScore = h.optuna_applied ? h.tuned_roc : br.r2
    return { primary: { label:'R²', value: finalScore ?? br.r2 },
             secondary: [{ label:'RMSE', value: br.rmse }, { label:'MAE', value: br.mae }],
             isRegression: true }
  }
  const finalScore = h.optuna_applied ? h.tuned_roc : br.roc_auc
  return { primary: { label:'ROC-AUC', value: finalScore ?? br.roc_auc },
           secondary: [{ label:'Accuracy', value: br.accuracy }, { label:'F1', value: br.f1 }],
           isRegression: false }
}

export default function History() {
  const [history,  setHistory]  = useState([])
  const [state,    setState]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState([])

  const load = () => {
    api.get('/history').then(r => setHistory(r.data))
    api.get('/state').then(r => setState(r.data))
  }
  useEffect(load, [])

  async function clearAll() {
    if (!confirm('전체 기록을 삭제할까요?')) return
    await api.delete('/history'); load(); setSelected([])
  }

  async function rerun() {
    setLoading(true)
    try { await api.post('/run-cv'); load() }
    catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  function toggleSelect(idx) {
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].slice(-3))
  }

  const reversed = [...history].reverse()

  const trend = reversed.map((h, i) => ({
    name: `#${i+1}`,
    roc:    h.results?.[0]?.roc_auc ?? h.results?.[0]?.r2 ?? 0,
    optuna: h.optuna_applied ? h.tuned_roc ?? h.results?.[0]?.roc_auc : null,
  }))

  const bestROC = history.length > 0
    ? Math.max(...history.map(h => h.results?.[0]?.roc_auc ?? h.results?.[0]?.r2 ?? 0))
    : 0

  // 선택된 실험 데이터
  const selectedExps = selected.map(idx => ({ idx, h: reversed[idx] }))

  // 비교할 primary metric 최고값
  const maxPrimary = selectedExps.length > 0
    ? Math.max(...selectedExps.map(({ h }) => parseFloat(getMetrics(h).primary.value) || 0))
    : 0

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          {selected.length >= 2 && (
            <p style={{ fontSize:12, color:'#6366f1', fontWeight:600, margin:0 }}>
              {selected.length}개 선택됨 — 아래에서 비교 결과를 확인하세요
            </p>
          )}
          {selected.length === 1 && (
            <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>하나 더 선택하면 비교가 시작됩니다</p>
          )}
          {selected.length === 0 && history.length > 0 && (
            <p style={{ fontSize:12, color:'var(--text-label)', margin:0 }}>행을 클릭하면 실험을 선택해 비교할 수 있습니다 (최대 3개)</p>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {state?.has_data && (
            <button onClick={rerun} disabled={loading} className="btn-primary">
              {loading ? <span className="spinner" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              재실행
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={() => setSelected([])} className="btn-secondary">선택 해제</button>
          )}
          {history.length > 0 && (
            <button onClick={clearAll} className="btn-secondary" style={{ color:'#fda4af', borderColor:'rgba(244,63,94,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2-2v2"/></svg>
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card empty-state">
          <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)' }}>
            <span style={{ fontSize:40 }}>📭</span>
          </div>
          <p className="empty-title">저장된 실험 기록이 없습니다</p>
          <p className="empty-desc">Model Lab에서 모델을 실행하면 자동으로 저장됩니다.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            <div className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-3)', margin:'0 0 8px' }}>총 실험 수</p>
              <p style={{ fontSize:32, fontWeight:700, color:'var(--text)', margin:0 }}>{history.length}</p>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-3)', margin:'0 0 8px' }}>Optuna 적용</p>
              <p style={{ fontSize:32, fontWeight:700, color:'#d97706', margin:0 }}>{history.filter(h=>h.optuna_applied).length}</p>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-3)', margin:'0 0 8px' }}>최고 성능</p>
              <p style={{ fontSize:32, fontWeight:700, color:'#059669', margin:0 }}>{bestROC.toFixed(4)}</p>
            </div>
          </div>

          {/* 추이 차트 */}
          {trend.length > 1 && (
            <div className="card">
              <p className="section-title">성능 추이</p>
              <p style={{ fontSize:11, color:'var(--text-2)', margin:'-8px 0 14px' }}>실험을 반복할수록 성능이 어떻게 변했는지 보여줍니다. 위로 올라갈수록 좋습니다.</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="name" tick={{ fill:'var(--text-2)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Line type="monotone" dataKey="roc" stroke="#6366f1" strokeWidth={2.5}
                    dot={{ fill:'#6366f1', r:4, strokeWidth:2, stroke:'#ffffff' }} name="기본 성능" />
                  <Line type="monotone" dataKey="optuna" stroke="#f59e0b" strokeWidth={2}
                    dot={{ fill:'#f59e0b', r:4, strokeWidth:2, stroke:'#ffffff' }} name="Optuna 적용"
                    connectNulls={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:24, marginTop:12, justifyContent:'flex-end' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--text-2)' }}>
                  <span style={{ width:20, height:2, borderRadius:99, background:'#6366f1', display:'inline-block' }} />기본 성능
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--text-2)' }}>
                  <span style={{ width:20, height:0, display:'inline-block', borderTop:'2px dashed #f59e0b' }} />Optuna 적용
                </span>
              </div>
            </div>
          )}

          {/* ── 실험 비교 카드 ── */}
          {selectedExps.length >= 2 && (
            <div className="card animate-slide-up" style={{ borderColor:'rgba(99,102,241,0.3)', background:'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.02))' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>실험 비교</p>
                  <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>선택한 {selectedExps.length}개 실험을 나란히 비교합니다. 초록색이 가장 좋은 값입니다.</p>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:`repeat(${selectedExps.length}, 1fr)`, gap:12 }}>
                {selectedExps.map(({ idx, h }) => {
                  const m = getMetrics(h)
                  const isBest = parseFloat(m.primary.value) === maxPrimary
                  return (
                    <div key={idx} style={{
                      borderRadius:14, padding:18,
                      border:`2px solid ${isBest ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                      background: isBest ? 'rgba(16,185,129,0.05)' : 'var(--surface-alt)',
                      position:'relative',
                    }}>
                      {isBest && (
                        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
                          background:'#10b981', color:'white', fontSize:10, fontWeight:700,
                          padding:'2px 10px', borderRadius:99 }}>
                          최고 성능
                        </div>
                      )}

                      {/* 실험 헤더 */}
                      <div style={{ marginBottom:14 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>
                          실험 #{history.length - idx}
                        </p>
                        <p style={{ fontSize:10, color:'var(--text-label)', margin:0 }}>{h.timestamp}</p>
                      </div>

                      {/* 주요 메트릭 */}
                      <div style={{ padding:'12px 14px', borderRadius:10, background: isBest ? 'rgba(16,185,129,0.08)' : 'var(--bg)', marginBottom:12, textAlign:'center' }}>
                        <p style={{ fontSize:10, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 4px' }}>{m.primary.label}</p>
                        <p style={{ fontSize:26, fontWeight:800, color: isBest ? '#059669' : '#6366f1', margin:0 }}>
                          {m.primary.value ?? '—'}
                        </p>
                      </div>

                      {/* 보조 메트릭 */}
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                        {m.secondary.map(({ label, value }) => (
                          <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 8px', borderRadius:7, background:'rgba(0,0,0,0.03)' }}>
                            <span style={{ fontSize:11, color:'var(--text-label)' }}>{label}</span>
                            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-2)' }}>{value ?? '—'}</span>
                          </div>
                        ))}
                      </div>

                      {/* 추가 정보 */}
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                          <span style={{ color:'var(--text-label)' }}>모델</span>
                          <span style={{ color:'var(--text-2)', fontWeight:500, maxWidth:100, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.best_model}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                          <span style={{ color:'var(--text-label)' }}>데이터</span>
                          <span style={{ color:'var(--text-2)' }}>{h.data_shape?.join('×')}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                          <span style={{ color:'var(--text-label)' }}>Optuna</span>
                          {h.optuna_applied
                            ? <span className="badge badge-green" style={{ fontSize:9 }}>적용</span>
                            : <span style={{ color:'var(--text-label)' }}>—</span>}
                        </div>
                        {h.task_type && (
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                            <span style={{ color:'var(--text-label)' }}>유형</span>
                            <span style={{ color:'var(--text-2)' }}>{h.task_type === 'regression' ? '회귀' : '분류'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 이력 테이블 */}
          <div className="card" style={{ overflowX:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <p className="section-title" style={{ margin:'0 0 4px' }}>전체 실험 이력</p>
                <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>행을 클릭해서 비교할 실험을 선택하세요 (최대 3개)</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:28 }} />
                  {['#','시간','데이터','타깃','최고 모델','주요 성능','Optuna'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reversed.map((h, i) => {
                  const m = getMetrics(h)
                  const isSelected = selected.includes(i)
                  return (
                    <tr key={i}
                      onClick={() => toggleSelect(i)}
                      style={{ cursor:'pointer', background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent', transition:'background 0.15s' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-alt)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td>
                        <div style={{
                          width:16, height:16, borderRadius:4, border:`2px solid ${isSelected ? '#6366f1' : 'var(--border)'}`,
                          background: isSelected ? '#6366f1' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        }}>
                          {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
                        </div>
                      </td>
                      <td style={{ color:'var(--text-2)', fontSize:11 }}>#{history.length-i}</td>
                      <td style={{ color:'var(--text-2)', fontSize:11, whiteSpace:'nowrap' }}>{h.timestamp}</td>
                      <td style={{ color:'var(--text-2)', fontSize:11 }}>{h.data_shape?.join('×')}</td>
                      <td style={{ color:'var(--text-2)', fontSize:11 }}>{h.target || '—'}</td>
                      <td style={{ color:'var(--text)', fontWeight:500, fontSize:11 }}>{h.best_model}</td>
                      <td style={{ color:'#4f46e5', fontWeight:600, fontSize:11, fontVariantNumeric:'tabular-nums' }}>
                        {m.primary.label} {m.primary.value ?? '—'}
                        {h.optuna_applied && h.tuned_roc && (
                          <span className="badge badge-green" style={{ fontSize:9, marginLeft:6 }}>↑{h.tuned_roc}</span>
                        )}
                      </td>
                      <td>
                        {h.optuna_applied
                          ? <span className="badge badge-green">✓ 적용</span>
                          : <span style={{ fontSize:11, color:'var(--text-label)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}
