import { useState, useEffect } from 'react'
import api from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: 12, fontSize: 11, color: '#0f172a',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function XAI() {
  const [tab,     setTab]     = useState('global')
  const [global,  setGlobal]  = useState(null)
  const [local,   setLocal]   = useState(null)
  const [preds,   setPreds]   = useState(null)
  const [idx,     setIdx]     = useState(0)
  const [loading, setLoading] = useState('')

  useEffect(() => { api.get('/state').then(r => { if(!r.data.has_model) return }) }, [])

  async function runShap() {
    setLoading('shap')
    try {
      const { data } = await api.post('/run-shap')
      setGlobal(data.global); setTab('global')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function fetchLocal() {
    setLoading('local')
    try {
      const { data } = await api.get(`/shap-local/${idx}`)
      setLocal(data)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function fetchPreds() {
    setLoading('preds')
    try {
      const { data } = await api.get('/predictions')
      setPreds(data); setTab('wrong')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  const TABS = [['global','전역 중요도'],['local','개별 설명'],['wrong','오분류']]

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      <div className="tab-bar" style={{ width:'fit-content', marginBottom:24 }}>
        {TABS.map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={tab === k ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>
            {v}
          </button>
        ))}
      </div>

      {/* 전역 SHAP */}
      {tab === 'global' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!global ? (
            <div className="card empty-state">
              <div style={{ width:64, height:64, borderRadius:20, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
                <span style={{ fontSize:30 }}>🧮</span>
              </div>
              <p className="empty-title">SHAP 피처 중요도 계산</p>
              <p className="empty-desc" style={{ marginBottom:24 }}>각 피처가 예측에 미치는 영향을 분석합니다</p>
              <button onClick={runShap} disabled={!!loading} className="btn-primary">
                {loading === 'shap' ? <span className="spinner" /> : '🧮'}
                SHAP 계산
              </button>
            </div>
          ) : (
            <div className="card animate-slide-up">
              <p className="section-title">전역 피처 중요도 (SHAP 평균 절댓값)</p>
              <ResponsiveContainer width="100%" height={Math.max(300, global.length * 38)}>
                <BarChart data={[...global].reverse()} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="feature" type="category" tick={{ fill:'#475569', fontSize:11 }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar dataKey="shap_value" radius={[0,6,6,0]}>
                    {global.map((_, i) => (
                      <Cell key={i} fill={`hsl(${240 + i*15}, 70%, ${65 - i*2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 개별 설명 */}
      {tab === 'local' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#334155', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.1em' }}>샘플 인덱스</label>
                <input type="number" value={idx} min={0} onChange={e => setIdx(+e.target.value)}
                  className="input" style={{ width:128 }} />
              </div>
              <button onClick={fetchLocal} className="btn-primary" disabled={!!loading}>
                {loading === 'local' ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                )}
                설명 보기
              </button>
            </div>
          </div>

          {local && (
            <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                <div className="card" style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>예측 결과</p>
                  <p style={{ fontSize:24, fontWeight:700, color: local.prediction===1 ? '#f43f5e' : '#10b981', margin:0 }}>
                    {local.prediction === 1 ? '🔴 고장' : '🟢 정상'}
                  </p>
                </div>
                <div className="card" style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>정상 확률</p>
                  <p style={{ fontSize:24, fontWeight:700, color:'#10b981', margin:0 }}>{(local.probability[0]*100).toFixed(1)}%</p>
                </div>
                <div className="card" style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#334155', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>고장 확률</p>
                  <p style={{ fontSize:24, fontWeight:700, color:'#f43f5e', margin:0 }}>{(local.probability[1]*100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="card">
                <p className="section-title">SHAP 기여도</p>
                <div style={{ display:'flex', gap:16, marginBottom:16, fontSize:11, color:'#475569' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:'#f43f5e', display:'inline-block' }} />고장 방향 (+)</span>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:'#6366f1', display:'inline-block' }} />정상 방향 (−)</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, local.local.length * 34)}>
                  <BarChart data={[...local.local].reverse()} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" tick={{ fill:'#475569', fontSize:11 }} width={140} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="shap_value" radius={[0,6,6,0]}>
                      {[...local.local].reverse().map((d,i) => (
                        <Cell key={i} fill={d.shap_value > 0 ? '#f43f5e' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 오분류 */}
      {tab === 'wrong' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!preds ? (
            <div className="card empty-state">
              <div style={{ width:64, height:64, borderRadius:20, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)' }}>
                <span style={{ fontSize:30 }}>❌</span>
              </div>
              <p className="empty-title">오분류 샘플 분석</p>
              <p className="empty-desc" style={{ marginBottom:24 }}>모델이 잘못 예측한 샘플을 확인합니다</p>
              <button onClick={fetchPreds} disabled={!!loading} className="btn-primary"
                style={{ background:'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}>
                {loading === 'preds' ? <span className="spinner" /> : '❌'}
                오분류 보기
              </button>
            </div>
          ) : preds.misclassified.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'64px 20px' }}>
              <span style={{ fontSize:40, display:'block', marginBottom:12 }}>🎉</span>
              <p style={{ color:'#10b981', fontWeight:600, fontSize:18, margin:'0 0 4px' }}>오분류 샘플이 없습니다!</p>
              <p style={{ color:'#334155', fontSize:13 }}>모든 샘플이 올바르게 분류되었습니다.</p>
            </div>
          ) : (
            <>
              <div className="banner-danger">
                <span style={{ fontSize:18 }}>⚠️</span>
                <p style={{ color:'#1e293b', fontSize:13, margin:0 }}>
                  전체 <b>{preds.total.toLocaleString()}</b>건 중 오분류 상위 <b style={{ color:'#fda4af' }}>3건</b>을 표시합니다.
                </p>
              </div>
              {preds.misclassified.map((w, i) => (
                <div key={i} className="card animate-slide-up" style={{ borderColor:'rgba(244,63,94,0.2)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <span className="badge badge-red">오분류 #{i+1}</span>
                    <span style={{ fontSize:11, color:'#334155' }}>샘플 #{w.idx}</span>
                    <span style={{ fontSize:11, color:'#334155', marginLeft:'auto' }}>
                      실제 {w.actual} → 예측 {w.predicted} | 확률 {(w.probability*100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {Object.entries(w.features).slice(0,8).map(([k,v]) => (
                      <div key={k} className="card-elevated" style={{ textAlign:'center', borderRadius:12, padding:12 }}>
                        <p style={{ fontSize:10, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'0 0 4px' }}>{k}</p>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1e293b', margin:0 }}>{typeof v === 'number' ? v.toFixed(3) : v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
