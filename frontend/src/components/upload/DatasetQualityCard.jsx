export default function DatasetQualityCard({ quality, error, onRetry }) {
  if (!quality && !error) return null
  const failed = Boolean(error)
  const info = quality || error?.quality || {}
  const tips = error?.tips || []
  const reasons = info.reasons || []
  const advice = buildAdvice(error, info)

  return (
    <div className="card" style={{
      borderColor: failed ? 'rgba(220,38,38,0.24)' : 'rgba(5,150,105,0.22)',
      background: failed ? 'rgba(220,38,38,0.05)' : 'rgba(5,150,105,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: failed ? '#dc2626' : '#059669', margin: '0 0 5px' }}>
            데이터셋 진단
          </p>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
            {failed ? '이 파일은 바로 분석하기 어렵습니다' : '분석 가능한 표 데이터입니다'}
          </h2>
        </div>
        {onRetry && <button onClick={onRetry} className="btn-secondary" style={{ fontSize: 12 }}>다시 선택</button>}
      </div>

      {error?.message && <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#b91c1c' }}>{error.message}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: reasons.length || tips.length ? 12 : 0 }}>
        <Metric label="행" value={info.rows ?? '-'} />
        <Metric label="열" value={info.columns ?? '-'} />
        <Metric label="변화 있는 열" value={info.varying_columns ?? '-'} />
        <Metric label="진단 점수" value={info.score ?? '-'} />
      </div>

      {reasons.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: tips.length ? 12 : 0 }}>
          {reasons.map(reason => <p key={reason} style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>문제: {reason}</p>)}
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

function Metric({ label, value }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface)', padding: 10 }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--text)', fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function buildAdvice(error, info) {
  if (!error) return []
  const rows = Number(info.rows || 0)
  const cols = Number(info.columns || 0)
  const varying = Number(info.varying_columns || 0)
  if (rows === 0 || cols === 0) return ['엑셀에서 CSV로 다시 저장한 뒤 첫 행에 컬럼명이 있는지 확인하세요.']
  if (cols < 2) return ['예측할 값과 참고할 정보가 최소 2개 열 이상 필요합니다.']
  if (rows < 10) return ['데모 분석은 가능하지만 모델 비교에는 행이 더 많은 CSV가 안정적입니다.']
  if (varying < 2) return ['모든 행이 거의 같은 값이면 학습할 패턴이 부족하므로 다른 열을 포함하세요.']
  return ['구분자, 인코딩, 숫자/문자 컬럼이 표 형태로 정리되어 있는지 확인하세요.']
}
