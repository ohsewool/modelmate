import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Box, CheckCircle2, Database, FileText, ListChecks } from 'lucide-react'
import api from '../api'
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/workspace-shell/WorkspaceStates'

const STATUS_LABELS = {
  supported: '지원 가능',
  limited: '제한적 지원',
  unsupported: '지원 범위 밖',
  completed: '완료',
  succeeded: '완료',
  failed: '실패',
  running: '실행 중',
  planned: '실행 예정',
  pending: '대기 중',
  blocked: '사용자 확인 필요',
  stopped: '중단됨',
  waiting_for_review: '확인이 필요합니다',
}

const REVIEW_REASON_COPY = {
  target_ambiguous: {
    title: '예측할 타깃 컬럼을 선택하세요',
    description: 'Agent가 여러 개의 예측 후보를 찾았습니다. 어떤 값을 예측하고 싶은지 선택하면 분석을 계속 진행합니다.',
    reason: '예측할 컬럼이 명확하지 않습니다. Agent가 여러 개의 후보를 찾았기 때문에 사용자의 선택이 필요합니다.',
  },
  leakage_review_required: {
    title: '데이터 누수 가능성을 확인하세요',
    description: '예측 시점에 알 수 없는 정보가 포함되었을 수 있습니다. 제외하거나 계속 사용할지 확인해 주세요.',
    reason: '데이터 누수 가능성이 있어 확인이 필요합니다. 예측 시점에 알 수 없는 정보가 포함되었을 수 있습니다.',
  },
  metric_review_required: {
    title: '평가 기준을 확인하세요',
    description: '현재 데이터와 문제 유형에 맞는 성능 지표를 사용할지 확인해야 합니다.',
    reason: '평가 기준 확인이 필요합니다. 분류 문제에 맞는 성능 지표를 사용할지 확인해야 합니다.',
  },
  api_readiness_review_required: {
    title: 'API 생성 전 확인하세요',
    description: '모델 성능과 입력 형식이 안정적인지 확인한 뒤 예측 API로 이어갈 수 있습니다.',
    reason: 'API 배포 전 확인이 필요합니다. 모델 성능과 입력 형식이 안정적인지 확인해야 합니다.',
  },
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '정보 없음'
}

function shortId(value) {
  if (!value) return ''
  return String(value).slice(0, 8)
}

function getStepStatus(step) {
  return step?.status || 'planned'
}

function isStepDone(step) {
  return ['completed', 'succeeded', 'success'].includes(getStepStatus(step))
}

function isStepActive(step) {
  return ['running', 'blocked', 'waiting_for_review'].includes(getStepStatus(step)) || step?.requires_human_review
}

function Section({ title, icon, children }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <p className="section-title" style={{ margin: 0 }}>{title}</p>
      </div>
      {children}
    </section>
  )
}

function MetricBox({ label, value }) {
  return (
    <div className="card-compact">
      <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>{label}</p>
      <strong>{value ?? '-'}</strong>
    </div>
  )
}

function normalizeError(err, fallback) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return detail?.message || err.response?.data?.error?.message || fallback
}

function reviewCopy(review) {
  const reason = review?.review_reason || review?.reason || review?.decision_type || review?.review_type
  if (reason && REVIEW_REASON_COPY[reason]) return REVIEW_REASON_COPY[reason]
  const text = `${review?.prompt || ''} ${review?.context_summary || ''}`.toLowerCase()
  if (text.includes('target') || text.includes('타깃') || text.includes('column')) return REVIEW_REASON_COPY.target_ambiguous
  if (text.includes('leakage') || text.includes('누수')) return REVIEW_REASON_COPY.leakage_review_required
  if (text.includes('metric') || text.includes('평가')) return REVIEW_REASON_COPY.metric_review_required
  if (text.includes('api')) return REVIEW_REASON_COPY.api_readiness_review_required
  return {
    title: '사용자 확인이 필요합니다',
    description: 'Agent가 자동으로 결정하기 어려운 지점을 발견했습니다. 아래 선택지를 확인하면 분석을 계속 진행할 수 있습니다.',
    reason: review?.context_summary || '현재 단계에서 사용자의 확인이 필요합니다.',
  }
}

function optionColumn(option) {
  if (!option) return ''
  if (option.id?.startsWith('select:')) return option.id.split(':').slice(1).join(':')
  const match = String(option.label || '').match(/[A-Za-z0-9_가-힣]+/)
  return match?.[0] || ''
}

