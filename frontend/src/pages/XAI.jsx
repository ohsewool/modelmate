import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api'

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text)',
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
}

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}
const taskLabel = value => ({
  classification: '분류 예측',
  regression: '숫자 예측',
}[value] || value || '-')
const directionLabel = value => ({
  high: '높을수록 영향',
  low: '낮을수록 영향',
  neutral: '영향 있음',
}[value] || value || '영향 있음')
const limitationText = item => ({
  'Feature importance shows signal strength, not guaranteed causality.': '중요도는 예측에 영향을 준 정도를 보여주지만, 실제 원인이라고 단정할 수는 없습니다.',
  'Local explanations are approximations when SHAP values are unavailable.': 'SHAP 값을 사용할 수 없을 때의 개별 설명은 근사치일 수 있습니다.',
}[item] || item)

function SourceBadge({ source }) {
  const label = {
    feature_importance: '중요도 기준',
    model_coefficient: '모델 계수 기준',
    target_correlation: '정답과의 관계 기준',
  }[source] || source || '설명 기준'
  return <span className="badge badge-cyan">{label}</span>
}

function EmptyState({ error, onRetry }) {
  return (
    <div className="card empty-state">
      <AlertCircle size={42} color="#e11d48" />
      <p className="empty-title" style={{ marginTop: 16 }}>아직 이유 분석이 준비되지 않았습니다</p>
      <p className="empty-desc">{error || '먼저 데이터 업로드, 정답 선택, 모델 비교를 진행해주세요.'}</p>
      {onRetry && <button className="btn-secondary" onClick={onRetry} style={{ marginTop: 16 }}><RefreshCw size={14} /> 다시 시도</button>}
    </div>
  )
}

function FeatureBars({ items, valueKey = 'importance', signed = false }) {
  const data = useMemo(() => [...(items || [])].slice(0, 10).reverse(), [items])
  if (!data.length) return <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>아직 보여줄 근거 정보가 없습니다.</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 38)}>
      <BarChart data={data} layout="vertical" barSize={14} margin={{ left: 12, right: 16 }}>
        <XAxis type="number" tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="feature" type="category" width={160} tick={{ fill: 'var(--text-2)', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), signed ? '영향도' : '중요도']} />
        <Bar dataKey={valueKey} radius={[0, 6, 6, 0]}>
          {data.map((row, idx) => (
            <Cell key={`${row.feature}-${idx}`} fill={signed && row[valueKey] < 0 ? '#6366f1' : '#059669'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function XAI() {
  const [tab, setTab] = useState('global')
  const [summary, setSummary] = useState(null)
  const [local, setLocal] = useState(null)
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadSummary() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/explain/summary?limit=10')
      setSummary(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLocal(sampleIndex = idx) {
    setLocalLoading(true)
    try {
      const { data } = await api.get(`/explain/local/${sampleIndex}?limit=8`)
      setLocal(data)
      setTab('local')
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLocalLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [])

  const topFeature = summary?.items?.[0]
  const localTop = local?.features?.[0]
  const summaryTitle = topFeature ? '핵심 근거' : '예측 근거'

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1080 }}>
        <div className="card empty-state">
          <Loader2 className="animate-spin" size={36} color="#059669" />
          <p className="empty-title" style={{ marginTop: 16 }}>예측 이유를 불러오는 중입니다</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 32, maxWidth: 960 }}><EmptyState error={error} onRetry={loadSummary} /></div>
  }

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1080 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg,#ecfdf5,#f8fafc 52%,#eff6ff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(5,150,105,0.12)', color: '#059669' }}>
                <Brain size={27} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>예측 이유 보기</p>
                <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>
                  {summaryTitle}
                </h1>
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                  {topFeature ? `${topFeature.feature}가 가장 큰 영향을 주었습니다.` : '중요한 정보를 순서대로 보여줍니다.'}
                </p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>
                  사용 모델 {summary.model} / 예측 유형 {taskLabel(summary.task_type)} / <SourceBadge source={summary.source} />
                </p>
              </div>
            </div>
            <button className="btn-secondary" onClick={loadSummary}>
              <RefreshCw size={14} /> 새로고침
            </button>
          </div>
        </div>

        <div className="tab-bar" style={{ width: 'fit-content' }}>
          <button onClick={() => setTab('global')} className={tab === 'global' ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>
            전체 데이터 기준
          </button>
          <button onClick={() => setTab('local')} className={tab === 'local' ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>
            한 행 자세히 보기
          </button>
        </div>

        {tab === 'global' && (
          <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 18 }}>
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <CheckCircle2 size={18} color="#059669" />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>가장 중요한 근거</h2>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
                {topFeature?.feature || '-'}
              </p>
              <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
                이 정보가 현재 모델의 예측에 가장 큰 영향을 주었습니다. 모델이 무엇을 먼저 보는지 이해하는 데 도움이 됩니다.
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                {(summary.items || []).slice(0, 4).map(item => (
                  <div key={item.feature} className="card-elevated" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 750, color: 'var(--text)' }}>{item.feature}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.importance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BarChart3 size={18} color="#4f46e5" />
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>중요 정보 순위</h2>
                </div>
                <SourceBadge source={summary.source} />
              </div>
              <FeatureBars items={summary.items} />
            </section>
          </div>
        )}

        {tab === 'local' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end' }}>
                <div>
                  <p className="section-title" style={{ marginBottom: 8 }}>개별 데이터 설명</p>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                    학습 데이터의 행 번호를 입력하면 그 행에서 왜 그런 예측이 나왔는지 확인할 수 있습니다.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="number" min={0} value={idx} onChange={e => setIdx(Number(e.target.value))} style={{ width: 120 }} />
                  <button className="btn-primary" onClick={() => loadLocal(idx)} disabled={localLoading}>
                    {localLoading ? <span className="spinner" /> : <Search size={14} />}
                    이유 보기
                  </button>
                </div>
              </div>
            </section>

            {local ? (
              <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 18 }}>
                <section className="card">
                  <p className="section-title">예측 결과</p>
                  <p style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 900, color: '#4f46e5' }}>
                    {local.prediction_label || fmt(local.prediction)}
                  </p>
                  <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 13 }}>
                    샘플 #{local.sample_index} / {taskLabel(local.task_type)}
                  </p>
                  {local.confidence !== undefined && (
                    <div className="card-elevated">
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--text-label)', textTransform: 'uppercase' }}>확신도</p>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 850, color: '#059669' }}>{fmt(local.confidence)}</p>
                    </div>
                  )}
                  {localTop && (
                    <p style={{ margin: '16px 0 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
                      이 행에서 가장 큰 근거는 <strong style={{ color: 'var(--text)' }}>{localTop.feature}</strong>입니다. 방향: <strong>{directionLabel(localTop.direction)}</strong>
                    </p>
                  )}
                </section>

                <section className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>개별 영향도</h2>
                    <SourceBadge source={local.source} />
                  </div>
                  <FeatureBars items={local.features} valueKey="contribution" signed />
                </section>
              </div>
            ) : (
              <div className="card empty-state" style={{ padding: 56 }}>
                <Search size={36} color="#6366f1" />
                <p className="empty-title" style={{ marginTop: 16 }}>설명할 샘플을 선택해주세요</p>
              </div>
            )}
          </div>
        )}

        <section className="card">
          <p className="section-title">주의할 점</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {(summary.limitations || []).map(item => (
              <div key={item} className="banner-info" style={{ padding: 10 }}>
                <AlertCircle size={14} />
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>{limitationText(item)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
