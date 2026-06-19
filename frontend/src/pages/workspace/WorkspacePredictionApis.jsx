import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingState, StatusBadge, WorkspacePageHeader, statusLabel } from '../../components/workspace-shell/WorkspaceStates'
import { asArray, fmt, loadPredictionApiRows } from './workspaceData'
import api from '../../api'

function latestUsed(tokens) {
  return asArray(tokens).map(token => token?.last_used_at).filter(Boolean).sort().at(-1) || '아직 호출 없음'
}

function projectTarget(project) {
  return project?.last_target || project?.dataset_summary?.target_col || project?.latest_run?.target || '타깃 확인 필요'
}

function projectDataset(project) {
  return project?.dataset_name || project?.dataset_summary?.filename || project?.latest_dataset?.filename || '데이터셋 정보 확인 필요'
}

function taskLabel(value) {
  return ({ classification: '분류 예측', regression: '회귀 예측' }[value] || '문제 유형 확인 필요')
}

function projectMetric(project) {
  if (project?.last_metric_value !== undefined && project?.last_metric_value !== null) {
    const value = Number(project.last_metric_value)
    const formatted = Number.isFinite(value) ? value.toFixed(4) : project.last_metric_value
    return project.last_metric_name ? `${project.last_metric_name}: ${formatted}` : formatted
  }
  return '성능 지표 확인 필요'
}

function apiReadiness(row) {
  const availability = row?.availability || {}
  const project = row?.project || {}
  const tokens = asArray(row?.tokens)
  const hasActiveToken = tokens.some(token => token?.status === 'active')
  const hasModel = Boolean(project.last_best_model || availability.model_id || availability.model_ready)
  const hasMetric = project.last_metric_value !== undefined && project.last_metric_value !== null
  const hasTarget = Boolean(projectTarget(project) && projectTarget(project) !== '타깃 확인 필요')
  const status = project.last_status || availability.reason

  if (status === 'failed') {
    return {
      state: 'failed',
      label: '분석 실패',
      tone: 'badge badge-red',
      action: '분석 다시 실행하기',
      explanation: '분석이 실패해 예측 API로 연결할 수 없습니다.',
      canOpenApi: false,
    }
  }
  if (availability.dataset_active === false || String(availability.reason || '').includes('deleted')) {
    return {
      state: 'failed',
      label: 'API 연결 불가',
      tone: 'badge badge-red',
      action: '데이터셋 다시 확인',
      explanation: '연결된 데이터셋 또는 프로젝트가 삭제되어 예측 API를 사용할 수 없습니다.',
      canOpenApi: false,
    }
  }
  if (availability.available && hasActiveToken) {
    return {
      state: 'ready',
      label: 'API 연결 가능',
      tone: 'badge badge-green',
      action: 'API 보기',
      explanation: '분석 결과와 API 인증 정보가 준비되어 외부 요청에 사용할 수 있습니다.',
      canOpenApi: true,
    }
  }
  if (availability.available && !hasActiveToken) {
    return {
      state: 'ready',
      label: 'API 생성 준비 완료',
      tone: 'badge badge-green',
      action: 'API 만들기',
      explanation: '모델과 데이터셋은 준비되었습니다. 프로젝트 상세에서 API 인증 정보를 생성할 수 있습니다.',
      canOpenApi: true,
    }
  }
  if (hasModel && hasTarget && (hasMetric || project.last_status === 'needs_review')) {
    return {
      state: 'review_required',
      label: '검토 후 API 연결 가능',
      tone: 'badge badge-amber',
      action: '결과 검토하기',
      explanation: '분석 결과는 있지만 성능, 주요 요인, 사용 목적을 확인한 뒤 API로 연결하는 것이 안전합니다.',
      canOpenApi: false,
    }
  }
  return {
    state: 'not_ready',
    label: 'API 연결 준비 중',
    tone: 'badge badge-blue',
    action: '분석 결과 확인 필요',
    explanation: '모델 비교가 완료된 분석 결과만 예측 API로 만들 수 있습니다.',
    canOpenApi: false,
  }
}

function availabilityText(row) {
  return apiReadiness(row).explanation
}

function readinessLabel(row) {
  return apiReadiness(row).label
}

function readinessTone(row) {
  return apiReadiness(row).tone
}

function ReadinessOverview({ rows, onOpenSettings }) {
  const safeRows = asArray(rows)
  const readiness = safeRows.map(apiReadiness)
  const usable = readiness.filter(item => item.state === 'ready').length
  const needsReview = readiness.filter(item => item.state === 'review_required').length
  const notReady = readiness.filter(item => item.state === 'not_ready').length
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 6 }}>API 연결 상태 요약</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>예측 API 준비 상태</h2>
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
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>준비 중</p>
          <strong>{notReady}개</strong>
        </div>
        <div className="card-compact">
          <p style={{ margin: '0 0 6px', color: 'var(--text-label)', fontSize: 11, fontWeight: 800 }}>보안 안내</p>
          <strong>인증 정보 일부만 표시</strong>
        </div>
      </div>
      <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          예측 API는 분석 결과를 재사용하기 위한 MVP 기능입니다. 운영 배포 자동화가 아니며, 보고서의 성능과 주의사항을 먼저 확인한 뒤 연결하세요.
        </p>
      </div>
    </section>
  )
}

