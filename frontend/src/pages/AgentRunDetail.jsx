import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Box, CheckCircle2, Database, FileText, ListChecks } from 'lucide-react'
import api from '../api'
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/workspace-shell/WorkspaceStates'

function statusLabel(status) {
  const labels = {
    supported: '지원 가능',
    limited: '제한적 지원',
    unsupported: '지원 범위 밖',
    completed: '완료',
    failed: '실패',
    running: '실행 중',
    planned: '계획됨',
    blocked: '차단',
    stopped: '중단됨',
    waiting_for_review: '검토 필요',
  }
  return labels[status] || status || '정보 없음'
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

function PlanTimeline({ steps, selectedStepId, onSelect }) {
  if (!steps?.length) {
    return <EmptyState title="아직 계획 단계가 없습니다." description="Agent Run 계획이 생성되면 여기에 표시됩니다." />
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {steps.map(step => (
        <button
          key={step.plan_step_id}
          type="button"
          onClick={() => onSelect(step.plan_step_id)}
          className="card-compact"
          style={{
            textAlign: 'left',
            borderColor: selectedStepId === step.plan_step_id ? '#2563eb' : 'var(--border)',
            display: 'grid',
            gap: 7,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>{step.order}. {step.name}</strong>
            <StatusBadge status={step.status} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{step.purpose}</p>
          <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{step.tool_name}</span>
          {step.requires_human_review && <span style={{ color: '#92400e', fontSize: 12 }}>검토 필요: {step.review_reason || '사용자 확인 필요'}</span>}
        </button>
      ))}
    </div>
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

function ReviewPanel({ reviews, run, onResolve, onRetry, onStop, onContinue }) {
  const pending = reviews.filter(review => review.status === 'pending')
  if (!pending.length && run?.status !== 'waiting_for_review') return null

  if (!pending.length) {
    return (
      <section className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#92400e" />
          <p className="section-title" style={{ margin: 0 }}>사용자 검토 대기</p>
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          이 Agent Run은 검토 단계에서 멈춰 있습니다. 저장된 review 항목이 없거나 이전 화면에서 처리되지 않았다면
          계속 실행, 재시도, 중단 중 하나를 선택할 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={onContinue}>승인하고 계속 실행</button>
          <button className="btn btn-secondary" type="button" onClick={onRetry}>현재 단계 다시 시도</button>
          <button className="btn btn-secondary" type="button" onClick={onStop}>실행 중단</button>
        </div>
      </section>
    )
  }

  return (
    <section className="card" style={{ borderColor: '#f59e0b', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={18} color="#92400e" />
        <p className="section-title" style={{ margin: 0 }}>사용자 검토 필요</p>
      </div>
      {pending.map(review => (
        <div key={review.id} className="card-compact" style={{ display: 'grid', gap: 10 }}>
          <strong>{review.prompt}</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>{review.context_summary}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(review.options || []).map(option => (
              <button
                key={option.id}
                className={option.id === 'stop' || option.id === 'reject' ? 'btn btn-secondary' : 'btn btn-primary'}
                type="button"
                onClick={() => onResolve(review, option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

export default function AgentRunDetail() {
  const params = useParams()
  const agentRunId = params.agentRunId || params.id
  const [trace, setTrace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [selectedStepId, setSelectedStepId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadTrace()
  }, [agentRunId])

  useEffect(() => {
    if (trace?.plan_steps?.length && !selectedStepId) {
      setSelectedStepId(trace.plan_steps[0].plan_step_id)
    }
  }, [trace, selectedStepId])

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
      } catch (reviewErr) {
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
        user_note: option.label,
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
      setError(normalizeError(err, '사용자 검토 처리에 실패했습니다.'))
    } finally {
      setActionLoading(false)
    }
  }

  const run = trace?.analysis_run || trace?.run
  const planSteps = trace?.plan_steps || trace?.steps || []
  const selectedStep = useMemo(
    () => planSteps.find(step => step.plan_step_id === selectedStepId),
    [planSteps, selectedStepId],
  )
  const stepToolCalls = useMemo(
    () => trace?.tool_calls?.filter(call => call.plan_step_id === selectedStepId) || [],
    [trace, selectedStepId],
  )
  const stepObservations = useMemo(
    () => trace?.observations?.filter(item => item.plan_step_id === selectedStepId) || [],
    [trace, selectedStepId],
  )
  const stepDecisions = useMemo(
    () => trace?.decisions?.filter(item => item.plan_step_id === selectedStepId || !item.plan_step_id) || [],
    [trace, selectedStepId],
  )
  const stepValidations = useMemo(
    () => trace?.validations?.filter(item => item.plan_step_id === selectedStepId || !item.plan_step_id) || [],
    [trace, selectedStepId],
  )
  const stepArtifacts = useMemo(
    () => trace?.artifacts?.filter(item => item.plan_step_id === selectedStepId) || [],
    [trace, selectedStepId],
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
          <p className="eyebrow">Agent Trace</p>
          <h1>Agent Run 상세</h1>
          <p>{run?.user_goal || '분석 목표 정보가 없습니다.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/agent-mode">Agent Mode</Link>
          <button className="btn btn-primary" type="button" onClick={continueRun} disabled={actionLoading || !run?.dataset_id}>
            <CheckCircle2 size={16} /> 계속 실행
          </button>
        </div>
      </header>

      {warning && <div className="alert alert-warning"><AlertTriangle size={16} /> {warning}</div>}
      {error && <div className="alert alert-warning"><AlertTriangle size={16} /> {error}</div>}

      <div className="workspace-grid four-columns">
        <MetricBox label="상태" value={statusLabel(run?.status)} />
        <MetricBox label="Plan 단계" value={planSteps.length || 0} />
        <MetricBox label="Tool Call" value={trace?.tool_calls?.length || 0} />
        <MetricBox label="Observation" value={trace?.observations?.length || 0} />
      </div>

      <Section title="연결 정보" icon={<Database size={18} />}>
        <div className="workspace-grid three-columns">
          <MetricBox label="Project ID" value={run?.project_id || '없음'} />
          <MetricBox label="Dataset ID" value={run?.dataset_id || '연결되지 않음'} />
          <MetricBox label="Task Type" value={run?.task_type || '미정'} />
        </div>
        {!run?.dataset_id && (
          <div className="alert alert-warning">
            <AlertTriangle size={16} />
            이 Run에는 CSV 데이터셋이 연결되어 있지 않아 실제 tool 실행을 진행할 수 없습니다. Agent Mode에서 데이터셋을 선택해 새 Run을 만드세요.
          </div>
        )}
      </Section>

      <ReviewPanel
        reviews={reviews}
        run={run}
        onResolve={resolveReview}
        onRetry={retryStep}
        onStop={stopRun}
        onContinue={continueRun}
      />

      <div className="workspace-grid two-columns" style={{ alignItems: 'start' }}>
        <Section title="Plan Timeline" icon={<ListChecks size={18} />}>
          <PlanTimeline steps={planSteps} selectedStepId={selectedStepId} onSelect={setSelectedStepId} />
        </Section>

        <Section title="선택 단계 상세" icon={<Box size={18} />}>
          {selectedStep ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <strong>{selectedStep.name}</strong>
                <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{selectedStep.purpose}</p>
                <StatusBadge status={selectedStep.status} />
              </div>
              <DetailList
                title="Tool Calls"
                items={stepToolCalls}
                empty="아직 실행된 tool call이 없습니다."
                render={call => (
                  <div key={call.id} className="card-compact">
                    <strong>{call.tool_name}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{call.input_summary || call.status}</p>
                  </div>
                )}
              />
              <DetailList
                title="Observations"
                items={stepObservations}
                empty="아직 observation이 없습니다."
                render={observation => (
                  <div key={observation.id} className="card-compact">
                    <strong>{observation.severity || 'info'}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{observation.summary}</p>
                  </div>
                )}
              />
              <DetailList
                title="Decisions"
                items={stepDecisions}
                empty="아직 decision이 없습니다."
                render={decision => (
                  <div key={decision.id} className="card-compact">
                    <strong>{decision.action}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{decision.reason}</p>
                  </div>
                )}
              />
              <DetailList
                title="Validations"
                items={stepValidations}
                empty="검증 결과가 없습니다."
                render={validation => (
                  <div key={validation.id} className="card-compact">
                    <strong>{validation.passed ? '통과' : '확인 필요'} · {validation.severity}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{validation.message}</p>
                  </div>
                )}
              />
              <DetailList
                title="Artifacts"
                items={stepArtifacts}
                empty="생성된 artifact가 없습니다."
                render={artifact => (
                  <div key={artifact.id} className="card-compact">
                    <strong>{artifact.artifact_type}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{artifact.title}</p>
                    {artifact.route_hint && <Link to={artifact.route_hint}>열기</Link>}
                  </div>
                )}
              />
            </div>
          ) : (
            <EmptyState title="단계를 선택하세요." description="왼쪽 timeline에서 확인할 단계를 선택하면 tool call과 근거가 표시됩니다." />
          )}
        </Section>
      </div>

      <Section title="전체 근거 요약" icon={<FileText size={18} />}>
        <div className="workspace-grid four-columns">
          <MetricBox label="Decisions" value={trace?.decisions?.length || 0} />
          <MetricBox label="Validations" value={trace?.validations?.length || 0} />
          <MetricBox label="Artifacts" value={trace?.artifacts?.length || 0} />
          <MetricBox label="Human Review" value={reviews.length || 0} />
        </div>
      </Section>
    </main>
  )
}
