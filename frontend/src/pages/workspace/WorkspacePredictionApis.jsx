import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingState, StatusBadge, WorkspacePageHeader, statusLabel } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadPredictionApiRows } from './workspaceData'
import api from '../../api'

function latestUsed(tokens) {
  return tokens.map(token => token.last_used_at).filter(Boolean).sort().at(-1) || '-'
}

function availabilityStatus(row) {
  if (row.availability?.available) return 'active'
  const reason = row.availability?.reason || ''
  if (reason.includes('deleted')) return 'deleted'
  if (reason.includes('model')) return 'needs_review'
  return 'disabled'
}

function availabilityText(row) {
  if (row.availability?.available) return '예측 API를 사용할 수 있습니다.'
  if (row.availability?.dataset_active === false) return '연결된 데이터셋이 삭제되어 예측 API를 사용할 수 없습니다.'
  if (row.availability?.model_ready === false) return '모델이 아직 준비되지 않았습니다.'
  return fmt(row.availability?.reason || '사용 가능 상태를 확인해야 합니다.')
}

function readinessLabel(row) {
  if (!row) return 'API 연결 전 검토가 필요합니다.'
  if (row.availability?.available && row.tokens.some(token => token.status === 'active')) return 'API 연결 가능'
  if (row.availability?.available) return 'API token 생성 필요'
  if (row.availability?.dataset_active === false || row.availability?.model_ready === false) return 'API 연결 권장하지 않음'
  return 'API 연결 전 검토가 필요합니다.'
}

function readinessTone(row) {
  const label = readinessLabel(row)
  if (label === 'API 연결 가능') return 'badge badge-green'
  if (label === 'API 연결 권장하지 않음') return 'badge badge-amber'
  return 'badge badge-blue'
}

function ReadinessOverview({ rows, onOpenSettings }) {
  const usable = rows.filter(row => row.availability?.available && row.tokens.some(token => token.status === 'active')).length
  const needsReview = rows.filter(row => readinessLabel(row) !== 'API 연결 가능').length
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 6 }}>API 연결 상태 요약</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>API 연결 상태</h2>
        </div>
        <button className="btn-secondary" onClick={onOpenSettings}>API 설정 열기</button>
      </div>
      <div className="workspace-grid four-columns">
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>API 연결 가능</p>
          <strong>{usable}개</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>검토 필요</p>
          <strong>{needsReview}개</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>전체 프로젝트</p>
          <strong>{rows.length}개</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>보안 안내</p>
          <strong>token 일부만 표시</strong>
        </div>
      </div>
      <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          운영 연결 전 보고서와 데이터 품질을 확인하세요.
        </p>
      </div>
    </section>
  )
}

function ApiExamplePanel({ row }) {
  const endpoint = row?.project?.id ? `/api/projects/${row.project.id}/predict` : '/api/v2/<model_id>/predict'
  const payload = JSON.stringify({ records: [{ feature_1: 10, feature_2: 'A' }] }, null, 2)
  const curl = `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <prediction_api_token>" \\\n  -d '${payload.replace(/\n/g, '')}'`
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">요청 예시</p>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
        endpoint와 token은 프로젝트 상세에서 확인하세요.
      </p>
      <div className="workspace-grid two-columns">
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>필수 입력 항목</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>
            학습 컬럼과 같은 이름의 JSON 값을 보내세요.
          </p>
        </div>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>응답 예시</strong>
          <code style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify({ prediction: 'class_A', confidence: 0.82 }, null, 2)}</code>
        </div>
      </div>
      <pre style={{ margin: 0, padding: 14, borderRadius: 12, overflowX: 'auto', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}><code>{curl}</code></pre>
    </section>
  )
}

export default function WorkspacePredictionApis() {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.get('/projects').then(res => loadPredictionApiRows(res.data || [])).then(setRows).catch(() => setRows([]))
  }, [])

  if (!rows) return <div style={{ padding: 24 }}><LoadingState label="예측 API 상태를 불러오는 중입니다." /></div>

  const visible = rows.filter(row => row.availability || row.tokens.length)
  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader
        title="예측 API"
        description="API 준비도와 token 상태를 확인합니다."
        action={<button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>}
      />
      <ReadinessOverview rows={visible} onOpenSettings={() => nav('/deploy')} />
      {!visible.length ? (
        <section className="card empty-state">
          <strong className="empty-title">아직 예측 API가 없어요.</strong>
          <p className="empty-desc">
            분석 완료 후 API token을 만들면 여기에 표시됩니다.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>
            <button className="btn-secondary" onClick={() => nav('/agent-mode')}>분석 시작</button>
          </div>
        </section>
      ) : (
        <>
          <section className="card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>프로젝트</th>
                  <th>API 준비도</th>
                  <th>token</th>
                  <th>마지막 사용</th>
                  <th>호출 수</th>
                  <th>데이터셋/모델</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>{visible.map(row => {
                const active = row.tokens.filter(token => token.status === 'active')
                const revoked = row.tokens.filter(token => token.status === 'revoked')
                const calls = row.tokens.reduce((sum, token) => sum + Number(token.usage_count || 0), 0)
                const status = availabilityStatus(row)
                return (
                  <tr key={row.project.id}>
                    <td>
                      <Link to={`/projects/${row.project.id}?tab=api`}><strong>{row.project.name}</strong></Link>
                      <br />
                      <span style={{ color: 'var(--text-label)' }}>{String(row.project.id).slice(0, 8)}</span>
                    </td>
                    <td>
                      <span className={readinessTone(row)}>{readinessLabel(row)}</span>
                      <br />
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      {active.length} 활성 / {revoked.length} 폐기 / {row.tokens.length} 전체
                      <br />
                      <span style={{ color: 'var(--text-label)' }}>전체 token은 표시하지 않습니다.</span>
                    </td>
                    <td>{latestUsed(row.tokens)}</td>
                    <td>{calls}</td>
                    <td>
                      <strong>{statusLabel(status)}</strong>
                      <br />
                      <span style={{ color: 'var(--text-2)' }}>{availabilityText(row)}</span>
                    </td>
                    <td><button className="btn-secondary" onClick={() => nav(`/projects/${row.project.id}?tab=api`)}>token 관리</button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </section>
          <ApiExamplePanel row={visible[0]} />
        </>
      )}
    </div>
  )
}
