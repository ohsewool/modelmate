import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react'
import api from '../api'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

const pct = value => `${Math.round((Number(value) || 0) * 100)}%`
const statusLabel = key => ({
  has_data: '데이터 준비',
  has_target: '정답 선택',
  has_model: '모델 학습',
  has_explanation: '이유 분석',
  has_deployment: '공유 준비',
  dataset_uploaded: '데이터 업로드',
  target_selected: '정답 선택',
  cv_completed: '모델 비교 완료',
  model_ready: '모델 준비 완료',
  optuna_checked: '성능 개선 확인',
}[key] || key.replaceAll('_', ' '))
const metricLabel = key => ({
  accuracy: '정확도',
  f1: 'F1',
  rmse: '오차',
  mae: '평균 오차',
  roc_auc: 'ROC-AUC',
  r2: 'R2',
}[key] || key)
const taskLabel = value => ({
  classification: '분류 예측',
  regression: '숫자 예측',
}[value] || value || '-')
const optStatusLabel = value => ({
  ok: '개선 완료',
  skipped: '개선 생략',
  not_tunable: '개선 생략',
  failed: '개선 실패',
}[value] || value || '-')
const reportSummaryText = (summary, dataset, opt) => {
  const model = summary?.model_selection?.best_model || '선택된 모델'
  const target = dataset?.target_col || '정답값'
  if (opt?.status === 'skipped' || opt?.status === 'not_tunable') {
    return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다. 추가 자동 개선은 생략되었습니다.`
  }
  if (opt?.status === 'ok') {
    return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었고, 자동 개선도 완료되었습니다.`
  }
  return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다.`
}

function MiniStat({ label, value, tone = 'blue' }) {
  const colors = {
    blue: ['rgba(99,102,241,0.12)', '#4f46e5'],
    green: ['rgba(16,185,129,0.12)', '#059669'],
    amber: ['rgba(245,158,11,0.12)', '#d97706'],
  }
  const [bg, fg] = colors[tone] || colors.blue
  return (
    <div className="card-elevated" style={{ minHeight: 88 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 850, color: fg, lineHeight: 1 }}>
        {value}
      </p>
      <div style={{ height: 3, width: 36, borderRadius: 99, background: bg, marginTop: 12 }} />
    </div>
  )
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
            <Icon size={17} />
          </span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function Report() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function loadSummary() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/report/summary')
      setSummary(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [])

  async function downloadReport() {
    setDownloading(true)
    try {
      const res = await api.get('/report/html', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'ModelMate_Report.html'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setDownloading(false)
    }
  }

  const topModels = useMemo(() => summary?.model_selection?.models?.slice(0, 5) || [], [summary])
  const primaryMetric = summary?.model_selection?.score_info?.primary
  const opt = summary?.optimization || {}
  const dataset = summary?.dataset || {}
  const features = summary?.feature_evidence?.items || []

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1120 }}>
        <div className="card empty-state">
          <Loader2 className="animate-spin" size={36} color="#6366f1" />
          <p className="empty-title" style={{ marginTop: 16 }}>결과 요약을 불러오는 중입니다</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <div className="card empty-state">
          <AlertCircle size={42} color="#e11d48" />
          <p className="empty-title" style={{ marginTop: 16 }}>아직 결과 요약이 준비되지 않았습니다</p>
          <p className="empty-desc">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg,#eef2ff,#f8fafc 55%,#ecfeff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>
                결과 요약
              </p>
              <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>
                선택된 모델
              </h1>
              <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                {reportSummaryText(summary, dataset, opt)}
              </p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>
                {new Date(summary.generated_at).toLocaleString()} / 맞히려는 값 {dataset.target_col || '-'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => window.open('/api/report/html', '_blank')}>
                <ExternalLink size={15} /> HTML로 열기
              </button>
              <button className="btn-primary" onClick={downloadReport} disabled={downloading}>
                {downloading ? <span className="spinner" /> : <Download size={15} />}
                내려받기
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <MiniStat label="준비도" value={pct(summary.readiness_score)} tone="green" />
          <MiniStat label="선택된 모델" value={summary.model_selection?.best_model || '-'} />
          <MiniStat label="예측 유형" value={taskLabel(dataset.task_type)} tone="amber" />
          <MiniStat label="사용한 정보" value={dataset.training_shape?.[1] ?? '-'} />
        </div>

        <Section title="분석 진행 상태" icon={CheckCircle2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
            {Object.entries(summary.readiness || {}).map(([key, ok]) => (
              <div key={key} className={ok ? 'banner-success' : 'banner-warning'} style={{ padding: 10, justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 750 }}>{statusLabel(key)}</span>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
          <Section title="모델 비교 결과" icon={BarChart3}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th>상태</th>
                  <th>{primaryMetric || 'Score'}</th>
                  <th>보조 점수</th>
                </tr>
              </thead>
              <tbody>
                {topModels.map((row, idx) => (
                  <tr key={row.model}>
                    <td style={{ fontWeight: idx === 0 ? 800 : 600, color: 'var(--text)' }}>{row.model}</td>
                    <td><span className={row.status === 'ok' ? 'badge badge-green' : 'badge badge-red'}>{row.status === 'ok' || !row.status ? '완료' : '실패'}</span></td>
                    <td>{fmt(row[primaryMetric])}</td>
                    <td>{Object.keys(row).filter(k => ['accuracy', 'f1', 'rmse', 'mae'].includes(k)).map(k => `${metricLabel(k)}: ${fmt(row[k])}`).join(' / ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="성능 자동 개선" icon={Sparkles}>
            {opt.status ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className={opt.status === 'ok' ? 'badge badge-green' : 'badge badge-amber'} style={{ width: 'fit-content' }}>
                  {optStatusLabel(opt.status)}
                </span>
                <MiniStat label={metricLabel(opt.metric_name) || '점수'} value={`${fmt(opt.before_score)} -> ${fmt(opt.after_score)}`} tone="green" />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  시도 횟수: {opt.n_trials || '-'} / 개선율: {fmt(opt.improvement)}%
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>아직 자동 개선을 실행하지 않았습니다.</p>
            )}
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 18 }}>
          <Section title="데이터 정리 내용" icon={FileText}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                원본 크기: {dataset.raw_shape?.join(' x ') || '-'} / 학습에 사용한 크기: {dataset.training_shape?.join(' x ') || '-'}
              </p>
              <div>
                <p className="section-title" style={{ marginBottom: 8 }}>자동으로 제외한 정보</p>
                {(summary.preprocessing?.auto_drop_cols || []).length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {summary.preprocessing.auto_drop_cols.map(col => (
                      <span className="badge badge-violet" key={col}>{col}</span>
                    ))}
                  </div>
                ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-label)' }}>자동으로 제외한 정보가 없습니다.</p>}
              </div>
            </div>
          </Section>

          <Section title="예측에 영향을 준 정보" icon={BarChart3}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {features.slice(0, 6).map(item => (
                <div key={item.feature} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 64px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.feature}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(3, (item.importance || 0) * 100))}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'right' }}>{fmt(item.importance)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
