import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Box, CheckCircle2, Clock3, Database, FileText, ListChecks } from 'lucide-react'
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
    waiting_for_review: '검토 필요',
  }
  return labels[status] || status || '알 수 없음'
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

function PlanTimeline({ steps, selectedStepId, onSelect }) {
  if (!steps?.length) return <EmptyState title="아직 계획 단계가 없습니다." description="Agent Run 계획이 생성되면 여기에 표시됩니다." />
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

function StepDetail({ step, toolCalls, observations, decisions, validations, artifacts }) {
  if (!step) return <EmptyState title="단계를 선택하세요." description="왼쪽 계획 timeline에서 단계를 선택하면 저장된 tool call, observation, decision을 확인할 수 있습니다." />
  return (
    <Section title="선택한 단계 상세" icon={<ListChecks size={16} />}>
      <div>
        <h3 style={{ margin: '0 0 6px' }}>{step.name}</h3>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>{step.tool_name} · {statusLabel(step.status)}</p>
      </div>
      <DetailList
        title="Tool call"
        items={toolCalls}
        empty="아직 이 단계의 tool call이 없습니다."
        render={item => (
          <div key={item.id} className="card-compact">
            <strong>{item.tool_name}</strong> <StatusBadge status={item.status} />
            <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '6px 0' }}>{item.output_summary || item.input_summary || '요약이 아직 없습니다.'}</p>
            <p style={{ color: 'var(--text-label)', fontSize: 12, margin: 0 }}>시작 {item.created_at || '-'} / 완료 {item.finished_at || '아직 없음'}</p>
            {item.error_message && <div className="banner-danger" style={{ marginTop: 8 }}><AlertTriangle size={14} /><p style={{ margin: 0 }}>{item.error_message}</p></div>}
          </div>
        )}
      />
      <DetailList
        title="Observation"
        items={observations}
        empty="아직 이 단계의 관찰 결과가 생성되지 않았습니다."
        render={item => (
          <div key={item.id} className="card-compact">
            <strong>{item.observation_type || 'observation'}</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--text-2)', lineHeight: 1.55 }}>{item.summary}</p>
          </div>
        )}
      />
      <DetailList
        title="Decision"
        items={decisions}
        empty="아직 이 단계에서 기록된 decision이 없습니다."
        render={item => (
          <div key={item.id} className="card-compact">
            <strong>{item.decision_type || item.action}</strong>
            <p style={{ margin: '6px 0', color: 'var(--text-2)', lineHeight: 1.55 }}>{item.summary || item.reason}</p>
            <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{item.action}</span>
          </div>
        )}
      />
      <DetailList
        title="Validation"
        items={validations}
        empty="아직 이 단계의 검증 결과가 없습니다."
        render={item => (
          <div key={item.id} className={item.severity === 'blocking' ? 'banner-danger' : 'banner-warning'} style={{ alignItems: 'flex-start' }}>
            <AlertTriangle size={14} />
            <p style={{ margin: 0 }}>{item.validation_type}: {item.message}</p>
          </div>
        )}
      />
      <DetailList
        title="Artifact"
        items={artifacts}
        empty="아직 이 단계에서 연결된 artifact가 없습니다."
        render={item => (
          <div key={item.id} className="card-compact">
            <strong>{item.title}</strong> <StatusBadge status={item.status} />
            <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>{item.artifact_type}</p>
            {item.route && <Link to={item.route}>연결된 화면 열기</Link>}
          </div>
        )}
      />
    </Section>
  )
}

