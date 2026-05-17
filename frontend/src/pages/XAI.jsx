import { useState, useEffect } from 'react'
import api from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

function localSummary(localData, prediction, labels = {}) {
  if (!localData?.length) return null
  const sorted = [...localData].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
  const top = sorted[0]
  const second = sorted[1]
  const topName = labels[top.feature] || top.feature
  const secondName = second ? (labels[second.feature] || second.feature) : null
  const dir = top.shap_value > 0 ? '예측값을 높이는 방향으로 작용했습니다' : '예측값을 낮추는 방향으로 작용했습니다'
  let text = `가장 큰 영향을 준 항목은 "${topName}"으로, ${dir}.`
  if (secondName) text += ` "${secondName}"도 주요 판단 근거입니다.`
  return text
}

export default function XAI() {
  const [tab,       setTab]       = useState('global')
  const [global,    setGlobal]    = useState(null)
  const [local,     setLocal]     = useState(null)
  const [preds,     setPreds]     = useState(null)
  const [idx,       setIdx]       = useState(0)
  const [loading,   setLoading]   = useState('')
  const [colLabels, setColLabels] = useState({})

  useEffect(() => {
    api.get('/state').then(r => {
      if (r.data.col_labels) setColLabels(r.data.col_labels)
    })
  }, [])

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

  const TABS = [['global','어떤 항목이 중요한가?'],['local','이 데이터는 왜 이렇게 예측됐나?'],['wrong','틀린 예측 확인']]

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

      {/* 전역 중요도 */}
      {tab === 'global' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* 설명 배너 */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:12, background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.14)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>🔍</span>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 4px' }}>AI가 어떤 항목을 보고 판단했나요?</p>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}>
                막대가 길수록 AI가 예측할 때 해당 항목을 더 많이 참고했다는 뜻입니다. 중요도가 높다고 해서 무조건 위험한 것이 아니라, 예측에 영향을 많이 미쳤다는 의미입니다.
              </p>
            </div>
          </div>

          {!global ? (
            <div className="card empty-state">
              <div style={{ width:64, height:64, borderRadius:20, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
                <span style={{ fontSize:30 }}>🔍</span>
              </div>
              <p className="empty-title">SHAP 중요도 계산</p>
              <p className="empty-desc">어떤 항목이 AI 예측에 가장 큰 영향을 미쳤는지 분석합니다</p>
              <p style={{ fontSize:12, color:'var(--text-2)', marginBottom:24, lineHeight:1.6 }}>AI가 예측할 때 어떤 항목을 얼마나 중요하게 봤는지 분석합니다</p>
              <button onClick={runShap} disabled={!!loading} className="btn-primary">
                {loading === 'shap' ? <span className="spinner" /> : '🔍'}
                분석 시작
              </button>
            </div>
          ) : (
            <div className="card animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* 상위 3개 요약 */}
              <div>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>예측에 가장 큰 영향을 준 항목</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {global.slice(0,3).map((f, i) => {
                    const icons = ['🥇','🥈','🥉']
                    const pct = ((f.shap_value / global[0].shap_value) * 100).toFixed(0)
                    return (
                      <div key={f.feature} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background: i === 0 ? 'rgba(99,102,241,0.07)' : 'var(--surface-alt)', border:'1px solid var(--border-sub)' }}>
                        <span style={{ fontSize:16, flexShrink:0 }}>{icons[i]}</span>
                        <div style={{ flex:1, lineHeight:1.2 }}>
                          <div style={{ fontSize:13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--text)' : 'var(--text-2)' }}>{colLabels[f.feature] || f.feature}</div>
                          {colLabels[f.feature] && <div style={{ fontSize:10, color:'var(--text-label)', marginTop:1 }}>{f.feature}</div>}
                        </div>
                        <div style={{ width:80, height:6, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, background: i === 0 ? '#6366f1' : '#a5b4fc' }} />
                        </div>
                        <span style={{ fontSize:11, color:'var(--text-label)', width:40, textAlign:'right' }}>{f.shap_value.toFixed(3)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 전체 차트 */}
              <div>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>전체 항목 중요도</p>
                <ResponsiveContainer width="100%" height={Math.max(300, global.length * 38)}>
                  <BarChart data={[...global].reverse()} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" tick={{ fill:'var(--text-2)', fontSize:11 }} width={150} axisLine={false} tickLine={false}
                      tickFormatter={col => colLabels[col] || col} />
                    <Tooltip contentStyle={ttStyle} formatter={v => [v.toFixed(4), 'SHAP 값']}
                      labelFormatter={col => colLabels[col] ? `${colLabels[col]} (${col})` : col} />
                    <Bar dataKey="shap_value" radius={[0,6,6,0]}>
                      {global.map((_, i) => (
                        <Cell key={i} fill={`hsl(${240 + i*15}, 70%, ${65 - i*2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 개별 설명 */}
      {tab === 'local' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* 설명 배너 */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:12, background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.14)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>🧩</span>
            <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}>
              특정 데이터 하나에 대해 AI가 왜 그런 예측을 했는지 항목별로 설명합니다. <span style={{ color:'#f43f5e', fontWeight:600 }}>빨간색</span>은 양성(위험) 방향으로 밀었다는 뜻, <span style={{ color:'#6366f1', fontWeight:600 }}>파란색</span>은 음성(안전) 방향으로 밀었다는 뜻입니다.
            </p>
          </div>

          <div className="card">
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 12px' }}>분석할 데이터 번호를 입력하세요</p>
            <p style={{ fontSize:11, color:'var(--text-2)', margin:'0 0 12px' }}>데이터는 0번부터 시작합니다. 원하는 번호를 입력하고 "분석 시작"을 누르세요.</p>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input type="number" value={idx} min={0} onChange={e => setIdx(+e.target.value)}
                className="input" style={{ width:120 }} placeholder="0" />
              <button onClick={fetchLocal} className="btn-primary" disabled={!!loading}>
                {loading === 'local' ? <span className="spinner" /> : '🔍'}
                분석 시작
              </button>
            </div>
          </div>

          {local && (
            <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* 예측 결과 요약 */}
              <div style={{
                padding:'16px 20px', borderRadius:14,
                border: `1px solid ${local.prediction === 1 ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                background: local.prediction === 1 ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)',
                display:'flex', alignItems:'center', gap:16,
              }}>
                <span style={{ fontSize:32 }}>{local.prediction === 1 ? '🔴' : '🟢'}</span>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color: local.prediction === 1 ? '#e11d48' : '#059669', margin:'0 0 4px' }}>
                    {local.prediction === 1 ? '양성 (위험)' : '음성 (정상)'}으로 예측되었습니다
                  </p>
                  <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                    정상일 확률 <strong>{(local.probability[0]*100).toFixed(1)}%</strong>
                    &nbsp;·&nbsp;
                    양성(위험)일 확률 <strong style={{ color:'#f43f5e' }}>{(local.probability[1]*100).toFixed(1)}%</strong>
                  </p>
                </div>
              </div>

              {/* AI 판단 근거 요약 */}
              {(() => {
                const summary = localSummary(local.local, local.prediction, colLabels)
                if (!summary) return null
                return (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:12, background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.14)' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
                    <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}><strong>AI 판단 근거:</strong> {summary}</p>
                  </div>
                )
              })()}

              {/* SHAP 차트 */}
              <div className="card">
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 6px' }}>항목별 기여도</p>
                <p style={{ fontSize:11, color:'var(--text-2)', margin:'0 0 16px', lineHeight:1.55 }}>
                  오른쪽(빨강)으로 뻗을수록 양성(위험) 방향, 왼쪽(파랑)으로 뻗을수록 음성(정상) 방향으로 판단에 기여했습니다.
                </p>
                <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:11, color:'var(--text-2)' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:'#f43f5e', display:'inline-block' }} />양성(위험) 방향</span>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:'#6366f1', display:'inline-block' }} />음성(정상) 방향</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, local.local.length * 34)}>
                  <BarChart data={[...local.local].reverse()} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" tick={{ fill:'var(--text-2)', fontSize:11 }} width={150} axisLine={false} tickLine={false}
                      tickFormatter={col => colLabels[col] || col} />
                    <Tooltip contentStyle={ttStyle} formatter={v => [v.toFixed(4), '기여도']}
                      labelFormatter={col => colLabels[col] ? `${colLabels[col]} (${col})` : col} />
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

      {/* 오분류 분석 */}
      {tab === 'wrong' && (
        <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* 설명 배너 */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:12, background:'rgba(244,63,94,0.05)', border:'1px solid rgba(244,63,94,0.14)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
            <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}>
              AI가 틀리게 예측한 데이터를 보여줍니다. 오분류 패턴을 보면 모델의 약점을 파악하거나 데이터 품질을 개선할 단서를 얻을 수 있습니다.
            </p>
          </div>

          {!preds ? (
            <div className="card empty-state">
              <div style={{ width:64, height:64, borderRadius:20, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)' }}>
                <span style={{ fontSize:30 }}>🔎</span>
              </div>
              <p className="empty-title">오분류 샘플 분석</p>
              <p className="empty-desc" style={{ marginBottom:24 }}>AI가 잘못 예측한 데이터를 찾아 원인을 살펴봅니다</p>
              <button onClick={fetchPreds} disabled={!!loading} className="btn-primary"
                style={{ background:'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}>
                {loading === 'preds' ? <span className="spinner" /> : '🔎'}
                오분류 찾기
              </button>
            </div>
          ) : preds.misclassified.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'64px 20px' }}>
              <span style={{ fontSize:40, display:'block', marginBottom:12 }}>🎉</span>
              <p style={{ color:'#10b981', fontWeight:600, fontSize:18, margin:'0 0 4px' }}>오분류 샘플이 없습니다!</p>
              <p style={{ color:'var(--text-2)', fontSize:13 }}>학습 데이터 내 모든 샘플을 올바르게 분류했습니다.</p>
            </div>
          ) : (
            <>
              <div className="banner-danger">
                <span style={{ fontSize:18 }}>⚠️</span>
                <p style={{ color:'var(--text)', fontSize:13, margin:0 }}>
                  전체 <b>{preds.total.toLocaleString()}</b>건 중 AI가 잘못 예측한 상위 <b style={{ color:'#fda4af' }}>3건</b>을 보여줍니다.
                </p>
              </div>
              {preds.misclassified.map((w, i) => {
                const actualLabel  = w.actual     === 1 ? '양성(위험)' : '음성(정상)'
                const predictLabel = w.predicted  === 1 ? '양성(위험)' : '음성(정상)'
                const missType = w.actual === 1 && w.predicted === 0
                  ? '실제로는 위험했는데 정상으로 잘못 예측 (미탐지)'
                  : '실제로는 정상인데 위험으로 잘못 예측 (오탐지)'
                return (
                  <div key={i} className="card animate-slide-up" style={{ borderColor:'rgba(244,63,94,0.2)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                      <span className="badge badge-red">오분류 #{i+1}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'0 0 2px' }}>{missType}</p>
                        <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>
                          데이터 #{w.idx} · 실제: <strong>{actualLabel}</strong> → AI 예측: <strong style={{ color:'#f43f5e' }}>{predictLabel}</strong> · 예측 확신도 {(w.probability*100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {Object.entries(w.features).slice(0,8).map(([k,v]) => (
                        <div key={k} className="card-elevated" style={{ textAlign:'center', borderRadius:12, padding:12 }}>
                          <p style={{ fontSize:10, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'0 0 2px' }}>
                            {colLabels[k] || k}
                          </p>
                          {colLabels[k] && <p style={{ fontSize:8, color:'var(--text-label)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'0 0 4px' }}>{k}</p>}
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{typeof v === 'number' ? v.toFixed(3) : v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
