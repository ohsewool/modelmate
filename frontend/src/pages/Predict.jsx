import { useState, useEffect, useRef } from 'react'
import api from '../api'

export default function Predict() {
  const [info, setInfo]         = useState(null)
  const [values, setValues]     = useState({})
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('single')
  const [batchFile, setBatchFile] = useState(null)
  const [batchRes, setBatchRes] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [drag, setDrag]         = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    api.get('/feature-info').then(r => {
      setInfo(r.data)
      const defaults = {}
      r.data.features.forEach(f => {
        defaults[f.name] = f.type === 'categorical' ? f.options[0] : f.mean
      })
      setValues(defaults)
    }).catch(() => {})
  }, [])

  async function handlePredict() {
    setLoading(true); setResult(null)
    try {
      const r = await api.post('/predict', { features: values })
      setResult(r.data)
    } catch(e) {
      alert('예측 실패: ' + (e.response?.data?.detail || e.message))
    } finally { setLoading(false) }
  }

  async function handleBatch() {
    if (!batchFile) return
    setBatchLoading(true); setBatchRes(null)
    const fd = new FormData(); fd.append('file', batchFile)
    try {
      const r = await api.post('/predict-batch', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setBatchRes(r.data)
    } catch(e) {
      alert('배치 예측 실패: ' + (e.response?.data?.detail || e.message))
    } finally { setBatchLoading(false) }
  }

  function downloadCSV() {
    if (!batchRes) return
    const rows = batchRes.results
    const header = ['행번호', '예측값', '예측 레이블', '확신도(%)'].join(',')
    const body = rows.map(r =>
      [r.row, r.prediction, r.prediction_label ?? r.prediction, r.confidence != null ? (r.confidence * 100).toFixed(1) : ''].join(',')
    ).join('\n')
    const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'predictions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) setBatchFile(f)
    else alert('CSV 파일만 지원합니다')
  }

  if (!info) return (
    <div style={{ padding:40, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:16 }}>
      <div className="spinner-lg" />
      <p style={{ color:'var(--text-label)', fontSize:14 }}>모델 정보를 불러오는 중...</p>
      <p style={{ color:'var(--text-label)', fontSize:12 }}>모델을 먼저 학습해야 예측할 수 있습니다 (Model Lab 또는 AI 자동 분석)</p>
    </div>
  )

  return (
    <div style={{ padding:'24px 28px', maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      {/* 헤더 */}
      <div className="card" style={{ background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:36 }}>🔮</div>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              AI 예측
            </p>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>새 데이터 예측하기</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
              학습된 <strong style={{ color:'#fff' }}>{info.task_type === 'regression' ? '회귀' : '분류'}</strong> 모델로 새 데이터를 예측합니다 &nbsp;·&nbsp; 타깃: <strong style={{ color:'#fff' }}>{info.target_col}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="tab-bar" style={{ width:'fit-content' }}>
        {[['single','✏️  직접 입력'], ['batch','📂  파일 업로드 (여러 건)']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`tab-item ${tab === k ? 'tab-item-active' : 'tab-item-inactive'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
          {/* 입력 폼 */}
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <p className="section-title">항목 입력</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {info.features.map(f => (
                <div key={f.name}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:5 }}>
                    {f.label !== f.name ? <>{f.label} <span style={{ color:'var(--text-label)', fontWeight:400 }}>({f.name})</span></> : f.name}
                  </label>
                  {f.type === 'categorical' ? (
                    <select className="input" value={values[f.name] ?? f.options[0]}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}>
                      {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="number" className="input"
                      value={values[f.name] ?? f.mean}
                      step={(f.max - f.min) > 10 ? 1 : 0.01}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                      placeholder={`범위: ${f.min} ~ ${f.max}`}
                    />
                  )}
                  {f.type === 'numeric' && (
                    <p style={{ fontSize:11, color:'var(--text-label)', margin:'3px 0 0 2px' }}>
                      평균 {f.mean} &nbsp;|&nbsp; 범위 {f.min} ~ {f.max}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handlePredict} disabled={loading} className="btn-primary" style={{ marginTop:20, justifyContent:'center' }}>
              {loading ? <><span className="spinner" />예측 중...</> : '🔮 예측하기'}
            </button>
          </div>

          {/* 결과 */}
          <div>
            {!result && (
              <div className="empty-state" style={{ paddingTop:60 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔮</div>
                <p className="empty-title">왼쪽 항목을 입력하고<br/>예측하기를 눌러보세요</p>
                <p className="empty-desc">AI 모델이 결과를 예측합니다</p>
              </div>
            )}
            {result && <ResultCard result={result} info={info} />}
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* 드롭존 */}
          <div className="card"
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: drag ? '2px dashed #6366f1' : '2px dashed var(--border)',
              background: drag ? 'rgba(99,102,241,0.05)' : 'var(--surface)',
              cursor:'pointer', textAlign:'center', padding:'40px 20px', transition:'all 0.2s'
            }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => setBatchFile(e.target.files[0])} />
            <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
            {batchFile ? (
              <>
                <p style={{ fontWeight:700, color:'var(--text)', fontSize:15, marginBottom:4 }}>{batchFile.name}</p>
                <p style={{ fontSize:13, color:'var(--text-label)' }}>{(batchFile.size/1024).toFixed(1)} KB &nbsp;·&nbsp; 다른 파일 선택하려면 클릭</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight:600, color:'var(--text-2)', fontSize:15, marginBottom:4 }}>CSV 파일을 드래그하거나 클릭해서 선택</p>
                <p style={{ fontSize:13, color:'var(--text-label)' }}>학습 데이터와 같은 컬럼 형식이어야 합니다 (타깃 컬럼 제외)</p>
              </>
            )}
          </div>

          {batchFile && (
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleBatch} disabled={batchLoading} className="btn-primary">
                {batchLoading ? <><span className="spinner" />예측 중...</> : `🔮 ${batchFile.name} 예측하기`}
              </button>
              {batchRes && (
                <button onClick={downloadCSV} className="btn-secondary">
                  ⬇️ 결과 CSV 다운로드
                </button>
              )}
            </div>
          )}

          {batchRes && <BatchResultTable batchRes={batchRes} />}
        </div>
      )}
    </div>
  )
}

function ResultCard({ result, info }) {
  const isReg = result.task_type === 'regression'

  if (isReg) {
    return (
      <div className="card animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <p className="section-title">예측 결과</p>
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <p style={{ fontSize:13, color:'var(--text-label)', marginBottom:8 }}>{info.target_col} 예측값</p>
          <p style={{ fontSize:52, fontWeight:800, color:'#6366f1', margin:'0 0 4px' }}>{result.prediction}</p>
        </div>
      </div>
    )
  }

  const probs     = result.probabilities || []
  const pred      = result.prediction
  const label     = result.prediction_label ?? String(pred)
  const classes   = result.class_labels ?? result.classes ?? [0, 1]
  const isBinary  = probs.length === 2
  const confidence = result.confidence ?? (probs[pred] || 0)

  const isPositive = pred === 1 || label?.toLowerCase().includes('fail') || label?.toLowerCase().includes('yes')
  const emoji  = isPositive ? '🔴' : '🟢'
  const color  = isPositive ? '#e11d48' : '#059669'
  const bgClr  = isPositive ? 'rgba(225,29,72,0.06)' : 'rgba(5,150,105,0.06)'

  return (
    <div className="card animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <p className="section-title">예측 결과</p>

      {/* 메인 결과 */}
      <div style={{ borderRadius:14, background:bgClr, border:`1px solid ${color}30`, padding:'24px 20px', textAlign:'center' }}>
        <p style={{ fontSize:36, margin:'0 0 8px' }}>{emoji}</p>
        <p style={{ fontSize:24, fontWeight:800, color, margin:'0 0 6px' }}>{label}</p>
        <p style={{ fontSize:13, color:'var(--text-label)', margin:0 }}>모델 예측 결과</p>
      </div>

      {/* 확신도 */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>확신도</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#6366f1' }}>{(confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width:`${confidence * 100}%` }} />
        </div>
      </div>

      {/* 확률 분포 */}
      {isBinary && probs.length === 2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>클래스별 확률</p>
          {classes.map((cls, i) => {
            const p = probs[i] ?? 0
            const isThis = i === pred
            return (
              <div key={cls}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color: isThis ? color : 'var(--text-label)', fontWeight: isThis ? 700 : 500 }}>
                    {isThis && '▶ '}{String(cls)}
                  </span>
                  <span style={{ fontSize:12, fontWeight:700, color: isThis ? color : 'var(--text-3)' }}>{(p * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div style={{ height:'100%', borderRadius:99, background: isThis ? color : 'var(--border)', width:`${p * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BatchResultTable({ batchRes }) {
  const isReg = batchRes.task_type === 'regression'
  const rows  = batchRes.results

  const positiveCount = isReg ? 0 : rows.filter(r => r.prediction === 1).length
  const negativeCount = rows.length - positiveCount

  return (
    <div className="card animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p className="section-title" style={{ margin:0 }}>배치 예측 결과</p>
        <span style={{ fontSize:13, color:'var(--text-label)' }}>총 {batchRes.count}건</span>
      </div>

      {!isReg && (
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ flex:1, background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:800, color:'#059669', margin:'0 0 2px' }}>{negativeCount}</p>
            <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>정상 예측</p>
          </div>
          <div style={{ flex:1, background:'rgba(225,29,72,0.08)', border:'1px solid rgba(225,29,72,0.2)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:800, color:'#e11d48', margin:'0 0 2px' }}>{positiveCount}</p>
            <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>주의 예측</p>
          </div>
        </div>
      )}

      <div style={{ overflowX:'auto', maxHeight:400, overflowY:'auto', borderRadius:10, border:'1px solid var(--border)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>행</th>
              <th>예측 결과</th>
              {!isReg && <th>확신도</th>}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map(r => {
              const isPos = r.prediction === 1
              return (
                <tr key={r.row}>
                  <td style={{ fontWeight:600 }}>#{r.row}</td>
                  <td>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      fontWeight:700, color: isReg ? 'var(--text)' : isPos ? '#e11d48' : '#059669',
                    }}>
                      {!isReg && <span>{isPos ? '🔴' : '🟢'}</span>}
                      {r.prediction_label ?? r.prediction}
                    </span>
                  </td>
                  {!isReg && (
                    <td>
                      {r.confidence != null && (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ width:`${r.confidence * 100}%`, height:'100%', background:'#6366f1', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', flexShrink:0 }}>{(r.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length > 200 && (
          <p style={{ textAlign:'center', padding:10, fontSize:12, color:'var(--text-label)' }}>
            상위 200건만 표시됩니다. 전체 결과는 CSV로 다운로드하세요.
          </p>
        )}
      </div>
    </div>
  )
}
