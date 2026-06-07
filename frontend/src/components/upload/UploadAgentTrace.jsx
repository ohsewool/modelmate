import { BrainCircuit, CheckCircle2, Eye, ListFilter, MoveRight } from 'lucide-react'

function tone(confidence) {
  if (confidence === '높음') return { badge: 'badge badge-green', label: '자동 판단' }
  if (confidence === '중간') return { badge: 'badge badge-blue', label: '검토 권장' }
  return { badge: 'badge badge-amber', label: '확인 필요' }
}

function buildSteps({ domain, domainReason, domainConfidence, target, targetCategory, targetReason, targetConfidence, dropCount, activeCount }) {
  return [
    {
      icon: BrainCircuit,
      title: '데이터 성격 판단',
      value: domain,
      body: domainReason || '컬럼명과 값의 형태로 어떤 업무 데이터인지 먼저 추정했습니다.',
      tone: tone(domainConfidence),
    },
    {
      icon: Eye,
      title: '맞힐 값 해석',
      value: `${target || '-'} · ${targetCategory}`,
      body: targetReason,
      tone: tone(targetConfidence),
    },
    {
      icon: ListFilter,
      title: '사용 정보 정리',
      value: `${activeCount}개 사용 · ${dropCount}개 제외`,
      body: dropCount ? 'ID, 날짜, 정답을 직접 알려줄 수 있는 컬럼을 우선 제외했습니다.' : '현재는 제외 없이 모델 입력을 구성할 수 있습니다.',
      tone: { badge: dropCount ? 'badge badge-blue' : 'badge badge-green', label: dropCount ? '정리됨' : '그대로 사용' },
    },
    {
      icon: CheckCircle2,
      title: '다음 실행',
      value: '분석 준비',
      body: '설정이 맞으면 분석 준비를 실행하고, 이후 모델 비교에서 가장 적합한 모델을 고릅니다.',
      tone: { badge: 'badge badge-violet', label: '다음 단계' },
    },
  ]
}

export default function UploadAgentTrace(props) {
  const steps = buildSteps(props)
  return (
    <section className="card" style={{ display: 'grid', gap: 13 }}>
      <div>
        <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>AI 판단 로그</p>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
          CSV를 분석 흐름으로 바꾼 과정
        </h2>
      </div>
      <div className="upload-agent-trace" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="card-elevated" style={{ padding: 12, position: 'relative' }}>
              {idx < steps.length - 1 && (
                <MoveRight className="upload-agent-arrow" size={15} color="#94a3b8" style={{ position: 'absolute', right: -13, top: 18 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Icon size={16} color="#7c3aed" />
                <span className={step.tone.badge}>{step.tone.label}</span>
              </div>
              <p style={{ margin: '0 0 5px', fontSize: 12, color: 'var(--text-label)', fontWeight: 800 }}>{step.title}</p>
              <p style={{ margin: '0 0 7px', fontSize: 14, color: 'var(--text)', fontWeight: 900, lineHeight: 1.35 }}>{step.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{step.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
