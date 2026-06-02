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
          <p className="empty-title" style={{ marginTop: 16 }}>Loading report summary</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <div className="card empty-state">
          <AlertCircle size={42} color="#e11d48" />
          <p className="empty-title" style={{ marginTop: 16 }}>Report is not ready</p>
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
                Analysis Report
              </p>
              <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>
                {summary.executive_summary}
              </h1>
              <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                Generated {new Date(summary.generated_at).toLocaleString()} · Target {dataset.target_col || '-'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => window.open('/api/report/html', '_blank')}>
                <ExternalLink size={15} /> Open HTML
              </button>
              <button className="btn-primary" onClick={downloadReport} disabled={downloading}>
                {downloading ? <span className="spinner" /> : <Download size={15} />}
                Download
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <MiniStat label="Readiness" value={pct(summary.readiness_score)} tone="green" />
          <MiniStat label="Best Model" value={summary.model_selection?.best_model || '-'} />
          <MiniStat label="Task" value={dataset.task_type || '-'} tone="amber" />
          <MiniStat label="Features" value={dataset.training_shape?.[1] ?? '-'} />
        </div>

        <Section title="Pipeline Status" icon={CheckCircle2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
            {Object.entries(summary.readiness || {}).map(([key, ok]) => (
              <div key={key} className={ok ? 'banner-success' : 'banner-warning'} style={{ padding: 10, justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 750 }}>{key.replaceAll('_', ' ')}</span>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
          <Section title="Model Leaderboard" icon={BarChart3}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Status</th>
                  <th>{primaryMetric || 'Score'}</th>
                  <th>Secondary</th>
                </tr>
              </thead>
              <tbody>
                {topModels.map((row, idx) => (
                  <tr key={row.model}>
                    <td style={{ fontWeight: idx === 0 ? 800 : 600, color: 'var(--text)' }}>{row.model}</td>
                    <td><span className={row.status === 'ok' ? 'badge badge-green' : 'badge badge-red'}>{row.status || 'ok'}</span></td>
                    <td>{fmt(row[primaryMetric])}</td>
                    <td>{Object.keys(row).filter(k => ['accuracy', 'f1', 'rmse', 'mae'].includes(k)).map(k => `${k}: ${fmt(row[k])}`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Optimization" icon={Sparkles}>
            {opt.status ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className={opt.status === 'ok' ? 'badge badge-green' : 'badge badge-amber'} style={{ width: 'fit-content' }}>
                  {opt.status}
                </span>
                <MiniStat label={opt.metric_name || 'Metric'} value={`${fmt(opt.before_score)} -> ${fmt(opt.after_score)}`} tone="green" />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Trials: {opt.n_trials || '-'} · Improvement: {fmt(opt.improvement)}%
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>Optuna has not been run yet.</p>
            )}
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 18 }}>
          <Section title="Preprocessing" icon={FileText}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                Raw shape: {dataset.raw_shape?.join(' x ') || '-'} · Training shape: {dataset.training_shape?.join(' x ') || '-'}
              </p>
              <div>
                <p className="section-title" style={{ marginBottom: 8 }}>Auto dropped</p>
                {(summary.preprocessing?.auto_drop_cols || []).length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {summary.preprocessing.auto_drop_cols.map(col => (
                      <span className="badge badge-violet" key={col}>{col}</span>
                    ))}
                  </div>
                ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-label)' }}>No automatic drops.</p>}
              </div>
            </div>
          </Section>

          <Section title="Feature Evidence" icon={BarChart3}>
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
