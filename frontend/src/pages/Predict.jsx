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
      {/* 상단 그라디언트 헤더 배너 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position:'absolute', top:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, left:40, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:20 }}>
          <div style={{
            width:64, height:64, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.25)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize:30 }}>🔮</span>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.65)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.12em' }}>
              AI 예측 엔진
            </p>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.02em' }}>새 데이터 예측하기</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.78)', margin:0, lineHeight:1.5 }}>
              학습된 <strong style={{ color:'#fff' }}>{info.task_type === 'regression' ? '회귀' : '분류'}</strong> 모델로 새 데이터를 예측합니다 &nbsp;·&nbsp; 타깃: <strong style={{ color:'#fff' }}>{info.target_col}</strong>
            </p>
          </div>
          <div style={{
            flexShrink:0, background:'rgba(255,255,255,0.12)', borderRadius:12,
            padding:'8px 14px', border:'1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.6)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.08em' }}>입력 피처</p>
            <p style={{ fontSize:16, fontWeight:800, color:'#fff', margin:0 }}>{info.features?.length ?? 0}개</p>
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
          {/* 입력 폼 - 2컬럼 그리드 */}
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{
                width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(3,105,161,0.1))',
                border:'1px solid rgba(14,165,233,0.25)', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ fontSize:16 }}>✏️</span>
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>항목 입력</p>
                <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>각 항목에 값을 입력하세요</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {info.features.map(f => (
                <div key={f.name} style={{ display:'flex', flexDirection:'column' }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-2)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {f.label !== f.name ? f.label : f.name}
                    {f.type === 'numeric' && <span style={{ color:'var(--text-label)', fontWeight:400, marginLeft:4 }}>({f.name})</span>}
                  </label>
                  {f.type === 'categorical' ? (
                    <select className="input" value={values[f.name] ?? f.options[0]}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                      style={{ fontSize:12 }}>
                      {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="number" className="input"
                      value={values[f.name] ?? f.mean}
                      step={(f.max - f.min) > 10 ? 1 : 0.01}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                      placeholder={`${f.min} ~ ${f.max}`}
                      style={{ fontSize:12 }}
                    />
                  )}
                  {f.type === 'numeric' && (
                    <p style={{ fontSize:10, color:'var(--text-label)', margin:'2px 0 0 2px', lineHeight:1.3 }}>
                      평균 {f.mean}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handlePredict} disabled={loading} className="btn-primary"
              style={{ marginTop:20, justifyContent:'center', background:'linear-gradient(135deg,#0ea5e9,#0369a1)', fontSize:14, padding:'12px 20px' }}>
              {loading
                ? <><span className="spinner" />예측 중...</>
                : <><span style={{ fontSize:16 }}>🔮</span> 예측하기</>
              }
            </button>
          </div>

          {/* 결과 패널 */}
          <div>
            {!result && (
              <div className="empty-state" style={{ paddingTop:60 }}>
                <div style={{ fontSize:52, marginBottom:12, filter:'drop-shadow(0 4px 12px rgba(14,165,233,0.3))' }}>🔮</div>
                <p className="empty-title">왼쪽 항목을 입력하고<br/>예측하기를 눌러보세요</p>
                <p className="empty-desc">AI 모델이 즉시 결과를 예측합니다</p>
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
              border: drag ? '2px dashed #0ea5e9' : '2px dashed var(--border)',
              background: drag
                ? 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(3,105,161,0.04))'
                : 'var(--surface)',
              cursor:'pointer', textAlign:'center', padding:'44px 20px', transition:'all 0.2s',
              borderRadius:16,
            }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => setBatchFile(e.target.files[0])} />
            <div style={{
              width:56, height:56, borderRadius:18, margin:'0 auto 16px',
              background: drag ? 'rgba(14,165,233,0.12)' : 'var(--surface-alt)',
              border:`1px solid ${drag ? 'rgba(14,165,233,0.3)' : 'var(--border)'}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, transition:'all 0.2s',
            }}>📂</div>
            {batchFile ? (
              <>
                <p style={{ fontWeight:700, color:'var(--text)', fontSize:15, marginBottom:4 }}>{batchFile.name}</p>
                <p style={{ fontSize:13, color:'var(--text-label)' }}>
                  {(batchFile.size/1024).toFixed(1)} KB &nbsp;·&nbsp;
                  <span style={{ color:'#0ea5e9' }}>다른 파일 선택하려면 클릭</span>
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight:700, color:'var(--text)', fontSize:15, marginBottom:6 }}>CSV 파일을 드래그하거나 클릭해서 선택</p>
                <p style={{ fontSize:13, color:'var(--text-label)' }}>학습 데이터와 같은 컬럼 형식이어야 합니다 (타깃 컬럼 제외)</p>
              </>
            )}
          </div>

          {batchFile && (
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleBatch} disabled={batchLoading} className="btn-primary"
                style={{ background:'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
                {batchLoading
                  ? <><span className="spinner" />예측 중...</>
                  : <><span>🔮</span>{batchFile.name} 예측하기</>
                }
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
        <div style={{
          borderRadius:16, padding:'32px 20px', textAlign:'center',
          background:'linear-gradient(135deg, rgba(14,165,233,0.07), rgba(3,105,161,0.04))',
          border:'1px solid rgba(14,165,233,0.2)',
        }}>
          <p style={{ fontSize:13, color:'var(--text-label)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {info.target_col} 예측값
          </p>
          <p style={{ fontSize:60, fontWeight:900, color:'#0ea5e9', margin:'0 0 8px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{result.prediction}</p>
          <p style={{ fontSize:12, color:'var(--text-label)', margin:0 }}>AI 모델 회귀 예측 결과</p>
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
  const borderClr = isPositive ? 'rgba(225,29,72,0.2)' : 'rgba(5,150,105,0.2)'

  return (
    <div className="card animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <p className="section-title">예측 결과</p>

      {/* 메인 결과 - 임팩트 있게 */}
      <div style={{
        borderRadius:16, background:bgClr, border:`1px solid ${borderClr}`,
        padding:'32px 20px', textAlign:'center',
        boxShadow:`0 0 40px ${isPositive ? 'rgba(225,29,72,0.08)' : 'rgba(5,150,105,0.08)'}`,
      }}>
        <p style={{ fontSize:52, margin:'0 0 10px', filter:`drop-shadow(0 4px 12px ${isPositive ? 'rgba(225,29,72,0.3)' : 'rgba(5,150,105,0.3)'})` }}>{emoji}</p>
        <p style={{ fontSize:28, fontWeight:900, color, margin:'0 0 8px', letterSpacing:'-0.02em' }}>{label}</p>
        <p style={{ fontSize:12, color:'var(--text-label)', margin:0, fontWeight:500 }}>모델 예측 결과</p>
      </div>

      {/* 확신도 */}
      <div style={{
        background:'var(--surface-alt)', borderRadius:12, padding:'14px 16px',
        border:'1px solid var(--border)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-2)' }}>AI 확신도</span>
          <span style={{ fontSize:16, fontWeight:800, color:'#0ea5e9' }}>{(confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="progress-bar" style={{ height:8 }}>
          <div className="progress-fill" style={{ width:`${confidence * 100}%`, background:'linear-gradient(90deg,#0ea5e9,#0369a1)' }} />
        </div>
        <p style={{ fontSize:11, color:'var(--text-label)', margin:'6px 0 0', textAlign:'right' }}>
          {confidence >= 0.9 ? '매우 높은 확신' : confidence >= 0.7 ? '높은 확신' : '보통 확신'}
        </p>
      </div>

      {/* 확률 분포 */}
      {isBinary && probs.length === 2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>클래스별 확률</p>
          {classes.map((cls, i) => {
            const p = probs[i] ?? 0
            const isThis = i === pred
            return (
              <div key={cls}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color: isThis ? color : 'var(--text-label)', fontWeight: isThis ? 700 : 500 }}>
                    {isThis && '▶ '}{String(cls)}
                  </span>
                  <span style={{ fontSize:13, fontWeight:800, color: isThis ? color : 'var(--text-3)' }}>{(p * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div style={{ height:'100%', borderRadius:99, background: isThis ? color : 'var(--border)', width:`${p * 100}%`, transition:'width 0.5s ease' }} />
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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,rgba(14,165,233,0.15),rgba(3,105,161,0.1))',
            border:'1px solid rgba(14,165,233,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          }}>📊</div>
          <div>
            <p className="section-title" style={{ margin:0 }}>배치 예측 결과</p>
            <p style={{ fontSize:11, color:'var(--text-label)', margin:0 }}>총 {batchRes.count}건 예측 완료</p>
          </div>
        </div>
        <span style={{
          fontSize:13, fontWeight:700, color:'#0ea5e9',
          background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.2)',
          padding:'4px 12px', borderRadius:8,
        }}>{batchRes.count}건</span>
      </div>

      {!isReg && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{
            background:'linear-gradient(135deg,rgba(5,150,105,0.08),rgba(5,150,105,0.04))',
            border:'1px solid rgba(5,150,105,0.2)', borderRadius:14, padding:'16px 20px', textAlign:'center',
          }}>
            <p style={{ fontSize:32, fontWeight:900, color:'#059669', margin:'0 0 4px', lineHeight:1 }}>{negativeCount}</p>
            <p style={{ fontSize:12, color:'var(--text-label)', margin:0, fontWeight:600 }}>🟢 정상 예측</p>
          </div>
          <div style={{
            background:'linear-gradient(135deg,rgba(225,29,72,0.08),rgba(225,29,72,0.04))',
            border:'1px solid rgba(225,29,72,0.2)', borderRadius:14, padding:'16px 20px', textAlign:'center',
          }}>
            <p style={{ fontSize:32, fontWeight:900, color:'#e11d48', margin:'0 0 4px', lineHeight:1 }}>{positiveCount}</p>
            <p style={{ fontSize:12, color:'var(--text-label)', margin:0, fontWeight:600 }}>🔴 주의 예측</p>
          </div>
        </div>
      )}

      <div style={{
        overflowX:'auto', maxHeight:400, overflowY:'auto',
        borderRadius:12, border:'1px solid var(--border)',
        boxShadow:'inset 0 1px 3px rgba(0,0,0,0.04)',
      }}>
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
                  <td style={{ fontWeight:700, color:'var(--text-label)' }}>#{r.row}</td>
                  <td>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      fontWeight:700, fontSize:13,
                      color: isReg ? 'var(--text)' : isPos ? '#e11d48' : '#059669',
                    }}>
                      {!isReg && <span style={{ fontSize:14 }}>{isPos ? '🔴' : '🟢'}</span>}
                      {r.prediction_label ?? r.prediction}
                    </span>
                  </td>
                  {!isReg && (
                    <td>
                      {r.confidence != null && (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ width:`${r.confidence * 100}%`, height:'100%', background:'linear-gradient(90deg,#0ea5e9,#0369a1)', borderRadius:99, transition:'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', flexShrink:0 }}>{(r.confidence * 100).toFixed(0)}%</span>
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
          <div style={{ textAlign:'center', padding:'12px', background:'var(--surface-alt)', borderTop:'1px solid var(--border)' }}>
            <p style={{ fontSize:12, color:'var(--text-label)', margin:0 }}>
              상위 200건만 표시됩니다. 전체 결과는 CSV로 다운로드하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
