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
      {/* 상단 그라디언트 헤더 배너 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position:'absolute', top:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-20, left:80, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:20 }}>
          <div style={{
            width:64, height:64, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.25)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize:30 }}>🚀</span>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.65)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.12em' }}>
              REST API 배포
            </p>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.02em' }}>모델을 API로 배포하기</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.78)', margin:0, lineHeight:1.5 }}>
              학습된 모델에 고유 URL을 부여해 어디서든 예측 요청을 보낼 수 있습니다
            </p>
          </div>
          <div style={{
            flexShrink:0, background:'rgba(255,255,255,0.12)', borderRadius:12,
            padding:'8px 14px', border:'1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.6)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.08em' }}>배포 수</p>
            <p style={{ fontSize:20, fontWeight:800, color:'#fff', margin:0 }}>{deployed.length}</p>
          </div>
        </div>
      </div>

      {/* 배포하기 카드 */}
      <div className="card" style={{
        borderColor: hasModel ? 'rgba(99,102,241,0.2)' : 'var(--border)',
        background: hasModel
          ? 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(79,70,229,0.02))'
          : 'var(--surface)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background: hasModel ? 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.1))' : 'var(--surface-alt)',
            border: hasModel ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          }}>🚀</div>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>현재 모델 배포하기</p>
            <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>학습된 모델을 REST API 엔드포인트로 즉시 배포합니다</p>
          </div>
        </div>

        {!hasModel ? (
          <div style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12,
            background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)',
          }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#92400e', margin:'0 0 2px' }}>모델 학습 필요</p>
              <p style={{ fontSize:12, color:'#78350f', margin:0 }}>Model Lab 또는 AI 자동 분석에서 먼저 모델을 학습해야 합니다</p>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input className="input" placeholder="모델 이름 (예: 장비 고장 예측 v1)"
                value={modelName} onChange={e => setModelName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDeploy()}
                style={{ width:'100%', paddingLeft:40, boxSizing:'border-box' }} />
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, pointerEvents:'none' }}>🤖</span>
            </div>
            <button onClick={handleDeploy} disabled={deploying} className="btn-primary"
              style={{ flexShrink:0, background:'linear-gradient(135deg,#6366f1,#4338ca)', padding:'10px 20px' }}>
              {deploying ? <><span className="spinner" />배포 중...</> : <><span>🚀</span> 배포하기</>}
            </button>
          </div>
        )}
        {newId && (
          <div style={{
            marginTop:12, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12,
            background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)',
          }}>
            <span style={{ fontSize:20 }}>✅</span>
            <p style={{ fontSize:13, fontWeight:600, color:'#166534', margin:0 }}>
              배포 완료! 아래에서 API 엔드포인트를 확인하세요.
            </p>
          </div>
        )}
      </div>

      {/* 배포 목록 */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <p className="section-title" style={{ margin:0 }}>배포된 모델</p>
          {deployed.length > 0 && (
            <span style={{
              fontSize:12, fontWeight:700, color:'#6366f1',
              background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
              padding:'2px 10px', borderRadius:8,
            }}>{deployed.length}개</span>
          )}
        </div>
        {deployed.length === 0 ? (
          <div className="empty-state">
            <div style={{
              width:64, height:64, borderRadius:20, margin:'0 auto 16px',
              background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
            }}>🚀</div>
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
      transition: 'border 0.3s',
      boxShadow: isNew ? '0 0 24px rgba(99,102,241,0.12)' : 'none',
    }}>
      {/* 모델 헤더 */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{
              width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.1))',
              border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0,
            }}>🤖</div>
            <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', margin:0 }}>{model.name}</h3>
            {isNew && <span className="badge badge-violet">새로 배포됨</span>}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
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
            padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600, transition:'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#e11d48'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-label)'}>
            삭제
          </button>
        </div>
      </div>

      {/* 엔드포인트 URL - 강조 박스 */}
      <div style={{ marginBottom:18 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
          🔗 API 엔드포인트
        </p>
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(79,70,229,0.04))',
          border:'1.5px solid rgba(99,102,241,0.25)',
          borderRadius:12, padding:'12px 16px',
          boxShadow:'inset 0 1px 3px rgba(99,102,241,0.06)',
        }}>
          <span style={{
            fontSize:11, fontWeight:800, color:'#fff', flexShrink:0,
            background:'linear-gradient(135deg,#6366f1,#4338ca)',
            padding:'3px 8px', borderRadius:6,
            boxShadow:'0 1px 4px rgba(99,102,241,0.4)',
          }}>POST</span>
          <code style={{ flex:1, fontSize:12, color:'var(--text)', wordBreak:'break-all', fontWeight:500 }}>{url}</code>
          <button onClick={copyUrl} style={{
            flexShrink:0, fontSize:12, fontWeight:700, padding:'5px 12px',
            borderRadius:8, border:`1px solid ${copied ? 'rgba(5,150,105,0.3)' : 'rgba(99,102,241,0.25)'}`,
            background: copied ? 'rgba(5,150,105,0.08)' : 'rgba(99,102,241,0.08)',
            color: copied ? '#059669' : '#6366f1', cursor:'pointer', transition:'all 0.2s',
          }}>
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>

      {/* 코드 예시 - 신택스 하이라이팅 느낌 */}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
          {'</>'} 코드 예시
        </p>
        <div style={{
          borderRadius:12, overflow:'hidden',
          border:'1px solid rgba(15,23,42,0.5)',
          boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {/* 코드 탭 헤더 */}
          <div style={{
            display:'flex', gap:0, background:'#1e293b',
            borderBottom:'1px solid rgba(255,255,255,0.06)',
            padding:'0 4px',
          }}>
            {[['curl','cURL'], ['python','Python'], ['javascript','JavaScript']].map(([k, lbl]) => (
              <button key={k} onClick={() => setCodeTab(k)} style={{
                fontSize:12, fontWeight:600, padding:'8px 14px', border:'none',
                background: codeTab === k ? '#0f172a' : 'transparent',
                color: codeTab === k ? '#818cf8' : 'rgba(255,255,255,0.4)',
                cursor:'pointer', transition:'all 0.15s',
                borderBottom: codeTab === k ? '2px solid #818cf8' : '2px solid transparent',
              }}>{lbl}</button>
            ))}
            {/* 우측 장식 점 */}
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 12px', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', opacity:0.6 }} />
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', opacity:0.6 }} />
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', opacity:0.6 }} />
            </div>
          </div>
          <pre style={{
            background:'#0f172a', color:'#e2e8f0',
            padding:'18px 20px', fontSize:12, lineHeight:1.75, overflow:'auto',
            margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all',
            fontFamily:'"Fira Code", "Cascadia Code", "SF Mono", monospace',
          }}>
            <code>{snippets[codeTab]}</code>
          </pre>
        </div>
      </div>

      {/* 피처 목록 */}
      <details style={{ marginTop:14 }}>
        <summary style={{
          fontSize:12, fontWeight:600, color:'var(--text-label)', cursor:'pointer', userSelect:'none',
          padding:'8px 12px', borderRadius:8, background:'var(--surface-alt)', border:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:6,
        }}>
          📋 필요한 입력값 보기 ({model.features.length}개)
        </summary>
        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
          {model.features.map(f => (
            <div key={f.name} style={{
              fontSize:11, padding:'4px 10px', borderRadius:8,
              background:'var(--surface-alt)', border:'1px solid var(--border)',
              color:'var(--text-2)', transition:'all 0.15s',
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
