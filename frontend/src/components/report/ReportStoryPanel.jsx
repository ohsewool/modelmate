import { ArrowDown, CheckCircle2, FileSpreadsheet, Rocket } from 'lucide-react'

const icons = [FileSpreadsheet, CheckCircle2, CheckCircle2, Rocket]

function defaultPoints() {
  return [
    'CSV를 올리면 데이터 성격과 맞힐 값을 자동으로 판단합니다.',
    '예측을 방해할 수 있는 정보는 학습 전에 정리합니다.',
    '여러 모델을 비교해 데이터에 맞는 모델을 고릅니다.',
    '결과 요약, 이유 보기, 새 데이터 예측, 공유 API까지 이어집니다.',
  ]
}

export default function ReportStoryPanel({ points, summary }) {
  const items = (points?.length ? points : defaultPoints()).slice(0, 4)
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 900, color: '#059669' }}>서비스 흐름</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            사용자가 얻는 결과
          </h2>
        </div>
        <span className="badge badge-green">발표용</span>
      </div>

      {summary && (
        <div style={{ padding: 13, borderRadius: 12, border: '1px solid rgba(5,150,105,0.18)', background: 'rgba(5,150,105,0.06)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{summary}</p>
        </div>
      )}

      <div className="report-story-flow">
        {items.map((text, idx) => {
          const Icon = icons[idx] || CheckCircle2
          return (
            <div key={text} style={{ display: 'contents' }}>
              <div className="card-elevated" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                    <Icon size={16} />
                  </span>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#2563eb' }}>
                    {['데이터 이해', '분석 준비', '모델 선택', '업무 활용'][idx] || '다음 단계'}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{text}</p>
              </div>
              {idx < items.length - 1 && (
                <div className="report-story-arrow" aria-hidden="true">
                  <ArrowDown size={17} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
