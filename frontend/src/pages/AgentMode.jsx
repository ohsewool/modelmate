import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock3, Database, ListChecks, ShieldAlert, Upload } from 'lucide-react'
import api from '../api'

const STALE_CHURN_GOAL = '이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.'

function statusLabel(status) {
  if (status === 'supported') return '지원 가능'
  if (status === 'limited') return '제한적 지원'
  if (status === 'unsupported') return '지원 범위 밖'
  if (['completed', 'succeeded', 'success'].includes(status)) return '분석 완료'
  if (status === 'waiting_for_review') return '확인 필요'
  if (status === 'running') return '실행 중'
  if (status === 'failed') return '실패'
  if (status === 'blocked') return '사용자 확인 필요'
  if (status === 'planned') return '실행 예정'
  return '확인 필요'
}

function getRunRecord(run) {
  return run?.agent_run || run?.analysis_run || run?.run || run || {}
}

function getRunId(run) {
  const record = getRunRecord(run)
  return run?.agent_run_id || run?.analysis_run_id || record?.agent_run_id || record?.analysis_run_id || record?.id || run?.id || ''
}

function getRunStatus(run) {
  const record = getRunRecord(run)
  return run?.status || record?.status || ''
}

function getRunDatasetId(run) {
  const record = getRunRecord(run)
  return run?.dataset_id || record?.dataset_id || ''
}

function getRunProjectId(run) {
  const record = getRunRecord(run)
  return run?.project_id || record?.project_id || ''
}

function normalizeAgentRun(payload, previousRun = null, selectedDataset = null) {
  const next = payload || {}
  const nextRecord = getRunRecord(next)
  const previousRecord = getRunRecord(previousRun)
  const runId = getRunId(next) || getRunId(previousRun)
  const datasetId = getRunDatasetId(next) || getRunDatasetId(previousRun) || selectedDataset?.dataset_id || selectedDataset?.id || ''
  const projectId = getRunProjectId(next) || getRunProjectId(previousRun) || selectedDataset?.project_id || ''
  return {
    ...(previousRun || {}),
    ...next,
    agent_run_id: next.agent_run_id || runId,
    analysis_run_id: next.analysis_run_id || runId,
    id: next.id || runId,
    status: next.status || nextRecord.status || previousRun?.status || previousRecord.status,
    dataset_id: datasetId,
    project_id: projectId,
    user_goal: next.user_goal || nextRecord.user_goal || previousRun?.user_goal || previousRecord.user_goal,
    interpreted_goal: next.interpreted_goal || nextRecord.interpreted_goal || previousRun?.interpreted_goal || previousRecord.interpreted_goal,
    plan: next.plan || previousRun?.plan,
  }
}

function runTitle(run) {
  const record = getRunRecord(run)
  return run?.user_goal || record?.user_goal || run?.goal_text || '저장된 Agent Run'
}

function TraceLink({ run, children = 'Trace 보기' }) {
  const runId = getRunId(run)
  if (!runId) {
    return (
      <button className="btn btn-secondary" type="button" disabled title="Agent Run ID를 찾을 수 없습니다. 다시 생성해 주세요.">
        {children}
      </button>
    )
  }
  return <Link className="btn btn-secondary" to={`/agent-mode/${runId}`}>{children}</Link>
}

function datasetTitle(dataset) {
  if (!dataset) return '선택한 데이터셋 없음'
  const rows = dataset.row_count ?? dataset.rows
  const cols = dataset.column_count ?? dataset.columns
  return `${dataset.filename || dataset.original_filename || dataset.dataset_id} · ${rows ?? '-'}행 / ${cols ?? '-'}컬럼`
}

function datasetTarget(dataset) {
  const targetQuality = dataset?.target_quality || dataset?.quality_summary?.target_quality
  if (targetQuality && targetQuality.has_meaningful_target === false) return ''
  return dataset?.target_col || dataset?.recommended_target || dataset?.target_column || ''
}

function datasetTargetQuality(dataset) {
  return dataset?.target_quality || dataset?.quality_summary?.target_quality || null
}

