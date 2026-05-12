import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ttStyle = {
  background: '#ffffff', border: '1px solid var(--border)',
  borderRadius: 12, fontSize: 11, color: 'var(--text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function Upload() {
  const [dragging,    setDragging]    = useState(false)
  const [uploadInfo,  setUploadInfo]  = useState(null)
  const [edaInfo,     setEdaInfo]     = useState(null)
  const [target,      setTarget]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [tab,         setTab]         = useState('preview')
  const fileRef = useRef()
  const nav = useNavigate()

  async function handleFile(file) {
    if (!file) return
    setLoading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await api.post('/upload', fd)
      setUploadInfo(data)
      setTarget(data.default_target)
    } catch(e) { alert('업로드 실패: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  async function handleSetTarget() {
    setLoading(true)
    try {
      const { data } = await api.post('/set-target', { target_col: target })
      setEdaInfo(data)
      setTab('dist')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const drop = e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }
  const TABS = [['preview','미리보기'],['dist','분포'],['corr','상관관계'],['stats','통계']]

  return (
    <div className="animate-fade-in" style={{ padding:32, maxWidth:960 }}>

      {!uploadInfo ? (
        <div
          style={{
            position: 'relative',
            border: `2px dashed ${dragging ? '#6366f1' : 'rgba(99,102,241,0.2)'}`,
            borderRadius: 20,
            padding: '80px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s',
            background: dragging ? 'rgba(99,102,241,0.06)' : 'var(--bg)',
            transform: dragging ? 'scale(1.01)' : 'scale(1)',
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          onClick={() => fileRef.current.click()}
          onMouseEnter={e => { if(!dragging) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
          onMouseLeave={e => { if(!dragging) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)' }}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <div className="spinner-lg" />
              <p style={{ color:'var(--text-2)', fontSize:13 }}>파일 분석 중…</p>
            </div>
          ) : (
            <>
              <div style={{
                width:64, height:64, borderRadius:18, margin:'0 auto 20px',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                border: '1px solid rgba(99,102,241,0.3)',
                transition: 'transform 0.2s',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p style={{ color:'var(--text)', fontWeight:600, fontSize:15, marginBottom:8 }}>파일을 드래그하거나 클릭해서 업로드</p>
              <p style={{ color:'var(--text-2)', fontSize:13 }}>CSV, TXT 지원 · TXT는 구분자 자동 감지</p>
            </>
          )}
        </div>
      ) : (
        <div className="animate-slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {uploadInfo.converted && (
            <div className="banner-info">
              <span style={{ fontSize:20 }}>🤖</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>파일 변환 완료</p>
                <p style={{ fontSize:11, marginTop:2, color:'var(--text-3)', margin:'2px 0 0' }}>구분자 자동 감지 ({uploadInfo.separator}) → CSV 변환</p>
              </div>
              <span className="badge badge-cyan">변환됨</span>
            </div>
          )}

          {/* 타깃 선택 */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--text-2)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.1em' }}>타깃 컬럼 선택</label>
                <select value={target} onChange={e => setTarget(e.target.value)} className="input">
                  {uploadInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={handleSetTarget} className="btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                )}
                데이터 확정
              </button>
              <button onClick={() => { setUploadInfo(null); setEdaInfo(null) }} className="btn-secondary">
                ↩ 다시
              </button>
            </div>
          </div>

          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            <KPICard label="전체 행" value={uploadInfo.shape[0].toLocaleString()} icon="📋" color="blue" />
            <KPICard label="전체 열" value={uploadInfo.shape[1]} icon="📊" color="cyan" />
            <KPICard label="결측치" value={uploadInfo.missing_total}
              icon="⚠️" color={uploadInfo.missing_total > 0 ? 'amber' : 'green'} />
            <KPICard label="타깃 컬럼" value={target} icon="🎯" color="violet" />
          </div>

          {/* EDA 탭 */}
          {edaInfo && (
            <div className="card animate-fade-in">
              <div className="tab-bar" style={{ width:'fit-content', marginBottom:24 }}>
                {TABS.map(([k, v]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={tab === k ? 'tab-item tab-item-active' : 'tab-item tab-item-inactive'}>
                    {v}
                  </button>
                ))}
              </div>

              {tab === 'preview' && (
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>{uploadInfo.columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {uploadInfo.preview.map((row, i) => (
                        <tr key={i}>
                          {uploadInfo.columns.map(c => (
                            <td key={c} style={{ color:'var(--text-3)', fontSize:11 }}>{String(row[c])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'dist' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
                  {Object.entries(edaInfo.distributions).map(([col, d]) => (
                    <div key={col} className="card-elevated">
                      <p style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', marginBottom:12 }}>{col}</p>
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={d.bins.map((b,i) => ({ bin: b, normal: d.normal[i], failure: d.failure[i] }))} barSize={7}>
                          <XAxis dataKey="bin" tick={false} axisLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={ttStyle} labelFormatter={v=>`값: ${v}`} />
                          <Bar dataKey="normal"  stackId="a" fill="#6366f1" opacity={0.75} radius={[2,2,0,0]} />
                          <Bar dataKey="failure" stackId="a" fill="#f43f5e" opacity={0.85} radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ display:'flex', gap:16, marginTop:8 }}>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-2)' }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:'#6366f1', display:'inline-block' }} />정상
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-2)' }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:'#f43f5e', display:'inline-block' }} />고장
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'corr' && (
                <div>
                  <p style={{ fontSize:11, color:'var(--text-2)', marginBottom:16 }}>피처 간 상관관계 — 값이 클수록 강한 양의 상관</p>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ fontSize:10, borderCollapse:'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width:96 }} />
                          {edaInfo.corr_cols.map(c => (
                            <th key={c} style={{ padding:'2px 4px', color:'var(--text-2)', fontWeight:'normal', textAlign:'center', width:60, fontSize:9 }}>{c.slice(0,8)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {edaInfo.corr_cols.map(r => (
                          <tr key={r}>
                            <td style={{ paddingRight:8, color:'var(--text-2)', textAlign:'right', fontSize:9 }}>{r.slice(0,10)}</td>
                            {edaInfo.corr_cols.map(c => {
                              const v = edaInfo.corr_data.find(d=>d.x===r&&d.y===c)?.v ?? 0
                              const a = Math.abs(v)
                              const bg = v > 0 ? `rgba(99,102,241,${a*0.8})` : `rgba(244,63,94,${a*0.8})`
                              return (
                                <td key={c} style={{ width:56, height:32, textAlign:'center', borderRadius:4, background:bg, color:a>0.5?'white':'var(--text-3)', fontSize:10, fontFamily:'monospace' }}>
                                  {v.toFixed(2)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'stats' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                  <KPICard label="샘플 수" value={edaInfo.n_samples.toLocaleString()} color="blue" />
                  <KPICard label="피처 수" value={edaInfo.n_features} color="cyan" />
                  <KPICard label="고장률" value={`${edaInfo.failure_rate}%`}
                    color={edaInfo.failure_rate > 30 ? 'red' : 'green'} />
                </div>
              )}
            </div>
          )}

          {edaInfo && (
            <button onClick={() => nav('/model-lab')} className="btn-primary"
              style={{ width:'100%', justifyContent:'center', padding:'14px 20px', fontSize:14 }}>
              Model Lab으로 이동
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