function ApiExamplePanel({ row }) {
  const project = row?.project || {}
  const endpoint = row?.availability?.endpoint || (project?.id ? `/api/predict/${project.id}` : '/api/predict/{project_id}')
  const sampleFeatures = inferExampleFeatures(project)
  const payload = JSON.stringify({ records: [sampleFeatures] }, null, 2)
  const responseExample = JSON.stringify({
    status: 'ok',
    prediction: { prediction: 'class_or_value', confidence: 0.87 },
  }, null, 2)
  const curl = `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <prediction_api_token>" \\\n  -d '${payload.replace(/\n/g, '')}'`
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">API 문서 미리보기</p>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
        실제 endpoint와 API 인증 정보는 프로젝트 상세 화면에서 확인하세요. 전체 인증 값은 생성 직후 한 번만 표시됩니다.
      </p>
      <div className="workspace-grid two-columns">
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>Endpoint</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>
            <code>POST {endpoint}</code>
          </p>
        </div>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>API 인증 정보</strong>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>
            <code>Authorization: Bearer &lt;prediction_api_token&gt;</code>
          </p>
        </div>
      </div>
      <div className="workspace-grid two-columns">
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>Request JSON</strong>
          <code style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{payload}</code>
        </div>
        <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
          <strong>Response JSON</strong>
          <code style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{responseExample}</code>
        </div>
      </div>
      <pre style={{ margin: 0, padding: 14, borderRadius: 12, overflowX: 'auto', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}><code>{curl}</code></pre>
    </section>
  )
}

function inferExampleFeatures(project) {
  const excluded = new Set([projectTarget(project), 'target', 'label', 'prediction'])
  const columns = [
    ...(Array.isArray(project?.dataset_summary?.columns) ? project.dataset_summary.columns : []),
    ...(Array.isArray(project?.latest_dataset?.columns) ? project.latest_dataset.columns : []),
  ].filter(column => column && !excluded.has(column)).slice(0, 3)
  if (!columns.length) return { feature_1: 10, feature_2: 'A' }
  return Object.fromEntries(columns.map((column, index) => [column, index === 0 ? 10 : 'value']))
}

export default function WorkspacePredictionApis() {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.get('/projects').then(res => loadPredictionApiRows(asArray(res.data))).then(setRows).catch(() => setRows([]))
  }, [])

  if (!rows) return <div style={{ padding: 24 }}><LoadingState label="예측 API 상태를 불러오는 중입니다." /></div>

  const visible = asArray(rows).filter(row => row?.availability || asArray(row?.tokens).length)
  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <WorkspacePageHeader
        title="예측 API"
        description="분석 결과를 재사용 가능한 예측 API로 연결할 수 있는지 확인합니다."
        action={<button className="btn-primary" onClick={() => nav('/deploy')}>API 설정 열기</button>}
      />
      <ReadinessOverview rows={visible} onOpenSettings={() => nav('/deploy')} />
      {!visible.length ? (
        <section className="card empty-state">
          <strong className="empty-title">아직 사용할 수 있는 예측 API가 없습니다.</strong>
          <p className="empty-desc">
            모델 비교가 완료된 분석 결과에서 API 인증 정보를 만들면 여기에 표시됩니다. 먼저 CSV 분석을 완료해 주세요.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/upload')}>새 분석 시작</button>
            <button className="btn-secondary" onClick={() => nav('/reports')}>결과 보고서 보기</button>
          </div>
        </section>
      ) : (
        <>
          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <p className="section-title" style={{ margin: 0 }}>예측 API 목록</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>프로젝트</th>
                    <th>API 준비도</th>
                    <th>데이터셋/타깃</th>
                    <th>모델/성능</th>
                    <th>API 인증 정보</th>
                    <th>마지막 사용</th>
                    <th>호출 수</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>{visible.map((row, index) => {
                  const tokens = asArray(row?.tokens)
                  const project = row?.project || {}
                  const projectId = project.id
                  const active = tokens.filter(token => token?.status === 'active')
                  const revoked = tokens.filter(token => token?.status === 'revoked')
                  const calls = tokens.reduce((sum, token) => sum + Number(token?.usage_count || 0), 0)
                  const status = availabilityStatus(row)
                  const readiness = apiReadiness(row)
                  return (
                    <tr key={projectId || row?.model_id || row?.id || index}>
                      <td>
                        {projectId ? <Link to={`/projects/${projectId}?tab=api`}><strong>{project.name || '프로젝트'}</strong></Link> : <strong>{project.name || '프로젝트 정보 없음'}</strong>}
                        <br />
                        <span style={{ color: 'var(--text-label)' }}>{projectId ? String(projectId).slice(0, 8) : '연결 정보 없음'}</span>
                      </td>
                      <td>
                        <span className={readinessTone(row)}>{readinessLabel(row)}</span>
                        <br />
                        <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{readiness.explanation}</span>
                      </td>
                      <td>
                        <strong>{projectDataset(project)}</strong>
                        <br />
                        <span style={{ color: 'var(--text-label)' }}>{projectTarget(project)} · {taskLabel(project.last_task_type)}</span>
                      </td>
                      <td>
                        <strong>{project.last_best_model || row.availability?.model_id || '모델 결과 확인 필요'}</strong>
                        <br />
                        <span style={{ color: 'var(--text-label)' }}>{projectMetric(project)}</span>
                      </td>
                      <td>
                        {active.length} 활성 / {revoked.length} 폐기 / {tokens.length} 전체
                        <br />
                        <span style={{ color: 'var(--text-label)' }}>전체 API 인증 값은 다시 표시하지 않습니다.</span>
                      </td>
                      <td>{latestUsed(tokens)}</td>
                      <td>{calls}</td>
                      <td>
                        <button
                          className={readiness.state === 'ready' ? 'btn-primary' : 'btn-secondary'}
                          disabled={!projectId}
                          onClick={() => projectId && nav(readiness.state === 'failed' ? `/projects/${projectId}?tab=runs` : `/projects/${projectId}?tab=api`)}
                        >
                          {readiness.action}
                        </button>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </section>
          <ApiExamplePanel row={visible[0]} />
        </>
      )}
    </div>
  )
}
