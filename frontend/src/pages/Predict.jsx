import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Send,
  UploadCloud,
  Wand2,
} from 'lucide-react'
import api from '../api'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

function FactorList({ items = [] }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.slice(0, 5).map(item => (
        <div key={item.feature} className="card-elevated" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 750, color: 'var(--text)' }}>{item.feature}</span>
            <span className={item.direction === 'high' ? 'badge badge-amber' : item.direction === 'low' ? 'badge badge-blue' : 'badge badge-cyan'}>
              {item.direction === 'high' ? '높을수록 영향' : item.direction === 'low' ? '낮을수록 영향' : '영향 있음'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
            입력값 {fmt(item.value)} / 기준값 {fmt(item.baseline)} / 영향도 {fmt(item.contribution)}
          </p>
        </div>
      ))}
    </div>
  )
}

function Warnings({ items = [] }) {
  if (!items.length) return null
  return (
    <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
      <AlertCircle size={16} />
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 750, color: 'var(--text)' }}>입력값을 자동 보정했습니다</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item, idx) => (
            <span key={`${item.feature}-${idx}`} className="badge badge-amber">
              {item.feature}: {item.type}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PredictionCard({ result }) {
  if (!result) {
    return (
      <div className="card empty-state" style={{ minHeight: 360 }}>
        <Wand2 size={42} color="#0ea5e9" />
        <p className="empty-title" style={{ marginTop: 16 }}>예측할 준비가 되었습니다</p>
        <p className="empty-desc">값을 입력하고 모델 예측을 실행하세요.</p>
      </div>
    )
  }
  const label = result.prediction_label || fmt(result.prediction)
  return (
    <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="section-title">예측 결과</p>
      <div style={{ padding: 24, borderRadius: 16, background: 'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(99,102,241,0.05))', border: '1px solid rgba(14,165,233,0.2)' }}>
        <p style={{ margin: '0 0 8px', color: 'var(--text-label)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
          {result.task_type}
        </p>
        <p style={{ margin: 0, fontSize: 34, lineHeight: 1.05, fontWeight: 900, color: '#0369a1' }}>{label}</p>
        {result.confidence !== undefined && (
          <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: 13 }}>
            확신도 <strong>{fmt(result.confidence)}</strong>
          </p>
        )}
      </div>
      <Warnings items={result.input_warnings} />
      {result.probabilities && (
        <div>
          <p className="section-title" style={{ marginBottom: 10 }}>가능성</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(result.probabilities).map(([key, value]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 54px', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{key}</span>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.max(2, Number(value) * 100)}%` }} /></div>
                <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-2)' }}>{fmt(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="section-title" style={{ marginBottom: 10 }}>예측에 영향을 준 정보</p>
        <FactorList items={result.top_factors} />
      </div>
    </div>
  )
}

function BatchResults({ data }) {
  if (!data) return null
  return (
    <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 4 }}>여러 행 예측 결과</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {data.count}개 행 / 보정 {data.warning_count}개 / {data.encoding} / {data.separator}
          </p>
        </div>
        <span className="badge badge-green">{data.status}</span>
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>행</th>
              <th>예측값</th>
              <th>확신도</th>
              <th>보정</th>
              <th>주요 근거</th>
            </tr>
          </thead>
          <tbody>
            {data.results.slice(0, 200).map(row => (
              <tr key={row.row}>
                <td>#{row.row}</td>
                <td style={{ fontWeight: 800, color: 'var(--text)' }}>{row.prediction_label || fmt(row.prediction)}</td>
                <td>{fmt(row.confidence)}</td>
                <td>{row.input_warnings?.length || 0}</td>
                <td>{row.top_factors?.[0]?.feature || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Predict() {
  const [info, setInfo] = useState(null)
  const [values, setValues] = useState({})
  const [tab, setTab] = useState('single')
  const [result, setResult] = useState(null)
  const [batchFile, setBatchFile] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/feature-info').then(({ data }) => {
      setInfo(data)
      const defaults = {}
      data.features.forEach(feature => {
        defaults[feature.name] = feature.type === 'categorical' ? feature.options?.[0] : feature.mean
      })
      setValues(defaults)
    }).catch(e => setError(e.response?.data?.detail || e.message))
  }, [])

  async function predictSingle() {
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.post('/predict/single', { features: values, limit: 5 })
      setResult(data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function predictBatch() {
    if (!batchFile) return
    setBatchLoading(true)
    setBatchResult(null)
    const form = new FormData()
    form.append('file', batchFile)
    try {
      const { data } = await api.post('/predict/batch?limit=3', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setBatchResult(data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setBatchLoading(false)
    }
  }

  function downloadBatch() {
    if (!batchResult) return
    const rows = batchResult.results || []
    const header = ['row', 'prediction', 'prediction_label', 'confidence', 'warnings', 'top_factor']
    const body = rows.map(row => [
      row.row,
      row.prediction,
      row.prediction_label || '',
      row.confidence || '',
      row.input_warnings?.length || 0,
      row.top_factors?.[0]?.feature || '',
    ].join(','))
    const blob = new Blob([header.join(',') + '\n' + body.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelmate_batch_predictions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!info) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <div className="card empty-state">
          {error ? <AlertCircle size={42} color="#e11d48" /> : <Loader2 className="animate-spin" size={36} color="#0ea5e9" />}
          <p className="empty-title" style={{ marginTop: 16 }}>{error ? '아직 예측이 준비되지 않았습니다' : '모델 정보를 불러오는 중입니다'}</p>
          <p className="empty-desc">{error || '먼저 모델 비교를 진행해주세요.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg,#ecfeff,#f8fafc 54%,#eef2ff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(14,165,233,0.12)', color: '#0284c7' }}>
                <Wand2 size={27} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>새 데이터 예측</p>
                <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: 0 }}>학습된 모델로 예측하기</h1>
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                  맞히려는 값 {info.target_col} / {info.task_type} / 사용 정보 {info.features.length}개
                </p>
              </div>
            </div>
            <span className="badge badge-blue">모델 준비 완료</span>
          </div>
        </div>

        <div className="tab-bar" style={{ width: 'fit-content' }}>
          <button onClick={() => setTab('single')} className={tab === 'single' ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>한 행 예측</button>
          <button onClick={() => setTab('batch')} className={tab === 'batch' ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>CSV 여러 행 예측</button>
        </div>

        {tab === 'single' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 18, alignItems: 'start' }}>
            <section className="card">
              <p className="section-title">예측에 사용할 값</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {info.features.map(feature => (
                  <label key={feature.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--text)' }}>{feature.label || feature.name}</span>
                    {feature.type === 'categorical' ? (
                      <select className="input" value={values[feature.name] ?? ''} onChange={e => setValues(v => ({ ...v, [feature.name]: e.target.value }))}>
                        {(feature.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input className="input" type="number" value={values[feature.name] ?? ''} onChange={e => setValues(v => ({ ...v, [feature.name]: e.target.value }))} />
                    )}
                    {feature.type === 'numeric' && (
                      <span style={{ fontSize: 11, color: 'var(--text-label)' }}>평균 {fmt(feature.mean)}</span>
                    )}
                  </label>
                ))}
              </div>
              <button className="btn-primary" onClick={predictSingle} disabled={loading} style={{ marginTop: 18 }}>
                {loading ? <span className="spinner" /> : <Send size={15} />}
                예측 실행
              </button>
            </section>
            <PredictionCard result={result} />
          </div>
        )}

        {tab === 'batch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section className="card" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', borderStyle: 'dashed', textAlign: 'center', padding: 42 }}>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => setBatchFile(e.target.files?.[0] || null)} />
              <UploadCloud size={42} color="#0284c7" />
              <p style={{ margin: '14px 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                {batchFile ? batchFile.name : '여러 행을 예측할 CSV 파일을 올려주세요'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                빠진 값은 자동으로 채우고 보정 내역으로 알려줍니다.
              </p>
            </section>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={predictBatch} disabled={!batchFile || batchLoading}>
                {batchLoading ? <span className="spinner" /> : <FileSpreadsheet size={15} />}
                여러 행 예측 실행
              </button>
              {batchResult && (
                <button className="btn-secondary" onClick={downloadBatch}>
                  <Download size={15} /> CSV 내려받기
                </button>
              )}
            </div>
            <BatchResults data={batchResult} />
          </div>
        )}
      </div>
    </div>
  )
}
