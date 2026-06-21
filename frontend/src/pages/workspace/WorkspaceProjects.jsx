import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoDatasetGuide from '../../components/upload/DemoDatasetGuide'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, fmt, loadWorkspaceOverview, primaryMetric, projectDatasetName, projectTarget } from './workspaceData'

export default function WorkspaceProjects() {
  const nav = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setData({ projects: [] }))
  }, [])

  if (!data) return <div className="workspace-page"><LoadingState label="프로젝트를 불러오는 중입니다." /></div>
  const projects = asArray(data.projects).filter(Boolean)
  const activeProjects = projects.filter(project => !['deleted', 'archived'].includes(project.archive_status)).length
  const reportReady = projects.filter(project => project.last_report_id || project.report_id || project.report).length
  const apiReady = projects.filter(project => project.prediction_api_enabled || project.api_token_count || project.prediction_tokens?.length).length

  return (
    <div className="workspace-page animate-fade-in">
      <WorkspacePageHeader
        title="프로젝트"
        description="저장된 CSV, 분석 실행, 보고서를 프로젝트별로 확인합니다."
        action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작하기</button>}
      />
      <div className="workspace-grid four-columns" style={{ marginBottom: 18 }}>
        <section className="metric-card"><p className="section-title">프로젝트</p><strong>{projects.length}</strong></section>
        <section className="metric-card"><p className="section-title">활성</p><strong>{activeProjects}</strong></section>
        <section className="metric-card"><p className="section-title">보고서</p><strong>{reportReady}</strong></section>
        <section className="metric-card"><p className="section-title">예측 API</p><strong>{apiReady}</strong></section>
      </div>
      {!projects.length ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <EmptyState
            title="아직 프로젝트가 없어요."
            description="CSV를 올려 첫 프로젝트를 만들어 보세요."
            action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}><button className="btn-primary" onClick={() => nav('/new')}>CSV 올리기</button><button className="btn-secondary" onClick={() => nav('/agent-mode')}>목표 기반 분석</button></div>}
          />
          <DemoDatasetGuide compact onStart={() => nav('/new')} />
        </div>
      ) : (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <p className="section-title" style={{ margin: 0 }}>프로젝트 목록</p>
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>프로젝트</th>
                <th>상태</th>
                <th>예측값</th>
                <th>데이터셋</th>
                <th>최근 실행</th>
                <th>추천 모델</th>
                <th>주요 지표</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>{projects.map(project => (
              <tr key={project.id}>
                <td><Link to={`/projects/${project.id}`}><strong>{project.name}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>참조 {String(project.id).slice(0, 8)}</span></td>
                <td><StatusBadge status={project.archive_status || 'active'} /></td>
                <td>{fmt(projectTarget(project))}</td>
                <td>{projectDatasetName(project)}</td>
                <td>{fmt(project.last_run_id || project.updated_at)}</td>
                <td>{fmt(project.last_best_model)}</td>
                <td>{primaryMetric(project)}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => nav(`/projects/${project.id}`)}>결과 보기</button>
                  <Link to={`/projects/${project.id}?tab=report`}>보고서</Link>
                  <Link to={`/projects/${project.id}?tab=api`}>API</Link>
                </td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  )
}
