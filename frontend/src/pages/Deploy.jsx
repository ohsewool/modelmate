import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Play,
  Rocket,
  Send,
  Trash2,
} from 'lucide-react'
import api from '../api'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

function CodeBlock({ model }) {
  const url = `${window.location.origin}/api/v2/${model.id}/predict`
  const example = Object.fromEntries((model.features || []).slice(0, 5).map(f => [f.name, f.example]))
  const snippet = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ features: example })}'`
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <code style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 12, wordBreak: 'break-all' }}>{url}</code>
        <button className="btn-secondary" onClick={copy}><Clipboard size={14} /> {copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre style={{ margin: 0, padding: 16, borderRadius: 12, background: '#0f172a', color: '#e2e8f0', fontSize: 12, overflowX: 'auto' }}>
        <code>{snippet}</code>
      </pre>
    </div>
  )
}

function ModelTester({ model }) {
  const [values, setValues] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const defaults = {}
    ;(model.features || []).forEach(feature => { defaults[feature.name] = feature.example })
    setValues(defaults)
    setResult(null)
  }, [model.id])

  async function testPredict() {
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.post(`/v2/${model.id}/predict`, { features: values })
      setResult(data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-elevated" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {(model.features || []).slice(0, 6).map(feature => (
          <label key={feature.name} style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--text)' }}>{feature.label || feature.name}</span>
            {feature.type === 'categorical' ? (
              <select className="input" value={values[feature.name] ?? ''} onChange={e => setValues(v => ({ ...v, [feature.name]: e.target.value }))}>
                {(feature.options || []).map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input className="input" type="number" value={values[feature.name] ?? ''} onChange={e => setValues(v => ({ ...v, [feature.name]: e.target.value }))} />
            )}
          </label>
        ))}
      </div>
      <button className="btn-primary" onClick={testPredict} disabled={loading}>
        {loading ? <span className="spinner" /> : <Send size={14} />}
        Test v2 prediction
      </button>
      {result && (
        <div className="banner-success" style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={16} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              Prediction: {result.prediction_label || fmt(result.prediction)}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
              Confidence {fmt(result.confidence)} · warnings {result.input_warnings?.length || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ModelCard({ model, onDelete }) {
  const [open, setOpen] = useState(false)
  const metric = model.metrics?.best_cv || model.metrics || {}
  const primary = model.task_type === 'regression' ? metric.r2 : metric.roc_auc
  return (
    <section className="card animate-slide-up" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850 }}>{model.name}</h2>
            <span className="badge badge-blue">{model.best_model_name}</span>
            <span className="badge badge-green">{model.task_type}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            ID {model.id} · target {model.target_col} · score {fmt(primary)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setOpen(v => !v)}><Play size={14} /> {open ? 'Hide' : 'Test'}</button>
          <button className="btn-secondary" onClick={() => onDelete(model.id)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
      <CodeBlock model={model} />
      {open && <ModelTester model={model} />}
    </section>
  )
}

export default function Deploy() {
  const [models, setModels] = useState([])
  const [hasModel, setHasModel] = useState(false)
  const [modelName, setModelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [listRes, stateRes] = await Promise.all([
      api.get('/deployed').catch(() => ({ data: [] })),
      api.get('/state').catch(() => ({ data: {} })),
    ])
    setModels(listRes.data)
    setHasModel(Boolean(stateRes.data.has_model))
  }

  useEffect(() => { load() }, [])

  async function deployStable() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/deploy/stable', { name: modelName || undefined })
      setModelName('')
      await load()
      setError(`Deployed ${data.name} (${data.model_id})`)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteModel(id) {
    if (!confirm('Delete this deployed model?')) return
    await api.delete(`/deployed/${id}`).catch(() => {})
    await load()
  }

  const countLabel = useMemo(() => `${models.length} deployed`, [models.length])

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1080 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg,#eef2ff,#f8fafc 54%,#ecfeff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}>
                <Rocket size={27} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Model Deployment</p>
                <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>Publish a stable prediction API</h1>
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{countLabel}</p>
              </div>
            </div>
            <span className={hasModel ? 'badge badge-green' : 'badge badge-amber'}>{hasModel ? 'Model ready' : 'Train model first'}</span>
          </div>
        </div>

        <section className="card">
          <p className="section-title">Deploy current model</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input className="input" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Display name, optional" />
            <button className="btn-primary" onClick={deployStable} disabled={!hasModel || loading}>
              {loading ? <span className="spinner" /> : <Rocket size={15} />}
              Deploy stable API
            </button>
          </div>
          {error && (
            <div className={error.startsWith('Deployed') ? 'banner-success' : 'banner-warning'} style={{ marginTop: 12 }}>
              {error.startsWith('Deployed') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{error}</p>
            </div>
          )}
        </section>

        {models.length ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {models.map(model => <ModelCard key={model.id} model={model} onDelete={deleteModel} />)}
          </div>
        ) : (
          <div className="card empty-state">
            <Rocket size={42} color="#6366f1" />
            <p className="empty-title" style={{ marginTop: 16 }}>No deployed models yet</p>
            <p className="empty-desc">Deploy the current trained model to create a reusable API.</p>
          </div>
        )}
      </div>
    </div>
  )
}