function optionLabel(option, index) {
  const column = optionColumn(option)
  if (option.id === 'stop' || option.id === 'reject') return '분석 중단'
  if (option.id === 'retry') return '현재 단계 다시 시도'
  if (option.id === 'approve' || option.id === 'continue') return '확인하고 계속 실행'
  if (option.id === 'exclude') return '의심 컬럼 제외하고 계속'
  if (option.id?.startsWith('select:')) return `${column}로 계속 실행`
  return option.label || `선택지 ${index + 1}`
}

function ProgressSummary({ steps, run }) {
  const done = steps.filter(isStepDone)
  const current = steps.find(isStepActive) || steps.find(step => !isStepDone(step))
  const next = steps.find(step => step.order > (current?.order || 0) && !isStepDone(step))
  return (
    <Section title="진행 요약" icon={<ListChecks size={18} />}>
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          현재 상태는 <strong>{statusLabel(run?.status)}</strong>입니다.
          {done.length > 0 && ` ${done.length}개 단계가 완료되었습니다.`}
        </p>
        {done.slice(-2).map(step => (
          <div key={step.plan_step_id} className="alert alert-success" style={{ margin: 0 }}>
            {step.order}단계 완료: {step.name}
          </div>
        ))}
        {current && (
          <div className="alert alert-warning" style={{ margin: 0 }}>
            현재 단계: {current.name}
          </div>
        )}
        {next && <p style={{ margin: 0, color: 'var(--text-2)' }}>다음 단계: {next.name}</p>}
      </div>
    </Section>
  )
}

function ConnectedCsvCard({ trace, run }) {
  const dataset = trace?.dataset || trace?.dataset_info || {}
  const filename = dataset.filename || dataset.original_filename || run?.dataset_name || '연결된 CSV 데이터셋'
  const rows = dataset.row_count ?? dataset.rows ?? run?.row_count
  const cols = dataset.column_count ?? dataset.columns ?? run?.column_count
  const target = run?.target_column || run?.target_col || run?.interpreted_goal?.target_preference || dataset.target_col
  return (
    <Section title="연결된 CSV" icon={<Database size={18} />}>
      <div className="workspace-grid four-columns">
        <MetricBox label="파일" value={filename} />
        <MetricBox label="데이터 행" value={rows ?? '확인 중'} />
        <MetricBox label="컬럼" value={cols ?? '확인 중'} />
        <MetricBox label="선택 타깃" value={target || '확인 필요'} />
      </div>
      {!run?.dataset_id && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          이 Run에는 CSV 데이터셋이 연결되어 있지 않아 실제 실행을 계속할 수 없습니다. Agent Mode에서 데이터셋을 선택해 새 Run을 만들어 주세요.
        </div>
      )}
      {run?.dataset_id && (
        <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
          데이터 연결 ID: {shortId(run.dataset_id)}
          {run.project_id ? ` · 프로젝트: ${shortId(run.project_id)}` : ''}
        </p>
      )}
    </Section>
  )
}

