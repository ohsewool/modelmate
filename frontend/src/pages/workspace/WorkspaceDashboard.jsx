import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoDatasetGuide from '../../components/upload/DemoDatasetGuide'
import { EmptyState, LoadingState, StatusBadge } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, datasetDisplayName, fmt, formatTimestamp, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget, taskTypeLabel } from './workspaceData'

function MetricCard({ label, value, sub }) {
  return <div className="metric-card"><p className="section-title">{label}</p><strong>{value}</strong><p style={{ margin: 0, color: 'var(--text-2)', fontSize: 12 }}>{sub}</p></div>
}

function usageSummary(usage) {
  if (usage?.is_admin || usage?.role === 'admin' || usage?.plan === 'admin') {
    return '관리자 모드입니다. 데모와 검증을 위해 작업, 프로젝트, 데이터셋, 예측 API 한도가 적용되지 않습니다.'
  }
  if (!usage?.limits) return '사용량 정보를 확인할 수 없습니다.'
  const jobs = `${usage.usage?.jobs_today || 0} / ${usage.limits?.max_jobs_per_day ?? '제한 없음'}`
  const api = `${usage.usage?.prediction_api_calls_today || 0} / ${usage.limits?.max_prediction_api_calls_per_day ?? '제한 없음'}`
  return `오늘 작업 ${jobs}, API 호출 ${api}`
}

function ProductHomeHero({ onUpload, onQuick, onGoal }) {
  return (
    <section className="workspace-hero" style={{ marginBottom: 18 }}>
      <div>
        <p className="eyebrow">CSV 예측 분석 워크스페이스</p>
        <h1>대시보드</h1>
        <p>업로드한 CSV와 분석 결과를 한눈에 확인합니다.</p>
      </div>
      <div className="workspace-hero-actions">
        <button className="btn-primary" type="button" onClick={onUpload}>새 분석 시작하기</button>
        <button className="btn-secondary" type="button" onClick={onQuick}>빠른 자동 분석</button>
        <button className="btn-secondary" type="button" onClick={onGoal}>목표 기반 분석</button>
      </div>
    </section>
  )
}

function RecommendedNextAction({ data, latestRun, nav }) {
  const datasets = asArray(data?.datasets)
  const history = asArray(data?.history)
  const jobs = asArray(data?.jobs)
  const reports = asArray(data?.reports)
  const deployed = asArray(data?.deployed)
  const hasDataset = datasets.length > 0
  const hasRun = history.length > 0 || jobs.length > 0
  const hasReport = reports.length > 0
  const hasApi = deployed.length > 0
  let title = '다음에 할 일'
  let description = '첫 CSV를 올리고 예측할 값을 정해 보세요.'
  let cta = 'CSV 올리기'
  let path = '/new'

  if (!hasDataset) {
    description = '아직 분석할 데이터가 없어요. CSV를 올리면 예측 목표를 추천해 드립니다.'
    cta = 'CSV 올리기'
    path = '/new'
  } else if (!hasRun) {
    description = '업로드한 CSV로 목표 기반 분석을 시작해 보세요. 타깃 추천과 실행 기록을 함께 남길 수 있습니다.'
    cta = '목표 기반 분석 시작'
    path = '/agent-mode'
  } else if (!hasReport) {
    description = '분석 결과를 보고서로 정리해 보세요. 성능, 중요 요인, 주의사항을 한 화면에서 확인할 수 있습니다.'
    cta = '보고서 보기'
    path = '/reports'
  } else if (!hasApi) {
    description = '보고서 확인 후 예측 결과를 API로 연결할 준비가 되었는지 확인해 보세요.'
    cta = '예측 API 보기'
    path = '/prediction-apis'
  } else if (latestRun) {
    description = `${fmt(latestRun.target)} 분석 결과를 새 데이터 예측이나 예측 API로 재사용할 수 있습니다.`
    cta = '프로젝트 보기'
    path = '/projects'
  }

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">{title}</p>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{description}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" type="button" onClick={() => nav(path)}>{cta}</button>
        <button className="btn-secondary" type="button" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
      </div>
    </section>
  )
}

