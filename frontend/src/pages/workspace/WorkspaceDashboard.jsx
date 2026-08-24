import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoDatasetGuide from '../../components/upload/DemoDatasetGuide'
import { EmptyState, LoadingState, StatusBadge } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, datasetDisplayName, fmt, formatTimestamp, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget, taskTypeLabel } from './workspaceData'

// DESIGN.md §1 — 이 화면의 1등은 "다음에 할 단 하나의 일"이다.
//
// 수리 전에는 이 계산이 화면 하단 2단 그리드의 한 칸(사용량 요약 옆)에 묻혀
// 있었고, 맨 위 hero에는 사이드바와 똑같은 버튼 세 개가 또 있었다. "새 분석
// 시작하기"가 한 화면에 세 번 — 전부 소리치면 아무것도 안 들린다.
function computeNextAction(data, latestRun) {
  const datasets = asArray(data?.datasets)
  const history = asArray(data?.history)
  const jobs = asArray(data?.jobs)
  const reports = asArray(data?.reports)
  const deployed = asArray(data?.deployed)

  if (!datasets.length) return {
    description: '아직 분석할 데이터가 없어요. CSV를 올리면 예측 목표를 추천해 드립니다.',
    cta: 'CSV 올리기', path: '/new',
  }
  if (!history.length && !jobs.length) return {
    description: '업로드한 CSV로 목표 기반 분석을 시작해 보세요. 타깃 추천과 실행 기록이 함께 남습니다.',
    cta: '목표 기반 분석 시작', path: '/agent-mode',
  }
  if (!reports.length) return {
    description: '분석 결과를 보고서로 정리해 보세요. 성능, 중요 요인, 주의사항을 한 화면에서 봅니다.',
    cta: '보고서 보기', path: '/reports',
  }
  if (!deployed.length) return {
    description: '보고서를 확인했다면 예측 결과를 API로 연결할 차례입니다.',
    cta: '예측 API 보기', path: '/prediction-apis',
  }
  if (latestRun) return {
    description: `${fmt(latestRun.target)} 분석 결과를 새 데이터 예측이나 예측 API로 재사용할 수 있습니다.`,
    cta: '프로젝트 보기', path: '/projects',
  }
  return { description: '업로드한 CSV와 분석 결과를 이어서 봅니다.', cta: '프로젝트 보기', path: '/projects' }
}

// DESIGN.md §2 — 숫자는 의미 있을 때만 크다. 0은 문장 자격도 없다(그냥 뺀다).
// 수리 전에는 "분석 실패 0"이 "데이터셋 3"과 같은 크기의 카드였다.
function StatLine({ pairs }) {
  const shown = pairs.filter(([, value]) => value > 0)
  if (!shown.length) return null
  return (
    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>
      {shown.map(([label, value], index) => (
        <span key={label}>
          {index > 0 && ' · '}
          {label} <strong style={{ color: 'var(--text)' }}>{value}</strong>
        </span>
      ))}
    </p>
  )
}

