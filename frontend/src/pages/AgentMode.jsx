import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, Database, ListChecks, ShieldAlert, Upload } from 'lucide-react'
import api from '../api'

const EXAMPLE_GOAL = '이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.'

function statusLabel(status) {
  if (status === 'supported') return '지원 가능'
  if (status === 'limited') return '제한적 지원'
  if (status === 'unsupported') return '지원 범위 밖'
  if (status === 'completed') return '완료'
  if (status === 'waiting_for_review') return '검토 필요'
  if (status === 'running') return '실행 중'
  if (status === 'failed') return '실패'
  if (status === 'blocked') return '차단'
  if (status === 'planned') return '계획됨'
  return '확인 필요'
}

function runTitle(run) {
  return run?.user_goal || run?.goal_text || '저장된 Agent Run'
}

function datasetTitle(dataset) {
  if (!dataset) return '선택한 데이터셋 없음'
  const rows = dataset.row_count ?? dataset.rows
  const cols = dataset.column_count ?? dataset.columns
  return `${dataset.filename || dataset.original_filename || dataset.dataset_id} · ${rows ?? '-'}행 / ${cols ?? '-'}컬럼`
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
              <span className="status-pill">{step.status || 'planned'}</span>
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
        <Link className="btn btn-secondary" to="/upload"><Upload size={16} /> CSV 업로드하고 시작하기</Link>
      </div>
      {loading ? (
        <p style={{ color: 'var(--text-label)' }}>저장된 데이터셋을 불러오는 중입니다.</p>
      ) : datasets.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {datasets.map(dataset => (
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
                {dataset.target_col ? ` · 추천 타깃: ${dataset.target_col}` : ''}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: 18 }}>
          <Database size={24} />
          <strong>아직 Agent Mode에 연결할 저장 데이터셋이 없습니다.</strong>
          <p>CSV를 먼저 업로드하거나 기존 빠른 자동 분석을 완료한 뒤 다시 실행하세요.</p>
          <Link className="btn btn-primary" to="/upload">CSV 업로드</Link>
        </div>
      )}
    </section>
  )
}

export default function AgentMode() {
  const [goalText, setGoalText] = useState(EXAMPLE_GOAL)
  const [targetPreference, setTargetPreference] = useState('')
  const [runs, setRuns] = useState([])
  const [datasets, setDatasets] = useState([])
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [selectedRun, setSelectedRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [datasetLoading, setDatasetLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  const selectedDataset = useMemo(
    () => datasets.find(dataset => (dataset.id || dataset.dataset_id) === selectedDatasetId),
    [datasets, selectedDatasetId],
  )

  useEffect(() => {
    loadRuns()
    loadDatasets()
  }, [])

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
      const items = response.data?.datasets || []
      setDatasets(items)
      if (!selectedDatasetId && items.length) {
        setSelectedDatasetId(items[0].id || items[0].dataset_id)
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
    setCreating(true)
    try {
      const response = await api.post('/agent-runs', {
        goal_text: goalText.trim(),
        target_preference: targetPreference.trim() || selectedDataset?.target_col || null,
        dataset_id: selectedDatasetId,
        project_id: selectedDataset?.project_id || null,
      })
      setSelectedRun(response.data)
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  async function executeRun(run = selectedRun) {
    if (!run?.analysis_run_id) return
    if (!run.dataset_id) {
      setError('이 Agent Run에는 CSV 데이터셋이 연결되어 있지 않습니다. 새 Run을 만들 때 데이터셋을 선택하세요.')
      return
    }
    setExecuting(true)
    setError('')
    try {
      const response = await api.post(`/agent-runs/${run.analysis_run_id}/execute`)
      setSelectedRun(response.data)
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run 실행에 실패했습니다.')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <main className="workspace-page" style={{ display: 'grid', gap: 20 }}>
      <header className="workspace-hero">
        <div>
          <p className="eyebrow">Agent Mode</p>
          <h1>분석 목표부터 시작하기</h1>
          <p>
            사용자가 원하는 예측 목표를 먼저 입력하면 ModelMate가 분석 계획을 만들고,
            CSV 데이터셋에 연결된 실행 trace를 순서대로 남깁니다.
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
              value={goalText}
              onChange={event => setGoalText(event.target.value)}
              rows={5}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="예: 고객 이탈 가능성을 예측하고, 중요한 요인을 보고서로 정리해줘."
            />
          </div>
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
          onSelect={setSelectedDatasetId}
          loading={datasetLoading}
        />
      </div>

      {selectedRun && (
        <div className="workspace-grid two-columns">
          <ScopePanel interpreted={selectedRun.interpreted_goal} />
          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <p className="section-title">Run 상태</p>
            <strong>{statusLabel(selectedRun.status)}</strong>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>
              데이터 연결: {selectedRun.dataset_id ? selectedRun.dataset_id : '연결되지 않음'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={() => executeRun(selectedRun)} disabled={executing || !selectedRun.dataset_id}>
                <CheckCircle2 size={16} /> {executing ? '실행 중' : '계획 실행'}
              </button>
              <Link className="btn btn-secondary" to={`/agent-mode/${selectedRun.analysis_run_id}`}>Trace 보기</Link>
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
              <div key={run.analysis_run_id} className="card-compact" style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>{runTitle(run)}</strong>
                  <span className="status-pill">{statusLabel(run.status)}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                  데이터셋: {run.dataset_id || '연결되지 않음'} · 프로젝트: {run.project_id || '없음'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedRun(run)}>계획 보기</button>
                  <Link className="btn btn-secondary" to={`/agent-mode/${run.analysis_run_id}`}>Trace 보기</Link>
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
