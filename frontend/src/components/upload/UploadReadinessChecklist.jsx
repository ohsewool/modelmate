import { AlertTriangle, CheckCircle2, Eye, Target } from 'lucide-react'

function statusTone(status) {
  if (status === 'pass') return { icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.07)', label: '통과' }
  if (status === 'warn') return { icon: AlertTriangle, color: '#d97706', bg: 'rgba(245,158,11,0.09)', label: '확인' }
  return { icon: Eye, color: '#2563eb', bg: 'rgba(37,99,235,0.07)', label: '검토' }
}

function confidenceStatus(value) {
  if (value === '높음') return 'pass'
  if (value === '중간') return 'review'
  return 'warn'
}

export default function UploadReadinessChecklist({
  rows,
  cols,
  missingTotal,
  domain,
  domainConfidence,
  target,
  targetConfidence,
  activeCount,
  dropCount,
}) {
  const checks = [
    {
      title: '표 데이터 구조',
      body: `${Number(rows || 0).toLocaleString()}행, ${cols || 0}개 컬럼을 분석했습니다.`,
      status: rows >= 5 && cols >= 2 ? 'pass' : 'warn',
    },
    {
      title: '데이터 분야 판단',
      body: `${domain || '도메인 확인 필요'} / 확신도 ${domainConfidence || '낮음'}`,
      status: confidenceStatus(domainConfidence),
    },
    {
      title: '맞힐 값 후보',
      body: `${target || '선택 필요'} / 확신도 ${targetConfidence || '낮음'}`,
      status: confidenceStatus(targetConfidence),
    },
    {
      title: '사용 정보 정리',
      body: `${activeCount || 0}개 사용, ${dropCount || 0}개 제외로 모델 입력을 준비했습니다.`,
      status: activeCount > 0 ? 'pass' : 'warn',
    },
    {
      title: '결측값 확인',
      body: missingTotal ? `비어 있는 값 ${missingTotal}개가 있어 학습 전 확인이 좋습니다.` : '비어 있는 값이 없어 바로 진행하기 좋습니다.',
      status: missingTotal ? 'review' : 'pass',
    },
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.09)', color: '#2563eb' }}>
          <Target size={18} />
        </div>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>분석 준비도 점검</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>임의 CSV를 올렸을 때 바로 설명 가능한지 확인합니다.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 9 }}>
        {checks.map(check => {
          const tone = statusTone(check.status)
          const Icon = tone.icon
          return (
            <div key={check.title} style={{ padding: 11, borderRadius: 10, border: `1px solid ${tone.color}22`, background: tone.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>{check.title}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 900, color: tone.color }}>
                  <Icon size={13} /> {tone.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{check.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
