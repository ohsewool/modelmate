import { AlertTriangle, CheckCircle2, CircleDot, Clock3 } from 'lucide-react'

const statusStyle = {
  done: ['#dcfce7', '#047857', CheckCircle2, '완료'],
  warning: ['#fef3c7', '#b45309', AlertTriangle, '주의 필요'],
  pending: ['#eef2ff', '#4f46e5', Clock3, '대기'],
}

const stepStatus = ok => (ok ? 'done' : 'pending')

export default function AnalysisTracePanel({ summary }) {
  const readiness = summary?.readiness || {}
  const dataset = summary?.dataset || {}
  const model = summary?.model_selection || {}
  const features = summary?.feature_evidence?.items || []
  const business = summary?.business_summary || {}
  const risks = business.risk_notes || []
  const hasReport = Boolean(summary?.executive_summary || business.headline)

  const steps = [
    ['분석 목표 해석', '목표 기반 계획', 'done', dataset.domain || 'CSV 예측 목표를 분석 흐름으로 해석했습니다.', `예측할 값: ${dataset.target_col || '-'}`, '낮음', '데이터 점검'],
    ['데이터 구조 확인', '데이터 구조 분석', stepStatus(readiness.dataset_uploaded || readiness.has_data), `${dataset.training_shape?.[0] ?? '-'}행 / ${dataset.training_shape?.[1] ?? '-'}개 정보`, '학습 가능한 표 구조 확인', '낮음', '스키마 검증'],
    ['CSV 형식 검증', '스키마 검증', stepStatus(readiness.dataset_uploaded || readiness.has_data), '결측값과 사용 가능 컬럼을 점검했습니다.', '학습 진행 가능', risks.length ? '중간' : '낮음', '예측할 값 추천'],
    ['예측값 추천', '예측값 추천', stepStatus(readiness.target_selected || readiness.has_target), `추천 예측값: ${dataset.target_col || '확인 필요'}`, `문제 유형: ${dataset.task_type || '확인 필요'}`, '낮음', '데이터 누수 점검'],
    ['데이터 누수 점검', '누수 검사', 'done', `${summary?.preprocessing?.auto_drop_cols?.length || 0}개 컬럼 제외/주의`, '의심 컬럼은 제외 또는 검토 대상으로 처리', summary?.preprocessing?.auto_drop_cols?.length ? '중간' : '낮음', '모델 비교'],
    ['모델 비교 완료', 'AutoML 모델 비교', stepStatus(readiness.cv_completed || readiness.model_ready), `${model.models?.length || 0}개 모델 비교`, `가장 좋은 모델: ${model.best_model || '-'}`, '낮음', '성능 판단'],
    ['예측 성능 판단', '성능 검토', stepStatus(model.best_model), `대표 지표: ${model.score_info?.primary || '-'}`, business.recommended_decision || '결과 사용 가능 여부 판단', risks.length ? '중간' : '낮음', '근거 생성'],
    ['예측 이유 정리', '설명 근거 생성', features.length ? 'done' : 'warning', `${features.length}개 주요 변수`, features[0]?.feature ? `가장 큰 요인: ${features[0].feature}` : '설명 근거 제한', features.length ? '낮음' : '중간', '보고서 작성'],
    ['근거 기반 보고서 생성', '보고서 생성', stepStatus(hasReport), summary?.executive_summary || business.headline || '보고서 요약 준비 중', '근거 기반 보고서 생성', '낮음', '재사용 흐름'],
    ['API 연결 가능성 확인', 'API 연결 검토', 'warning', business.commercial_readiness?.summary || '공유/API 흐름으로 이어갈 수 있습니다.', '운영 배포는 자동 실행하지 않음', '중간', '사용자 검토'],
    ['사용자 확인 여부 판단', '사용자 확인', risks.length ? 'warning' : 'done', risks[0] || '강한 검토 필요 신호는 없습니다.', risks.length ? '검토 권장' : '검토 없이 진행 가능', risks.length ? '중간' : '낮음', '다음 행동 선택'],
  ]

  return (
    <section className="card">
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>상세 실행 기록</p>
      <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>분석 판단 흐름</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map(([name, tool, status, observation, decision, warning, next]) => {
          const [bg, fg, Icon, label] = statusStyle[status] || statusStyle.pending
          return (
            <div key={name} className="card-elevated" style={{ padding: 12, display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'start' }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: bg, color: fg }}><Icon size={15} /></span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900 }}>{name}</p>
                <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--text-label)' }}>{tool}</p>
                <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>확인 내용: {observation}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>판단: {decision} · 다음 단계: {next}</p>
              </div>
              <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                <span className="badge" style={{ background: bg, color: fg }}>{label}</span>
                <span style={{ fontSize: 11, color: warning === '낮음' ? '#059669' : '#b45309', fontWeight: 850 }}>주의 수준 {warning}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-label)', lineHeight: 1.6 }}>
        이 상세 실행 기록은 현재 결과 요약과 저장된 근거를 사용해 표시합니다. 운영 배포나 자동 재학습을 실행하지 않습니다.
      </p>
    </section>
  )
}
