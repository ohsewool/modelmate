import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import AgentInsightCards from '../AgentInsightCards'
import AgentDecisionBoard from './AgentDecisionBoard'
import AgentPlanBoard, { AGENT_PLAN } from './AgentPlanBoard'
import AgentStepCard from './AgentStepCard'

export default function AgentResultPanel({ result, steps, decision, onReport, onXai }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 16, alignItems: 'start' }}>
        <AgentPlanBoard activeIndex={AGENT_PLAN.length} completed />
        <AgentDecisionBoard decision={decision} />
      </div>
      <AgentInsightCards insights={result.agent_insights} />
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 5px' }}>판단 로그</p>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>AI가 남긴 실행 기록</h2>
          </div>
          <Badge variant={result.demo_mode ? 'secondary' : 'default'}>{result.demo_mode ? '데모 모드' : 'AI 설명 사용'}</Badge>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {steps.map((step, idx) => <AgentStepCard key={`${step.step}-${idx}`} step={step} idx={idx} />)}
        </div>
      </div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>AI 분석 코치가 결론을 만들었습니다</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
            결과 요약에서 발표용 설명을 확인하고, 이유 보기에서 근거를 더 자세히 볼 수 있습니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button onClick={onReport}>결과 요약 보기</Button>
          <Button onClick={onXai} variant="secondary">이유 보기</Button>
        </div>
      </div>
    </div>
  )
}