function ReviewPanel({ reviews, onResolve, onRetry, onStop }) {
  if (!reviews?.length) return null
  const pending = reviews.filter(item => item.status === 'pending')
  return (
    <section className="card" style={{ display: 'grid', gap: 12, borderColor: pending.length ? '#f59e0b' : 'var(--border)', marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <AlertTriangle size={17} color={pending.length ? '#d97706' : '#64748b'} />
        <p className="section-title" style={{ margin: 0 }}>사용자 확인 필요</p>
      </div>
      {reviews.map(review => (
        <div key={review.id} className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <strong>{review.title}</strong>
            <StatusBadge status={review.status} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>{review.message}</p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{review.review_type} · {review.severity}</p>
          {review.status === 'pending' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(review.options || []).map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === 'stop' ? 'btn-secondary' : 'btn-primary'}
                  onClick={async () => {
                    await onResolve(review, option)
                    if (option.id === 'retry') await onRetry()
                    if (option.id === 'stop') await onStop()
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {review.status !== 'pending' && <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>처리 결과: {review.selected_option || review.status}</p>}
        </div>
      ))}
    </section>
  )
}

export default function AgentRunDetail() {
  const { agentRunId } = useParams()
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [selectedStepId, setSelectedStepId] = useState('')
  const [message, setMessage] = useState('')

  async function loadTrace() {
    setState({ loading: true, error: '', data: null })
    const res = await api.get(`/agent-runs/${agentRunId}/trace`)
    setState({ loading: false, error: '', data: res.data })
    const first = res.data.steps?.[0]?.id || res.data.plan?.steps?.[0]?.plan_step_id || ''
    setSelectedStepId(first)
  }

  useEffect(() => {
    let mounted = true
    setState({ loading: true, error: '', data: null })
    api.get(`/agent-runs/${agentRunId}/trace`)
      .then(res => {
        if (!mounted) return
        setState({ loading: false, error: '', data: res.data })
        const first = res.data.steps?.[0]?.id || res.data.plan?.steps?.[0]?.plan_step_id || ''
        setSelectedStepId(first)
      })
      .catch(err => {
        if (!mounted) return
        setState({ loading: false, error: err.response?.data?.detail || 'Agent Run trace를 불러오지 못했습니다.', data: null })
      })
    return () => { mounted = false }
  }, [agentRunId])

  async function resolveReview(review, option) {
    setMessage('')
    try {
      await api.post(`/agent-runs/${agentRunId}/reviews/${review.id}/resolve`, {
        selected_option: option.id,
        user_note: option.label,
      })
      setMessage('사용자 확인 결과를 저장했습니다.')
      await loadTrace()
    } catch (err) {
      setMessage(err.response?.data?.detail || '확인 결과를 저장하지 못했습니다.')
    }
  }

  async function retryRun() {
    setMessage('')
    try {
      const res = await api.post(`/agent-runs/${agentRunId}/retry-step`)
      setState({ loading: false, error: '', data: res.data })
      setMessage('이전 trace를 보존한 채 재시도를 실행했습니다.')
    } catch (err) {
      setMessage(err.response?.data?.detail || '재시도하지 못했습니다.')
    }
  }

  async function stopRun() {
    setMessage('')
    try {
      const res = await api.post(`/agent-runs/${agentRunId}/stop`)
      setState({ loading: false, error: '', data: res.data })
      setMessage('Agent Run을 중단했습니다. 기존 trace는 보존됩니다.')
    } catch (err) {
      setMessage(err.response?.data?.detail || '중단하지 못했습니다.')
    }
  }

  const trace = state.data
  const run = trace?.run
  const interpreted = run?.interpreted_goal || {}
  const steps = useMemo(() => trace?.steps?.map(item => ({
    ...(item.payload || {}),
    plan_step_id: item.id,
    status: item.status,
    name: item.title,
    order: item.step_index,
  })) || [], [trace])
  const selectedStep = steps.find(step => step.plan_step_id === selectedStepId)
  const byStep = key => (trace?.[key] || []).filter(item => item.plan_step_id === selectedStepId || item.analysis_step_id === selectedStepId)

  if (state.loading) return <div style={{ padding: 24 }}><LoadingState label="Agent Run trace를 불러오는 중입니다." /></div>
  if (state.error) return <div style={{ padding: 24 }}><ErrorState message={state.error} /></div>
  if (!trace || !run) return <div style={{ padding: 24 }}><EmptyState title="Agent Run trace가 없습니다." description="저장된 Agent Run을 먼저 생성하거나 실행해 주세요." action={<Link className="btn-primary" to="/agent-mode">Agent Mode로 이동</Link>} /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <p className="section-title">Agent Run Detail</p>
          <h1 style={{ margin: '4px 0 8px' }}>목표 기반 분석 실행</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{run.user_goal}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusBadge status={run.status} />
          <Link className="btn-secondary" to="/agent-mode">Agent Mode</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 18 }} className="admin-stat-grid">
        <MetricBox label="지원 범위" value={statusLabel(run.supported_status)} />
        <MetricBox label="작업 유형" value={run.task_type} />
        <MetricBox label="tool call" value={trace.tool_calls?.length || 0} />
        <MetricBox label="decision" value={trace.decisions?.length || 0} />
        <MetricBox label="artifact" value={trace.artifacts?.length || 0} />
      </div>
      {message && <div className="banner-warning" style={{ marginBottom: 14 }}><p style={{ margin: 0 }}>{message}</p></div>}
      <ReviewPanel reviews={trace.human_reviews || []} onResolve={resolveReview} onRetry={retryRun} onStop={stopRun} />

      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 18 }} className="admin-detail-grid">
        <div style={{ display: 'grid', gap: 14, alignSelf: 'start' }}>
          <Section title="목표 해석" icon={<Database size={16} />}>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>프레이밍: {interpreted.report_framing || '-'}</p>
            {interpreted.planner && <p style={{ margin: 0, color: 'var(--text-2)' }}>계획 방식: {interpreted.planner.planner_type === 'llm_assisted' ? 'LLM 보조' : '기본 규칙 기반'}</p>}
            <p style={{ margin: 0, color: 'var(--text-2)' }}>추천 지표: {(interpreted.likely_metrics || []).join(', ') || '-'}</p>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>타깃 후보: {(interpreted.target_candidates || []).join(', ') || '-'}</p>
            {(interpreted.review_flags || []).includes('causal_claim_warning') && (
              <div className="banner-warning"><p style={{ margin: 0 }}>중요 변수의 기여도는 설명할 수 있지만 인과관계를 단정하지 않습니다.</p></div>
            )}
          </Section>
          <Section title="Plan timeline" icon={<Clock3 size={16} />}>
            <PlanTimeline steps={steps} selectedStepId={selectedStepId} onSelect={setSelectedStepId} />
          </Section>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <StepDetail
            step={selectedStep}
            toolCalls={byStep('tool_calls')}
            observations={byStep('observations')}
            decisions={(trace.decisions || []).filter(item => (item.based_on_observation_ids || []).some(id => byStep('observations').some(obs => obs.id === id)))}
            validations={byStep('validations')}
            artifacts={(trace.artifacts || []).filter(item => selectedStep?.tool_name && artifactMatchesStep(item, selectedStep.tool_name))}
          />
          <Section title="전체 검증 요약" icon={<AlertTriangle size={16} />}>
            {trace.validations?.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {trace.validations.map(item => (
                  <div key={item.id} className={item.severity === 'blocking' ? 'banner-danger' : item.severity === 'warning' ? 'banner-warning' : 'card-compact'}>
                    <strong>{item.severity === 'blocking' ? '차단' : item.severity === 'warning' ? '주의' : '정보'}</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-2)' }}>{item.message}</p>
                  </div>
                ))}
              </div>
            ) : <p style={{ margin: 0, color: 'var(--text-label)' }}>검증 결과가 없습니다.</p>}
          </Section>
          <Section title="연결된 artifact" icon={<Box size={16} />}>
            {trace.artifacts?.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {trace.artifacts.map(item => (
                  <div key={item.id} className="card-compact">
                    <strong>{item.title}</strong> <StatusBadge status={item.status} />
                    <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>{item.artifact_type}</p>
                    {item.route && <Link to={item.route}><FileText size={14} /> 연결된 화면 열기</Link>}
                  </div>
                ))}
              </div>
            ) : <p style={{ margin: 0, color: 'var(--text-label)' }}>생성된 artifact가 없습니다.</p>}
          </Section>
          <Section title="trace 기준" icon={<CheckCircle2 size={16} />}>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
              이 화면은 저장된 Agent Run, plan step, tool_call, observation, decision, validation, artifact 레코드만 표시합니다.
              아직 실행되지 않은 단계는 planned 또는 unavailable 상태로 남깁니다.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function artifactMatchesStep(artifact, toolName) {
  const map = {
    data_profile_tool: 'dataset_profile',
    automl_training_tool: 'trained_model',
    evaluation_tool: 'evaluation_summary',
    shap_explainer_tool: 'explanation_summary',
    report_writer_tool: 'report',
    api_readiness_tool: 'api_readiness',
  }
  return map[toolName] === artifact.artifact_type
}
