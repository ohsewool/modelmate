import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoDatasetGuide from '../../components/upload/DemoDatasetGuide'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

function MetricCard({ label, value, sub }) {
  return <div className="card"><p className="section-title">{label}</p><strong style={{ fontSize: 26 }}>{value}</strong><p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 12 }}>{sub}</p></div>
}

function usageSummary(usage) {
  if (!usage?.limits) return '사용량 정보를 확인할 수 없습니다.'
  const jobs = `${usage.usage?.jobs_today || 0} / ${usage.limits?.max_jobs_per_day ?? '제한 없음'}`
  const api = `${usage.usage?.prediction_api_calls_today || 0} / ${usage.limits?.max_prediction_api_calls_per_day ?? '제한 없음'}`
  return `오늘 작업 ${jobs}, API 호출 ${api}`
}

export default function WorkspaceDashboard() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setError('워크스페이스 요약을 불러오지 못했습니다.'))
  }, [])

  if (error) return <div style={{ padding: 24 }}><div className="banner-warning">{error}</div></div>
  if (!data) return <div style={{ padding: 24 }}><LoadingState /></div>

  const recentProjects = data.projects.slice(0, 5)
  const activeJobs = data.jobs.filter(job => ['created', 'queued', 'running'].includes(job.status)).slice(0, 4)
  const failedJobs = data.jobs.filter(job => job.status === 'failed' || job.error_type || job.error_message).slice(0, 4)
  const latestRun = data.history[0]

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader
        eyebrow="워크스페이스"
        title="대시보드"
        description="저장된 프로젝트, 진행 중인 작업, 사용량, 최근 오류와 예측 API 상태를 한눈에 확인합니다."
        action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>}
      />
      {data.projects.length === 0 ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <EmptyState
            title="아직 저장된 프로젝트가 없습니다."
            description="CSV를 업로드하거나 사용 사례 샘플로 첫 분석을 시작하세요."
            action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}><button className="btn-primary" onClick={() => nav('/new')}>CSV 업로드</button><button className="btn-secondary" onClick={() => nav('/new')}>샘플로 체험하기</button></div>}
          />
          <DemoDatasetGuide compact onStart={() => nav('/new')} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }} className="admin-stat-grid">
            <MetricCard label="프로젝트" value={data.projects.length} sub="저장된 분석 공간" />
            <MetricCard label="데이터셋" value={data.datasets.length} sub="활성 업로드" />
            <MetricCard label="오늘 작업" value={data.usage?.usage?.jobs_today ?? 0} sub={`${data.usage?.plan || 'free'} 플랜`} />
            <MetricCard label="예측 API" value={data.deployed.length} sub="공유 모델 기록" />
          </div>

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
            <section className="card">
              <p className="section-title">다음 추천 행동</p>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {latestRun ? `${fmt(latestRun.target)} 결과를 보고서 또는 예측 API로 재사용할 수 있습니다.` : '새 분석을 시작해 첫 프로젝트를 만들어보세요.'}
              </p>
            </section>
          </div>

          <section className="card">
            <p className="section-title">최근 프로젝트</p>
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
          </section>
        </div>
      )}
    </div>
  )
}
