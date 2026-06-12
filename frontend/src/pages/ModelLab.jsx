import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api'
import { useAuth } from '../AuthContext'
import KPICard from '../components/KPICard'
import StatusRecoveryPanel from '../components/StatusRecoveryPanel'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
const jobStatusLabel = status => ({
  created: '생성됨',
  queued: '대기 중',
  running: '실행 중',
  succeeded: '완료',
  failed: '실패',
  cancelled: '취소됨',
  needs_review: '검토 필요',
}[status] || status || '상태 확인')

const OPTUNA_MIN_TRIALS = 5
const OPTUNA_MAX_TRIALS = 50

function clampTrials(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 20
  return Math.max(OPTUNA_MIN_TRIALS, Math.min(OPTUNA_MAX_TRIALS, Math.round(num)))
}

export default function ModelLab() {
  const [state, setState] = useState(null)
  const [result, setResult] = useState(null)
  const [optRes, setOptRes] = useState(null)
  const [nTrials, setNTrials] = useState(20)
  const [loading, setLoading] = useState('')
  const [trainingJob, setTrainingJob] = useState(null)
  const [operationalStatus, setOperationalStatus] = useState(null)
  const [usageLimits, setUsageLimits] = useState(null)
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data)
      setOperationalStatus(r.data.analysis_status || null)
      setUsageLimits(r.data.usage_limits || null)
      if (r.data.cv_results) setResult({ results: r.data.cv_results, best_model: r.data.best_model })
      if (r.data.optuna_result) setOptRes(r.data.optuna_result)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!trainingJob?.job_id || !['queued', 'running'].includes(trainingJob.status)) return undefined
    const timer = setInterval(() => refreshTrainingJob(trainingJob.job_id), 2500)
    return () => clearInterval(timer)
  }, [trainingJob?.job_id, trainingJob?.status])

  async function runCV() {
    setLoading('cv')
    try {
      const { data } = await api.post('/run-cv')
      setResult(data)
      setOperationalStatus(data.analysis_status || null)
      const fresh = await api.get('/state')
      setState(fresh.data)
      setUsageLimits(fresh.data.usage_limits || null)
    } catch (e) {
      const detail = e.response?.data?.detail
      if (detail?.user_friendly_message) {
        setOperationalStatus({
          status: 'failed',
          current_step: detail.failed_stage,
          progress_message: detail.user_friendly_message,
          error_message: detail.technical_message,
          recommended_next_action: detail.recommended_next_action,
        })
      }
      alert(detail?.user_friendly_message || detail || e.message)
    } finally {
      setLoading('')
    }
  }

  async function startTrainingJob() {
    setLoading('job')
    try {
      const currentDataset = state?.current_dataset || {}
      const { data } = await api.post('/training/jobs', {
        project_id: currentDataset.project_id || undefined,
        dataset_id: currentDataset.dataset_id || undefined,
      })
      setTrainingJob(data)
      setOperationalStatus({
        status: data.status,
        current_step: data.current_step,
        progress_message: data.progress_message,
        recommended_next_action: data.recommended_next_action,
      })
    } catch (e) {
      const detail = e.response?.data?.detail
      alert(detail?.user_friendly_message || detail || e.message)
    } finally {
      setLoading('')
    }
  }

  async function refreshTrainingJob(jobId = trainingJob?.job_id) {
    if (!jobId) return
    try {
      const { data } = await api.get(`/training/jobs/${jobId}`)
      setTrainingJob(data)
      setOperationalStatus({
        status: data.status,
        current_step: data.current_step,
        progress_message: data.progress_message,
        error_message: data.error_message,
        recommended_next_action: data.recommended_next_action,
      })
      if (data.status === 'succeeded') {
        const fresh = await api.get('/state')
        setState(fresh.data)
        setUsageLimits(fresh.data.usage_limits || null)
        if (fresh.data.cv_results) setResult({ results: fresh.data.cv_results, best_model: fresh.data.best_model })
      }
    } catch (_) {
      // Keep the existing UI stable if the lightweight job endpoint is unavailable.
    }
  }

  async function rerunTrainingJob() {
    if (!trainingJob?.job_id) return
    setLoading('job-rerun')
    try {
      const { data } = await api.post(`/training/jobs/${trainingJob.job_id}/rerun`)
      setTrainingJob(data)
      setOperationalStatus({
        status: data.status,
        current_step: data.current_step,
        progress_message: data.progress_message,
        error_message: data.error_message,
        recommended_next_action: data.recommended_next_action,
      })
    } catch (e) {
      const detail = e.response?.data?.detail
      alert(detail?.user_friendly_message || detail || e.message)
    } finally {
      setLoading('')
    }
  }

  async function runOptuna() {
    const trials = clampTrials(nTrials)
    setNTrials(trials)
    setLoading('optuna')
    try {
      const { data } = await api.post('/run-optuna', { n_trials: trials })
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
  const boundedScoreAxis = isBoundedScoreAxis(scores)
  const yAxisMax = chartAxisMax(scores, boundedScoreAxis)
  const yAxisTicks = boundedScoreAxis ? [0, 0.25, 0.5, 0.75, 1] : undefined

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

      <StatusRecoveryPanel status={operationalStatus} limits={usageLimits} compact />

      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', borderColor: 'var(--border)' }}>
        <div>
          <h2 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 5px' }}>저장되는 분석 작업</h2>
          <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
            {user && !user.is_guest
              ? '분석을 저장된 작업으로 시작하면 새로고침 후에도 상태를 확인하고 내 프로젝트에서 다시 열 수 있습니다.'
              : '로그인하면 분석 작업 상태를 저장하고 내 프로젝트에서 다시 열 수 있습니다.'}
          </p>
          {trainingJob && (
            <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '6px 0 0' }}>
              {jobStatusLabel(trainingJob.status)} / {trainingJob.progress_message || '진행 메시지 없음'} / {trainingJob.progress_percent ?? 0}%
            </p>
          )}
          {trainingJob?.status === 'failed' && (
            <p style={{ fontSize: 12, color: '#b91c1c', margin: '6px 0 0' }}>
              {trainingJob.error_message || '분석 작업을 완료하지 못했습니다. 타깃 컬럼이나 데이터 형식을 확인한 뒤 다시 실행해 주세요.'}
            </p>
          )}
          {trainingJob?.duplicate_guard && (
            <p style={{ fontSize: 12, color: '#b45309', margin: '6px 0 0' }}>
              이 프로젝트에서 이미 실행 중인 분석 작업이 있습니다.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {trainingJob?.job_id && (
            <button className="btn-secondary" onClick={() => refreshTrainingJob()} disabled={!!loading}>
              상태 새로고침
            </button>
          )}
          {trainingJob?.status === 'failed' && (
            <button className="btn-secondary" onClick={rerunTrainingJob} disabled={!!loading}>
              {loading === 'job-rerun' && <span className="spinner" />}
              다시 실행
            </button>
          )}
          <button className="btn-primary" onClick={startTrainingJob} disabled={!!loading || !user || user.is_guest}>
            {loading === 'job' && <span className="spinner" />}
            저장 작업 시작
          </button>
        </div>
      </div>

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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 28, right: 12, left: 0, bottom: 6 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, yAxisMax]} ticks={yAxisTicks} tickFormatter={formatAxisTick} tick={{ fontSize: 11 }} />
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
                  min={OPTUNA_MIN_TRIALS}
                  max={OPTUNA_MAX_TRIALS}
                  value={nTrials}
                  onChange={e => setNTrials(e.target.value === '' ? '' : clampTrials(e.target.value))}
                  onBlur={e => setNTrials(clampTrials(e.target.value))}
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
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                기본값은 20회입니다. 숫자를 늘리면 그 횟수만큼 모델 설정 조합을 더 탐색합니다. 현재 서버 안정성을 위해 입력값은 {OPTUNA_MIN_TRIALS}~{OPTUNA_MAX_TRIALS}회로 제한됩니다. 결과는 실행한 횟수 안에서 찾은 최고 조합이고, 더 좋아지지 않으면 기존 모델을 유지합니다.
              </p>
            </div>
            {optRes ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                  <KPICard label="개선 전" value={formatScore(optRes.before_score ?? optRes.before_roc)} color="amber" />
                  <KPICard label="개선 후" value={formatScore(optRes.after_score ?? optRes.after_roc)} color={optunaTone(optRes.status)} />
                  <KPICard label="변화량" value={`${formatDelta(optRes.improvement)}%`} color={optunaTone(optRes.status)} />
                  <KPICard label="시도 횟수" value={optRes.n_trials ?? nTrials} color="blue" />
                </div>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${optunaBorder(optRes.status)}`, background: optunaBg(optRes.status) }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: optunaColor(optRes.status), margin: '0 0 5px' }}>
                    {optunaStatusLabel(optRes.status)}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                    {optRes.reason || '자동 개선 결과를 확인했습니다.'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-label)', lineHeight: 1.6, margin: '6px 0 0' }}>
                    표시된 시도 횟수는 서버가 실제로 실행한 횟수입니다.
                  </p>
                </div>
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

function formatAxisTick(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function isBoundedScoreAxis(scores) {
  return scores.length > 0 && scores.every(score => score >= 0 && score <= 1)
}

function chartAxisMax(scores, boundedScoreAxis) {
  if (!scores.length) return 1
  const max = Math.max(...scores)
  if (boundedScoreAxis) return 1
  if (!Number.isFinite(max) || max <= 0) return 1
  return Number((max * 1.12).toFixed(2))
}

function formatDelta(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`
}

function optunaStatusLabel(status) {
  if (status === 'improved') return '성능이 개선되었습니다'
  if (status === 'no_change') return '더 좋은 조합을 찾지 못했습니다'
  if (status === 'kept_original') return '점수가 낮아져 원래 모델을 유지했습니다'
  if (status === 'skipped') return '자동 개선을 생략했습니다'
  return '자동 개선 결과'
}

function optunaTone(status) {
  if (status === 'improved') return 'green'
  if (status === 'kept_original' || status === 'no_change' || status === 'skipped') return 'amber'
  return 'blue'
}

function optunaColor(status) {
  return status === 'improved' ? '#059669' : '#b45309'
}

function optunaBorder(status) {
  return status === 'improved' ? 'rgba(5,150,105,0.22)' : 'rgba(245,158,11,0.26)'
}

function optunaBg(status) {
  return status === 'improved' ? 'rgba(5,150,105,0.06)' : 'rgba(245,158,11,0.08)'
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
