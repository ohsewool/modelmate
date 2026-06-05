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
import WorkspaceBanner from '../components/workspace/WorkspaceBanner'
import ApiReadinessPanel from '../components/deploy/ApiReadinessPanel'
import ShareValuePanel from '../components/deploy/ShareValuePanel'
import ApiOpsPanel from '../components/deploy/ApiOpsPanel'
import ModelLifecyclePanel from '../components/deploy/ModelLifecyclePanel'

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
        <button className="btn-secondary" onClick={copy}><Clipboard size={14} /> {copied ? '복사됨' : '복사'}</button>
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
  const [message, setMessage] = useState('')
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
    setMessage('')
    try {
      const { data } = await api.post(`/v2/${model.id}/predict`, { features: values })
      setResult(data)
    } catch (e) {
      setMessage(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-elevated" style={{ display: 'grid', gap: 14 }}>
      <div className="model-tester-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
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
        예측 테스트
      </button>
      {result && (
        <div className="banner-success" style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={16} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              예측 결과: {result.prediction_label || fmt(result.prediction)}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
              확신도 {fmt(result.confidence)} / 보정 {result.input_warnings?.length || 0}
            </p>
          </div>
        </div>
      )}
      {message && (
        <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
          <AlertCircle size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{message}</p>
        </div>
      )}
    </div>
  )
}

function ShareFlow({ hasModel, modelCount }) {
  const steps = [
    ['학습 모델 준비', hasModel ? '완료' : '필요', hasModel],
    ['공유 모델 생성', modelCount > 0 ? '생성됨' : '대기', modelCount > 0],
    ['URL 복사와 테스트', modelCount > 0 ? '가능' : '생성 후 가능', modelCount > 0],
  ]
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">공유 준비 흐름</p>
      <div className="share-flow-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {steps.map(([title, status, done]) => (
          <div key={title} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border-sub)', background: done ? '#f0fdf4' : 'var(--surface-alt)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{title}</p>
            <span className={done ? 'badge badge-green' : 'badge badge-amber'}>{status}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
        공유 모델을 만들면 고정된 예측 URL이 생기고, 다른 화면이나 외부 서비스에서 같은 모델로 예측을 요청할 수 있습니다.
      </p>
    </section>
  )
}

function ModelCard({ model, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const metric = model.metrics?.best_cv || model.metrics || {}
  const primary = model.task_type === 'regression' ? metric.r2 : metric.roc_auc
  const source = model.dataset_ref?.filename || '원본 데이터셋 정보 없음'
  return (
    <section className="card animate-slide-up" style={{ display: 'grid', gap: 16 }}>
      <div className="model-card-head" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850 }}>{model.name}</h2>
            <span className="badge badge-violet">{model.version_label || 'v1'}</span>
            <span className="badge badge-blue">{model.best_model_name}</span>
            <span className="badge badge-green">{model.task_type}</span>
            <span className="badge badge-amber">{model.owner_scope || '저장 모델'}</span>
            <span className={model.file_exists ? 'badge badge-green' : 'badge badge-amber'}>{model.storage_status || '상태 확인'}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            ID {model.id} / 맞히려는 값 {model.target_col} / 점수 {fmt(primary)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
            저장 모델은 같은 입력 형식으로 반복 예측할 수 있습니다. 원본 {source}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setOpen(v => !v)}><Play size={14} /> {open ? '닫기' : '테스트'}</button>
          {confirming ? (
            <button className="btn-secondary" onClick={() => onDelete(model.id)}><Trash2 size={14} /> 삭제 확인</button>
          ) : (
            <button className="btn-secondary" onClick={() => setConfirming(true)}><Trash2 size={14} /> 삭제</button>
          )}
        </div>
      </div>
      {confirming && (
        <div className="banner-warning" style={{ justifyContent: 'space-between', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>이 공유 URL은 삭제 후 사용할 수 없습니다.</p>
          <button className="btn-secondary" onClick={() => setConfirming(false)}>취소</button>
        </div>
      )}
      <CodeBlock model={model} />
      {open && <ModelTester model={model} />}
    </section>
  )
}

export default function Deploy() {
  const [models, setModels] = useState([])
  const [hasModel, setHasModel] = useState(false)
  const [profile, setProfile] = useState(null)
  const [modelName, setModelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const [listRes, stateRes, profileRes] = await Promise.all([
      api.get('/deployed').catch(() => ({ data: [] })),
      api.get('/state').catch(() => ({ data: {} })),
      api.get('/profile/summary').catch(() => ({ data: null })),
    ])
    setModels(listRes.data)
    setHasModel(Boolean(stateRes.data.has_model))
    setProfile(profileRes.data)
  }

  useEffect(() => { load() }, [])

  async function deployStable() {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post('/deploy/stable', { name: modelName || undefined })
      setModelName('')
      await load()
      setNotice(`공유 모델을 만들었습니다: ${data.name} (${data.model_id})`)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteModel(id) {
    setError('')
    setNotice('')
    await api.delete(`/deployed/${id}`).catch(e => setError(e.response?.data?.detail || e.message))
    await load()
    setNotice('공유 모델을 삭제했습니다.')
  }

  const countLabel = useMemo(() => `공유된 모델 ${models.length}개`, [models.length])

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1080 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg,#eef2ff,#f8fafc 54%,#ecfeff)' }}>
          <div className="deploy-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}>
                <Rocket size={27} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>모델 공유</p>
                <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>예측 모델 공유 관리</h1>
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{countLabel}</p>
              </div>
            </div>
            <span className={hasModel ? 'badge badge-green' : 'badge badge-amber'}>{hasModel ? '모델 준비 완료' : '먼저 모델 학습 필요'}</span>
          </div>
        </div>

        <section className="card">
          <p className="section-title">현재 학습 모델 공유하기</p>
          <div className="deploy-create-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input className="input" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="표시 이름, 선택 사항" />
            <button className="btn-primary" onClick={deployStable} disabled={!hasModel || loading}>
              {loading ? <span className="spinner" /> : <Rocket size={15} />}
              공유 모델 만들기
            </button>
          </div>
          {(notice || error) && (
            <div className={notice ? 'banner-success' : 'banner-warning'} style={{ marginTop: 12 }}>
              {notice ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{notice || error}</p>
            </div>
          )}
        </section>

        <ShareValuePanel models={models} hasModel={hasModel} />

        <ModelLifecyclePanel models={models} />

        <ApiOpsPanel models={models} />

        <ApiReadinessPanel models={models} hasModel={hasModel} />

        <ShareFlow hasModel={hasModel} modelCount={models.length} />

        <WorkspaceBanner
          profile={profile}
          summary={[
            ['공유 모델', `${models.length}개`],
            ['현재 모델', hasModel ? '준비됨' : '학습 필요'],
            ['요청 방식', 'REST URL'],
          ]}
        />

        {models.length ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {models.map(model => <ModelCard key={model.id} model={model} onDelete={deleteModel} />)}
          </div>
        ) : (
          <div className="card empty-state">
            <Rocket size={42} color="#6366f1" />
            <p className="empty-title" style={{ marginTop: 16 }}>아직 공유된 모델이 없습니다</p>
            <p className="empty-desc">학습된 모델을 공유 API로 만들면 다른 서비스에서도 예측을 요청할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
