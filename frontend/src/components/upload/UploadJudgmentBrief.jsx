const toneByConfidence = value => {
  if (value === '높음') return { bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', fg: '#047857', label: '신뢰 높음' }
  if (value === '중간') return { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', fg: '#2563eb', label: '검토 권장' }
  return { bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.24)', fg: '#b45309', label: '확인 필요' }
}

export default function UploadJudgmentBrief({
  domain,
  domainConfidence,
  targetName,
  targetCategory,
  targetReason,
  activeCount,
  dropCount,
}) {
  const tone = toneByConfidence(domainConfidence)
  const shouldReview = domainConfidence === '낮음' || targetCategory === '목적 확인 필요'
  const nextAction = shouldReview
    ? '맞힐 값 의미를 확인한 뒤 분석 준비를 실행하세요.'
    : '이 설정으로 바로 모델 비교를 시작할 수 있습니다.'

  return (
    <section className="card" style={{ borderColor: tone.border, background: 'linear-gradient(135deg, var(--surface), rgba(37,99,235,0.035))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>즉석 CSV 판단</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            {domain} 데이터로 보고 {targetCategory} 문제를 준비했습니다
          </h2>
        </div>
        <span style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.fg, fontSize: 11, fontWeight: 900 }}>
          {tone.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <BriefItem label="데이터 분야" value={domain} />
        <BriefItem label="맞힐 값" value={targetName || '-'} />
        <BriefItem label="예측 목적" value={targetCategory} />
        <BriefItem label="사용/제외 정보" value={`${activeCount}개 사용 · ${dropCount}개 제외`} />
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>
          {targetReason}
        </p>
        <div style={{ padding: '9px 11px', borderRadius: 10, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.fg, fontSize: 12, fontWeight: 800, lineHeight: 1.5 }}>
          다음 행동 · {nextAction}
        </div>
      </div>
    </section>
  )
}

function BriefItem({ label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)' }}>
      <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 800, color: 'var(--text-label)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)', lineHeight: 1.35 }}>{value}</p>
    </div>
  )
}
