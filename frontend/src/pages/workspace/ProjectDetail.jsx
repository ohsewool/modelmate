import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, FileText, KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import api from '../../api'
import { CopyButton, EmptyState, ErrorState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { datasetDisplayName, fmt, formatTimestamp, projectDatasetName, projectTarget, runTypeLabel, taskTypeLabel } from './workspaceData'
import {
  PROJECT_TABS,
  activeDataset,
  datasetForRun,
  latestReport,
  latestRun,
  loadProjectDetail,
  makeRunTimeline,
  projectMetric,
  projectPrimaryAction,
  projectSummaryText,
  runMetric,
  runIdentityWarning,
} from './projectDetailData'

function Stat({ label, value }) {
  return (
    <div className="card-compact">
      <p style={{ margin: '0 0 5px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
      <strong>{fmt(value)}</strong>
    </div>
  )
}

function ProjectTabs({ active, onChange }) {
  return (
    <div className="tab-bar" role="tablist" aria-label="프로젝트 섹션" style={{ flexWrap: 'wrap', marginBottom: 18 }}>
      {PROJECT_TABS.map(tab => (
        <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)} className={`tab-item ${active === tab.id ? 'tab-item-active' : 'tab-item-inactive'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function Timeline({ items }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map(item => (
        <div key={item.name} className="card-compact" style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong>{item.name}</strong>
            <StatusBadge status={item.status} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{item.observation}</p>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>판단: {item.decision}</p>
          {item.error && <div className="banner-danger"><AlertTriangle size={15} /><p style={{ margin: 0, fontSize: 13 }}>{item.error}</p></div>}
          {item.timestamp && <span style={{ color: 'var(--text-label)', fontSize: 11 }}>{item.timestamp}</span>}
        </div>
      ))}
    </div>
  )
}

function FailurePanel({ run, project, onRerun }) {
  const dataset = datasetForRun(project, run)
  const deleted = dataset?.deleted_at || dataset?.delete_status === 'deleted'
  if (!run || (run.status !== 'failed' && !deleted)) return null
  const title = deleted ? '연결된 데이터셋이 삭제되어 다시 실행할 수 없습니다.' : '분석을 완료하지 못했습니다.'
  const cause = deleted ? '원본 CSV가 필요한 재실행과 예측 API 사용이 제한됩니다.' : (run.failure_message || '데이터 형식이나 타깃 컬럼을 확인한 뒤 다시 실행하세요.')
  const idText = [run.error_id && `오류 ID: ${run.error_id}`, run.request_id && `request ID: ${run.request_id}`].filter(Boolean).join(' / ')
  return (
    <section className="card" style={{ display: 'grid', gap: 12, borderColor: '#fecdd3' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <AlertTriangle size={18} color="#dc2626" />
        <strong>{title}</strong>
      </div>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{cause}</p>
      {idText && <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{idText}</p>}
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>기술 정보 보기</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 10, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)' }}>{run.failure_message || '저장된 기술 상세 정보가 없습니다.'}</pre>
      </details>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" type="button" disabled={deleted || !run.can_rerun} onClick={onRerun}><RefreshCw size={15} /> 다시 실행</button>
        <Link className="btn-secondary" to="/new">새 데이터셋 업로드</Link>
        <CopyButton value={idText} label="오류 정보 복사" />
      </div>
    </section>
  )
}

export default function ProjectDetail() {
  const { projectId } = useParams()
  const nav = useNavigate()
  const [search, setSearch] = useSearchParams()
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [message, setMessage] = useState('')
  const tab = search.get('tab') || 'overview'
  const requestedRunId = search.get('run_id') || ''

  async function reload() {
    setState({ loading: true, error: '', data: null })
    try {
      setState({ loading: false, error: '', data: await loadProjectDetail(projectId) })
    } catch (err) {
      const status = err.response?.status
      const msg = status === 401 ? '로그인이 필요합니다.' : status === 403 || status === 404 ? '이 프로젝트를 볼 수 없습니다.' : '프로젝트 정보를 불러오지 못했습니다.'
      setState({ loading: false, error: msg, data: null })
    }
  }

  useEffect(() => { reload() }, [projectId])

  const data = state.data
  const project = data?.project
  const dataset = project ? activeDataset(project) : null
  const run = project ? latestRun(project) : null
  const report = project
    ? (requestedRunId ? (project.available_reports || []).find(item => item.analysis_run_id === requestedRunId) : latestReport(project))
    : null
  const action = project ? projectPrimaryAction(project) : null
  const timeline = useMemo(() => run && project ? makeRunTimeline(run, project, data.jobs) : [], [run, project, data])

  async function rerun(runId = project?.last_run_id) {
    if (!runId) return nav('/new')
    setMessage('')
    try {
      const res = await api.post(`/projects/${projectId}/runs/${runId}/rerun`)
      setMessage(`재실행 작업을 시작했습니다. Job: ${res.data.job_id || '-'}`)
      await reload()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '재실행을 시작하지 못했습니다. 데이터셋 상태와 사용 한도를 확인하세요.')
    }
  }

  async function createToken() {
    setMessage('')
    try {
      const res = await api.post(`/projects/${projectId}/prediction-tokens`, { label: '프로젝트 API 인증 정보' })
      setMessage(`API 인증 정보를 만들었습니다. 전체 인증 값은 지금 한 번만 표시됩니다: ${res.data.plaintext_token}`)
      await reload()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '예측 API 인증 정보를 만들 수 없습니다.')
    }
  }

  async function deleteDataset() {
    if (!dataset?.dataset_id && !dataset?.id) return
    if (!window.confirm('이 데이터셋을 삭제하면 원본 CSV가 필요한 재실행과 예측 API 사용이 제한될 수 있습니다. 계속할까요?')) return
    try {
      await api.delete(`/datasets/${dataset.dataset_id || dataset.id}`)
      setMessage('데이터셋을 삭제 처리했습니다.')
      await reload()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '데이터셋을 삭제하지 못했습니다.')
    }
  }

  async function deleteProject() {
    if (!window.confirm('프로젝트를 삭제 또는 보관 처리하면 기본 목록에서 숨겨집니다. 계속할까요?')) return
    try {
      await api.delete(`/projects/${projectId}`)
      nav('/projects')
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '프로젝트를 삭제하지 못했습니다.')
    }
  }

  if (state.loading) return <div className="workspace-page"><LoadingState label="프로젝트 정보를 불러오는 중입니다." /></div>
  if (state.error) return <div className="workspace-page"><ErrorState message={state.error} /></div>
  if (!project) return <div className="workspace-page"><EmptyState title="프로젝트가 없습니다." description="프로젝트 목록으로 돌아가 다시 선택하세요." action={<Link className="btn-primary" to="/projects">프로젝트 목록</Link>} /></div>

  return (
    <div className="workspace-page animate-fade-in">
      <WorkspacePageHeader
        eyebrow="프로젝트"
        title={project.name}
        description={projectSummaryText(project)}
        action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={project.archive_status || project.last_status || 'active'} />
          <button className="btn-primary" type="button" disabled={action?.disabled} onClick={() => action?.runId ? rerun(action.runId) : nav(action?.path || '/new')}>{action?.label}</button>
        </div>}
      />
      {message && <div className="banner-warning" style={{ marginBottom: 14 }}><p style={{ margin: 0, fontSize: 13 }}>{message}</p></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 18 }} className="admin-stat-grid">
        <Stat label="타깃" value={projectTarget(project)} />
        <Stat label="작업 유형" value={taskTypeLabel(project.last_task_type)} />
        <Stat label="데이터셋" value={projectDatasetName(project)} />
        <Stat label="마지막 업데이트" value={formatTimestamp(project.updated_at || project.created_at)} />
        <Stat label="추천 모델" value={project.last_best_model} />
        <Stat label="주요 지표" value={projectMetric(project)} />
      </div>
      <ProjectTabs active={tab} onChange={next => setSearch({ tab: next })} />
      {tab === 'overview' && <OverviewTab project={project} run={run} dataset={dataset} data={data} timeline={timeline} onRerun={() => rerun()} />}
      {tab === 'runs' && <RunsTab project={project} jobs={data.jobs} onRerun={rerun} />}
      {tab === 'report' && <ReportTab project={project} report={report} />}
      {tab === 'api' && <ApiTab data={data} onCreate={createToken} />}
      {tab === 'dataset' && <DatasetTab dataset={dataset} onDelete={deleteDataset} />}
      {tab === 'settings' && <SettingsTab project={project} onDelete={deleteProject} />}
    </div>
  )
}

function OverviewTab({ project, run, dataset, data, timeline, onRerun }) {
  const deleted = dataset?.deleted_at || dataset?.delete_status === 'deleted'
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {deleted && <div className="banner-danger"><AlertTriangle size={16} /><p style={{ margin: 0 }}>이 데이터셋은 삭제되었습니다. 기존 보고서는 볼 수 있지만 재실행과 예측 API는 제한됩니다.</p></div>}
      {run?.status === 'failed' && <FailurePanel run={run} project={project} onRerun={onRerun} />}
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <p className="section-title">프로젝트 요약</p>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{projectSummaryText(project)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }} className="admin-stat-grid">
          <Stat label="실행 수" value={project.run_count} />
          <Stat label="보고서" value={project.has_report ? '있음' : '없음'} />
          <Stat label="API" value={data.tokens?.availability?.available ? '준비됨' : '확인 필요'} />
          <Stat label="데이터 상태" value={deleted ? '삭제됨' : '활성'} />
        </div>
      </section>
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <p className="section-title">신뢰 / 경고 요약</p>
        {(project.known_warnings || []).length ? project.known_warnings.map(item => <div key={item} className="banner-warning"><p style={{ margin: 0 }}>{item}</p></div>) : <p style={{ margin: 0, color: 'var(--text-2)' }}>현재 프로젝트 요약에서 차단 경고가 확인되지 않았습니다.</p>}
        <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>다음 추천 행동: {project.next_recommended_action || '보고서와 API 상태를 확인하세요.'}</p>
      </section>
      {run ? <section className="card"><p className="section-title">최근 실행 기록</p><Timeline items={timeline} /></section> : <EmptyState title="아직 실행 기록이 없습니다." description="분석을 시작하면 실행 기록과 판단 흐름이 프로젝트에 저장됩니다." />}
    </div>
  )
}

function RunsTab({ project, jobs, onRerun }) {
  const runs = project.analysis_runs || []
  if (!runs.length) return <EmptyState title="아직 실행 기록이 없습니다." description="분석을 시작하면 실행 기록이 이 프로젝트에 저장됩니다." action={<Link className="btn-primary" to="/new">분석 시작</Link>} />
  return (
    <section className="card workspace-section">
      <div className="workspace-section-head"><div><h2>분석 실행 기록</h2><p>각 실행은 당시 연결된 CSV와 결과를 기준으로 별도 보관됩니다.</p></div></div>
      <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>데이터셋 / 분석 유형</th><th>목표</th><th>상태</th><th>업데이트</th><th>모델 / 지표</th><th>작업</th></tr></thead>
        <tbody>{runs.map(run => {
          const runDataset = datasetForRun(project, run)
          const identityWarning = runIdentityWarning(project, run)
          return <tr key={run.analysis_run_id}>
            <td><strong>{runDataset ? datasetDisplayName(runDataset) : '데이터셋 참조 확인 필요'}</strong><br /><span style={{ color: 'var(--text-label)' }}>{runTypeLabel(run)}</span></td>
            <td><strong>{run.target || '예측값 확인 필요'}</strong><br /><span style={{ color: 'var(--text-label)' }}>{run.goal || taskTypeLabel(run.task_type)}</span></td>
            <td><StatusBadge status={run.status} /></td>
            <td>{formatTimestamp(run.updated_at || run.created_at)}</td>
            <td><strong>{fmt(run.best_model)}</strong><br /><span style={{ color: 'var(--text-label)' }}>{runMetric(run)}</span></td>
            <td><div className="table-actions">
              <Link className="btn-primary" to={`/projects/${project.id}/runs/${run.analysis_run_id}`}>결과 보기</Link>
              {run.report_id && <Link className="btn-secondary" to={`/projects/${project.id}?tab=report&run_id=${encodeURIComponent(run.analysis_run_id)}`}>보고서 보기</Link>}
              <button className="btn-secondary" type="button" disabled={!run.can_rerun || !!identityWarning || !runDataset} onClick={() => onRerun(run.analysis_run_id)}>다시 실행</button>
            </div>{identityWarning && <p style={{ margin: '6px 0 0', color: '#b45309', fontSize: 12 }}>{identityWarning}</p>}</td>
          </tr>
        })}</tbody>
      </table>
      </div>
      {!!jobs.length && <p style={{ margin: '12px 0 0', color: 'var(--text-label)', fontSize: 12 }}>최근 job {jobs.length}개가 연결되어 있습니다.</p>}
    </section>
  )
}

function ReportTab({ project, report }) {
  if (!report) return <EmptyState title="생성된 보고서가 없습니다." description="모델 비교를 완료하면 보고서 요약과 내보내기 기능을 이용할 수 있습니다." action={<Link className="btn-primary" to="/report">보고서 화면 열기</Link>} />
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div><p className="section-title">보고서 요약</p><h2 style={{ margin: 0 }}>{report.title}</h2></div>
        <StatusBadge status={report.status || 'ready'} />
      </div>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>추천 모델: {fmt(project.last_best_model)} / 주요 지표: {projectMetric(project)}</p>
      <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{report.message || '보고서는 업로드된 데이터와 현재 검증 결과를 기반으로 합니다.'}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className="btn-primary" to={`/projects/${project.id}/runs/${report.analysis_run_id}`}><FileText size={15} /> 관련 실행 보기</Link>
      </div>
    </section>
  )
}

function ApiTab({ data, onCreate }) {
  const availability = data.tokens?.availability
  const tokens = data.tokens?.tokens || []
  const disabledReason = availability?.dataset_active === false ? '연결된 데이터셋이 삭제되어 예측 API를 사용할 수 없습니다.' : availability?.model_ready === false ? '모델 결과를 확인한 뒤 API를 연결할 수 있습니다.' : '검토 후 API 연결 가능'
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div><p className="section-title">예측 API</p><p style={{ margin: 0, color: 'var(--text-2)' }}>프로젝트 단위 API 인증 정보로 학습 모델을 재사용합니다. 전체 인증 값은 생성 직후 한 번만 표시됩니다.</p></div>
        <StatusBadge status={availability?.available ? 'active' : 'disabled'} />
      </div>
      <div className="banner-warning"><p style={{ margin: 0 }}>모델: {availability?.model_ready ? '준비됨' : '준비 필요'} / 데이터셋: {availability?.dataset_active ? '활성' : '비활성'} / 상태: {availability?.available ? '사용 가능' : disabledReason}</p></div>
      <button className="btn-primary" type="button" disabled={!availability?.available} onClick={onCreate}><KeyRound size={15} /> API 인증 정보 만들기</button>
      {tokens.length ? tokens.map(token => (
        <div key={token.token_id} className="card-compact">
          <strong>{token.token_prefix}</strong> <StatusBadge status={token.status} />
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 12 }}>생성 {fmt(token.created_at)} / 호출 {token.usage_count || 0} / 마지막 사용 {fmt(token.last_used_at)}</p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>목록에는 전체 인증 값을 다시 표시하지 않습니다.</p>
        </div>
      )) : <p style={{ margin: 0, color: 'var(--text-2)' }}>아직 생성된 프로젝트 API 인증 정보가 없습니다.</p>}
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>사용 예시 보기</summary>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-alt)' }}>{`curl -X POST "/api/predict/${data.project.id}" \\\n  -H "Authorization: Bearer <MODEL_MATE_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"rows":[{"feature_a":1}]}'`}</pre>
      </details>
    </section>
  )
}

function DatasetTab({ dataset, onDelete }) {
  const [impact, setImpact] = useState(null)

  useEffect(() => {
    const datasetId = dataset?.dataset_id || dataset?.id
    if (!datasetId || dataset?.deleted_at || dataset?.delete_status === 'deleted') {
      setImpact(null)
      return
    }
    api.get(`/datasets/${datasetId}/delete-impact`).then(res => setImpact(res.data)).catch(() => setImpact(null))
  }, [dataset?.dataset_id, dataset?.id, dataset?.deleted_at, dataset?.delete_status])

  if (!dataset) return <EmptyState title="연결된 데이터셋이 없습니다." description="새 분석을 시작하면 데이터셋 메타데이터가 프로젝트에 연결됩니다." action={<Link className="btn-primary" to="/new">데이터 업로드</Link>} />
  const deleted = dataset.deleted_at || dataset.delete_status === 'deleted'
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {deleted && <div className="banner-danger"><p style={{ margin: 0 }}>이 데이터셋은 삭제되었습니다. 기존 보고서는 남을 수 있지만 재실행과 예측 API는 사용할 수 없습니다.</p></div>}
      <section className="card">
        <p className="section-title">데이터셋</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }} className="admin-stat-grid">
          <Stat label="파일명" value={dataset.original_filename || dataset.filename} />
          <Stat label="행" value={dataset.row_count || dataset.rows} />
          <Stat label="열" value={dataset.column_count || dataset.columns} />
          <Stat label="상태" value={deleted ? '삭제됨' : dataset.delete_status || '활성'} />
        </div>
        <p style={{ margin: '12px 0 0', color: 'var(--text-label)', fontSize: 12 }}>연결 실행 {fmt(dataset.linked_analysis_run_count)} / 보고서 {fmt(dataset.linked_report_count)} / API {dataset.has_prediction_api ? '있음' : '없음'}</p>
      </section>
      {impact && (
        <section className="card" style={{ display: 'grid', gap: 10 }}>
          <p className="section-title">삭제 영향 미리보기</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }} className="admin-stat-grid">
            <Stat label="연결 실행" value={impact.linked_analysis_runs} />
            <Stat label="연결 보고서" value={impact.linked_reports} />
            <Stat label="연결 모델" value={impact.linked_models} />
            <Stat label="API 영향" value={impact.will_revoke_prediction_api ? '있음' : '없음'} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>{impact.retention_note}</p>
        </section>
      )}
      <section className="card" style={{ borderColor: '#fecdd3', display: 'grid', gap: 10 }}>
        <p className="section-title">위험 작업</p>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>데이터셋을 삭제하면 원본 CSV가 필요한 재실행은 불가능해질 수 있습니다. 기존 보고서는 이력 요약으로 남을 수 있습니다.</p>
        <button className="btn-secondary" type="button" disabled={deleted} onClick={onDelete}><Trash2 size={15} /> 데이터셋 삭제</button>
      </section>
    </div>
  )
}

function SettingsTab({ project, onDelete }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <p className="section-title">프로젝트 설정</p>
      <Stat label="프로젝트 이름" value={project.name} />
      <Stat label="상태" value={project.archive_status || 'active'} />
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>프로젝트 소유권과 접근 제어는 MVP 수준으로 적용되어 있습니다. 팀 권한, RBAC, enterprise 설정은 아직 범위 밖입니다.</p>
      <div className="card-compact" style={{ borderColor: '#fecdd3' }}>
        <strong>위험 작업</strong>
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>프로젝트를 삭제하면 기본 목록에서 숨겨지고 연결 데이터셋이 삭제 상태로 전환될 수 있습니다.</p>
        <button className="btn-secondary" type="button" onClick={onDelete}><Trash2 size={15} /> 프로젝트 삭제</button>
      </div>
    </section>
  )
}
