import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, fmt, loadWorkspaceReports } from './workspaceData'

export default function WorkspaceReports() {
  const nav = useNavigate()
  const [reports, setReports] = useState(null)

  useEffect(() => {
    loadWorkspaceReports().then(setReports).catch(() => setReports([]))
  }, [])

  if (!reports) return <div style={{ padding: 24 }}><LoadingState label="보고서를 불러오는 중입니다." /></div>
  const safeReports = asArray(reports).filter(Boolean)
  const readyCount = safeReports.length
  const modelCount = safeReports.filter(report => report?.best_model || report?.model_summary?.best_model).length
  const metricCount = safeReports.filter(report => report?.metric_summary?.best_metric || report?.best_metric).length

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader title="보고서" description="분석 보고서와 다음 행동을 확인합니다." action={<button className="btn-primary" onClick={() => nav('/report')}>현재 보고서 열기</button>} />
      <div className="workspace-grid four-columns" style={{ marginBottom: 18 }}>
        <section className="card-compact"><p className="section-title">보고서</p><strong>{readyCount}</strong></section>
        <section className="card-compact"><p className="section-title">모델 요약</p><strong>{modelCount}</strong></section>
        <section className="card-compact"><p className="section-title">성능 지표</p><strong>{metricCount}</strong></section>
        <section className="card-compact"><p className="section-title">다음 행동</p><strong>확인</strong></section>
      </div>
      {!safeReports.length ? (
        <section className="card empty-state">
          <strong className="empty-title">아직 보고서가 준비되지 않았어요.</strong>
          <p className="empty-desc">
            분석이 끝나면 보고서가 여기에 표시됩니다.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/agent-mode')}>분석 시작</button>
            <button className="btn-secondary" onClick={() => nav('/dashboard')}>상태 보기</button>
          </div>
        </section>
      ) : (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <p className="section-title" style={{ margin: 0 }}>보고서 목록</p>
          <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>보고서</th><th>프로젝트</th><th>생성일</th><th>추천 모델</th><th>주요 지표</th><th>다음 행동</th></tr></thead>
            <tbody>{safeReports.map((report, index) => (
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
          </div>
        </section>
      )}
    </div>
  )
}
