import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api'
import KPICard from '../components/KPICard'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function ModelLab() {
  const [state, setState] = useState(null)
  const [result, setResult] = useState(null)
  const [optRes, setOptRes] = useState(null)
  const [nTrials, setNTrials] = useState(20)
  const [loading, setLoading] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data)
      if (r.data.cv_results) setResult({ results: r.data.cv_results, best_model: r.data.best_model })
      if (r.data.optuna_result) setOptRes(r.data.optuna_result)
    }).catch(() => {})
  }, [])

  async function runCV() {
    setLoading('cv')
    try {
      const { data } = await api.post('/run-cv')
      setResult(data)
      const fresh = await api.get('/state')
      setState(fresh.data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLoading('')
    }
  }

  async function runOptuna() {
    setLoading('optuna')
    try {
      const { data } = await api.post('/run-optuna', { n_trials: nTrials })
      setOptRes(data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLoading('')
    }
  }

  if (state && !state.has_data) {
    return (
      <EmptyState
        title="먼저 데이터가 필요합니다"
        desc="CSV 파일을 올린 뒤 모델 비교를 시작할 수 있습니다."
        action="데이터 넣으러 가기"
        onClick={() => nav('/upload')}
      />
    )
  }

  const isRegression = state?.task_type === 'regression' || result?.task_type === 'regression'
  const rows = result?.results || []
  const best = result?.best_model || state?.best_model || rows[0]?.model || '-'
  const chartData = rows.map(row => ({
    name: shortModel(row.model),
    model: row.model,
    score: metricValue(row, isRegression),
  })).filter(row => row.score != null)
  const scores = chartData.map(row => row.score)
  const bestScore = scores.length ? Math.max(...scores) : null
  const worstScore = scores.length ? Math.min(...scores) : null
  const bestModel = chartData.find(row => row.score === bestScore)?.model || best
  const worstModel = chartData.find(row => row.score === worstScore)?.model || null

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 980 }}>
      <section style={{
        borderRadius: 10, padding: '22px 24px', marginBottom: 18,
        background: 'var(--surface)',
        color: 'var(--text)', border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', margin: '0 0 8px' }}>분석 흐름 · 모델 고르기</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', letterSpacing: 0 }}>
          모델 비교
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          같은 데이터로 여러 모델을 시험하고 가장 좋은 모델을 보여줍니다.
        </p>
      </section>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>1단계: 모델 성능 비교</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              같은 데이터를 여러 모델에 학습시켜 어떤 모델이 가장 안정적으로 예측하는지 확인합니다.
            </p>
          </div>
          <button onClick={runCV} className="btn-primary" disabled={!!loading}>
            {loading === 'cv' && <span className="spinner" />}
            모델 비교 시작
          </button>
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            <KPICard label="선택된 모델" value={shortModel(best)} color="violet" />
            <KPICard label="문제 유형" value={isRegression ? '숫자 예측' : '분류 예측'} color="cyan" />
            <KPICard label="비교한 모델" value={`${rows.length}개`} color="blue" />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, color: 'var(--text)', margin: '0 0 6px' }}>모델별 점수</h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 16px' }}>
              초록색은 최고점, 주황색은 최저점입니다.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <LegendDot color="#059669" label={`최고점 ${shortModel(bestModel)} ${formatScore(bestScore)}`} />
              {worstModel && worstModel !== bestModel && (
                <LegendDot color="#d97706" label={`최저점 ${shortModel(worstModel)} ${formatScore(worstScore)}`} />
              )}
              <LegendDot color="#2563eb" label="비교 모델" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 'dataMax']} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={ttStyle} formatter={v => Number(v).toFixed(4)} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map(row => (
                    <Cell key={row.model} fill={barColor(row.score, bestScore, worstScore)} />
                  ))}
                  <LabelList dataKey="score" position="top" formatter={v => Number(v).toFixed(3)} style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text-2)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, color: 'var(--text)', margin: '0 0 12px' }}>비교 결과표</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>모델</th>
                    <th>상태</th>
                    <th>{isRegression ? 'R2 점수' : '정확도'}</th>
                    {!isRegression && <th>F1</th>}
                    {!isRegression && <th>ROC-AUC</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const score = metricValue(row, isRegression)
                    const rank = score === bestScore ? 'best' : score === worstScore ? 'worst' : ''
                    return (
                    <tr key={row.model} style={{ background: rank === 'best' ? 'rgba(5,150,105,0.06)' : rank === 'worst' ? 'rgba(217,119,6,0.06)' : 'transparent' }}>
                      <td style={{ fontWeight: 800 }}>{shortModel(row.model)}</td>
                      <td>
                        {row.error ? '실패' : rank === 'best' ? <span className="badge badge-green">최고점</span> : rank === 'worst' ? <span className="badge badge-amber">최저점</span> : '완료'}
                      </td>
                      <td>{formatScore(isRegression ? row.r2 : row.accuracy)}</td>
                      {!isRegression && <td>{formatScore(row.f1)}</td>}
                      {!isRegression && <td>{formatScore(row.roc_auc)}</td>}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>2단계: 성능 더 올리기</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                  선택된 모델의 세부 설정을 자동으로 여러 번 바꿔 보면서 더 좋은 조합을 찾습니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <input
                  type="number"
                  min="3"
                  max="100"
                  value={nTrials}
                  onChange={e => setNTrials(Number(e.target.value))}
                  className="input"
                  style={{ width: 84 }}
                  aria-label="시도 횟수"
                />
                <button onClick={runOptuna} className="btn-primary" disabled={!!loading}>
                  {loading === 'optuna' && <span className="spinner" />}
                  자동 개선
                </button>
              </div>
            </div>
            {optRes ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <KPICard label="개선 전" value={formatScore(optRes.before_score ?? optRes.before_roc)} color="amber" />
                <KPICard label="개선 후" value={formatScore(optRes.after_score ?? optRes.after_roc)} color="green" />
                <KPICard label="시도 횟수" value={optRes.n_trials ?? nTrials} color="blue" />
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-label)', margin: 0 }}>
                모델 비교가 끝났다면 자동 개선을 눌러 성능을 한 번 더 끌어올릴 수 있습니다.
              </p>
            )}
          </div>

          <button onClick={() => nav('/report')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 14 }}>
            결과 요약 보러 가기
          </button>
        </>
      ) : (
        <EmptyState
          title="아직 모델 비교를 시작하지 않았습니다"
          desc="위의 '모델 비교 시작' 버튼을 누르면 여러 모델을 자동으로 학습하고 비교합니다."
          action="모델 비교 시작"
          onClick={runCV}
          loading={loading === 'cv'}
        />
      )}
    </div>
  )
}

function EmptyState({ title, desc, action, onClick, loading }) {
  return (
    <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,0.09)', color: '#2563eb' }}>
          <FlaskIcon />
        </div>
        <h2 style={{ color: 'var(--text)', fontSize: 20, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.65, margin: '0 0 20px' }}>{desc}</p>
        <button onClick={onClick} className="btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          {action}
        </button>
      </div>
    </div>
  )
}

function metricValue(row, isRegression) {
  const value = isRegression ? row.r2 : (row.roc_auc ?? row.accuracy ?? row.f1)
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function shortModel(name) {
  return String(name || '-').split(' ')[0]
}

function formatScore(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(4) : '-'
}

function barColor(score, bestScore, worstScore) {
  if (score === bestScore) return '#059669'
  if (score === worstScore && bestScore !== worstScore) return '#d97706'
  return '#2563eb'
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 750, color: 'var(--text-2)' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function FlaskIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-6 0v6l-6 12a1 1 0 00.9 1.4h12.2a1 1 0 00.9-1.4L15 9V3" /></svg>
}
