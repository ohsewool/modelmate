import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Button } from '../components/ui/button'
import AgentHero from '../components/agent/AgentHero'
import AgentLoadingPanel from '../components/agent/AgentLoadingPanel'
import AgentResultPanel from '../components/agent/AgentResultPanel'
import AgentStartPanel from '../components/agent/AgentStartPanel'
import { buildAgentDecision } from '../components/agent/AgentUtils'

const UPLOAD_DRAFT_KEY = 'mm_upload_draft'

export default function Agent() {
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [quickSummary, setQuickSummary] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const nav = useNavigate()

  async function runAgent(options = {}) {
    if (!options.keepResult) setResult(null)
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/run-agent')
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickFile(file) {
    if (!file) return
    setError('')
    setResult(null)
    setQuickSummary(null)
    setQuickLoading('upload')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data: upload } = await api.post('/upload', fd)

      setQuickLoading('analyze')
      let ai = null
      try {
        const { data } = await api.post('/analyze-columns')
        ai = data
      } catch (_) {
        ai = null
      }

      const target = ai?.target_suggestion && upload.columns.includes(ai.target_suggestion)
        ? ai.target_suggestion
        : upload.default_target || upload.columns?.at(-1)
      const colLabels = ai?.col_labels || {}
      const dropCols = ai?.drop_suggestions?.length
        ? ai.drop_suggestions.map(d => d.col).filter(c => upload.columns.includes(c) && c !== target)
        : (upload.suggested_drop || []).filter(c => c !== target)

      setQuickLoading('target')
      const { data: eda } = await api.post('/set-target', { target_col: target, drop_cols: dropCols, col_labels: colLabels })

      sessionStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify({
        uploadInfo: upload,
        aiAnalysis: ai,
        target,
        dropCols,
        colLabels,
        edaInfo: eda,
      }))

      setQuickSummary({
        fileName: file.name,
        rows: upload.shape?.[0],
        cols: upload.shape?.[1],
        target,
        domain: ai?.dataset_domain || '도메인 확인 필요',
        purpose: ai?.target_category || eda.target_category || '분석 준비 완료',
      })

      setQuickLoading('agent')
      await runAgent({ keepResult: true })
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setQuickLoading('')
      setDragging(false)
    }
  }

  const steps = result?.steps || []
  const decision = useMemo(() => buildAgentDecision(result), [result])

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1120 }}>
      <AgentHero />

      {!result && !loading && !quickLoading && (
        <AgentStartPanel
          fileRef={fileRef}
          dragging={dragging}
          setDragging={setDragging}
          onFile={handleQuickFile}
          summary={quickSummary}
          onRun={() => runAgent()}
          onManual={() => nav('/model-lab')}
        />
      )}

      {(loading || quickLoading) && <AgentLoadingPanel stage={quickLoading} />}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.05)', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, color: '#dc2626', margin: '0 0 8px' }}>AI 분석 코치를 시작하지 못했습니다</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{error}</p>
          <Button onClick={() => nav('/upload')} variant="secondary">데이터 확인하기</Button>
        </div>
      )}

      {result && (
        <AgentResultPanel
          result={result}
          steps={steps}
          decision={decision}
          onReport={() => nav('/report')}
          onXai={() => nav('/xai')}
          onPredict={() => nav('/predict')}
          onDeploy={() => nav('/deploy')}
        />
      )}
    </div>
  )
}
