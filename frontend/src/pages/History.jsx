import { useState, useEffect } from 'react'
import api from '../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: 12, fontSize: 11, color: '#0f172a',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function History() {
  const [history, setHistory] = useState([])
  const [state,   setState]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    api.get('/history').then(r => setHistory(r.data))
    api.get('/state').then(r => setState(r.data))
  }
  useEffect(load, [])

  async function clearAll() {
    if (!confirm('전체 기록을 삭제할까요?')) return
    await api.delete('/history'); load()
  }

  async function rerun() {
    setLoading(true)
    try { await api.post('/run-cv'); load() }
    catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const trend = [...history].reverse().map((h, i) => ({
    name: `#${i+1}`,
    roc:    h.results?.[0]?.roc_auc ?? 0,
    optuna: h.optuna_applied ? h.tuned_roc ?? h.results?.[0]?.roc_auc : null,
  }))

  const bestROC = history.length > 0
    ? Math.max(...history.map(h => h.results?.[0]?.roc_auc ?? 0))
    : 0

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', marginBottom:24, gap:8 }}>
        {state?.has_data && (
          <button onClick={rerun} disabled={loading} className="btn-primary">
            {loading ? <span className="spinner" /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5,3 19,12 5,21"/></svg>
            )}
            재실행
          </button>
        )}
        {history.length > 0 && (
          <button onClick={clearAll} className="btn-secondary" style={{ color:'#fda4af', borderColor:'rgba(244,63,94,0.2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>
            전체 삭제
          </button>
        )}
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
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#64748b', marginBottom:8, margin:'0 0 8px' }}>총 실험 수</p>
              <p style={{ fontSize:32, fontWeight:700, color:'#1e293b', margin:0 }}>{history.length}</p>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#64748b', marginBottom:8, margin:'0 0 8px' }}>Optuna 적용</p>
              <p style={{ fontSize:32, fontWeight:700, color:'#d97706', margin:0 }}>{history.filter(h=>h.optuna_applied).length}</p>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#64748b', marginBottom:8, margin:'0 0 8px' }}>최고 ROC-AUC</p>
              <p style={{ fontSize:32, fontWeight:700, color:'#059669', margin:0 }}>{bestROC.toFixed(4)}</p>
            </div>
          </div>

          {/* 추이 차트 */}
          {trend.length > 1 && (
            <div className="card">
              <p className="section-title">ROC-AUC 성능 추이</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="name" tick={{ fill:'#334155', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Line type="monotone" dataKey="roc" stroke="#6366f1" strokeWidth={2.5}
                    dot={{ fill:'#6366f1', r:4, strokeWidth:2, stroke:'#ffffff' }} name="ROC-AUC" />
                  <Line type="monotone" dataKey="optuna" stroke="#f59e0b" strokeWidth={2}
                    dot={{ fill:'#f59e0b', r:4, strokeWidth:2, stroke:'#ffffff' }} name="Optuna"
                    connectNulls={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:24, marginTop:12, justifyContent:'flex-end' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#475569' }}>
                  <span style={{ width:20, height:2, borderRadius:99, background:'#6366f1', display:'inline-block' }} />ROC-AUC
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#475569' }}>
                  <span style={{ width:20, height:0, display:'inline-block', borderTop:'2px dashed #f59e0b' }} />Optuna
                </span>
              </div>
            </div>
          )}

          {/* 이력 테이블 */}
          <div className="card" style={{ overflowX:'auto' }}>
            <p className="section-title">전체 실험 이력</p>
            <table className="data-table">
              <thead>
                <tr>
                  {['#','시간','데이터','타깃','최고 모델','Accuracy','F1','ROC-AUC','Optuna'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, i) => {
                  const br = h.results?.find(r => r.model === h.best_model) || {}
                  return (
                    <tr key={i}>
                      <td style={{ color:'#334155', fontSize:11 }}>#{history.length-i}</td>
                      <td style={{ color:'#334155', fontSize:11, whiteSpace:'nowrap' }}>{h.timestamp}</td>
                      <td style={{ color:'#475569', fontSize:11 }}>{h.data_shape?.join('×')}</td>
                      <td style={{ color:'#475569', fontSize:11 }}>{h.target || '—'}</td>
                      <td style={{ color:'#1e293b', fontWeight:500, fontSize:11 }}>{h.best_model}</td>
                      <td style={{ color:'#64748b', fontSize:11, fontVariantNumeric:'tabular-nums' }}>{br.accuracy || '—'}</td>
                      <td style={{ color:'#64748b', fontSize:11, fontVariantNumeric:'tabular-nums' }}>{br.f1 || '—'}</td>
                      <td style={{ color:'#4f46e5', fontWeight:600, fontSize:11, fontVariantNumeric:'tabular-nums' }}>{br.roc_auc || '—'}</td>
                      <td>
                        {h.optuna_applied
                          ? <span className="badge badge-green">✓ 적용</span>
                          : <span style={{ fontSize:11, color:'#1e293b' }}>—</span>
                        }
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
