import { useState, useEffect } from 'react'
import api from '../api'

export default function Deploy() {
  const [deployed, setDeployed]   = useState([])
  const [hasModel, setHasModel]   = useState(false)
  const [modelName, setModelName] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [newId, setNewId]         = useState(null)

  useEffect(() => {
    load()
    api.get('/state').then(r => setHasModel(!!r.data.has_model)).catch(() => {})
  }, [])

  async function load() {
    const r = await api.get('/deployed').catch(() => ({ data: [] }))
    setDeployed(r.data)
  }

  async function handleDeploy() {
    setDeploying(true); setNewId(null)
    try {
      const r = await api.post('/deploy', { name: modelName || undefined })
      setNewId(r.data.model_id)
      setModelName('')
      await load()
    } catch(e) {
      alert('배포 실패: ' + (e.response?.data?.detail || e.message))
    } finally { setDeploying(false) }
  }

  async function handleDelete(id) {
    if (!confirm('이 모델을 삭제할까요?')) return
    await api.delete(`/deployed/${id}`).catch(() => {})
    await load()
  }

  return (
    <div style={{ padding:'24px 28px', maxWidth:860, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      {/* 헤더 */}
      <div className="card" style={{ background:'linear-gradient(135deg,#0ea5e9,#6366f1)', border:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:36 }}>🚀</div>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>API 배포</p>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>모델을 API로 배포하기</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
              학습된 모델에 고유 URL을 부여해 어디서든 예측 요청을 보낼 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 배포하기 카드 */}
      <div className="card">
        <p className="section-title">현재 모델 배포하기</p>
        {!hasModel ? (
          <div className="banner-warning">
            <span style={{ fontSize:18 }}>⚠️</span>
            <p style={{ fontSize:13, color:'#92400e', margin:0 }}>Model Lab 또는 AI 자동 분석에서 먼저 모델을 학습해야 합니다</p>
          </div>
        ) : (
          <div style={{ display:'flex', gap:10 }}>
            <input className="input" placeholder="모델 이름 (예: 장비 고장 예측 v1)"
              value={modelName} onChange={e => setModelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDeploy()}
              style={{ flex:1 }} />
            <button onClick={handleDeploy} disabled={deploying} className="btn-primary" style={{ flexShrink:0 }}>
              {deploying ? <><span className="spinner" />배포 중...</> : '🚀 배포하기'}
            </button>
          </div>
        )}
        {newId && (
          <div className="banner-success" style={{ marginTop:12 }}>
            <span style={{ fontSize:18 }}>✅</span>
            <p style={{ fontSize:13, color:'#166534', margin:0 }}>
              배포 완료! 아래에서 API 엔드포인트를 확인하세요.
            </p>
          </div>
        )}
      </div>

      {/* 배포 목록 */}
      <div>
        <p className="section-title">배포된 모델 ({deployed.length}개)</p>
        {deployed.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize:40, marginBottom:12 }}>🚀</div>
            <p className="empty-title">아직 배포된 모델이 없습니다</p>
            <p className="empty-desc">위에서 현재 모델을 배포해보세요</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {deployed.map(m => (
              <ModelCard key={m.id} model={m} onDelete={() => handleDelete(m.id)} isNew={m.id === newId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ModelCard({ model, onDelete, isNew }) {
  const [codeTab, setCodeTab] = useState('curl')
  const [copied, setCopied]   = useState(false)
  const base   = window.location.origin
  const url    = `${base}/api/v1/${model.id}/predict`
  const isReg  = model.task_type === 'regression'

  function copyUrl() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 예시 features JSON (처음 5개만)
  const exampleFeatures = Object.fromEntries(
    model.features.slice(0, 5).map(f => [f.name, f.example])
  )
  const exampleJson = JSON.stringify({ features: exampleFeatures }, null, 2)

  const snippets = {
    curl: `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ features: exampleFeatures })}'`,

    python: `import requests

response = requests.post(
    "${url}",
    json=${JSON.stringify({ features: exampleFeatures }, null, 4).split('\n').join('\n    ')}
)
print(response.json())
# → {"prediction": ..., "confidence": ...}`,

    javascript: `const response = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${JSON.stringify({ features: exampleFeatures }, null, 2).split('\n').join('\n  ')})
})
const result = await response.json()
console.log(result) // { prediction: ..., confidence: ... }`,
  }

  const metricKey = isReg ? 'r2' : 'roc_auc'
  const metricLabel = isReg ? 'R²' : 'ROC-AUC'
  const metricVal = model.metrics?.[metricKey]

  return (
    <div className="card animate-slide-up" style={{
      border: isNew ? '2px solid #6366f1' : '1px solid var(--border)',
      transition: 'border 0.3s'
    }}>
      {/* 모델 헤더 */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:16 }}>🤖</span>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:0 }}>{model.name}</h3>
            {isNew && <span className="badge badge-violet">새로 배포됨</span>}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span className="badge badge-blue">{model.best_model_name}</span>
            <span className={`badge ${isReg ? 'badge-amber' : 'badge-green'}`}>{isReg ? '회귀' : '분류'}</span>
            {metricVal != null && (
              <span className="badge badge-cyan">{metricLabel} {metricVal}</span>
            )}
            <span className="badge" style={{ background:'var(--surface-alt)', color:'var(--text-label)', border:'1px solid var(--border)' }}>
              타깃: {model.target_col}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:11, color:'var(--text-label)' }}>
            {model.created_at?.slice(0, 16).replace('T', ' ')}
          </span>
          {!model.file_exists && (
            <span className="badge badge-red">파일 없음 (재배포 필요)</span>
          )}
          <button onClick={onDelete} style={{
            background:'none', border:'none', cursor:'pointer', color:'var(--text-label)',
            padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600,
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#e11d48'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-label)'}>
            삭제
          </button>
        </div>
      </div>

      {/* 엔드포인트 URL */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
          API 엔드포인트
        </p>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'var(--surface-alt)', border:'1px solid var(--border)',
          borderRadius:10, padding:'10px 14px',
        }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#6366f1', flexShrink:0, background:'rgba(99,102,241,0.1)', padding:'2px 6px', borderRadius:4 }}>POST</span>
          <code style={{ flex:1, fontSize:12, color:'var(--text-2)', wordBreak:'break-all' }}>{url}</code>
          <button onClick={copyUrl} style={{
            flexShrink:0, fontSize:12, fontWeight:600, padding:'4px 10px',
            borderRadius:6, border:'1px solid var(--border)',
            background: copied ? '#f0fdf4' : 'var(--surface)',
            color: copied ? '#059669' : 'var(--text-2)', cursor:'pointer', transition:'all 0.2s',
          }}>
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>

      {/* 코드 예시 */}
      <div>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          코드 예시
        </p>
        <div style={{ display:'flex', gap:4, marginBottom:8 }}>
          {[['curl','cURL'], ['python','Python'], ['javascript','JavaScript']].map(([k, lbl]) => (
            <button key={k} onClick={() => setCodeTab(k)} style={{
              fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:6,
              border: codeTab === k ? '1px solid #6366f1' : '1px solid var(--border)',
              background: codeTab === k ? 'rgba(99,102,241,0.1)' : 'var(--surface)',
              color: codeTab === k ? '#6366f1' : 'var(--text-3)', cursor:'pointer',
            }}>{lbl}</button>
          ))}
        </div>
        <pre style={{
          background:'#0f172a', color:'#e2e8f0', borderRadius:10,
          padding:'16px', fontSize:12, lineHeight:1.7, overflow:'auto',
          margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all',
        }}>
          <code>{snippets[codeTab]}</code>
        </pre>
      </div>

      {/* 피처 목록 */}
      <details style={{ marginTop:12 }}>
        <summary style={{ fontSize:12, fontWeight:600, color:'var(--text-label)', cursor:'pointer', userSelect:'none' }}>
          필요한 입력값 보기 ({model.features.length}개)
        </summary>
        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
          {model.features.map(f => (
            <div key={f.name} style={{
              fontSize:11, padding:'3px 8px', borderRadius:6,
              background:'var(--surface-alt)', border:'1px solid var(--border)',
              color:'var(--text-2)',
            }}>
              <span style={{ fontWeight:600 }}>{f.label !== f.name ? f.label : f.name}</span>
              <span style={{ color:'var(--text-label)', marginLeft:4 }}>
                {f.type === 'categorical' ? `(${f.options?.slice(0,3).join('/')})` : `(숫자, 예: ${f.example})`}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