function DatasetList({ datasets, jobs, nav }) {
  const latestJob = dataset => jobs.find(job => String(job.dataset_id || '') === String(dataset.id || dataset.dataset_id || ''))
  return (
    <section className="card workspace-section">
      <div className="workspace-section-head">
        <div><h2>최근 데이터셋</h2><p>업로드한 CSV를 다시 선택해 새 분석이나 빠른 분석을 시작할 수 있습니다.</p></div>
        <button className="btn-secondary" onClick={() => nav('/upload')}>CSV 업로드</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>데이터셋</th><th>크기</th><th>최근 분석</th><th>최근 예측값</th><th>업로드</th><th>작업</th></tr></thead>
          <tbody>{datasets.slice(0, 8).map(dataset => {
            const datasetId = dataset.id || dataset.dataset_id
            const job = latestJob(dataset)
            const summary = job?.result_summary || {}
            const projectId = dataset.project_id
            return (
              <tr key={datasetId}>
                <td><strong>{datasetDisplayName(dataset)}</strong>{dataset.is_demo_dataset && <><br /><span className="badge badge-blue">샘플 데이터</span></>}</td>
                <td>{fmt(dataset.row_count || dataset.rows)}행 · {fmt(dataset.column_count || dataset.columns)}열</td>
                <td>{job ? <StatusBadge status={job.status} /> : <span style={{ color: 'var(--text-2)' }}>아직 분석하지 않음</span>}</td>
                <td>{summary.target || dataset.target_col || '선택 전'}{summary.task_type && <><br /><span style={{ color: 'var(--text-label)' }}>{taskTypeLabel(summary.task_type)}</span></>}</td>
                <td>{formatTimestamp(dataset.created_at)}</td>
                <td><div className="table-actions">
                  <button className="btn-secondary" onClick={() => nav('/upload')}>새 분석 시작</button>
                  <button className="btn-secondary" onClick={() => nav(`/agent?dataset_id=${encodeURIComponent(datasetId)}`)}>빠른 자동 분석</button>
                  <button className="btn-secondary" onClick={() => nav(`/agent-mode?dataset_id=${encodeURIComponent(datasetId)}${projectId ? `&project_id=${encodeURIComponent(projectId)}` : ''}`)}>목표 기반 분석</button>
                  {projectId && <button className="btn-secondary" onClick={() => nav(`/projects/${projectId}?tab=runs`)}>분석 기록 보기</button>}
                </div></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </section>
  )
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
  const allFailedJobs = jobs.filter(job => job.status === 'failed' || job.error_type || job.error_message)
  const failedJobs = allFailedJobs.slice(0, 4)
  const completedCount = Math.max(
    jobs.filter(job => ['succeeded', 'success', 'completed'].includes(job.status)).length,
    history.filter(run => ['succeeded', 'success', 'completed'].includes(run.status)).length,
  )
  const reviewCount = Math.max(
    jobs.filter(job => job.status === 'needs_review').length,
    history.filter(run => run.status === 'needs_review').length,
  )
  const latestRun = history[0]

  return (
    <div className="workspace-page animate-fade-in">
      <ProductHomeHero
        onUpload={() => nav('/new')}
        onQuick={() => nav('/agent')}
        onGoal={() => nav('/agent-mode')}
      />
      <div className="workspace-summary-grid" style={{ marginBottom: 18 }}>
        <MetricCard label="데이터셋" value={datasets.length} sub="업로드된 CSV" />
        <MetricCard label="완료된 분석" value={completedCount} sub="저장된 실행 결과" />
        <MetricCard label="생성된 보고서" value={reports.length} sub="확인 가능한 결과" />
        <MetricCard label="예측 API" value={deployed.length} sub="연결된 모델" />
        <MetricCard label="검토 필요" value={reviewCount} sub="사용자 확인 항목" />
        <MetricCard label="분석 실패" value={allFailedJobs.length} sub="복구 확인 항목" />
      </div>
      {datasets.length === 0 ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <EmptyState
            title="아직 업로드된 CSV가 없습니다."
            description="CSV를 업로드하고 첫 분석을 시작해 주세요."
            action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => nav('/new')}>CSV 업로드</button>
              <button className="btn-secondary" onClick={() => nav('/agent')}>빠른 자동 분석</button>
              <button className="btn-secondary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button>
            </div>}
          />
          <DemoDatasetGuide compact onStart={() => nav('/new')} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <DatasetList datasets={datasets} jobs={jobs} nav={nav} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
            <section className="card">
              <p className="section-title">진행 중인 작업</p>
              {activeJobs.length ? activeJobs.map(job => (
                <p key={job.job_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{job.project?.name || job.job_id}</span><StatusBadge status={job.status} />
                </p>
              )) : <p style={{ color: 'var(--text-2)' }}>현재 실행 중인 작업이 없습니다.</p>}
              <Link to="/jobs">모든 작업 보기</Link>
            </section>
            <section className="card">
              <p className="section-title">실패한 작업</p>
              {failedJobs.length ? failedJobs.map(job => (
                <p key={job.job_id} style={{ display: 'grid', gap: 3 }}>
                  <strong>{job.project?.name || job.job_id}</strong>
                  <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{job.error_message || '실패 원인을 확인하세요.'}</span>
                </p>
              )) : <p style={{ color: 'var(--text-2)' }}>최근 실패한 작업이 없습니다.</p>}
              <Link to="/jobs">실패 작업 확인</Link>
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
            <section className="card">
              <p className="section-title">사용량 요약</p>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>{usageSummary(data.usage)}</p>
              <Link to="/settings">사용량 보기</Link>
            </section>
            <RecommendedNextAction data={data} latestRun={latestRun} nav={nav} />
          </div>

          <section className="card workspace-section">
            <p className="section-title">최근 프로젝트</p>
            {recentProjects.length ? (
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
            ) : (
              <EmptyState
                title="최근 프로젝트가 없어요."
                description="CSV를 올려 시작하세요."
                action={<button className="btn-primary" onClick={() => nav('/new')}>새 프로젝트 시작</button>}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
