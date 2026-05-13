import { useState, useEffect } from 'react'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
const riskColor = p => p >= 0.8 ? '#f43f5e' : p >= 0.5 ? '#f59e0b' : '#10b981'
const riskGlow  = p => p >= 0.8 ? 'rgba(244,63,94,0.3)' : p >= 0.5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'

const LEVEL_CFG = {
  high: { border:'rgba(244,63,94,0.25)', bg:'rgba(244,63,94,0.05)', badge:'badge-red',   label:'긴급',
    icon:'🔴', actionTitle:'즉시 조치 필요',
    action:'지금 바로 점검하세요. 방치하면 장비 고장이나 안전사고로 이어질 수 있습니다.' },
  mid:  { border:'rgba(245,158,11,0.25)', bg:'rgba(245,158,11,0.05)', badge:'badge-amber', label:'주의',
    icon:'🟡', actionTitle:'이번 주 내 점검 권장',
    action:'이번 주 안에 점검 일정을 잡으세요. 지금 당장 위험하지는 않지만 상태가 나빠지고 있습니다.' },
  low:  { border:'rgba(16,185,129,0.25)', bg:'rgba(16,185,129,0.05)', badge:'badge-green', label:'관찰',
    icon:'🟢', actionTitle:'다음 정기 점검 시 확인',
    action:'현재는 안전합니다. 다음 정기 점검 때 함께 확인하면 됩니다.' },
}

const FEAT_LEVEL_LABEL = { high:'평균보다 높음', low:'평균보다 낮음', normal:'정상 범위' }
const FEAT_LEVEL_COLOR = { high:'#f43f5e', low:'#6366f1', normal:'#10b981' }

