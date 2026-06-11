import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'

const tone = status => ({
  succeeded: ['#dcfce7', '#047857', CheckCircle2, '완료'],
  running: ['#dbeafe', '#1d4ed8', Clock3, '진행 중'],
  queued: ['#eef2ff', '#4f46e5', Clock3, '대기'],
  failed: ['#fee2e2', '#b91c1c', AlertTriangle, '실패'],
  needs_review: ['#fef3c7', '#b45309', AlertTriangle, '검토 필요'],
  cancelled: ['#f1f5f9', '#475569', RotateCcw, '취소됨'],
}[status] || ['#eef2ff', '#4f46e5', Clock3, '생성됨'])

export default function StatusRecoveryPanel({ status, limits, compact = false }) {
  if (!status && !limits) return null
  const [bg, fg, Icon, label] = tone(status?.status)
  const limitText = limits
    ? `MVP 데모 기준: CSV ${limits.max_csv_file_size_mb}MB 이하, 권장 ${limits.warning_row_count?.toLocaleString?.() || limits.warning_row_count}행 이하, ${limits.warning_column_count}컬럼 이하`
    : ''
  return (
    <section className="card" style={{ padding: compact ? 14 : 18, borderColor: status?.status === 'failed' ? 'rgba(239,68,68,0.24)' : 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: bg, color: fg, flexShrink: 0 }}>
          <Icon size={17} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>작업 상태</p>
            <span className="badge" style={{ background: bg, color: fg }}>{label}</span>
            {status?.current_step && <span style={{ fontSize: 12, color: 'var(--text-label)' }}>{status.current_step}</span>}
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {status?.progress_message || '현재 분석 상태를 확인할 수 있습니다.'}
          </p>
          {status?.error_message && (
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#b91c1c', lineHeight: 1.55 }}>
              마지막 오류: {status.error_message}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 12, color: fg, lineHeight: 1.55, fontWeight: 750 }}>
            다음 행동: {status?.recommended_next_action || '다음 분석 단계를 진행하세요.'}
          </p>
          {limitText && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-label)', lineHeight: 1.5 }}>
              {limitText}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