function datasetSignature(dataset) {
  const target = datasetTarget(dataset)
  const filename = dataset?.filename || dataset?.original_filename || ''
  const domain = dataset?.dataset_domain || dataset?.domain || dataset?.category || ''
  const columns = Array.isArray(dataset?.columns) ? dataset.columns.join(' ') : ''
  return `${target} ${filename} ${domain} ${columns}`.toLowerCase()
}

function suggestedGoalForDataset(dataset) {
  const target = datasetTarget(dataset)
  const targetLower = String(target || '').toLowerCase()
  const signature = datasetSignature(dataset)

  if (targetLower === 'outcome' || signature.includes('diabetes') || signature.includes('glucose') || signature.includes('bmi')) {
    return '이 CSV로 당뇨병 여부를 예측하고 중요한 요인을 보고서로 정리해줘.'
  }
  if (['churn', 'churned', 'is_churn'].some(token => targetLower.includes(token) || signature.includes(token))) {
    return '이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.'
  }
  if (['failure', 'defect', 'fault', 'failure_risk'].some(token => targetLower.includes(token) || signature.includes(token))) {
    return '이 CSV로 고장 또는 불량 위험을 예측하고 중요한 요인을 보고서로 정리해줘.'
  }
  if (['price', 'sales', 'revenue', 'demand'].some(token => targetLower.includes(token))) {
    return `이 CSV로 ${target} 값을 예측하고 중요한 요인을 보고서로 정리해줘.`
  }
  if (target) {
    return `이 CSV로 ${target}을 예측하고 중요한 요인을 보고서로 정리해줘.`
  }
  return '이 CSV를 먼저 요약하고, 예측할 만한 타깃 후보를 함께 검토해줘.'
}

function isChurnGoal(goal) {
  const value = String(goal || '').toLowerCase()
  return value.includes('고객 이탈') || value.includes('이탈') || value.includes('churn')
}

function isDiabetesDataset(dataset) {
  const signature = datasetSignature(dataset)
  return signature.includes('diabetes') || signature.includes('outcome') || signature.includes('glucose') || signature.includes('bmi')
}

function goalDatasetMismatch(goal, dataset) {
  if (!goal?.trim() || !dataset) return null
  if (isChurnGoal(goal) && isDiabetesDataset(dataset)) {
    return {
      code: 'goal_dataset_mismatch_warning',
      title: '입력한 분석 목표와 CSV 데이터 내용이 맞지 않을 수 있습니다.',
      description: '현재 CSV는 당뇨병 여부 예측 데이터로 보입니다. 고객 이탈 예측 대신 당뇨병 여부 예측으로 진행할까요?',
    }
  }
  return null
}

function ScopePanel({ interpreted }) {
  if (!interpreted) return null
  const tone = interpreted.supported_status === 'unsupported' ? '#991b1b' : interpreted.supported_status === 'limited' ? '#92400e' : '#047857'
  return (
    <section className="card" style={{ borderColor: interpreted.supported_status === 'unsupported' ? '#fecaca' : 'var(--border)' }}>
      <p className="section-title">지원 범위 판단</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: tone }}>{statusLabel(interpreted.supported_status)}</strong>
        <span style={{ color: 'var(--text-2)' }}>{interpreted.report_framing}</span>
      </div>
      {interpreted.unsupported_reason && <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{interpreted.unsupported_reason}</p>}
      {interpreted.planner && (
        <p style={{ color: 'var(--text-label)', fontSize: 12, marginBottom: 0 }}>
          계획 방식: {interpreted.planner.planner_type === 'llm_assisted' ? 'LLM 보조' : '기본 규칙 기반'}
          {interpreted.planner.fallback_reason ? ` · fallback: ${interpreted.planner.fallback_reason}` : ''}
        </p>
      )}
      {interpreted.warnings?.length > 0 && (
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--text-2)' }}>
          {interpreted.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      )}
    </section>
  )
}

