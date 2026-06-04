import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { Button } from '../components/ui/button'
import DatasetQualityCard from '../components/upload/DatasetQualityCard'

const UPLOAD_DRAFT_KEY = 'mm_upload_draft'

function loadUploadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(UPLOAD_DRAFT_KEY) || 'null')
  } catch {
    return null
  }
}

export default function Upload() {
  const [dragging, setDragging] = useState(false)
  const draft = useRef(loadUploadDraft())
  const [uploadInfo, setUploadInfo] = useState(() => draft.current?.uploadInfo || null)
  const [aiAnalysis, setAiAnalysis] = useState(() => draft.current?.aiAnalysis || null)
  const [target, setTarget] = useState(() => draft.current?.target || '')
  const [dropCols, setDropCols] = useState(() => draft.current?.dropCols || [])
  const [colLabels, setColLabels] = useState(() => draft.current?.colLabels || {})
  const [edaInfo, setEdaInfo] = useState(() => draft.current?.edaInfo || null)
  const [uploadError, setUploadError] = useState(null)
  const [targetError, setTargetError] = useState('')
  const [loading, setLoading] = useState('')
  const fileRef = useRef()
  const nav = useNavigate()

  useEffect(() => {
    if (!uploadInfo) return
    sessionStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify({
      uploadInfo,
      aiAnalysis,
      target,
      dropCols,
      colLabels,
      edaInfo,
    }))
  }, [uploadInfo, aiAnalysis, target, dropCols, colLabels, edaInfo])

  async function handleFile(file) {
    if (!file) return
    setUploadError(null)
    setLoading('upload')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/upload', fd)
      setUploadInfo(data)
      setTarget(data.default_target || data.columns?.at(-1) || '')
      setDropCols(data.suggested_drop || [])
      setEdaInfo(null)

      setLoading('ai')
      try {
        const { data: ai } = await api.post('/analyze-columns')
        setAiAnalysis(ai)
        if (ai.col_labels) setColLabels(ai.col_labels)
        if (ai.target_suggestion && data.columns.includes(ai.target_suggestion)) setTarget(ai.target_suggestion)
        if (ai.drop_suggestions?.length) {
          setDropCols(ai.drop_suggestions.map(d => d.col).filter(c => data.columns.includes(c)))
        }
      } catch (_) {
        setAiAnalysis(null)
      }
    } catch (e) {
      const detail = e.response?.data?.detail
      setUploadError(typeof detail === 'object'
        ? detail
        : { message: detail || e.message, tips: ['CSV 파일인지, 첫 행에 컬럼명이 있는지 확인해 주세요.'] })
    } finally {
      setLoading('')
    }
  }

  async function handleSetTarget() {
    setLoading('target')
    setTargetError('')
    try {
      const { data } = await api.post('/set-target', { target_col: target, drop_cols: dropCols, col_labels: colLabels })
      setEdaInfo(data)
    } catch (e) {
      setTargetError(e.response?.data?.detail || e.message)
    } finally {
      setLoading('')
    }
  }

  function toggleDrop(col) {
    setDropCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
  }

  function reset() {
    setUploadInfo(null)
    setAiAnalysis(null)
    setTarget('')
    setDropCols([])
    setColLabels({})
    setEdaInfo(null)
    setUploadError(null)
    setTargetError('')
    sessionStorage.removeItem(UPLOAD_DRAFT_KEY)
  }

  const activeCols = uploadInfo?.columns?.filter(c => c !== target && !dropCols.includes(c)) || []
  const targetCategory = aiAnalysis?.target_category || (aiAnalysis?.task_type === 'regression' ? '연속값 예측' : '목적 확인 필요')
  const targetReason = aiAnalysis?.target_category_reason || '데이터 구조만으로는 실제 업무 의미를 정확히 알기 어렵습니다.'
  const targetConfidence = aiAnalysis?.target_category_confidence || '낮음'
  const datasetDomain = aiAnalysis?.dataset_domain || '도메인 확인 필요'
  const domainConfidence = aiAnalysis?.dataset_domain_confidence || targetConfidence

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 980 }}>
      <section style={{
        borderRadius: 10, padding: '22px 24px', marginBottom: 18,
        background: 'var(--surface)',
        color: 'var(--text)', border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', margin: '0 0 8px' }}>분석 흐름 · 데이터 넣기</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', letterSpacing: 0 }}>
          CSV 업로드
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          파일을 올리면 AI가 예측할 값과 제외할 정보를 정리합니다.
        </p>
      </section>

      {!uploadInfo ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? '#2563eb' : 'rgba(37,99,235,0.24)'}`,
              borderRadius: 10, padding: '56px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(37,99,235,0.07)' : 'var(--surface)',
              transition: 'all 0.2s',
            }}
          >
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {loading ? (
            <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
              <span className="spinner" />
              <p style={{ color: 'var(--text)', fontWeight: 800, margin: 0 }}>
                {loading === 'ai' ? 'AI가 데이터 구조를 읽는 중입니다' : '파일을 올리는 중입니다'}
              </p>
              <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>잠시만 기다려주세요.</p>
            </div>
          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 10, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                <UploadIcon />
              </div>
              <p style={{ color: 'var(--text)', fontWeight: 900, fontSize: 18, margin: '0 0 8px' }}>
                파일을 끌어오거나 클릭해서 선택하세요
              </p>
              <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 18px' }}>
                CSV, TSV, TXT 파일을 지원합니다. 한글 CSV도 자동으로 읽도록 처리했습니다.
              </p>
              <Button asChild>
                <span style={{ pointerEvents: 'none' }}>파일 선택</span>
              </Button>
            </>
          )}
          </div>
          <DatasetQualityCard error={uploadError} onRetry={() => fileRef.current.click()} />
        </div>
      ) : (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="데이터 행" value={uploadInfo.shape?.[0]?.toLocaleString?.() || uploadInfo.shape?.[0]} color="blue" />
            <KPICard label="전체 컬럼" value={uploadInfo.shape?.[1]} color="cyan" />
            <KPICard label="결측값" value={uploadInfo.missing_total ?? 0} color={(uploadInfo.missing_total ?? 0) > 0 ? 'amber' : 'green'} />
            <KPICard label="맞힐 값" value={shortName(target, colLabels)} color="violet" />
            <KPICard label="데이터 종류" value={datasetDomain} color={domainConfidence === '낮음' ? 'amber' : 'green'} />
          </div>

          <DatasetQualityCard quality={uploadInfo.dataset_quality} />

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>AI가 먼저 정리한 데이터 사용 방법</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                  아래 설정은 모델이 무엇을 예측하고 어떤 정보를 참고할지 정하는 단계입니다. 필요하면 직접 바꿀 수 있습니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button onClick={handleSetTarget} disabled={!!loading}>
                  {loading === 'target' && <span className="spinner" />}
                  이 설정으로 분석 준비
                </Button>
                <Button onClick={reset} variant="secondary">다시 올리기</Button>
              </div>
            </div>

            {aiAnalysis?.dataset_summary && (
              <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(37,99,235,0.16)', background: 'rgba(37,99,235,0.06)', marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 6px' }}>AI 요약</p>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{aiAnalysis.dataset_summary}</p>
                {aiAnalysis?.target_category && (
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: '8px 0 0' }}>
                    데이터 종류: <strong style={{ color: 'var(--text)' }}>{datasetDomain}</strong> · 맞힐 값: <strong style={{ color: 'var(--text)' }}>{targetCategory}</strong> · 확신도 {targetConfidence}
                    <br />{targetReason}
                  </p>
                )}
              </div>
            )}

            {targetError && (
              <div className="banner-warning" style={{ marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{targetError}</p>
              </div>
            )}

            <div style={{ display: 'grid', gap: 14 }}>
              <SettingPanel
                title="AI가 맞히려는 정답"
                desc={`예측 모델이 최종적으로 맞혀야 하는 값입니다. 이 파일은 ${datasetDomain} 데이터로 보이며, 현재 값은 ${targetCategory}로 해석했습니다.`}
                color="#2563eb"
              >
                <select value={target} onChange={e => { setTarget(e.target.value); setDropCols(prev => prev.filter(c => c !== e.target.value)) }} className="input" style={{ maxWidth: 360 }}>
                  {uploadInfo.columns.map(c => <option key={c} value={c}>{labelFor(c, colLabels)}</option>)}
                </select>
              </SettingPanel>

              <SettingPanel
                title={`예측에 사용할 정보 ${activeCols.length}개`}
                desc="모델이 정답을 맞히기 위해 참고할 정보입니다. 누르면 제외 목록으로 이동합니다."
                color="#059669"
              >
                <ChipList items={activeCols} colLabels={colLabels} empty="사용할 컬럼이 없습니다." onClick={toggleDrop} tone="green" />
              </SettingPanel>

              <SettingPanel
                title={`예측에서 제외할 정보 ${dropCols.length}개`}
                desc="ID, 날짜, 이미 정답을 알려주는 컬럼처럼 예측을 방해할 수 있는 정보입니다. 누르면 다시 포함됩니다."
                color="#dc2626"
              >
                <ChipList items={dropCols} colLabels={colLabels} empty="제외할 컬럼이 없습니다." onClick={toggleDrop} tone="red" />
              </SettingPanel>
            </div>
          </div>

          {aiAnalysis?.drop_suggestions?.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 12px' }}>AI가 제외를 추천한 이유</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {aiAnalysis.drop_suggestions.map((item, idx) => (
                  <div key={`${item.col}-${idx}`} style={{ padding: 12, borderRadius: 10, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.14)' }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', margin: '0 0 4px' }}>{labelFor(item.col, colLabels)}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {edaInfo && (
            <div className="card animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>분석 준비가 끝났습니다</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                    이제 여러 AI 모델을 비교해서 이 데이터에 가장 잘 맞는 모델을 찾을 수 있습니다.
                  </p>
                </div>
                <Button onClick={() => nav('/model-lab')}>모델 비교하러 가기</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <KPICard label="학습 데이터" value={edaInfo.n_samples?.toLocaleString?.() || edaInfo.n_samples} color="blue" />
                <KPICard label="사용 정보" value={edaInfo.n_features} color="cyan" />
                <KPICard label="정답 비율" value={edaInfo.failure_rate != null ? `${edaInfo.failure_rate}%` : '-'} color="green" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SettingPanel({ title, desc, color, children }) {
  return (
    <div style={{ borderRadius: 12, padding: 16, border: `1px solid ${color}33`, background: `${color}0d` }}>
      <p style={{ fontSize: 14, fontWeight: 900, color, margin: '0 0 4px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.55 }}>{desc}</p>
      {children}
    </div>
  )
}

function ChipList({ items, colLabels, empty, onClick, tone }) {
  if (!items.length) return <p style={{ fontSize: 12, color: 'var(--text-label)', margin: 0 }}>{empty}</p>
  const isGreen = tone === 'green'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(col => (
        <button key={col} onClick={() => onClick(col)} style={{
          padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          border: `1px solid ${isGreen ? 'rgba(5,150,105,0.28)' : 'rgba(220,38,38,0.28)'}`,
          background: isGreen ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
          color: isGreen ? '#047857' : '#dc2626',
        }}>
          {labelFor(col, colLabels)}
        </button>
      ))}
    </div>
  )
}

function labelFor(col, labels) {
  return labels[col] ? `${labels[col]} (${col})` : col
}

function shortName(col, labels) {
  return labels[col] || col || '-'
}

function UploadIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
}
