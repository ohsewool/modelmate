import { Button } from '../ui/button'
import AgentPlanBoard from './AgentPlanBoard'
import AgentQuickUploadCard from './AgentQuickUploadCard'

export default function AgentStartPanel({ fileRef, dragging, setDragging, onFile, summary, onRun, onManual }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
      <AgentPlanBoard activeIndex={-1} />
      <div className="card" style={{ position: 'sticky', top: 20 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', marginBottom: 14 }}>
          <AgentIcon />
        </div>
        <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 8px' }}>CSV로 빠른 자동 분석 시작</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 16px' }}>
          업로드된 데이터를 보고 목적을 정한 뒤 모델 비교와 결론 작성을 이어서 진행합니다.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <Button onClick={onRun}>에이전트 실행</Button>
          <Button onClick={onManual} variant="secondary">직접 모델 고르기</Button>
        </div>
      </div>
      <AgentQuickUploadCard fileRef={fileRef} dragging={dragging} setDragging={setDragging} onFile={onFile} summary={summary} />
    </div>
  )
}

function AgentIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M8 8H4a2 2 0 00-2 2v2a2 2 0 002 2h1" /><path d="M16 8h4a2 2 0 012 2v2a2 2 0 01-2 2h-1" /><path d="M9 20h6" /><path d="M12 14v6" /></svg>
}