function DatasetList({ datasets, jobs, nav }) {
  const latestJob = dataset => jobs.find(job => String(job.dataset_id || '') === String(dataset.id || dataset.dataset_id || ''))
  return (
    <section className="card workspace-section">
      <div className="workspace-section-head">
        <div><h2>최근 데이터셋</h2></div>
        <button className="btn-secondary" onClick={() => nav('/upload')}>CSV 업로드</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>데이터셋</th><th>크기</th><th>최근 분석</th><th>타깃</th><th>업로드</th><th></th></tr></thead>
          <tbody>{datasets.slice(0, 8).map(dataset => {
            const datasetId = dataset.id || dataset.dataset_id
            const job = latestJob(dataset)
            const summary = job?.result_summary || {}
            const projectId = dataset.project_id
            return (
              <tr key={datasetId}>
                <td><strong>{datasetDisplayName(dataset)}</strong>{dataset.is_demo_dataset && <><br /><span className="badge badge-blue">샘플 데이터</span></>}</td>
                <td>{fmt(dataset.row_count || dataset.rows)}행 · {fmt(dataset.column_count || dataset.columns)}열</td>
                <td>{job ? <StatusBadge status={job.status} /> : <span style={{ color: 'var(--text-2)' }}>아직 없음</span>}</td>
                <td>{summary.target || dataset.target_col || '선택 전'}{summary.task_type && <><br /><span style={{ color: 'var(--text-label)' }}>{taskTypeLabel(summary.task_type)}</span></>}</td>
                <td>{formatTimestamp(dataset.created_at)}</td>
                {/* DESIGN.md §1 — 행마다 같은 무게 버튼 4개가 있었다. 행의 일은
                    하나다: 이 데이터로 분석을 잇는 것. 기록은 링크로 강등. */}
                <td><div className="table-actions">
                  <button className="btn-secondary" onClick={() => nav(`/agent-mode?dataset_id=${encodeURIComponent(datasetId)}${projectId ? `&project_id=${encodeURIComponent(projectId)}` : ''}`)}>이 데이터로 분석</button>
                  {projectId && <Link to={`/projects/${projectId}?tab=runs`}>기록</Link>}
                </div></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </section>
  )
}

function usageLine(usage) {
  if (usage?.is_admin || usage?.role === 'admin' || usage?.plan === 'admin') {
    return '관리자 모드 — 한도가 적용되지 않습니다.'
  }
  if (!usage?.limits) return null
  const jobs = `${usage.usage?.jobs_today || 0}/${usage.limits?.max_jobs_per_day ?? '∞'}`
  const api = `${usage.usage?.prediction_api_calls_today || 0}/${usage.limits?.max_prediction_api_calls_per_day ?? '∞'}`
  return `오늘 작업 ${jobs} · API 호출 ${api}`
}

export default function WorkspaceDashboard() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setError('워크스페이스 요약을 불러오지 못했습니다.'))
  }, [])

  if (error) return <div className="workspace-page"><div className="banner-warning">{error}</div></div>
  if (!data) return <div className="workspace-page"><LoadingState /></div>

  const projects = asArray(data.projects).filter(Boolean)
  const datasets = asArray(data.datasets).filter(Boolean)
  const jobs = asArray(data.jobs).filter(Boolean)
  const history = asArray(data.history).filter(Boolean)
  const deployed = asArray(data.deployed).filter(Boolean)
  const reports = asArray(data.reports).filter(Boolean)
  const recentProjects = projects.slice(0, 5)
  const activeJobs = jobs.filter(job => ['created', 'queued', 'running'].includes(job.status)).slice(0, 4)
  const failedJobs = jobs.filter(job => job.status === 'failed' || job.error_type || job.error_message)
  const completedCount = Math.max(
    jobs.filter(job => ['succeeded', 'success', 'completed'].includes(job.status)).length,
    history.filter(run => ['succeeded', 'success', 'completed'].includes(run.status)).length,
  )
  const reviewCount = Math.max(
    jobs.filter(job => job.status === 'needs_review').length,
    history.filter(run => run.status === 'needs_review').length,
  )
  const latestRun = history[0]
  const nextAction = computeNextAction(data, latestRun)
  const usage = usageLine(data.usage)

  return (
    <div className="workspace-page animate-fade-in">
      {/* 1등: 다음에 할 일. 이 화면의 파란 버튼은 이것 하나다. */}
      <section className="workspace-hero" style={{ marginBottom: 24 }}>
        <div>
          <h1>대시보드</h1>
          <p style={{ maxWidth: 560 }}>{nextAction.description}</p>
        </div>
        <div className="workspace-hero-actions">
          <button className="btn-primary" type="button" onClick={() => nav(nextAction.path)}>{nextAction.cta}</button>
        </div>
      </section>

      {/* 주의가 필요한 것만 배너로 — 0일 때는 아무것도 없다 (§2·§5) */}
      {(reviewCount > 0 || failedJobs.length > 0) && (
        <div className="banner-warning" style={{ marginBottom: 16 }}>
          {reviewCount > 0 && <span>검토 필요 {reviewCount}건 </span>}
          {failedJobs.length > 0 && <span>분석 실패 {failedJobs.length}건 </span>}
          <Link to="/jobs">작업 기록에서 확인</Link>
        </div>
      )}

      {datasets.length === 0 ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <DemoDatasetGuide compact onStart={() => nav('/new')} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          <StatLine pairs={[['데이터셋', datasets.length], ['완료된 분석', completedCount], ['보고서', reports.length], ['예측 API', deployed.length]]} />

          <DatasetList datasets={datasets} jobs={jobs} nav={nav} />

          {/* §5 — 빈 상태는 자리를 차지하지 않는다: 있을 때만 그린다 */}
          {activeJobs.length > 0 && (
            <section className="card">
              <p className="section-title">진행 중인 작업</p>
              {activeJobs.map(job => (
                <p key={job.job_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{job.project?.name || job.job_id}</span><StatusBadge status={job.status} />
                </p>
              ))}
              <Link to="/jobs">모든 작업 보기</Link>
            </section>
          )}

          {recentProjects.length > 0 && (
            <section className="card workspace-section">
              <p className="section-title">최근 프로젝트</p>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>{recentProjects.map(project => (
                    <tr key={project.id}>
                      <td><strong>{project.name}</strong><br /><span style={{ color: 'var(--text-label)' }}>{projectDatasetName(project)}</span></td>
                      <td>{fmt(projectTarget(project))}</td>
                      <td>{fmt(project.last_best_model)}</td>
                      <td>{primaryMetric(project)}</td>
                      <td><Link to={`/projects/${project.id}`}>열기</Link></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )}

          {usage && <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 13 }}>{usage} · <Link to="/settings">사용량 보기</Link></p>}
        </div>
      )}
    </div>
  )
}
