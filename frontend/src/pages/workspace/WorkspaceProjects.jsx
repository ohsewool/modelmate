import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

export default function WorkspaceProjects() {
  const nav = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setData({ projects: [] }))
  }, [])

  if (!data) return <div style={{ padding: 24 }}><LoadingState label="프로젝트를 불러오는 중입니다." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="프로젝트" description="저장된 분석, 연결된 데이터셋, 최근 실행 기록, 재사용 가능한 결과물을 프로젝트별로 확인합니다." action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>} />
      {!data.projects.length ? (
        <EmptyState title="아직 저장된 프로젝트가 없습니다." description="CSV를 업로드하거나 샘플 데이터로 예측 분석을 시작하세요." action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>프로젝트</th><th>상태</th><th>타깃</th><th>데이터셋</th><th>최근 실행</th><th>추천 모델</th><th>주요 지표</th><th>작업</th></tr></thead>
            <tbody>{data.projects.map(project => (
              <tr key={project.id}>
                <td><Link to={`/projects/${project.id}`}><strong>{project.name}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>{project.id}</span></td>
                <td><StatusBadge status={project.archive_status || 'active'} /></td>
                <td>{fmt(projectTarget(project))}</td>
                <td>{projectDatasetName(project)}</td>
                <td>{fmt(project.last_run_id || project.updated_at)}</td>
                <td>{fmt(project.last_best_model)}</td>
                <td>{primaryMetric(project)}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => nav(`/projects/${project.id}`)}>열기</button>
                  <Link to={`/projects/${project.id}?tab=report`}>보고서</Link>
                  <Link to={`/projects/${project.id}?tab=api`}>API</Link>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
