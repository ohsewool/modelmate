import { buildAdvice, buildDiagnosis, translateReason } from './DatasetQualityMessages'

export default function DatasetQualityCard({ quality, error, onRetry }) {
  if (!quality && !error) return null
  const failed = Boolean(error)
  const info = quality || error?.quality || {}
  const tips = error?.tips || []
  const reasons = info.reasons || []
  const warnings = info.warnings || []
  const advice = buildAdvice(error, info)
  const diagnosis = buildDiagnosis(failed, info, reasons)
  const readiness = info.readiness_label || '학습 가능'
  const demo = demoReadiness(failed, info, warnings)

  return (
    <div className="card" style={{
      borderColor: failed ? 'rgba(220,38,38,0.24)' : 'rgba(5,150,105,0.22)',
      background: failed ? 'rgba(220,38,38,0.05)' : 'rgba(5,150,105,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: failed ? '#dc2626' : '#059669', margin: '0 0 5px' }}>
            업로드 진단
          </p>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
            {failed ? diagnosis.title : `분석 가능한 CSV입니다 · ${readiness}`}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {failed ? diagnosis.body : info.readiness_guide || '행과 열, 변화 있는 값이 있어 모델 비교를 시작할 수 있습니다.'}
          </p>
        </div>
        {onRetry && <button onClick={onRetry} className="btn-secondary" style={{ fontSize: 12 }}>다시 선택</button>}
      </div>

      <div style={{
        display: 'grid',
        gap: 5,
        padding: 11,
        borderRadius: 10,
        border: `1px solid ${demo.color}33`,
        background: demo.bg,
        marginBottom: 12,
      }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: demo.color }}>분석 적합도 · {demo.label}</p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--text-2)' }}>{demo.message}</p>
      </div>

      {error?.message && (
        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.16)', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#b91c1c' }}>{error.message}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: reasons.length || tips.length ? 12 : 0 }}>
        <Metric label="행" value={info.rows ?? '-'} />
        <Metric label="열" value={info.columns ?? '-'} />
        <Metric label="변화 있는 열" value={info.varying_columns ?? '-'} />
        <Metric label="진단 점수" value={info.score ?? '-'} />
      </div>

      {reasons.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: tips.length ? 12 : 0 }}>
          {reasons.map(reason => <p key={reason} style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>막힌 이유: {translateReason(reason)}</p>)}
        </div>
      )}

      {!failed && warnings.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {warnings.map(item => (
            <p key={item} style={{ margin: 0, fontSize: 12, color: '#92400e' }}>주의: {item}</p>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(148,163,184,0.25)', paddingTop: 10 }}>
          {tips.map(tip => <p key={tip} style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-2)' }}>해결: {tip}</p>)}
        </div>
      )}

      {advice.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginTop: tips.length ? 10 : 0, borderTop: '1px solid rgba(148,163,184,0.25)', paddingTop: 10 }}>
          {advice.map(item => <p key={item} style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>다음 행동: {item}</p>)}
        </div>
      )}
    </div>
  )
}

function demoReadiness(failed, info, warnings) {
  if (failed) {
    return {
      label: '사용 어려움',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.06)',
      message: '이 파일은 AutoML 데이터셋보다 문서나 불완전한 표에 가까워, 다른 CSV를 쓰는 편이 안전합니다.',
    }
  }
  const score = Number(info.score ?? 0)
  if (score >= 85 && !warnings?.length) {
    return {
      label: '바로 사용 가능',
      color: '#059669',
      bg: 'rgba(5,150,105,0.07)',
      message: '데이터 구조가 안정적이라 바로 모델 비교와 결과 요약까지 이어가기 좋습니다.',
    }
  }
  if (score >= 65) {
    return {
      label: '검토 후 사용',
      color: '#d97706',
      bg: 'rgba(245,158,11,0.08)',
      message: '분석은 가능하지만 맞힐 값, 제외 열, 데이터 의미를 한 번 확인하면 결과 신뢰도가 좋아집니다.',
    }
  }
  return {
    label: '보완 권장',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.06)',
    message: '학습은 될 수 있지만 결과가 흔들릴 수 있어 행 수나 참고 정보를 보강하는 것이 좋습니다.',
  }
}

function Metric({ label, value }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface)', padding: 10 }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--text)', fontWeight: 900 }}>{value}</p>
    </div>
  )
}
