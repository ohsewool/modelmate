import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

const AGENT_PLAN = [
  { title: '데이터 상태 확인', desc: '업로드된 데이터와 맞힐 값을 확인합니다.' },
  { title: '모델 후보 비교', desc: '여러 모델을 같은 기준으로 시험합니다.' },
  { title: '개선 여부 판단', desc: '성능이 부족하면 자동 개선을 시도합니다.' },
  { title: '예측 근거 정리', desc: '어떤 정보가 예측에 영향을 줬는지 찾습니다.' },
  { title: '발표용 결론 작성', desc: '결과 요약 화면에서 이해하기 쉽게 보여줍니다.' },
]
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
  const decision = useMemo(() => buildDecision(result), [result])

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1120 }}>
      <section className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)', gap: 20, alignItems: 'center', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 850, color: '#7c3aed', margin: '0 0 8px' }}>선택 기능 · AI 분석 코치</p>
          <h1 style={{ fontSize: 24, fontWeight: 950, margin: '0 0 8px', color: 'var(--text)', letterSpacing: 0 }}>
            AI가 분석 계획을 세우고 실행 판단을 남깁니다
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>
            직접 모델을 고를 수도 있지만, 이 화면에서는 AI가 모델 비교, 개선 판단, 예측 근거 정리를 한 번에 진행합니다.
          </p>
        </div>
        <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(37,99,235,0.08))', border: '1px solid rgba(124,58,237,0.18)' }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 8px' }}>에이전트 역할</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px' }}>분석 코치</p>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
            단순 자동 실행이 아니라, 왜 이 모델을 봤고 왜 개선을 시도했는지 판단 로그를 남깁니다.
          </p>
        </div>
      </section>

      {!result && !loading && !quickLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
          <PlanBoard activeIndex={-1} />
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ width: 58, height: 58, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', marginBottom: 14 }}>
              <AgentIcon />
            </div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 8px' }}>AI에게 맡기면 하는 일</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 16px' }}>
              모델 후보를 비교하고, 점수가 충분한지 판단하고, 설명에 필요한 근거를 추려냅니다.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button onClick={() => runAgent()}>AI 분석 코치 실행</Button>
              <Button onClick={() => nav('/model-lab')} variant="secondary">직접 모델 고르기</Button>
            </div>
          </div>
          <QuickUploadCard
            fileRef={fileRef}
            dragging={dragging}
            setDragging={setDragging}
            onFile={handleQuickFile}
            summary={quickSummary}
          />
        </div>
      )}

      {(loading || quickLoading) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
          <PlanBoard activeIndex={quickLoading === 'upload' ? 0 : quickLoading === 'analyze' || quickLoading === 'target' ? 0 : 1} />
          <div className="card" style={{ display: 'grid', gap: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: 0 }}>실행 중</p>
            {progressItems(quickLoading).map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: item.active ? 'rgba(124,58,237,0.08)' : 'var(--surface-alt)', border: item.active ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent' }}>
                <span className="spinner" />
                <span style={{ fontSize: 12, color: item.active ? '#7c3aed' : 'var(--text-2)', fontWeight: 750 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.05)', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, color: '#dc2626', margin: '0 0 8px' }}>AI 분석 코치를 시작하지 못했습니다</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{error}</p>
          <Button onClick={() => nav('/upload')} variant="secondary">데이터 확인하기</Button>
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 16, alignItems: 'start' }}>
            <PlanBoard activeIndex={AGENT_PLAN.length} completed />
            <DecisionBoard decision={decision} />
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 5px' }}>판단 로그</p>
                <h2 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>AI가 남긴 실행 기록</h2>
              </div>
              <Badge variant={result.demo_mode ? 'secondary' : 'default'}>{result.demo_mode ? '데모 모드' : 'AI 설명 사용'}</Badge>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {steps.map((step, idx) => (
                <StepCard key={`${step.step}-${idx}`} step={step} idx={idx} />
              ))}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>AI 분석 코치가 결론을 만들었습니다</h2>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                결과 요약에서 발표용 설명을 확인하고, 이유 보기에서 근거를 더 자세히 볼 수 있습니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button onClick={() => nav('/report')}>결과 요약 보기</Button>
              <Button onClick={() => nav('/xai')} variant="secondary">이유 보기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickUploadCard({ fileRef, dragging, setDragging, onFile, summary }) {
  return (
    <div
      className="card"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
      style={{
        gridColumn: '1 / -1',
        borderStyle: 'dashed',
        borderColor: dragging ? '#7c3aed' : 'var(--border)',
        background: dragging ? 'rgba(124,58,237,0.07)' : 'var(--surface)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
      <div>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 6px' }}>CSV 바로 넣고 실행</p>
        <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>파일을 넣으면 AI 코치가 바로 시작합니다</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
          업로드, 데이터 종류 판단, 맞힐 값 설정, 모델 비교를 한 번에 진행합니다.
        </p>
        {summary && (
          <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '10px 0 0' }}>
            {summary.fileName} · {summary.rows?.toLocaleString?.() || summary.rows}행 · 맞힐 값 {summary.target} · {summary.domain}
          </p>
        )}
      </div>
      <Button onClick={() => fileRef.current?.click()}>CSV 선택</Button>
    </div>
  )
}

function progressItems(stage) {
  const labels = [
    ['upload', 'CSV 파일을 업로드합니다'],
    ['analyze', '데이터 종류와 맞힐 값을 판단합니다'],
    ['target', '분석에 사용할 설정을 확정합니다'],
    ['agent', '모델 비교와 이유 분석을 실행합니다'],
  ]
  if (!stage) {
    return ['모델 후보를 비교합니다', '개선 필요성을 판단합니다', '예측 근거를 찾습니다', '결론을 정리합니다']
      .map((label, idx) => ({ label, active: idx === 0 }))
  }
  return labels.map(([key, label]) => ({ label, active: key === stage }))
}

function PlanBoard({ activeIndex, completed }) {
  return (
    <div className="card">
      <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 6px' }}>AI 계획</p>
      <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 14px' }}>에이전트가 진행할 순서</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {AGENT_PLAN.map((item, idx) => {
          const done = completed || idx < activeIndex
          const active = !completed && idx === activeIndex
          return (
            <div key={item.title} style={{
              display: 'flex', gap: 12, padding: 12, borderRadius: 12,
              border: `1px solid ${active ? 'rgba(124,58,237,0.32)' : done ? 'rgba(5,150,105,0.22)' : 'var(--border-sub)'}`,
              background: active ? 'rgba(124,58,237,0.08)' : done ? 'rgba(5,150,105,0.06)' : 'var(--surface-alt)',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 900, color: done ? '#059669' : active ? '#7c3aed' : 'var(--text-label)',
                background: done ? 'rgba(5,150,105,0.12)' : active ? 'rgba(124,58,237,0.13)' : 'var(--surface)',
              }}>
                {done ? '✓' : idx + 1}
              </span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)', margin: '0 0 3px' }}>{item.title}</p>
                <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-label)', margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DecisionBoard({ decision }) {
  return (
    <div className="card">
      <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 6px' }}>AI 결정</p>
      <h2 style={{ fontSize: 20, color: 'var(--text)', margin: '0 0 14px' }}>{decision.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <MiniScore label="추천 모델" value={decision.model} text />
        <MiniScore label="대표 점수" value={decision.score} />
        <MiniScore label="개선 판단" value={decision.tuning} text />
      </div>
      <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(37,99,235,0.16)', background: 'rgba(37,99,235,0.06)' }}>
        <p style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)', margin: '0 0 6px' }}>다음 행동</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{decision.next}</p>
      </div>
    </div>
  )
}

function StepCard({ step, idx }) {
  const rows = step.data?.results || []
  const optuna = step.data?.after_score !== undefined || step.data?.after_roc !== undefined
  const xai = step.data?.global
  const skipped = step.decision === 'optuna_skip'

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', padding: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: skipped ? 'rgba(245,158,11,0.12)' : 'rgba(124,58,237,0.1)', color: skipped ? '#b45309' : '#7c3aed', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
          {idx + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-label)' }}>AI STEP {step.step ?? idx + 1}</span>
            <h3 style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>{step.name || 'AI 실행 단계'}</h3>
            <span className={skipped ? 'badge badge-amber' : 'badge badge-green'} style={{ fontSize: 10 }}>{skipped ? '건너뜀' : '완료'}</span>
          </div>
          {step.comment && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 12px' }}>{step.comment}</p>
          )}

          {rows.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rows.slice(0, 4).map((row, rowIdx) => (
                <div key={row.model} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface)', border: rowIdx === 0 ? '1px solid rgba(5,150,105,0.24)' : '1px solid var(--border-sub)' }}>
                  <span style={{ fontSize: 12, color: rowIdx === 0 ? '#059669' : 'var(--text)', fontWeight: 850, flex: 1 }}>{rowIdx === 0 ? '추천 · ' : ''}{String(row.model).split(' ')[0]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-label)' }}>점수</span>
                  <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 900 }}>{formatScore(row.roc_auc ?? row.r2 ?? row.accuracy ?? row.f1)}</span>
                </div>
              ))}
            </div>
          )}

          {optuna && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <MiniScore label="개선 전" value={step.data.before_score ?? step.data.before_roc} />
              <MiniScore label="개선 후" value={step.data.after_score ?? step.data.after_roc} strong />
            </div>
          )}

          {xai && (
            <div style={{ display: 'grid', gap: 7 }}>
              {step.data.global.slice(0, 5).map(item => (
                <div key={item.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.feature}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, Number(item.shap_value || 0) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniScore({ label, value, strong, text }) {
  return (
    <div style={{ minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: strong ? 'rgba(16,185,129,0.08)' : 'var(--surface-alt)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-label)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: text ? 13 : 18, fontWeight: 900, color: strong ? '#059669' : 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text ? value : formatScore(value)}
      </p>
    </div>
  )
}

function buildDecision(result) {
  const rows = result?.cv_results || []
  const best = rows[0] || {}
  const score = best.roc_auc ?? best.r2 ?? best.accuracy ?? best.f1
  const tuned = result?.optuna_result
  const xai = result?.shap_global?.[0]?.feature
  return {
    title: best.model ? `${best.model} 모델을 우선 추천합니다` : '분석 결과를 기다리는 중입니다',
    model: best.model || '-',
    score,
    tuning: tuned ? '개선 적용' : '개선 생략',
    next: xai
      ? `${xai} 정보가 중요한 근거로 보입니다. 결과 요약을 확인한 뒤 이유 보기에서 근거를 발표용으로 정리하세요.`
      : '결과 요약을 확인한 뒤, 필요하면 이유 보기에서 예측 근거를 확인하세요.',
  }
}

function formatScore(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(4) : '-'
}

function AgentIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M8 8H4a2 2 0 00-2 2v2a2 2 0 002 2h1" /><path d="M16 8h4a2 2 0 012 2v2a2 2 0 01-2 2h-1" /><path d="M9 20h6" /><path d="M12 14v6" /></svg>
}
