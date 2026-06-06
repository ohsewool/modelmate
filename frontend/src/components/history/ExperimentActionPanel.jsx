import { BarChart3, FileText, RefreshCw, Rocket, Wand2 } from 'lucide-react'
import { Button } from '../ui/button'

const fmtMetric = metric => {
  if (!metric?.label) return '-'
  const value = typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value
  return `${metric.label} ${value ?? '-'}`
}

function reuseFrom(item) {
  const reuse = item?.reuse_config || {}
  const shape = reuse.data_shape || item?.data_shape || []
  return {
    filename: reuse.filename || item?.dataset_ref?.filename || '이전 실험 CSV',
    dataset_id: reuse.dataset_id || item?.dataset_ref?.id,
    domain: reuse.dataset_domain || item?.dataset_domain || item?.dataset_ref?.domain,
    target_col: reuse.target_col || item?.target,
    target_category: reuse.target_category || item?.target_category,
    drop_cols: reuse.drop_cols || item?.drop_cols || [],
    auto_drop_cols: reuse.auto_drop_cols || item?.auto_drop_cols || [],
    active_features: reuse.active_features || [],
    rows: shape?.[0] || item?.dataset_ref?.rows,
    columns: shape?.[1] || item?.dataset_ref?.columns,
    task_type: reuse.task_type || item?.task_type,
    best_model: reuse.best_model || item?.best_model,
    metric: reuse.metric,
  }
}

const actions = [
  ['rerun', RefreshCw, '같은 설정으로 다시 분석', '같은 CSV를 다시 올리면 이전 타겟과 제외 정보를 자동으로 맞춥니다.', 'CSV 다시 올리기', '/upload'],
  ['predict', Wand2, '저장 모델로 예측', '이 실험에서 선택된 모델을 기준으로 새 데이터를 예측하는 화면으로 이동합니다.', '예측하기', '/predict'],
  ['share', Rocket, '공유/API로 연결', '선택 모델을 공유 모델이나 API 사용 흐름으로 이어갑니다.', '공유 관리', '/deploy'],
  ['report', FileText, '보고서 다시 보기', '저장된 실험 결과를 발표용 요약 화면으로 다시 엽니다.', '결과 요약', '/report'],
]

export default function ExperimentActionPanel({ item, onNavigate }) {
  const reuse = reuseFrom(item)
  const hasModel = Boolean(reuse.best_model)
  const reanalysisState = { reanalysisExperiment: reuse }
  const selectedState = { selectedExperiment: reuse }
  const reportState = { historyReport: item }
  const stateFor = key => {
    if (key === 'rerun') return reanalysisState
    if (key === 'report') return reportState
    return selectedState
  }

  return (
    <div className="card-elevated" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.09)', color: '#2563eb' }}>
          <BarChart3 size={18} />
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>
            이 실험을 다시 사용할 수 있습니다
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {reuse.domain || '데이터 분야 미확인'} / {reuse.target_col || '맞힐 값 없음'} / {reuse.best_model || '선택 모델 없음'} / {fmtMetric(reuse.metric)}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="badge badge-blue">타겟 {reuse.target_col || '-'}</span>
        <span className="badge badge-green">사용 정보 {reuse.active_features.length || '-' }개</span>
        <span className="badge badge-amber">제외 정보 {(reuse.drop_cols.length + reuse.auto_drop_cols.length) || 0}개</span>
        <span className="badge badge-violet">{reuse.task_type || '분석 유형'}</span>
      </div>

      <div className="experiment-action-grid">
        {actions.map(([key, Icon, title, desc, label, to]) => {
          const disabled = !hasModel && key !== 'rerun'
          return (
            <div
              key={key}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onNavigate?.(to, stateFor(key))}
              onKeyDown={event => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) onNavigate?.(to, stateFor(key))
              }}
              className="card-elevated"
              style={{ padding: 12, textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}
            >
              <Icon size={16} color={disabled ? '#94a3b8' : '#2563eb'} />
              <p style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{title}</p>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>{desc}</p>
              <Button size="sm" variant={disabled ? 'secondary' : 'default'} disabled={disabled}>{label}</Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
