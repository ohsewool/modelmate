import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoDatasetGuide from '../../components/upload/DemoDatasetGuide'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, formatTimestamp, loadWorkspaceOverview, projectDatasetName, projectTarget, taskTypeLabel } from './workspaceData'

export default function WorkspaceProjects() {
  const nav = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    loadWorkspaceOverview().then(setData).catch(() => setData({ projects: [] }))
  }, [])

  if (!data) return <div className="workspace-page"><LoadingState label="프로젝트를 불러오는 중입니다." /></div>
  const projects = asArray(data.projects).filter(Boolean)
  const activeProjects = projects.filter(project => !['deleted', 'archived'].includes(project.archive_status)).length
  const reportReady = projects.reduce((sum, project) => sum + Number(project.report_count || (project.has_report ? 1 : 0)), 0)
  const apiReady = projects.reduce((sum, project) => sum + Number(project.prediction_api_count || (project.has_prediction_api ? 1 : 0)), 0)

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
                <th>데이터셋</th>
                <th>최근 분석</th>
                <th>저장된 결과</th>
                <th>마지막 업데이트</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>{projects.map(project => (
              <tr key={project.id}>
                <td><Link to={`/projects/${project.id}`}><strong>{project.name || '이름 없는 프로젝트'}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>최근 CSV: {projectDatasetName(project)}</span></td>
                <td><strong>{project.dataset_count || (project.dataset_name ? 1 : 0)}개</strong><br /><span style={{ color: 'var(--text-label)' }}>연결된 CSV</span></td>
                <td><StatusBadge status={project.last_status || project.last_job_status || 'created'} /><br /><span style={{ color: 'var(--text-label)' }}>{projectTarget(project) || '예측값 선택 전'} · {taskTypeLabel(project.last_task_type)}</span></td>
                <td>{project.run_count || 0}회 실행<br /><span style={{ color: 'var(--text-label)' }}>보고서 {project.report_count || (project.has_report ? 1 : 0)} · API {project.prediction_api_count || (project.has_prediction_api ? 1 : 0)}</span></td>
                <td>{formatTimestamp(project.updated_at || project.created_at)}</td>
                <td><div className="table-actions">
                  <button className="btn-primary" onClick={() => nav(`/projects/${project.id}`)}>프로젝트 열기</button>
                  <button className="btn-secondary" onClick={() => nav(`/agent-mode?project_id=${encodeURIComponent(project.id)}`)}>새 분석 시작</button>
                  {project.has_report && <button className="btn-secondary" onClick={() => nav(`/projects/${project.id}?tab=report`)}>보고서 보기</button>}
                </div>
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