function UserPlanTimeline({ steps }) {
  if (!steps?.length) {
    return <EmptyState title="아직 분석 계획이 없습니다." description="Agent Run 계획이 생성되면 여기에 표시됩니다." />
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {steps.map(step => (
        <div key={step.plan_step_id} className="card-compact" style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>{step.order}. {step.name}</strong>
            <span className="status-pill">{statusLabel(step.status)}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{step.purpose}</p>
          {step.requires_human_review && (
            <span style={{ color: '#92400e', fontSize: 12 }}>사용자 확인 필요: {reviewCopy(step).reason}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ReviewPanel({ reviews, run, onResolve, onRetry, onStop, onContinue }) {
  const pending = reviews.filter(review => review.status === 'pending')
  if (!pending.length && run?.status !== 'waiting_for_review') return null

  if (!pending.length) {
    return (
      <section className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#92400e" />
          <p className="section-title" style={{ margin: 0 }}>확인이 필요합니다</p>
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Agent가 자동으로 넘기기 어려운 지점을 발견했습니다. 저장된 검토 항목이 없으면 계속 실행, 현재 단계 다시 시도, 분석 중단 중 하나를 선택할 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={onContinue}>확인하고 계속 실행</button>
          <button className="btn btn-secondary" type="button" onClick={onRetry}>현재 단계 다시 시도</button>
          <button className="btn btn-secondary" type="button" onClick={onStop}>분석 중단</button>
        </div>
      </section>
    )
  }

  return (
    <section className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
      {pending.map(review => {
        const copy = reviewCopy(review)
        return (
          <div key={review.id} className="card-compact" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#92400e" />
              <strong>{copy.title}</strong>
            </div>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{copy.description}</p>
            <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13, lineHeight: 1.55 }}>{copy.reason}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {(review.options || []).map((option, index) => {
                const column = optionColumn(option)
                return (
                  <div key={option.id} className="card-compact" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{column || optionLabel(option, index)}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-label)', fontSize: 12 }}>
                        {option.reason || option.description || (index === 0 && option.id?.startsWith('select:') ? '추천 후보입니다.' : '이 선택으로 다음 단계를 진행합니다.')}
                      </p>
                    </div>
                    <button
                      className={option.id === 'stop' || option.id === 'reject' ? 'btn btn-secondary' : 'btn btn-primary'}
                      type="button"
                      onClick={() => onResolve(review, option)}
                    >
                      {optionLabel(option, index)}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function DetailList({ title, items, empty, render }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>{title}</strong>
      {items?.length ? items.map(render) : <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13 }}>{empty}</p>}
    </div>
  )
}

function AdvancedTrace({ trace, reviews }) {
  const toolCalls = trace?.tool_calls || []
  const observations = trace?.observations || []
  const decisions = trace?.decisions || []
  const validations = trace?.validations || []
  const artifacts = trace?.artifacts || []
  return (
    <details className="card" style={{ display: 'grid', gap: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 850 }}>고급 실행 기록 보기 · 개발자/검증용 trace</summary>
      <div className="workspace-grid four-columns" style={{ marginTop: 12 }}>
        <MetricBox label="Agent가 실행한 작업" value={toolCalls.length} />
        <MetricBox label="Agent가 발견한 내용" value={observations.length} />
        <MetricBox label="Agent의 판단" value={decisions.length} />
        <MetricBox label="생성된 결과물" value={artifacts.length} />
      </div>
      <div className="workspace-grid two-columns" style={{ alignItems: 'start', marginTop: 12 }}>
        <DetailList
          title="Agent가 실행한 작업"
          items={toolCalls}
          empty="아직 실행된 작업이 없습니다."
          render={call => (
            <div key={call.id} className="card-compact">
              <strong>{call.tool_name}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{call.input_summary || call.status}</p>
            </div>
          )}
        />
        <DetailList
          title="Agent가 발견한 내용"
          items={observations}
          empty="아직 발견 내용이 없습니다."
          render={observation => (
            <div key={observation.id} className="card-compact">
              <strong>{observation.severity || 'info'}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{observation.summary}</p>
            </div>
          )}
        />
        <DetailList
          title="Agent의 판단"
          items={decisions}
          empty="아직 판단 기록이 없습니다."
          render={decision => (
            <div key={decision.id} className="card-compact">
              <strong>{decision.action}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{decision.reason}</p>
            </div>
          )}
        />
        <DetailList
          title="검증 결과"
          items={validations}
          empty="검증 결과가 없습니다."
          render={validation => (
            <div key={validation.id} className="card-compact">
              <strong>{validation.passed ? '통과' : '확인 필요'} · {validation.severity}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{validation.message}</p>
            </div>
          )}
        />
        <DetailList
          title="생성된 결과물"
          items={artifacts}
          empty="생성된 결과물이 없습니다."
          render={artifact => (
            <div key={artifact.id} className="card-compact">
              <strong>{artifact.artifact_type}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{artifact.title}</p>
              {artifact.route_hint && <Link to={artifact.route_hint}>열기</Link>}
            </div>
          )}
        />
        <DetailList
          title="사용자 확인 기록"
          items={reviews}
          empty="사용자 확인 기록이 없습니다."
          render={review => (
            <div key={review.id} className="card-compact">
              <strong>{review.status}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{review.prompt || review.context_summary}</p>
            </div>
          )}
        />
      </div>
    </details>
  )
}

export default function AgentRunDetail() {
  const params = useParams()
  const agentRunId = params.agentRunId || params.id
  const [trace, setTrace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadTrace()
  }, [agentRunId])

  async function loadTrace() {
    setLoading(true)
    setError('')
    setWarning('')
    if (!agentRunId) {
      setError('Agent Run을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    try {
      const traceResponse = await api.get(`/agent-runs/${agentRunId}/trace`)
      setTrace(traceResponse.data)
      try {
        const reviewsResponse = await api.get(`/agent-runs/${agentRunId}/reviews`)
        setReviews(reviewsResponse.data?.reviews || [])
      } catch {
        setReviews([])
        setWarning('검토 요청 정보 일부를 불러오지 못했습니다. 저장된 trace는 계속 표시합니다.')
      }
    } catch (err) {
      const message = normalizeError(err, 'Agent Run을 찾을 수 없습니다.')
      setError(err.response?.status === 404 ? 'Agent Run을 찾을 수 없습니다.' : message)
    } finally {
      setLoading(false)
    }
  }

  async function continueRun() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/execute`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, 'Agent Run을 계속 실행하지 못했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function retryStep() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/retry-step`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, '현재 단계 재시도에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function stopRun() {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/stop`)
      await loadTrace()
    } catch (err) {
      setError(normalizeError(err, 'Agent Run 중단에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function resolveReview(review, option) {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/agent-runs/${agentRunId}/reviews/${review.id}/resolve`, {
        selected_option: option.id,
        user_note: optionLabel(option, 0),
      })
      if (option.id === 'retry') {
        await retryStep()
      } else if (option.id === 'stop' || option.id === 'reject') {
        await stopRun()
      } else if (option.id === 'approve' || option.id === 'continue' || option.id === 'exclude' || option.id.startsWith('select:')) {
        await continueRun()
      } else {
        await loadTrace()
      }
    } catch (err) {
      setError(normalizeError(err, '사용자 확인 처리에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  const run = trace?.analysis_run || trace?.run
  const planSteps = trace?.plan_steps || trace?.steps || []
  const currentStep = useMemo(
    () => planSteps.find(isStepActive) || planSteps.find(step => !isStepDone(step)) || planSteps[planSteps.length - 1],
    [planSteps],
  )

  if (loading) return <LoadingState label="Agent Run trace를 불러오는 중입니다." />
  if (error && !trace) {
    return (
      <ErrorState
        message={error || 'Agent Run을 찾을 수 없습니다.'}
        action={<button className="btn-secondary" type="button" onClick={loadTrace}>다시 불러오기</button>}
      />
    )
  }

  return (
    <main className="workspace-page" style={{ display: 'grid', gap: 20 }}>
      <header className="workspace-hero">
        <div>
          <p className="eyebrow">Agent Mode</p>
          <h1>분석 진행 상황</h1>
          <p>{run?.user_goal || '분석 목표 정보가 없습니다.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/agent-mode">Agent Mode로 돌아가기</Link>
          <button className="btn btn-primary" type="button" onClick={continueRun} disabled={actionLoading || !run?.dataset_id}>
            <CheckCircle2 size={16} /> 확인하고 계속 실행
          </button>
        </div>
      </header>

      {warning && <div className="alert alert-warning"><AlertTriangle size={16} /> {warning}</div>}
      {error && <div className="alert alert-warning"><AlertTriangle size={16} /> {error}</div>}

      <div className="workspace-grid four-columns">
        <MetricBox label="현재 상태" value={statusLabel(run?.status)} />
        <MetricBox label="완료 단계" value={`${planSteps.filter(isStepDone).length} / ${planSteps.length || 0}`} />
        <MetricBox label="현재 단계" value={currentStep?.name || '확인 중'} />
        <MetricBox label="다음 행동" value={run?.status === 'waiting_for_review' ? '사용자 확인' : '계속 실행'} />
      </div>

      <ConnectedCsvCard trace={trace} run={run} />
      <ProgressSummary steps={planSteps} run={run} />

      <ReviewPanel
        reviews={reviews}
        run={run}
        onResolve={resolveReview}
        onRetry={retryStep}
        onStop={stopRun}
        onContinue={continueRun}
      />

      <Section title="Agent가 이해한 분석 흐름" icon={<Box size={18} />}>
        <UserPlanTimeline steps={planSteps} />
      </Section>

      <Section title="결과 요약" icon={<FileText size={18} />}>
        <div className="workspace-grid four-columns">
          <MetricBox label="Agent가 실행한 작업" value={trace?.tool_calls?.length || 0} />
          <MetricBox label="Agent가 발견한 내용" value={trace?.observations?.length || 0} />
          <MetricBox label="Agent의 판단" value={trace?.decisions?.length || 0} />
          <MetricBox label="생성된 결과물" value={trace?.artifacts?.length || 0} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          이 화면은 사용자가 이해하기 쉬운 요약입니다. 실제 tool call, observation, decision, validation, artifact 원본은 아래 고급 실행 기록에서 확인할 수 있습니다.
        </p>
      </Section>

      <AdvancedTrace trace={trace} reviews={reviews} />
    </main>
  )
}
