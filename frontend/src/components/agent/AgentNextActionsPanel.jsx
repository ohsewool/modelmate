import { AlertTriangle, CheckCircle2, FileText, Rocket, Wand2 } from 'lucide-react'
import { Button } from '../ui/button'

function confidenceText(insights) {
  if (!insights) return '판단 대기'
  if ((insights.risk_notes || []).length >= 2) return '검토 필요'
  if ((insights.next_actions || []).length <= 1) return '높음'
  return '보통'
}

function fallbackActions(insights) {
  return [
    insights?.presentation_conclusion || '결과 요약에서 핵심 결론을 확인하세요.',
    '새 데이터 예측 화면에서 모델이 실제 입력에 어떻게 반응하는지 확인하세요.',
    '공유 API를 만들면 같은 모델을 외부 서비스처럼 재사용할 수 있습니다.',
  ]
}

export default function AgentNextActionsPanel({ insights, decision, onReport, onXai, onPredict, onDeploy }) {
  const actions = insights?.next_actions?.length ? insights.next_actions : fallbackActions(insights)
  const risks = insights?.risk_notes || []
  const priority = insights?.agent_priority
  const confidence = confidenceText(insights)
  const quickLinks = [
    ['보고서', FileText, onReport],
    ['이유 보기', CheckCircle2, onXai],
    ['예측 테스트', Wand2, onPredict],
    ['API 공유', Rocket, onDeploy],
  ]

  return (
    <div className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: '#059669', margin: '0 0 5px' }}>에이전트 실행 지시</p>
          <h2 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>이 결과로 바로 할 일</h2>
        </div>
        <span className={confidence === '높음' ? 'badge badge-green' : confidence === '보통' ? 'badge badge-blue' : 'badge badge-amber'}>
          판단 신뢰도 {confidence}
        </span>
      </div>

      <div style={{ padding: 13, borderRadius: 12, border: '1px solid rgba(5,150,105,0.18)', background: 'rgba(5,150,105,0.06)' }}>
        <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{decision?.title}</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{decision?.next}</p>
      </div>

      {priority && (
        <div style={{ display: 'grid', gap: 8, padding: 13, borderRadius: 12, border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>우선 판단 · {priority.level}</p>
            <span className={priority.level === '바로 진행' ? 'badge badge-green' : priority.level === '검토 후 진행' ? 'badge badge-blue' : 'badge badge-amber'}>
              에이전트 권고
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{priority.summary}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(priority.focus || []).slice(0, 4).map(item => <span key={item} className="badge badge-blue">{item}</span>)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {actions.slice(0, 4).map((action, idx) => (
          <div key={`${idx}-${action}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 900 }}>
              {idx + 1}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{action}</p>
          </div>
        ))}
      </div>

      {!!risks.length && (
        <div style={{ display: 'grid', gap: 7 }}>
          {risks.slice(0, 3).map(note => (
            <div key={note} className="banner-warning" style={{ alignItems: 'flex-start' }}>
              <AlertTriangle size={15} />
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{note}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {quickLinks.map(([label, Icon, onClick]) => (
          <Button key={label} variant={label === '보고서' ? 'default' : 'secondary'} onClick={onClick}>
            <Icon size={14} /> {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
