import { useState, useEffect } from 'react'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: 12, fontSize: 11, color: '#0f172a',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
const riskColor = p => p >= 0.8 ? '#f43f5e' : p >= 0.5 ? '#f59e0b' : '#10b981'
const riskGlow  = p => p >= 0.8 ? 'rgba(244,63,94,0.3)' : p >= 0.5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'

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
        <p style={{ color:'#94a3b8', fontWeight:600, marginBottom:8 }}>모델 없음</p>
        <p style={{ color:'#334155', fontSize:13 }}>먼저 Model Lab에서 모델을 학습해주세요.</p>
      </div>
    </div>
  )

  const risk = data?.risk_items?.slice(0, topN) || []

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>
      {!data ? (
        <div className="card empty-state">
          <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <span style={{ fontSize:40 }}>🏭</span>
          </div>
          <p className="empty-title">설비 리스크를 분석합니다</p>
          <p className="empty-desc" style={{ marginBottom:24 }}>버튼을 클릭하면 전체 설비의 고장 확률을 계산합니다</p>
          <button onClick={load} disabled={loading} className="btn-primary">
            {loading ? <span className="spinner" /> : '🔄'}
            분석 시작
          </button>
        </div>
      ) : (
        <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            <KPICard label="전체 설비"  value={data.total.toLocaleString()} icon="🏭" color="blue" />
            <KPICard label="고장 예측"  value={data.failure_count.toLocaleString()}
              sub={`전체의 ${data.failure_rate}%`} icon="⚠️" color="red" />
            <KPICard label="고위험 ≥80%" value={data.high_risk} icon="🔴" color="red" />
            <KPICard label="Accuracy"  value={data.accuracy} icon="✅" color="green" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
            {/* 위험 바차트 */}
            <div className="card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <p className="section-title" style={{ margin:0 }}>위험 설비 Top {topN}</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#334155' }}>{Math.min(5, data.risk_items.length)}</span>
                  <input type="range" min={5} max={Math.min(50, data.risk_items.length)} value={topN}
                    onChange={e => setTopN(+e.target.value)}
                    style={{ width:80, accentColor:'#6366f1', cursor:'pointer' }} />
                  <span style={{ fontSize:11, color:'#334155' }}>{Math.min(50, data.risk_items.length)}</span>
                </div>
              </div>
              {risk.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 0', color:'#10b981', gap:8 }}>
                  <span style={{ fontSize:32 }}>✅</span>
                  <p style={{ fontWeight:600, margin:0 }}>고장 예측 설비 없음</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={risk} barSize={18}>
                    <XAxis dataKey="id" tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false}
                      label={{ value:'설비 ID', position:'insideBottom', fill:'#334155', fontSize:10 }} />
                    <YAxis domain={[0,1]} tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false} />
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
              <p className="section-title">예측 분포</p>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name:'정상', value: data.total - data.failure_count, fill:'#6366f1' },
                      { name:'고장', value: data.failure_count, fill:'#f43f5e' },
                    ]} cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                      dataKey="value" stroke="none" />
                    <Tooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', gap:24, marginTop:8 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', display:'inline-block' }} />
                      <span style={{ fontSize:11, color:'#475569' }}>정상</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>{(data.total - data.failure_count).toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#f43f5e', display:'inline-block' }} />
                      <span style={{ fontSize:11, color:'#475569' }}>고장</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>{data.failure_count.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 정비 카드 */}
          {risk.length > 0 && (
            <div>
              <p className="section-title">정비 우선순위 추천</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                {risk.slice(0,6).map((r) => {
                  const p = r.probability
                  const level = p >= 0.8 ? 'high' : p >= 0.5 ? 'mid' : 'low'
                  const cfg = {
                    high: { border:'rgba(244,63,94,0.25)', bg:'rgba(244,63,94,0.06)', badge:'badge-red',   label:'긴급', action:'즉시 점검 및 가동 중단 검토', dot:'#f43f5e' },
                    mid:  { border:'rgba(245,158,11,0.25)', bg:'rgba(245,158,11,0.06)', badge:'badge-amber', label:'주의', action:'이번 주 내 점검 권장',          dot:'#f59e0b' },
                    low:  { border:'rgba(16,185,129,0.25)', bg:'rgba(16,185,129,0.06)', badge:'badge-green', label:'관찰', action:'다음 정기 점검 시 확인',        dot:'#10b981' },
                  }[level]
                  return (
                    <div key={r.id} style={{
                      borderRadius:16, padding:20, border:`1px solid ${cfg.border}`,
                      background: cfg.bg, transition:'all 0.2s', cursor:'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.01)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.3), 0 0 20px ${riskGlow(p)}` }}
                    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, boxShadow:`0 0 8px ${cfg.dot}`, display:'inline-block' }} />
                          <span style={{ fontWeight:700, color:'#1e293b', fontSize:14 }}>설비 #{r.id}</span>
                        </div>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                        <div style={{ flex:1, height:6, borderRadius:99, overflow:'hidden', background:'rgba(255,255,255,0.07)' }}>
                          <div style={{ height:'100%', borderRadius:99, width:`${p*100}%`, background:riskColor(p), boxShadow:`0 0 8px ${riskColor(p)}`, transition:'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1e293b', fontVariantNumeric:'tabular-nums', width:40, textAlign:'right', flexShrink:0 }}>{(p*100).toFixed(1)}%</span>
                      </div>
                      <p style={{ fontSize:11, color:'#475569', margin:0 }}>📌 {cfg.action}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 에이전트 가이드 */}
          <div className="card" style={{ borderColor:'rgba(34,211,238,0.3)', background:'linear-gradient(135deg, rgba(236,254,255,0.8), rgba(34,211,238,0.04))' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{
                width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)',
              }}>
                <span style={{ fontSize:18 }}>🤖</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, color:'#1e293b', margin:'0 0 4px' }}>에이전트 실험 가이드</p>
                <p style={{ fontSize:13, color:'#334155', margin:'0 0 12px' }}>
                  현재 모델: <span style={{ color:'#1e293b', fontWeight:500 }}>{state?.best_model}</span>
                  {state?.cv_results && (
                    <span className="badge badge-blue" style={{ marginLeft:8 }}>ROC-AUC {state.cv_results[0]?.roc_auc}</span>
                  )}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                  {[
                    '피처 엔지니어링: 온도 차이·마모율 등 파생 변수 추가',
                    'class_weight="balanced" 또는 SMOTE로 클래스 불균형 처리',
                    '임계값 조정으로 고장 Recall 향상 (threshold 낮추기)',
                    '상위 2개 모델 Voting Classifier 앙상블 구성',
                  ].map((tip, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, borderRadius:10, padding:12, background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.08)' }}>
                      <span style={{ color:'#22d3ee', fontSize:11, marginTop:1, flexShrink:0 }}>→</span>
                      <p style={{ fontSize:11, color:'#475569', margin:0 }}>{tip}</p>
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
