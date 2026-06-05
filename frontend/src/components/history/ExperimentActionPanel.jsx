import { BarChart3, FileText, RefreshCw, Rocket, Wand2 } from 'lucide-react'
import { Button } from '../ui/button'

const actions = [
  {
    key: 'rerun',
    icon: RefreshCw,
    title: '같은 설정으로 다시 분석',
    desc: '원본 CSV를 다시 올리고 이전 타겟, 도메인, 모델 판단을 참고해 이어갑니다.',
    label: 'CSV 다시 올리기',
    to: '/upload',
  },
  {
    key: 'predict',
    icon: Wand2,
    title: '새 데이터에 바로 적용',
    desc: '학습된 모델에 새 값을 넣어 한 건 또는 여러 건을 예측합니다.',
    label: '예측하기',
    to: '/predict',
  },
  {
    key: 'share',
    icon: Rocket,
    title: 'API로 공유',
    desc: '선택한 모델을 고정 URL로 만들어 다른 화면이나 서비스에서 재사용합니다.',
    label: '공유 관리',
    to: '/deploy',
  },
  {
    key: 'report',
    icon: FileText,
    title: '보고서로 정리',
    desc: '데이터 판단, 모델 선택 이유, 성능과 주의점을 발표용으로 확인합니다.',
    label: '결과 요약',
    to: '/report',
  },
]

export default function ExperimentActionPanel({ item, onNavigate }) {
  const hasModel = Boolean(item?.best_model)
  const reanalysisState = {
    reanalysisExperiment: {
      filename: item?.dataset_ref?.filename || '이전 실험 CSV',
      domain: item?.dataset_domain || item?.dataset_ref?.domain,
      target_col: item?.target,
      target_category: item?.target_category,
      drop_cols: item?.drop_cols || [],
      auto_drop_cols: item?.auto_drop_cols || [],
      rows: item?.data_shape?.[0] || item?.dataset_ref?.rows,
      columns: item?.data_shape?.[1] || item?.dataset_ref?.columns,
      best_model: item?.best_model,
    },
  }
  return (
    <div className="card-elevated" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.09)', color: '#2563eb' }}>
          <BarChart3 size={18} />
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>
            이 실험으로 다음 작업 이어가기
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {item?.dataset_domain || '업로드 데이터'} / {item?.target || '맞히려는 값'} / {item?.best_model || '선택 모델 없음'}
          </p>
        </div>
      </div>
      <div className="experiment-action-grid">
        {actions.map(action => {
          const Icon = action.icon
          const disabled = !hasModel && action.key !== 'rerun'
          return (
            <div
              key={action.key}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onNavigate?.(action.to, action.key === 'rerun' ? reanalysisState : undefined)}
              onKeyDown={event => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  onNavigate?.(action.to, action.key === 'rerun' ? reanalysisState : undefined)
                }
              }}
              className="card-elevated"
              style={{
                padding: 12,
                textAlign: 'left',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <Icon size={16} color={disabled ? '#94a3b8' : '#2563eb'} />
              <p style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{action.title}</p>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>{action.desc}</p>
              <Button size="sm" variant={disabled ? 'secondary' : 'default'} disabled={disabled}>{action.label}</Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