function PlanPreview({ plan }) {
  if (!plan?.steps?.length) return null
  return (
    <section className="card">
      <p className="section-title">생성된 분석 계획</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {plan.steps.map(step => (
          <div key={step.plan_step_id || step.order} className="card-compact" style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong>{step.order}. {step.name}</strong>
              <span className="status-pill">{statusLabel(step.status || 'planned')}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>{step.purpose}</p>
            <span style={{ color: 'var(--text-label)', fontSize: 12 }}>사용 도구: {step.tool_name || '미정'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function DatasetSelector({ datasets, selectedDatasetId, onSelect, loading }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 4 }}>분석할 CSV 데이터셋</p>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>Agent Mode는 저장된 CSV 데이터셋을 기준으로 계획과 실행 trace를 남깁니다.</p>
        </div>
        <Link className="btn btn-secondary" to="/upload?returnTo=agent-mode"><Upload size={16} /> CSV 업로드하고 시작하기</Link>
      </div>
      {loading ? (
        <p style={{ color: 'var(--text-label)' }}>저장된 데이터셋을 불러오는 중입니다.</p>
      ) : datasets.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {datasets.map(dataset => (
            (() => {
              const quality = datasetTargetQuality(dataset)
              const weakTarget = quality && quality.has_meaningful_target === false
              return (
            <button
              key={dataset.id || dataset.dataset_id}
              type="button"
              onClick={() => onSelect(dataset.id || dataset.dataset_id)}
              className="card-compact"
              style={{
                textAlign: 'left',
                borderColor: selectedDatasetId === (dataset.id || dataset.dataset_id) ? '#2563eb' : 'var(--border)',
                display: 'grid',
                gap: 5,
              }}
            >
              <strong>{datasetTitle(dataset)}</strong>
              <span style={{ color: 'var(--text-label)', fontSize: 12 }}>
                프로젝트: {dataset.project_name || dataset.project_id || '연결 정보 없음'}
                {datasetTarget(dataset) ? ` · 추천 타깃: ${datasetTarget(dataset)}` : ' · 명확한 추천 타깃 없음'}
              </span>
              {weakTarget && (
                <span style={{ color: '#92400e', fontSize: 12 }}>
                  이 CSV에서는 바로 예측할 만한 명확한 타깃을 찾기 어렵습니다.
                </span>
              )}
            </button>
              )
            })()
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: 18 }}>
          <Database size={24} />
          <strong>아직 Agent Mode에 연결할 저장 데이터셋이 없습니다.</strong>
          <p>CSV를 먼저 업로드하거나 기존 빠른 자동 분석을 완료한 뒤 다시 실행하세요.</p>
          <Link className="btn btn-primary" to="/upload?returnTo=agent-mode">CSV 업로드</Link>
        </div>
      )}
    </section>
  )
}

function MismatchWarning({ warning, suggestedGoal, onUseSuggestion, onProceed, onEdit }) {
  if (!warning) return null
  return (
    <div className="alert alert-warning" style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={18} />
        <div>
          <strong>{warning.title}</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.6 }}>{warning.description}</p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>추천 목표: {suggestedGoal}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="button" onClick={onUseSuggestion}>당뇨병 여부 예측으로 변경</button>
        <button className="btn btn-secondary" type="button" onClick={onProceed}>기존 목표 그대로 진행</button>
        <button className="btn btn-secondary" type="button" onClick={onEdit}>목표 직접 수정</button>
      </div>
    </div>
  )
}

export default function AgentMode() {
  const queryParams = new URLSearchParams(window.location.search)
  const requestedDatasetId = queryParams.get('dataset_id') || ''
  const [goalText, setGoalText] = useState('')
  const [lastSuggestedGoal, setLastSuggestedGoal] = useState('')
  const [targetPreference, setTargetPreference] = useState('')
  const [runs, setRuns] = useState([])
  const [datasets, setDatasets] = useState([])
  const [selectedDatasetId, setSelectedDatasetId] = useState(requestedDatasetId)
  const [selectedRun, setSelectedRun] = useState(null)
  const [mismatchChoice, setMismatchChoice] = useState('')
  const [loading, setLoading] = useState(true)
  const [datasetLoading, setDatasetLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')
  const goalRef = useRef(null)

  const selectedDataset = useMemo(
    () => datasets.find(dataset => (dataset.id || dataset.dataset_id) === selectedDatasetId),
    [datasets, selectedDatasetId],
  )
  const suggestedGoal = useMemo(() => suggestedGoalForDataset(selectedDataset), [selectedDataset])
  const mismatchWarning = useMemo(() => goalDatasetMismatch(goalText, selectedDataset), [goalText, selectedDataset])

  useEffect(() => {
    loadRuns()
    loadDatasets()
  }, [])

  useEffect(() => {
    if (!selectedDataset) return
    const shouldReplace =
      !goalText.trim() ||
      goalText === lastSuggestedGoal ||
      goalText === STALE_CHURN_GOAL
    if (shouldReplace) {
      setGoalText(suggestedGoal)
      setLastSuggestedGoal(suggestedGoal)
    }
    setTargetPreference(datasetTarget(selectedDataset) || '')
    setMismatchChoice('')
  }, [selectedDatasetId, selectedDataset, suggestedGoal])

  function selectDataset(datasetId) {
    setSelectedDatasetId(datasetId)
    setSelectedRun(null)
    setError('')
  }

  async function loadRuns() {
    setLoading(true)
    try {
      const response = await api.get('/agent-runs')
      setRuns(response.data?.runs || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function loadDatasets() {
    setDatasetLoading(true)
    try {
      const response = await api.get('/datasets')
      const items = Array.isArray(response.data) ? response.data : (response.data?.datasets || [])
      setDatasets(items)
      const ids = items.map(dataset => dataset.id || dataset.dataset_id)
      if (requestedDatasetId && ids.includes(requestedDatasetId)) {
        setSelectedDatasetId(requestedDatasetId)
      } else if (!selectedDatasetId && items.length) {
        setSelectedDatasetId(ids[0])
      }
    } catch (err) {
      setDatasets([])
    } finally {
      setDatasetLoading(false)
    }
  }

  async function createRun() {
    setError('')
    if (!goalText.trim()) {
      setError('먼저 분석 목표를 입력하세요.')
      return
    }
    if (!selectedDatasetId) {
      setError('Agent 실행 전에 CSV 데이터셋을 선택하거나 업로드하세요.')
      return
    }
    if (mismatchWarning && mismatchChoice !== 'proceed') {
      setError('분석 목표와 CSV 내용이 맞지 않을 수 있습니다. 추천 목표로 변경하거나 기존 목표 그대로 진행을 선택해 주세요.')
      return
    }
    setCreating(true)
    try {
      const response = await api.post('/agent-runs', {
        goal_text: goalText.trim(),
        target_preference: targetPreference.trim() || datasetTarget(selectedDataset) || null,
        dataset_id: selectedDatasetId,
        project_id: selectedDataset?.project_id || null,
        goal_dataset_warning: Boolean(mismatchWarning && mismatchChoice === 'proceed'),
        mismatch_warning: mismatchWarning?.description || null,
      })
      setSelectedRun(normalizeAgentRun(response.data, null, selectedDataset))
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  async function executeRun(run = selectedRun) {
    const runId = getRunId(run)
    const datasetId = getRunDatasetId(run)
    if (!runId) {
      setError('Agent Run ID를 찾을 수 없습니다. 다시 생성해 주세요.')
      return
    }
    if (!datasetId) {
      setError('이 Agent Run에는 CSV 데이터셋이 연결되어 있지 않습니다. 새 Run을 만들 때 데이터셋을 선택하세요.')
      return
    }
    setExecuting(true)
    setError('')
    try {
      const response = await api.post(`/agent-runs/${runId}/execute`)
      setSelectedRun(normalizeAgentRun(response.data, run, selectedDataset))
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run 실행에 실패했습니다.')
    } finally {
      setExecuting(false)
    }
  }

  function useSuggestedGoal() {
    setGoalText(suggestedGoal)
    setLastSuggestedGoal(suggestedGoal)
    setMismatchChoice('corrected')
    setError('')
  }

  function proceedWithMismatch() {
    setMismatchChoice('proceed')
    setError('')
  }

  function editGoal() {
    setMismatchChoice('')
    goalRef.current?.focus()
  }

  const placeholder = suggestedGoal || '예: 이 CSV로 당뇨병 여부를 예측하고 중요한 요인을 보고서로 정리해줘.'

  return (
    <main className="workspace-page" style={{ display: 'grid', gap: 20 }}>
      <header className="workspace-hero">
        <div>
          <p className="eyebrow">Agent Mode</p>
          <h1>분석 목표부터 시작하기</h1>
          <p>
            사용자가 원하는 예측 목표를 먼저 입력하면 ModelMate가 선택된 CSV에 맞는 분석 계획을 만들고,
            실행 trace를 순서대로 남깁니다.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/agent">빠른 자동 분석으로 이동</Link>
      </header>

      {error && <div className="alert alert-warning"><ShieldAlert size={16} /> {error}</div>}

      <div className="workspace-grid two-columns">
        <section className="card" style={{ display: 'grid', gap: 16 }}>
          <div>
            <p className="section-title">1. 분석 목표</p>
            <textarea
              ref={goalRef}
              value={goalText}
              onChange={event => {
                setGoalText(event.target.value)
                setMismatchChoice('')
              }}
              rows={5}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder={placeholder}
            />
            <p style={{ margin: '8px 0 0', color: 'var(--text-label)', fontSize: 12 }}>
              선택한 CSV 기준 추천 목표: {suggestedGoal}
            </p>
          </div>
          <MismatchWarning
            warning={mismatchWarning}
            suggestedGoal={suggestedGoal}
            onUseSuggestion={useSuggestedGoal}
            onProceed={proceedWithMismatch}
            onEdit={editGoal}
          />
          {mismatchWarning && mismatchChoice === 'proceed' && (
            <div className="alert alert-warning" style={{ margin: 0 }}>
              기존 목표 그대로 진행합니다. 이 선택은 Agent trace에 `goal_dataset_mismatch_warning`으로 기록됩니다.
            </div>
          )}
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="section-title">선호 타깃 컬럼</span>
            <input
              value={targetPreference}
              onChange={event => setTargetPreference(event.target.value)}
              placeholder="선택 사항입니다. 비워두면 데이터셋 추천 타깃을 사용합니다."
            />
          </label>
          <button className="btn btn-primary" type="button" onClick={createRun} disabled={creating || !selectedDatasetId}>
            <ListChecks size={16} /> {creating ? '계획 생성 중' : 'Agent Run 만들기'}
          </button>
        </section>

        <DatasetSelector
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelect={selectDataset}
          loading={datasetLoading}
        />
      </div>

      {selectedRun && (
        <div className="workspace-grid two-columns">
          <ScopePanel interpreted={selectedRun.interpreted_goal} />
          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <p className="section-title">Run 상태</p>
            <strong>{statusLabel(getRunStatus(selectedRun))}</strong>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>
              데이터 연결: {getRunDatasetId(selectedRun) || '연결되지 않음'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
              Agent Run ID: {getRunId(selectedRun) || 'Agent Run ID를 찾을 수 없습니다. 다시 생성해 주세요.'}
              {getRunProjectId(selectedRun) ? ` · Project ID: ${getRunProjectId(selectedRun)}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={() => executeRun(selectedRun)} disabled={executing || !getRunDatasetId(selectedRun) || !getRunId(selectedRun)}>
                <CheckCircle2 size={16} /> {executing ? '실행 중' : '계획 실행'}
              </button>
              <TraceLink run={selectedRun} />
            </div>
          </section>
        </div>
      )}

      {selectedRun?.plan && <PlanPreview plan={selectedRun.plan} />}

      <section className="card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock3 size={18} />
          <p className="section-title" style={{ margin: 0 }}>최근 Agent Run</p>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-label)' }}>불러오는 중입니다.</p>
        ) : runs.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {runs.map(run => (
              <div key={getRunId(run) || run.created_at} className="card-compact" style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>{runTitle(run)}</strong>
                  <span className="status-pill">{statusLabel(getRunStatus(run))}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                  데이터셋: {getRunDatasetId(run) || '연결되지 않음'} · 프로젝트: {getRunProjectId(run) || '없음'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedRun(run)}>계획 보기</button>
                  <TraceLink run={run} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-label)' }}>아직 Agent Run이 없습니다.</p>
        )}
      </section>
    </main>
  )
}
