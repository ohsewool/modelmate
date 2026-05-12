import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MEDALS = ['🥇','🥈','🥉','']
const COLORS  = ['#818cf8','#34d399','#fbbf24','#a78bfa']
const ttStyle = {
  background: '#0d1427', border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 12, fontSize: 11, color: '#f1f5f9',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

export default function ModelLab() {
  const [state,   setState]   = useState(null)
  const [result,  setResult]  = useState(null)
  const [optRes,  setOptRes]  = useState(null)
  const [nTrials, setNTrials] = useState(30)
  const [loading, setLoading] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data)
      if (r.data.cv_results) setResult({ results: r.data.cv_results, best_model: r.data.best_model })
      if (r.data.optuna_result) setOptRes(r.data.optuna_result)
    })
  }, [])

  async function runCV() {
    setLoading('cv')
    try {
      const { data } = await api.post('/run-cv')
      setResult(data)
      api.get('/state').then(r => setState(r.data))
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function runOptuna() {
    setLoading('optuna')
    try {
      const { data } = await api.post('/run-optuna', { n_trials: nTrials })
      setOptRes(data)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  if (state && !state.has_data) return (
    <div style={{ padding:32, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:24, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
          <span style={{ fontSize:40 }}>📂</span>
        </div>
        <p style={{ color:'#94a3b8', fontWeight:600, marginBottom:8 }}>데이터가 없습니다</p>
        <p style={{ color:'#334155', fontSize:13, marginBottom:20 }}>먼저 데이터를 업로드해주세요.</p>
        <button onClick={() => nav('/upload')} className="btn-primary">업로드 하러 가기</button>
      </div>
    </div>
  )

  const chartData = result?.results?.map(r => ({
    name: r.model.split(' ')[0], Accuracy: r.accuracy, F1: r.f1, 'ROC-AUC': r.roc_auc
  }))

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>

      {/* Run CV 카드 */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontWeight:600, color:'#f1f5f9', fontSize:15, margin:'0 0 4px' }}>3-fold Stratified CV</p>
            <p style={{ fontSize:11, color:'#334155', margin:0 }}>Random Forest · Gradient Boosting · Logistic Regression · Decision Tree</p>
          </div>
          <button onClick={runCV} disabled={!!loading} className="btn-primary">
            {loading === 'cv' ? <span className="spinner" /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
            실행
          </button>
        </div>

        {loading === 'cv' && (
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10 }}>
            {['Random Forest','Gradient Boosting','Logistic Regression','Decision Tree'].map((m, i) => (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:11, color:'#334155', width:144, flexShrink:0 }}>{m}</div>
                <div className="progress-bar" style={{ flex:1 }}>
                  <div className="progress-fill" style={{ width:`${25*(i+1)}%`, animation:'pulse 2s infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            <KPICard label="최고 모델" value={result.best_model?.split(' ')[0]} icon="🏆" color="blue" />
            <KPICard label="ROC-AUC"  value={result.results?.[0]?.roc_auc}     icon="📈" color="green" />
            <KPICard label="Accuracy" value={result.results?.[0]?.accuracy}     icon="✅" color="cyan" />
            <KPICard label="F1 Score" value={result.results?.[0]?.f1}           icon="⚡" color="amber" />
          </div>

          {/* Leaderboard */}
          <div className="card">
            <p className="section-title">리더보드</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {result.results.map((r, i) => (
                <div key={r.model} style={{
                  display:'flex', alignItems:'center', gap:16,
                  padding:'14px 16px', borderRadius:12, border:'1px solid',
                  borderColor: i === 0 ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(99,70,229,0.1) 0%, rgba(139,92,246,0.06) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                  boxShadow: i === 0 ? '0 0 20px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontSize:20, width:32, textAlign:'center', flexShrink:0 }}>{MEDALS[Math.min(i,3)]}</span>
                  <span style={{ flex:1, fontWeight:500, fontSize:13, color: i === 0 ? '#f1f5f9' : '#64748b' }}>{r.model}</span>
                  {[['Accuracy', r.accuracy],['F1', r.f1],['ROC-AUC', r.roc_auc]].map(([k,v]) => (
                    <div key={k} style={{ textAlign:'center', width:80 }}>
                      <p style={{ fontSize:10, color:'#334155', marginBottom:2, margin:'0 0 2px' }}>{k}</p>
                      <p style={{ fontWeight:700, fontSize:13, color: i===0 && k==='ROC-AUC' ? '#818cf8' : i===0 ? '#f1f5f9' : '#475569', margin:0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
            <div className="card">
              <p className="section-title">성능 비교</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={14} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill:'#334155', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,1]} tick={{ fill:'#334155', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill:'rgba(255,255,255,0.02)' }} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#475569' }} />
                  {['Accuracy','F1','ROC-AUC'].map((k,i) => (
                    <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[4,4,0,0]} opacity={0.9} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {result.feature_importance?.length > 0 && (
              <div className="card">
                <p className="section-title">피처 중요도 Top 8</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4 }}>
                  {result.feature_importance.slice(0,8).map((f) => (
                    <div key={f.feature} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:11, color:'#475569', width:112, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.feature}</span>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill" style={{ width:`${f.importance*100}%` }} />
                      </div>
                      <span style={{ fontSize:11, color:'#334155', width:36, textAlign:'right', flexShrink:0 }}>
                        {(f.importance*100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optuna */}
          <div className="card" style={{ borderColor:'rgba(245,158,11,0.2)', background:'linear-gradient(135deg, rgba(13,20,39,0.9), rgba(245,158,11,0.03))' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <p style={{ fontWeight:600, color:'#f1f5f9', margin:'0 0 4px' }}>⚡ Optuna 하이퍼파라미터 튜닝</p>
                <p style={{ fontSize:11, color:'#334155', margin:0 }}>최고 모델 ({result.best_model}) 자동 최적화</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#334155' }}>trials</span>
                  <input type="number" value={nTrials} min={10} max={100}
                    onChange={e => setNTrials(+e.target.value)}
                    className="input" style={{ width:64, textAlign:'center' }} />
                </div>
                <button onClick={runOptuna} disabled={!!loading} className="btn-primary"
                  style={{ background:'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow:'0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.3)' }}>
                  {loading === 'optuna' ? <span className="spinner" /> : '⚡'}
                  튜닝
                </button>
              </div>
            </div>

            {optRes && (
              <div className="animate-slide-up" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <KPICard label="튜닝 전 ROC-AUC" value={optRes.before_roc} color="cyan" />
                <KPICard label="튜닝 후 ROC-AUC" value={optRes.after_roc}
                  sub={`+${optRes.improvement}% 개선`} color="green" icon="✨" />
                <KPICard label="최적 파라미터" value={Object.keys(optRes.best_params).length + '개'} color="amber" />
                <div style={{ gridColumn:'1/-1', borderRadius:12, padding:16, border:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)' }}>
                  <p style={{ fontSize:10, color:'#334155', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>최적 파라미터</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {Object.entries(optRes.best_params).map(([k,v]) => (
                      <span key={k} className="badge badge-amber" style={{ fontSize:11 }}>{k}: {String(v)}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => nav('/xai')} className="btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'14px 20px' }}>
            XAI 설명 보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
