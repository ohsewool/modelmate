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
  if (status === 'running') return '분석 중'
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
  return run?.user_goal || record?.user_goal || run?.goal_text || '저장된 분석 실행'
}

function TraceLink({ run, children = '상세 실행 기록 보기' }) {
  const runId = getRunId(run)
  if (!runId) {
    return (
      <button className="btn btn-secondary" type="button" disabled title="분석 실행 ID를 찾을 수 없습니다. 다시 생성해 주세요.">
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

function targetQualityNeedsReview(quality) {
  if (!quality) return false
  return quality.has_meaningful_target === false || quality.requires_review === true || quality.confidence === 'low'
}

function datasetRows(dataset) {
  return dataset?.row_count ?? dataset?.rows ?? '-'
}

function datasetColumns(dataset) {
  const columns = dataset?.column_count ?? dataset?.columns
  return Array.isArray(columns) ? columns.length : columns ?? '-'
}

function datasetColumnNames(dataset) {
  const columns = dataset?.column_names || dataset?.column_list || dataset?.columns_list || dataset?.quality_summary?.columns || dataset?.target_quality?.columns
  if (Array.isArray(columns)) return columns.map(String)
  if (Array.isArray(dataset?.columns)) return dataset.columns.map(String)
  return []
}

function candidateColumnName(candidate) {
  return candidate?.column_name || candidate?.name || candidate?.column || ''
}

function candidateBelongsToDataset(candidate, dataset) {
  const name = candidateColumnName(candidate)
  if (!name) return false
  const columns = datasetColumnNames(dataset)
  return !columns.length || columns.includes(String(name))
}

function selectedDatasetName(dataset) {
  return dataset?.filename || dataset?.original_filename || dataset?.name || '선택한 CSV'
}

function targetUsefulnessLabel(candidate) {
  if (!candidate) return '검토 필요'
  if (candidate.suitability === 'good') return '추천'
  if (candidate.suitability === 'warning') return '가능'
  if (candidate.suitability === 'poor') return '비추천'
  return candidate.usefulness_label || '검토 필요'
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

function SelectedCsvSummary({ dataset }) {
  if (!dataset) {
    return (
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} />
          <p className="section-title" style={{ margin: 0 }}>선택한 CSV</p>
        </div>
        <div className="empty-state" style={{ padding: 18 }}>
          <Database size={24} />
          <strong>아직 선택한 CSV가 없어요.</strong>
          <p>분석할 CSV를 먼저 골라 주세요.</p>
          <Link className="btn btn-primary" to="/upload?returnTo=agent-mode">CSV 올리기</Link>
        </div>
      </section>
    )
  }

  const target = datasetTarget(dataset)
  const quality = datasetTargetQuality(dataset)
  const weakTarget = targetQualityNeedsReview(quality)
  const hint = weakTarget
    ? '바로 예측할 만한 명확한 값은 검토가 필요합니다.'
    : target
      ? '예측 분석을 시작할 수 있는 CSV입니다.'
      : '예측값 후보를 확인한 뒤 분석을 시작하세요.'

  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 6 }}>선택한 CSV</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>{selectedDatasetName(dataset)}</h2>
        </div>
        <span className="status-pill">{weakTarget ? '예측값 검토 필요' : '분석 준비됨'}</span>
      </div>
      <div className="workspace-grid four-columns">
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>데이터 행</p>
          <strong>{datasetRows(dataset)}</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>컬럼</p>
          <strong>{datasetColumns(dataset)}</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>추천 예측값</p>
          <strong>{target || '검토 필요'}</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>데이터 상태</p>
          <strong>{weakTarget ? '주의 필요' : '사용 가능'}</strong>
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{hint}</p>
      <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
        상세 정보: 데이터 연결 {String(dataset.id || dataset.dataset_id || '').slice(0, 8) || '-'}
        {dataset.project_id ? ` · 프로젝트 ${String(dataset.project_id).slice(0, 8)}` : ''}
      </p>
    </section>
  )
}

