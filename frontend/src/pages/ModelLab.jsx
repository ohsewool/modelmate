import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MEDALS = ['🥇','🥈','🥉','']
const COLORS  = ['#818cf8','#34d399','#fbbf24','#a78bfa']

function getScoreLabel(score, isR2 = false) {
  const v = parseFloat(score)
  if (isNaN(v)) return null
  if (isR2) {
    if (v >= 0.90) return { label:'매우 우수', color:'#059669', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.25)', icon:'🏆', desc:'예측값이 실제값과 매우 잘 일치합니다.' }
    if (v >= 0.80) return { label:'우수',     color:'#2563eb', bg:'rgba(37,99,235,0.08)', border:'rgba(37,99,235,0.2)',  icon:'✅', desc:'신뢰도 높은 수치 예측이 가능합니다.' }
    if (v >= 0.65) return { label:'양호',     color:'#7c3aed', bg:'rgba(124,58,237,0.08)',border:'rgba(124,58,237,0.2)', icon:'👍', desc:'괜찮은 성능이지만 Optuna 튜닝으로 더 높일 수 있습니다.' }
    if (v >= 0.50) return { label:'보통',     color:'#d97706', bg:'rgba(217,119,6,0.08)', border:'rgba(217,119,6,0.2)',  icon:'⚠️', desc:'아래 Optuna 튜닝으로 성능을 개선해 보세요.' }
    return           { label:'개선 필요', color:'#dc2626', bg:'rgba(220,38,38,0.08)',  border:'rgba(220,38,38,0.2)',  icon:'❗', desc:'데이터 품질이나 피처 구성을 다시 확인해 보세요.' }
  }
  if (v >= 0.95) return { label:'매우 우수', color:'#059669', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.25)', icon:'🏆', desc:'실제 현장에서도 즉시 활용할 수 있는 수준입니다.' }
  if (v >= 0.85) return { label:'우수',     color:'#2563eb', bg:'rgba(37,99,235,0.08)', border:'rgba(37,99,235,0.2)',  icon:'✅', desc:'신뢰도 높은 예측이 가능합니다.' }
  if (v >= 0.75) return { label:'양호',     color:'#7c3aed', bg:'rgba(124,58,237,0.08)',border:'rgba(124,58,237,0.2)', icon:'👍', desc:'괜찮은 성능이지만 Optuna 튜닝으로 더 높일 수 있습니다.' }
  if (v >= 0.65) return { label:'보통',     color:'#d97706', bg:'rgba(217,119,6,0.08)', border:'rgba(217,119,6,0.2)',  icon:'⚠️', desc:'아래 Optuna 튜닝으로 성능을 개선해 보세요.' }
  return           { label:'개선 필요', color:'#dc2626', bg:'rgba(220,38,38,0.08)',  border:'rgba(220,38,38,0.2)',  icon:'❗', desc:'데이터 품질이나 피처 구성을 다시 확인해 보세요.' }
}
const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function ModelLab() {
  const [state,       setState]       = useState(null)
  const [result,      setResult]      = useState(null)
  const [optRes,      setOptRes]      = useState(null)
  const [nTrials,     setNTrials]     = useState(30)
  const [loading,     setLoading]     = useState('')
  const [showReconfig, setShowReconfig] = useState(false)
  const [allCols,     setAllCols]     = useState([])
  const [newTarget,   setNewTarget]   = useState('')
  const [dropCols,    setDropCols]    = useState([])
  const nav = useNavigate()

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data)
      if (r.data.cv_results) setResult({ results: r.data.cv_results, best_model: r.data.best_model })
      if (r.data.optuna_result) setOptRes(r.data.optuna_result)
    })
  }, [])

  async function openReconfig() {
    try {
      const { data } = await api.get('/columns')
      setAllCols(data.columns)
      setNewTarget(data.current_target || data.columns.at(-1))
      setDropCols(data.current_drop || [])
      setShowReconfig(true)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
  }

  function toggleDrop(col) {
    setDropCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
  }

  async function applyReconfig() {
    setLoading('reconfig')
    try {
      await api.post('/set-target', { target_col: newTarget, drop_cols: dropCols })
      const { data } = await api.post('/run-cv')
      setResult(data)
      setOptRes(null)
      setShowReconfig(false)
      api.get('/state').then(r => setState(r.data))
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

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
        <p style={{ color:'var(--text-label)', fontWeight:600, marginBottom:8 }}>데이터가 없습니다</p>
        <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:20 }}>먼저 데이터를 업로드해주세요.</p>
        <button onClick={() => nav('/upload')} className="btn-primary">업로드 하러 가기</button>
      </div>
    </div>
  )

  const isRegression = state?.task_type === 'regression' || result?.task_type === 'regression'

  const chartData = isRegression
    ? result?.results?.map(r => ({ name: r.model.split(' ')[0], 'R²': r.r2 }))
    : result?.results?.map(r => ({ name: r.model.split(' ')[0], Accuracy: r.accuracy, F1: r.f1, 'ROC-AUC': r.roc_auc }))

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>

      {/* 부분 재실행 패널 */}
      {showReconfig && (
        <div className="card animate-slide-up" style={{ marginBottom:20, borderColor:'rgba(99,102,241,0.3)', background:'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.02))' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07"/><path d="M4.93 4.93A10 10 0 0 1 19.07 19.07"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>타깃 / 피처 재설정</p>
              <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>파일 재업로드 없이 설정을 바꿔 다시 학습합니다</p>
            </div>
            <button onClick={() => setShowReconfig(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-label)', padding:4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* 타깃 선택 */}
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>🎯</span> 예측할 타깃 컬럼
            </p>
            <select value={newTarget} onChange={e => setNewTarget(e.target.value)}
              className="input" style={{ width:'100%' }}>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* 제외 컬럼 선택 */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>❌</span> 학습에서 제외할 컬럼 <span style={{ fontWeight:400, color:'var(--text-label)' }}>(선택 없으면 전부 사용)</span>
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {allCols.filter(c => c !== newTarget).map(c => {
                const isDropped = dropCols.includes(c)
                return (
                  <button key={c} onClick={() => toggleDrop(c)} style={{
                    padding:'5px 12px', borderRadius:8, border:`1.5px solid ${isDropped ? 'rgba(244,63,94,0.5)' : 'var(--border)'}`,
                    background: isDropped ? 'rgba(244,63,94,0.08)' : 'var(--surface-alt)',
                    color: isDropped ? '#f43f5e' : 'var(--text-2)',
                    fontSize:12, cursor:'pointer', fontWeight: isDropped ? 600 : 400,
                    transition:'all 0.15s',
                  }}>
                    {isDropped ? '✕ ' : ''}{c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 적용 버튼 */}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={() => setShowReconfig(false)} className="btn-secondary">취소</button>
            <button onClick={applyReconfig} disabled={!!loading} className="btn-primary">
              {loading === 'reconfig' ? <span className="spinner" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              변경 후 재실행
            </button>
          </div>
        </div>
      )}

      {/* Run CV 카드 */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontWeight:600, color:'var(--text)', fontSize:15, margin:'0 0 4px' }}>3-fold Stratified CV</p>
            <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>Random Forest · Gradient Boosting · Logistic Regression · Decision Tree</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {state?.has_data && !showReconfig && (
              <button onClick={openReconfig} disabled={!!loading} className="btn-secondary" style={{ gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07"/><path d="M4.93 4.93A10 10 0 0 1 19.07 19.07"/></svg>
                부분 재실행
              </button>
            )}
            <button onClick={runCV} disabled={!!loading} className="btn-primary">
              {loading === 'cv' ? <span className="spinner" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              실행
            </button>
          </div>
        </div>

        {loading === 'cv' && (
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10 }}>
            {['Random Forest','Gradient Boosting','Logistic Regression','Decision Tree'].map((m, i) => (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:11, color:'var(--text-2)', width:144, flexShrink:0 }}>{m}</div>
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
            {isRegression ? (
              <>
                <KPICard label="R² Score" value={result.results?.[0]?.r2}   icon="📈" color="green" />
                <KPICard label="RMSE"     value={result.results?.[0]?.rmse} icon="📉" color="amber" />
                <KPICard label="MAE"      value={result.results?.[0]?.mae}  icon="📊" color="cyan" />
              </>
            ) : (
              <>
                <KPICard label="ROC-AUC"  value={result.results?.[0]?.roc_auc} icon="📈" color="green" />
                <KPICard label="Accuracy" value={result.results?.[0]?.accuracy} icon="✅" color="cyan" />
                <KPICard label="F1 Score" value={result.results?.[0]?.f1}       icon="⚡" color="amber" />
              </>
            )}
          </div>

          {/* 종합 평가 배너 */}
          {(() => {
            const primaryScore = isRegression ? result.results?.[0]?.r2 : result.results?.[0]?.roc_auc
            const lbl = getScoreLabel(primaryScore, isRegression)
            if (!lbl) return null
            const bestModel = result.best_model?.split(' ')[0]
            return (
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 18px', borderRadius:14, background:lbl.bg, border:`1px solid ${lbl.border}` }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{lbl.icon}</span>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:lbl.color }}>{lbl.label}</span>
                    <span style={{ fontSize:11, color:'var(--text-label)', background:'var(--surface)', border:'1px solid var(--border)', padding:'1px 8px', borderRadius:6 }}>
                      {isRegression ? `R² ${primaryScore}` : `ROC-AUC ${primaryScore}`}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-2)', margin:'0 0 4px', lineHeight:1.65 }}>
                    {isRegression
                      ? <><strong>{bestModel}</strong>이 가장 좋은 성능을 기록했습니다. R²는 예측값이 실제값을 얼마나 잘 설명하는지를 나타냅니다 (1.0이 최고).</>
                      : (() => { const acc = result.results?.[0]?.accuracy; return <><strong>{bestModel}</strong>이 가장 좋은 성능을 기록했습니다. 정확도 <strong>{acc}</strong>로, 100개 중 약 {Math.round(parseFloat(acc)*100)}개를 올바르게 예측합니다.</>})()
                    }
                  </p>
                  <p style={{ fontSize:12, color:lbl.color, margin:0, fontWeight:500 }}>{lbl.desc}</p>
                </div>
              </div>
            )
          })()}

          {/* Leaderboard */}
          <div className="card">
            <p className="section-title">리더보드</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {result.results.map((r, i) => (
                <div key={r.model} style={{
                  display:'flex', alignItems:'center', gap:16,
                  padding:'14px 16px', borderRadius:12, border:'1px solid',
                  borderColor: i === 0 ? 'rgba(99,102,241,0.3)' : 'var(--border)',
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)'
                    : 'var(--surface-alt)',
                  transition: 'all 0.15s',
                  boxShadow: i === 0 ? '0 0 20px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontSize:20, width:32, textAlign:'center', flexShrink:0 }}>{MEDALS[Math.min(i,3)]}</span>
                  <span style={{ flex:1, fontWeight:500, fontSize:13, color: i === 0 ? 'var(--text)' : 'var(--text-3)' }}>{r.model}</span>
                  {(isRegression
                    ? [['R²', r.r2], ['RMSE', r.rmse], ['MAE', r.mae]]
                    : [['Accuracy', r.accuracy], ['F1', r.f1], ['ROC-AUC', r.roc_auc]]
                  ).map(([k, v]) => {
                    const isPrimary = isRegression ? k === 'R²' : k === 'ROC-AUC'
                    const lbl = isPrimary ? getScoreLabel(v, isRegression) : null
                    return (
                      <div key={k} style={{ textAlign:'center', width:80 }}>
                        <p style={{ fontSize:10, color:'var(--text-2)', margin:'0 0 2px' }}>{k}</p>
                        <p style={{ fontWeight:700, fontSize:13, color: i===0 && isPrimary ? '#4f46e5' : i===0 ? 'var(--text)' : 'var(--text-2)', margin:0 }}>{v}</p>
                        {lbl && i === 0 && (
                          <span style={{ fontSize:9, fontWeight:600, color:lbl.color, background:lbl.bg, padding:'1px 6px', borderRadius:4, display:'inline-block', marginTop:3 }}>{lbl.label}</span>
                        )}
                      </div>
                    )
                  })}
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
                  <XAxis dataKey="name" tick={{ fill:'var(--text-2)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,1]} tick={{ fill:'var(--text-2)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill:'rgba(99,102,241,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize:11, color:'var(--text-2)' }} />
                  {(isRegression ? ['R²'] : ['Accuracy','F1','ROC-AUC']).map((k,i) => (
                    <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[4,4,0,0]} opacity={0.9} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {result.feature_importance?.length > 0 && (
              <div className="card">
                <p className="section-title">피처 중요도 Top 8</p>
                <p style={{ fontSize:11, color:'var(--text-2)', margin:'-8px 0 14px', lineHeight:1.55 }}>
                  AI가 예측할 때 어떤 항목을 가장 많이 참고했는지 보여줍니다. 막대가 길수록 예측에 큰 영향을 준 항목입니다.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {result.feature_importance.slice(0,8).map((f, fi) => (
                    <div key={f.feature} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:11, color: fi === 0 ? 'var(--text)' : 'var(--text-2)', width:112, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: fi === 0 ? 600 : 400 }}>
                        {fi === 0 ? '⭐ ' : ''}{f.feature}
                      </span>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill" style={{ width:`${f.importance*100}%`, opacity: fi === 0 ? 1 : 0.7 }} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-2)', width:36, textAlign:'right', flexShrink:0 }}>
                        {(f.importance*100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optuna */}
          <div className="card" style={{ borderColor:'rgba(245,158,11,0.3)', background:'linear-gradient(135deg, rgba(255,251,235,0.8), rgba(245,158,11,0.04))' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <p style={{ fontWeight:600, color:'var(--text)', margin:'0 0 4px' }}>⚡ Optuna 하이퍼파라미터 튜닝</p>
                <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>최고 모델 ({result.best_model?.split(' ')[0]}) 자동 최적화 · {isRegression ? 'R² 기준' : 'ROC-AUC 기준'}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-2)' }}>trials</span>
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
                <KPICard label={`튜닝 전 ${optRes.metric_name || 'ROC-AUC'}`} value={optRes.before_roc} color="cyan" />
                <KPICard label={`튜닝 후 ${optRes.metric_name || 'ROC-AUC'}`} value={optRes.after_roc}
                  sub={`+${optRes.improvement}% 개선`} color="green" icon="✨" />
                <KPICard label="최적 파라미터" value={Object.keys(optRes.best_params).length + '개'} color="amber" />

                {/* 튜닝 결과 해석 */}
                {(() => {
                  const diff = parseFloat(optRes.after_roc) - parseFloat(optRes.before_roc)
                  const lbl = getScoreLabel(optRes.after_roc)
                  return lbl ? (
                    <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:lbl.bg, border:`1px solid ${lbl.border}` }}>
                      <span style={{ fontSize:15 }}>{lbl.icon}</span>
                      <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.6 }}>
                        튜닝 후 성능이 <strong style={{ color:lbl.color }}>{lbl.label}</strong> 수준이 됐습니다.
                        {diff > 0.005 ? ` ROC-AUC가 ${diff.toFixed(3)} 향상됐습니다 — 튜닝 효과가 있었습니다.` : ' 이미 좋은 기본 설정이었습니다.'}
                      </p>
                    </div>
                  ) : null
                })()}

                <div style={{ gridColumn:'1/-1', borderRadius:12, padding:16, border:'1px solid rgba(245,158,11,0.15)', background:'rgba(255,251,235,0.5)' }}>
                  <p style={{ fontSize:10, color:'var(--text-2)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>최적 파라미터</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {Object.entries(optRes.best_params).map(([k,v]) => (
                      <span key={k} className="badge badge-amber" style={{ fontSize:11 }}>{k}: {String(v)}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12 }}>
            <button onClick={() => nav('/xai')} className="btn-primary"
              style={{ justifyContent:'center', padding:'14px 20px' }}>
              XAI 설명 보기
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button
              onClick={() => { const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'; window.open(`${base}/report/html?autoprint=1`, '_blank') }}
              className="btn-secondary"
              style={{ padding:'14px 20px', gap:8, whiteSpace:'nowrap' }}
              title="PDF로 저장하거나 인쇄합니다">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
              PDF 리포트
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
