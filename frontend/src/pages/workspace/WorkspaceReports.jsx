import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadWorkspaceReports } from './workspaceData'

export default function WorkspaceReports() {
  const nav = useNavigate()
  const [reports, setReports] = useState(null)

  useEffect(() => {
    loadWorkspaceReports().then(setReports).catch(() => setReports([]))
  }, [])

  if (!reports) return <div style={{ padding: 24 }}><LoadingState label="보고서를 불러오는 중입니다." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="보고서" description="저장된 프로젝트 근거를 바탕으로 생성된 분석 보고서를 다시 열 수 있습니다." action={<button className="btn-primary" onClick={() => nav('/report')}>현재 보고서 열기</button>} />
      {!reports.length ? (
        <EmptyState title="아직 생성된 보고서가 없습니다." description="분석이 완료되면 보고서가 여기에 표시됩니다." action={<button className="btn-primary" onClick={() => nav('/new')}>새 분석 시작</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>보고서</th><th>프로젝트</th><th>생성일</th><th>추천 모델</th><th>주요 지표</th><th>미리보기</th></tr></thead>
            <tbody>{reports.map((report, index) => (
              <tr key={`${report.project?.id}-${report.report_id || index}`}>
                <td><strong>{report.title || 'ModelMate 분석 보고서'}</strong></td>
                <td>{report.project?.id ? <Link to={`/projects/${report.project.id}?tab=report`}>{report.project?.name || report.project.id}</Link> : '-'}</td>
                <td>{fmt(report.created_at || report.generated_at)}</td>
                <td>{fmt(report.best_model || report.model_summary?.best_model)}</td>
                <td>{fmt(report.metric_summary?.best_metric || report.best_metric)}</td>
                <td>{report.project?.id ? <Link to={`/projects/${report.project.id}?tab=report`}>보고서 보기</Link> : <button className="btn-secondary" onClick={() => nav('/report')}>보고서 보기</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
