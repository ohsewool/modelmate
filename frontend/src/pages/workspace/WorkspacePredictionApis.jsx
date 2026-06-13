import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader, statusLabel } from '../../components/workspace-shell/WorkspaceStates'
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
        description="프로젝트별 API token 상태, 사용 가능 여부, 호출 횟수, 데이터셋/모델 준비 상태를 확인합니다."
        action={<button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>}
      />
      {!visible.length ? (
        <EmptyState
          title="아직 사용할 수 있는 예측 API가 없습니다."
          description="분석을 완료한 프로젝트에서 예측 API를 만들면 여기에 표시됩니다."
          action={<button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>}
        />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>프로젝트</th>
                <th>API 상태</th>
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
                    <span style={{ color: 'var(--text-label)' }}>{row.project.id}</span>
                  </td>
                  <td><StatusBadge status={status} /></td>
                  <td>
                    {active.length} 활성 / {revoked.length} 폐기 / {row.tokens.length} 전체
                    <br />
                    <span style={{ color: 'var(--text-label)' }}>목록에는 전체 token을 표시하지 않습니다.</span>
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
      )}
    </div>
  )
}