export default function Maintenance() {
  const [data,    setData]    = useState(null)
  const [state,   setState]   = useState(null)
  const [topN,    setTopN]    = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/state').then(r => setState(r.data)) }, [])

  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/predictions'); setData(data) }
    catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  if (!state?.has_model) return (
    <div style={{ padding:32, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)' }}>
          <span style={{ fontSize:40 }}>🔧</span>
        </div>
        <p style={{ color:'var(--text-label)', fontWeight:600, marginBottom:8 }}>모델 없음</p>
        <p style={{ color:'var(--text-2)', fontSize:13 }}>먼저 Model Lab에서 모델을 학습해주세요.</p>
      </div>
    </div>
  )

  const risk = data?.risk_items?.slice(0, topN) || []

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      {!data ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* 설명 배너 */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderRadius:14, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <span style={{ fontSize:20, flexShrink:0 }}>🏭</span>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>정비 우선순위 추천</p>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}>
                AI가 전체 데이터를 분석해 고장 가능성이 높은 순서대로 순위를 매깁니다. 어떤 장비·샘플을 먼저 점검해야 하는지 알 수 있습니다.
              </p>
            </div>
          </div>
          <div className="card empty-state">
            <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontSize:40 }}>🔄</span>
            </div>
            <p className="empty-title">분석을 시작하세요</p>
            <p className="empty-desc" style={{ marginBottom:24 }}>버튼을 누르면 전체 샘플의 위험도를 계산하고 정비 우선순위를 추천합니다</p>
            <button onClick={load} disabled={loading} className="btn-primary">
              {loading ? <span className="spinner" /> : '🔄'}
              분석 시작
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* 위험도 설명 배너 */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { icon:'🔴', label:'긴급', desc:'고장 확률 80% 이상 — 즉시 점검', bg:'rgba(244,63,94,0.06)', border:'rgba(244,63,94,0.2)', color:'#e11d48' },
              { icon:'🟡', label:'주의', desc:'고장 확률 50~80% — 이번 주 내 점검', bg:'rgba(245,158,11,0.06)', border:'rgba(245,158,11,0.2)', color:'#d97706' },
              { icon:'🟢', label:'관찰', desc:'고장 확률 50% 미만 — 정기 점검 때 확인', bg:'rgba(16,185,129,0.06)', border:'rgba(16,185,129,0.2)', color:'#059669' },
            ].map(({ icon, label, desc, bg, border, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:bg, border:`1px solid ${border}`, flex:1, minWidth:200 }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color }}>{label}</span>
                  <span style={{ fontSize:11, color:'var(--text-2)', marginLeft:6 }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            <KPICard label="전체 샘플"   value={data.total.toLocaleString()} icon="📋" color="blue" />
            <KPICard label="위험 예측"   value={data.failure_count.toLocaleString()}
              sub={`전체의 ${data.failure_rate}%`} icon="⚠️" color="red" />
            <KPICard label="긴급 (≥80%)" value={data.high_risk} icon="🔴" color="red" />
            <KPICard label="정확도"      value={data.accuracy}  icon="✅" color="green" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
            {/* 위험 바차트 */}
            <div className="card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <p className="section-title" style={{ margin:'0 0 4px' }}>위험도 순위 Top {topN}</p>
                  <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>막대가 길고 빨간색일수록 즉시 점검이 필요한 샘플입니다</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-2)' }}>5</span>
                  <input type="range" min={5} max={Math.min(50, data.risk_items.length)} value={topN}
                    onChange={e => setTopN(+e.target.value)}
                    style={{ width:80, accentColor:'#6366f1', cursor:'pointer' }} />
                  <span style={{ fontSize:11, color:'var(--text-2)' }}>{Math.min(50, data.risk_items.length)}</span>
                </div>
              </div>
              {risk.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 0', color:'#10b981', gap:8 }}>
                  <span style={{ fontSize:32 }}>✅</span>
                  <p style={{ fontWeight:600, margin:0 }}>위험 샘플이 없습니다</p>
                  <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>모든 샘플이 정상으로 예측되었습니다</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={risk} barSize={18}>
                    <XAxis dataKey="id" tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false}
                      label={{ value:'샘플 번호', position:'insideBottom', fill:'var(--text-2)', fontSize:10 }} />
                    <YAxis domain={[0,1]} tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} formatter={v => [`${(v*100).toFixed(1)}%`, '고장 확률']} />
                    <Bar dataKey="probability" radius={[5,5,0,0]}>
                      {risk.map((r,i) => <Cell key={i} fill={riskColor(r.probability)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 파이차트 */}
            <div className="card" style={{ display:'flex', flexDirection:'column' }}>
              <p className="section-title">전체 예측 분포</p>
              <p style={{ fontSize:11, color:'var(--text-2)', margin:'-8px 0 12px' }}>전체 샘플 중 위험/정상 비율</p>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name:'정상', value: data.total - data.failure_count, fill:'#6366f1' },
                      { name:'위험', value: data.failure_count, fill:'#f43f5e' },
                    ]} cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                      dataKey="value" stroke="none" />
                    <Tooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', gap:24, marginTop:8 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', display:'inline-block' }} />
                      <span style={{ fontSize:11, color:'var(--text-2)' }}>정상</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{(data.total - data.failure_count).toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#f43f5e', display:'inline-block' }} />
                      <span style={{ fontSize:11, color:'var(--text-2)' }}>위험</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{data.failure_count.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 정비 우선순위 카드 */}
          {risk.length > 0 && (
            <div>
              <div style={{ marginBottom:14 }}>
                <p className="section-title" style={{ margin:'0 0 4px' }}>정비 우선순위 추천 카드</p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>고장 가능성이 높은 순서대로 정렬되었습니다. 위에서부터 먼저 점검하세요.</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                {risk.slice(0,6).map((r, rank) => {
                  const p = r.probability
                  const level = p >= 0.8 ? 'high' : p >= 0.5 ? 'mid' : 'low'
                  const cfg = LEVEL_CFG[level]
                  return (
                    <div key={r.id} style={{
                      borderRadius:16, padding:20, border:`1px solid ${cfg.border}`,
                      background: cfg.bg, transition:'all 0.2s', cursor:'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.01)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.12), 0 0 20px ${riskGlow(p)}` }}
                    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
                    >
                      {/* 헤더 */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:16 }}>{cfg.icon}</span>
                          <div>
                            <span style={{ fontWeight:700, color:'var(--text)', fontSize:13 }}>#{rank+1}순위 점검</span>
                            <span style={{ fontSize:10, color:'var(--text-label)', marginLeft:6 }}>샘플 {r.id}</span>
                          </div>
                        </div>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>

                      {/* 확률 바 */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                        <div style={{ flex:1, height:8, borderRadius:99, overflow:'hidden', background:'var(--border)' }}>
                          <div style={{ height:'100%', borderRadius:99, width:`${p*100}%`, background:riskColor(p), transition:'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize:15, fontWeight:700, color:riskColor(p), width:44, textAlign:'right', flexShrink:0 }}>{(p*100).toFixed(0)}%</span>
                      </div>

                      {/* 주요 이상 피처 */}
                      {r.top_features?.length > 0 && (
                        <div style={{ marginBottom:12 }}>
                          <p style={{ fontSize:10, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 6px' }}>주요 측정값</p>
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            {r.top_features.map((f, fi) => (
                              <div key={fi} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', borderRadius:7, background:'rgba(0,0,0,0.03)' }}>
                                <span style={{ fontSize:11, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{f.feature}</span>
                                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{f.value}</span>
                                  {f.level !== 'normal' && (
                                    <span style={{ fontSize:9, fontWeight:600, color:FEAT_LEVEL_COLOR[f.level], background:`${FEAT_LEVEL_COLOR[f.level]}18`, padding:'1px 6px', borderRadius:4 }}>
                                      {FEAT_LEVEL_LABEL[f.level]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 권장 조치 */}
                      <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(0,0,0,0.04)', border:`1px solid ${cfg.border}` }}>
                        <p style={{ fontSize:11, fontWeight:600, color:'var(--text)', margin:'0 0 3px' }}>📌 {cfg.actionTitle}</p>
                        <p style={{ fontSize:11, color:'var(--text-2)', margin:0, lineHeight:1.55 }}>{cfg.action}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 에이전트 가이드 */}
          <div className="card" style={{ borderColor:'rgba(34,211,238,0.3)', background:'linear-gradient(135deg, rgba(236,254,255,0.6), rgba(34,211,238,0.03))' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{
                width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.25)',
              }}>
                <span style={{ fontSize:18 }}>🤖</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 4px', fontSize:14 }}>AI 실험 가이드</p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:'0 0 14px' }}>
                  현재 모델 <strong>{state?.best_model?.split(' ')[0]}</strong>의 분석 결과를 바탕으로, 성능을 더 높이려면 아래 방법을 시도해보세요.
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                  {[
                    { icon:'🎯', title:'Optuna 튜닝 재실행', desc:'Model Lab에서 시도 횟수를 50회 이상으로 늘려 더 좋은 설정을 찾아보세요.' },
                    { icon:'📊', title:'데이터 더 모으기', desc:'고장 사례 데이터가 적으면 AI가 배울 수 있는 패턴도 적습니다. 데이터를 보강하면 정확도가 올라갑니다.' },
                    { icon:'🔍', title:'불필요한 컬럼 제거', desc:'예측에 도움 안 되는 항목이 섞여 있으면 오히려 정확도가 떨어집니다. 업로드 단계에서 컬럼을 다시 검토해보세요.' },
                    { icon:'⚖️', title:'위험/정상 비율 확인', desc:`현재 위험 샘플 비율이 ${data.failure_rate}%입니다. 비율이 너무 낮으면 AI가 위험 패턴을 제대로 학습하지 못할 수 있습니다.` },
                  ].map((tip, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, borderRadius:10, padding:12, background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.1)' }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{tip.icon}</span>
                      <div>
                        <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'0 0 3px' }}>{tip.title}</p>
                        <p style={{ fontSize:11, color:'var(--text-2)', margin:0, lineHeight:1.55 }}>{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
