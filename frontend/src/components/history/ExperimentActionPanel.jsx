import { BarChart3, FileText, RefreshCw, Rocket, Wand2 } from 'lucide-react'
import { Button } from '../ui/button'

const actions = [
  {
    key: 'rerun',
    icon: RefreshCw,
    title: '같은 데이터로 다시 개선',
    desc: '모델 비교와 자동 개선을 다시 실행해 최신 기준으로 점수를 확인합니다.',
    label: '모델 고르기',
    to: '/model-lab',
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
              onClick={() => !disabled && onNavigate?.(action.to)}
              onKeyDown={event => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) onNavigate?.(action.to)
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
