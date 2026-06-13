import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import { fmt, loadPredictionApiRows } from './workspaceData'
import api from '../../api'

function latestUsed(tokens) {
  return tokens.map(token => token.last_used_at).filter(Boolean).sort().at(-1) || '-'
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
      <WorkspacePageHeader title="예측 API" description="프로젝트별 예측 API token으로 학습된 모델을 재사용할 수 있는 프로젝트를 확인합니다." action={<button className="btn-primary" onClick={() => nav('/deploy')}>token 관리</button>} />
      {!visible.length ? (
        <EmptyState title="아직 사용할 수 있는 예측 API가 없습니다." description="분석이 완료된 프로젝트에서 예측 API를 만들면 여기에 표시됩니다." action={<button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>프로젝트</th><th>API 상태</th><th>token</th><th>마지막 사용</th><th>호출 수</th><th>데이터셋/모델</th><th>작업</th></tr></thead>
            <tbody>{visible.map(row => {
              const active = row.tokens.filter(token => token.status === 'active')
              const calls = row.tokens.reduce((sum, token) => sum + Number(token.usage_count || 0), 0)
              return (
                <tr key={row.project.id}>
                  <td><Link to={`/projects/${row.project.id}?tab=api`}><strong>{row.project.name}</strong></Link><br /><span style={{ color: 'var(--text-label)' }}>{row.project.id}</span></td>
                  <td><StatusBadge status={row.availability?.available ? 'ready' : 'warning'} /></td>
                  <td>{active.length} 활성 / {row.tokens.length} 전체</td>
                  <td>{latestUsed(row.tokens)}</td>
                  <td>{calls}</td>
                  <td>{row.availability?.dataset_active ? '데이터셋 활성' : fmt(row.availability?.reason)} - {row.availability?.model_ready ? '모델 준비됨' : '모델 필요'}</td>
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