function TargetRecommendationPanel({ dataset, onFocusGoal, onUseCandidate }) {
  const quality = datasetTargetQuality(dataset)
  const target = datasetTarget(dataset)
  const recommended = quality?.recommended || (target ? { column_name: target, suitability: 'good', usefulness_explanation: 'CSV 구조를 기준으로 추천된 예측값입니다.' } : null)
  const candidates = [
    ...(recommended?.column_name ? [recommended] : []),
    ...(quality?.candidates || quality?.candidate_targets || []),
  ].filter((item, index, arr) => {
    const name = candidateColumnName(item)
    return name && candidateBelongsToDataset(item, dataset) && arr.findIndex(other => candidateColumnName(other) === name) === index
  })
  const noMeaningfulTarget = quality?.has_meaningful_target === false || quality?.confidence === 'low' || (!target && dataset)
  const optionalCandidateRaw = quality?.optional_prediction_candidate || quality?.recommended
  const optionalCandidate = candidateBelongsToDataset(optionalCandidateRaw, dataset) ? optionalCandidateRaw : null

  if (!dataset) return null

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>예측할 값 확인</p>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          이 CSV에서 가장 먼저 검토할 예측값입니다.
        </p>
      </div>
      {noMeaningfulTarget ? (
        <div className="alert alert-warning" style={{ display: 'grid', gap: 10, margin: 0 }}>
          <strong>바로 예측할 만한 명확한 값을 찾기 어렵습니다.</strong>
          <span>{quality?.message || '예측보다 요약 보고서가 먼저일 수 있습니다.'}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" to="/reports">요약 보고서 만들기</Link>
            {optionalCandidate?.column_name && optionalCandidate?.inferred_task_type !== 'unsuitable' && (
              <button className="btn btn-secondary" type="button" onClick={() => onUseCandidate(optionalCandidate.column_name)}>
                {optionalCandidate.column_name} 예측하기
              </button>
            )}
            <button className="btn btn-secondary" type="button" onClick={onFocusGoal}>예측값 직접 선택</button>
            <button className="btn btn-secondary" type="button" onClick={onFocusGoal}>목표 다시 입력</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {candidates.slice(0, 1).map(candidate => (
            <div key={candidate.column_name} className="card-compact" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 20 }}>{candidate.column_name}</strong>
                <span className="status-pill">{targetUsefulnessLabel(candidate)}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {candidate.usefulness_explanation || candidate.reason || '예측 목적과 데이터 구조를 기준으로 검토한 후보입니다.'}
              </p>
            </div>
          ))}
          {candidates.length > 1 && (
            <details className="card-compact" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>다른 후보 보기</summary>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {candidates.slice(1, 4).map(candidate => (
                  <div key={candidate.column_name} style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{candidate.column_name}</strong>
                      <span className="status-pill">{targetUsefulnessLabel(candidate)}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.45 }}>
                      {candidate.usefulness_explanation || candidate.reason || '추가 후보입니다.'}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function DatasetSelector({ datasets, selectedDatasetId, onSelect, loading }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 4 }}>분석할 CSV 데이터셋</p>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>저장된 CSV를 선택하세요.</p>
        </div>
        <Link className="btn btn-secondary" to="/upload?returnTo=agent-mode"><Upload size={16} /> CSV 올리기</Link>
      </div>
      {loading ? (
        <p style={{ color: 'var(--text-label)' }}>저장된 데이터셋을 불러오는 중입니다.</p>
      ) : datasets.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {datasets.map(dataset => (
            (() => {
              const quality = datasetTargetQuality(dataset)
              const weakTarget = targetQualityNeedsReview(quality)
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
                {dataset.project_name ? `프로젝트: ${dataset.project_name}` : `상세 정보: 프로젝트 ${dataset.project_id ? String(dataset.project_id).slice(0, 8) : '연결 정보 없음'}`}
                {datasetTarget(dataset) ? ` · 추천 예측값: ${datasetTarget(dataset)}` : ' · 명확한 추천 예측값 없음'}
              </span>
              {weakTarget && (
                <span style={{ color: '#92400e', fontSize: 12 }}>
                  이 CSV에서는 바로 예측할 만한 명확한 값을 찾기 어렵습니다.
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
          <strong>아직 목표 기반 분석에 연결할 저장 데이터셋이 없습니다.</strong>
          <p>CSV를 먼저 올려 주세요.</p>
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

function AnalysisGoalCard({
  goalText,
  setGoalText,
  goalRef,
  placeholder,
  suggestedGoal,
  onUseSuggestion,
  mismatchWarning,
  mismatchChoice,
  onProceed,
  onEdit,
  targetPreference,
  setTargetPreference,
  selectedTargetUnclear,
  creating,
  canCreateRun,
  onCreate,
}) {
  return (
    <section className="card" style={{ display: 'grid', gap: 16 }}>
      <div>
        <p className="section-title">분석 목표 확인</p>
        <p style={{ margin: '0 0 10px', color: 'var(--text-2)', lineHeight: 1.6 }}>
          추천 목표를 확인하고 필요하면 한 문장으로 수정하세요.
        </p>
        <textarea
          ref={goalRef}
          value={goalText}
          onChange={event => {
            setGoalText(event.target.value)
          }}
          rows={4}
          style={{ width: '100%', resize: 'vertical' }}
          placeholder={placeholder}
        />
        {suggestedGoal && goalText !== suggestedGoal && (
          <button className="btn btn-secondary" type="button" onClick={onUseSuggestion} style={{ marginTop: 8 }}>
            추천 목표로 바꾸기
          </button>
        )}
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span className="section-title">예측값 컬럼</span>
        <input
          value={targetPreference}
          onChange={event => setTargetPreference(event.target.value)}
          placeholder="비워두면 추천 예측값을 사용합니다."
        />
      </label>

      <MismatchWarning
        warning={mismatchWarning}
        suggestedGoal={suggestedGoal}
        onUseSuggestion={onUseSuggestion}
        onProceed={onProceed}
        onEdit={onEdit}
      />
      {mismatchWarning && mismatchChoice === 'proceed' && (
        <div className="alert alert-warning" style={{ margin: 0 }}>
          기존 목표 그대로 진행합니다. 이 선택은 상세 실행 기록에 `goal_dataset_mismatch_warning`으로 기록됩니다.
        </div>
      )}
      {selectedTargetUnclear && (
        <div className="alert alert-warning" style={{ margin: 0 }}>
          추천 예측값이 명확하지 않아 분석 중 사용자 확인이 필요할 수 있습니다.
        </div>
      )}
      <button className="btn btn-primary" type="button" onClick={onCreate} disabled={creating || !canCreateRun}>
        <ListChecks size={16} /> {creating ? '준비 중' : '분석 시작'}
      </button>
    </section>
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
    if (selectedRun && getRunDatasetId(selectedRun) && String(getRunDatasetId(selectedRun)) !== String(selectedDatasetId)) {
      setSelectedRun(null)
    }
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
      setError(err.response?.data?.detail || '분석 실행 목록을 불러오지 못했습니다.')
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
      setError('분석을 시작하기 전에 CSV 데이터셋을 선택하거나 업로드하세요.')
      return
    }
    if (selectedTargetUnclear && !targetPreference.trim()) {
      setError('이 CSV는 예측값이 명확하지 않습니다. 요약 보고서를 먼저 보거나 예측할 값을 직접 선택해 주세요.')
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
      setError(err.response?.data?.detail || '분석 실행 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  async function executeRun(run = selectedRun) {
    const runId = getRunId(run)
    const datasetId = getRunDatasetId(run)
    const selectedId = selectedDataset?.dataset_id || selectedDataset?.id || selectedDatasetId
    const selectedProjectId = selectedDataset?.project_id || ''
    if (!runId) {
      setError('분석 실행 ID를 찾을 수 없습니다. 다시 생성해 주세요.')
      return
    }
    if (!datasetId) {
      setError('이 분석 실행에는 CSV 데이터셋이 연결되어 있지 않습니다. 새 분석 실행을 만들 때 데이터셋을 선택하세요.')
      return
    }
    if (selectedId && String(datasetId) !== String(selectedId)) {
      setSelectedRun(null)
      setError('분석 정보가 현재 CSV와 일치하지 않아 다시 불러옵니다. CSV를 다시 선택하거나 분석 실행을 새로 만들어 주세요.')
      return
    }
    if (selectedProjectId && getRunProjectId(run) && String(getRunProjectId(run)) !== String(selectedProjectId)) {
      setSelectedRun(null)
      setError('선택한 CSV와 분석 실행의 프로젝트가 일치하지 않습니다. CSV를 다시 선택해 주세요.')
      return
    }
    const columns = datasetColumnNames(selectedDataset)
    const selectedTarget = targetPreference.trim() || datasetTarget(selectedDataset)
    if (selectedTarget && columns.length && !columns.includes(selectedTarget)) {
      setError('선택한 예측값이 현재 CSV 컬럼과 일치하지 않습니다. 예측값을 다시 선택해 주세요.')
      return
    }
    setExecuting(true)
    setError('')
    try {
      const response = await api.post(`/agent-runs/${runId}/execute`)
      setSelectedRun(normalizeAgentRun(response.data, run, selectedDataset))
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || '분석 실행에 실패했습니다.')
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

  function updateGoalText(value) {
    setGoalText(value)
    setMismatchChoice('')
  }

  function usePredictionCandidate(columnName) {
    setTargetPreference(columnName)
    setGoalText(`이 CSV로 ${columnName} 값을 예측하고 중요한 요인을 보고서로 정리해줘.`)
    setMismatchChoice('')
    setError('')
    goalRef.current?.focus()
  }

  const selectedTargetUnclear = Boolean(selectedDataset && targetQualityNeedsReview(datasetTargetQuality(selectedDataset)))
  const canCreateRun = Boolean(selectedDatasetId && goalText.trim() && (!selectedTargetUnclear || targetPreference.trim()))
  const placeholder = suggestedGoal || '예: 이 CSV로 당뇨병 여부를 예측하고 중요한 요인을 보고서로 정리해줘.'
  const selectedRunStatus = getRunStatus(selectedRun)
  const executionStarted = Boolean(selectedRun && selectedRunStatus && selectedRunStatus !== 'planned')
  const setupVisible = !executionStarted
  const visibleRuns = selectedDatasetId
    ? runs.filter(run => String(getRunDatasetId(run) || '') === String(selectedDatasetId))
    : runs

  return (
    <main className="workspace-page" style={{ display: 'grid', gap: 20 }}>
      <header className="workspace-hero" style={{ flexDirection: 'column' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow">목표 기반 분석</p>
            <h1>CSV로 예측 목표를 정하고 분석을 시작하세요</h1>
            <p>
              CSV 선택 → 목표 확인 → 분석 실행
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link className="btn btn-secondary" to="/upload?returnTo=agent-mode"><Upload size={16} /> CSV 올리기</Link>
            <Link className="btn btn-secondary" to="/agent">빠른 자동 분석 시작</Link>
          </div>
        </div>
        <div className="workspace-grid four-columns" style={{ width: '100%' }}>
          {['CSV 선택', '예측값 추천', '분석 실행', '결과 확인'].map((step, index) => (
            <div key={step} className="card-compact" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 900 }}>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </header>

      <details className="card" style={{ padding: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 850 }}>목표 기반 분석은 어떻게 작동하나요?</summary>
        <p style={{ margin: '10px 0 0', color: 'var(--text-2)', lineHeight: 1.6 }}>
          데이터 확인 → 목표 정리 → 모델 비교 → 결과 검토 → 보고서 준비 순서로 진행합니다.
        </p>
      </details>

      {error && <div className="alert alert-warning"><ShieldAlert size={16} /> {error}</div>}

      <div className={selectedDataset ? 'workspace-grid two-columns' : ''}>
        <SelectedCsvSummary dataset={selectedDataset} />
        {!selectedDataset && (
          <DatasetSelector
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelect={selectDataset}
            loading={datasetLoading}
          />
        )}
      </div>

      {selectedDataset && setupVisible && (
        <div className="workspace-grid two-columns">
          <TargetRecommendationPanel dataset={selectedDataset} onFocusGoal={editGoal} onUseCandidate={usePredictionCandidate} />
          <AnalysisGoalCard
            goalText={goalText}
            setGoalText={updateGoalText}
            goalRef={goalRef}
            placeholder={placeholder}
            suggestedGoal={suggestedGoal}
            onUseSuggestion={useSuggestedGoal}
            mismatchWarning={mismatchWarning}
            mismatchChoice={mismatchChoice}
            onProceed={proceedWithMismatch}
            onEdit={editGoal}
            targetPreference={targetPreference}
            setTargetPreference={setTargetPreference}
            selectedTargetUnclear={selectedTargetUnclear}
            creating={creating}
            canCreateRun={canCreateRun}
            onCreate={createRun}
          />
        </div>
      )}

      {selectedDataset && setupVisible && (
        <details className="card" style={{ padding: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 850 }}>다른 CSV 선택</summary>
          <div style={{ marginTop: 12 }}>
            <DatasetSelector
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelect={selectDataset}
              loading={datasetLoading}
            />
          </div>
        </details>
      )}

      {selectedRun && (
        <div className="workspace-grid two-columns">
          <ScopePanel interpreted={selectedRun.interpreted_goal} />
          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <p className="section-title">분석 실행 상태</p>
            <strong>{statusLabel(getRunStatus(selectedRun))}</strong>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>
              {selectedRunStatus === 'running'
                ? '분석을 실행하고 있습니다. 완료되면 결과와 상세 실행 기록을 확인할 수 있습니다.'
                : ['completed', 'succeeded', 'success'].includes(selectedRunStatus)
                  ? '분석이 완료되었습니다. 결과 보고서와 예측 API 준비 상태를 확인해 보세요.'
                  : selectedRunStatus === 'waiting_for_review'
                    ? '사용자 확인이 필요한 단계에서 멈췄습니다. 상세 실행 기록에서 확인 항목을 볼 수 있습니다.'
                    : '분석 계획이 준비되었습니다. 실행을 시작하면 상세 기록이 남습니다.'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
              데이터 연결: {getRunDatasetId(selectedRun) ? String(getRunDatasetId(selectedRun)).slice(0, 8) : '연결되지 않음'}
              {getRunId(selectedRun) ? ` · 실행 ${String(getRunId(selectedRun)).slice(0, 8)}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!['completed', 'succeeded', 'success'].includes(selectedRunStatus) && (
                <button className="btn btn-primary" type="button" onClick={() => executeRun(selectedRun)} disabled={executing || !getRunDatasetId(selectedRun) || !getRunId(selectedRun)}>
                  <CheckCircle2 size={16} /> {executing ? '분석 중' : '분석 시작'}
                </button>
              )}
              <TraceLink run={selectedRun} />
              {['completed', 'succeeded', 'success'].includes(selectedRunStatus) && (
                <>
                  <Link className="btn btn-secondary" to="/reports">보고서 보기</Link>
                  <Link className="btn btn-secondary" to="/prediction-apis">예측 API 확인</Link>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedRun?.plan && <PlanPreview plan={selectedRun.plan} />}

      <details className="card" style={{ padding: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 850 }}>
          <Clock3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          최근 실행 기록 보기
        </summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {loading ? (
            <p style={{ color: 'var(--text-label)' }}>불러오는 중입니다.</p>
          ) : visibleRuns.length ? visibleRuns.map(run => (
            <div key={getRunId(run) || run.created_at} className="card-compact" style={{ display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{runTitle(run)}</strong>
                <span className="status-pill">{statusLabel(getRunStatus(run))}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                데이터 연결: {getRunDatasetId(run) ? String(getRunDatasetId(run)).slice(0, 8) : '연결되지 않음'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedRun(run)}>계획 보기</button>
                <TraceLink run={run} />
              </div>
            </div>
          )) : (
            <p style={{ color: 'var(--text-label)' }}>아직 분석 실행이 없습니다.</p>
          )}
        </div>
      </details>
    </main>
  )
}
