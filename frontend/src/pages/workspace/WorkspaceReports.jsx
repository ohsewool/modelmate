import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, fmt, loadWorkspaceReports } from './workspaceData'

const statusLabel = status => ({
  ready: '분석 완료',
  succeeded: '분석 완료',
  metadata_available: '분석 완료',
  needs_review: '분석 완료 · 검토 필요',
  failed: '분석 실패',
  running: '보고서 생성 중',
}[status] || '결과 확인 필요')

const statusClass = status => {
  if (['ready', 'succeeded', 'metadata_available'].includes(status)) return 'badge badge-green'
  if (status === 'failed') return 'badge badge-red'
  return 'badge badge-amber'
}

const taskLabel = value => ({
  classification: '분류 예측',
  regression: '회귀 예측',
}[value] || '문제 유형 확인 필요')

function reportDataset(report) {
  return report.dataset_name || report.dataset?.filename || report.project?.dataset_name || report.project?.dataset_summary?.filename || '데이터셋 정보 확인 필요'
}

function reportTarget(report) {
  return report.target || report.target_col || report.dataset?.target_col || report.project?.last_target || '예측값 확인 필요'
}

function reportModel(report) {
  return report.best_model || report.model_summary?.best_model || '모델 결과 없음'
}

function reportMetric(report) {
  const summary = report.metric_summary || {}
  if (summary.display) return summary.display
  const value = summary.best_metric ?? report.best_metric
  const name = summary.metric_name || report.metric_name
  if (value === null || value === undefined || value === '') return '성능 지표 확인 필요'
  const formatted = typeof value === 'number' ? value.toFixed(4) : value
  return name ? `${name}: ${formatted}` : formatted
}

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
      <WorkspacePageHeader title="보고서" description="완료된 분석 결과, 주요 모델, 성능 지표와 다음 행동을 확인합니다." action={<button className="btn-primary" onClick={() => nav('/report')}>현재 보고서 열기</button>} />
      <div className="workspace-grid four-columns" style={{ marginBottom: 18 }}>
        <section className="card-compact"><p className="section-title">보고서</p><strong>{readyCount}</strong></section>
        <section className="card-compact"><p className="section-title">모델 요약</p><strong>{modelCount || '확인 필요'}</strong></section>
        <section className="card-compact"><p className="section-title">성능 지표</p><strong>{metricCount || '확인 필요'}</strong></section>
        <section className="card-compact"><p className="section-title">다음 행동</p><strong>{readyCount ? '보고서 검토' : '분석 시작'}</strong></section>
      </div>
      {!safeReports.length ? (
        <section className="card empty-state">
          <strong className="empty-title">아직 보고서가 준비되지 않았어요.</strong>
          <p className="empty-desc">
            CSV를 업로드하고 모델 비교까지 완료하면 데이터셋, 타깃, 모델, 성능 지표가 여기에 표시됩니다.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/upload')}>새 분석 시작</button>
            <button className="btn-secondary" onClick={() => nav('/dashboard')}>상태 보기</button>
          </div>
        </section>
      ) : (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <p className="section-title" style={{ margin: 0 }}>보고서 목록</p>
          <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>보고서</th><th>데이터셋</th><th>예측값</th><th>유형</th><th>추천 모델</th><th>성능 지표</th><th>상태</th><th>다음 행동</th></tr></thead>
            <tbody>{safeReports.map((report, index) => (
              <tr key={`${report.project?.id}-${report.report_id || index}`}>
                <td>
                  <strong>{report.title || `${reportTarget(report)} 예측 분석 보고서`}</strong>
                  <div style={{ color: 'var(--text-label)', fontSize: 12, marginTop: 4 }}>{fmt(report.created_at || report.generated_at)}</div>
                </td>
                <td>{reportDataset(report)}</td>
                <td>{reportTarget(report)}</td>
                <td>{taskLabel(report.task_type || report.project?.last_task_type)}</td>
                <td>{reportModel(report)}</td>
                <td>{reportMetric(report)}</td>
                <td><span className={statusClass(report.status)}>{statusLabel(report.status)}</span></td>
                <td>
                  {report.project?.id
                    ? <Link to={`/projects/${report.project.id}?tab=report`}>보고서 보기</Link>
                    : <button className="btn-secondary" onClick={() => nav('/report')}>현재 보고서 보기</button>}
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
