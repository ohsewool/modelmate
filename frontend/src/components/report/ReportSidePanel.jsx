import { BarChart3, CheckCircle2, FileText, Sparkles } from 'lucide-react'
import { Badge } from '../ui/badge'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '확인 필요'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

const metricLabel = key => ({ accuracy: '정확도', f1: 'F1', rmse: '오차', mae: '평균 오차', roc_auc: 'ROC-AUC', r2: 'R2' }[key] || key)
const optStatusLabel = value => ({ ok: '개선 확인', improved: '개선 완료', no_change: '변화 없음', kept_original: '기존 모델 유지', skipped: '성능 개선 생략', not_tunable: '성능 개선 생략', failed: '성능 개선 실패' }[value] || '성능 개선 확인 필요')
const statusLabel = key => ({ dataset_uploaded: 'CSV 업로드', target_selected: '예측값 선택', cv_completed: '모델 비교 완료', model_ready: '모델 결과 준비', optuna_checked: '성능 개선 확인' }[key] || '분석 상태 확인')

const tabs = [
  ['status', CheckCircle2, '진행'],
  ['models', BarChart3, '모델'],
  ['tuning', Sparkles, '개선'],
  ['data', FileText, '정리'],
]

export default function ReportSidePanel({ open, setOpen, tab, setTab, summary, models, primaryMetric, opt, features }) {
  const commercial = summary.business_summary?.commercial_readiness || {}
  return (
    <aside className={`report-side-panel ${open ? 'report-side-open' : ''}`}>
      <button type="button" className="report-side-toggle" onClick={() => setOpen(!open)}>
        {open ? '접기' : '자세히'}
      </button>
      <div className="report-side-tabs">
        {tabs.map(([key, Icon, label]) => (
          <button key={key} type="button" onClick={() => { setTab(key); setOpen(true) }} className={`report-side-tab ${tab === key ? 'report-side-tab-active' : ''}`}>
            <Icon size={17} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </div>
      {open && (
        <div className="report-side-content">
          {tab === 'status' && (
            <Panel title="분석 진행 상태">
              {commercial.level && (
                <div className="report-side-commercial">
                  <p>상용 활용 판단</p>
                  <b>{commercial.level}</b>
                  <span>{commercial.summary}</span>
                </div>
              )}
              {Object.entries(summary.readiness || {}).map(([key, ok]) => (
                <div key={key} className={ok ? 'banner-success' : 'banner-warning'} style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{statusLabel(key)}</span>
                  <span>{ok ? '완료' : '대기'}</span>
                </div>
              ))}
              {(commercial.strengths || []).slice(0, 3).map(item => (
                <p key={item} className="report-side-note">좋은 점 · {item}</p>
              ))}
              {(commercial.blockers || []).slice(0, 3).map(item => (
                <p key={item} className="report-side-note">보완점 · {item}</p>
              ))}
            </Panel>
          )}
          {tab === 'models' && (
            <Panel title="모델 비교 결과">
              {models.map((row, idx) => (
                <div key={row.model} className="report-side-row">
                  <div>
                    <p>{idx === 0 ? '추천 · ' : ''}{row.model}</p>
                    <span>{primaryMetric || 'Score'} {fmt(row[primaryMetric])}</span>
                  </div>
                  <Badge variant={row.status === 'ok' || !row.status ? 'success' : 'danger'}>{row.status === 'ok' || !row.status ? '완료' : '실패'}</Badge>
                </div>
              ))}
            </Panel>
          )}
          {tab === 'tuning' && (
            <Panel title="성능 자동 개선">
              <Badge variant={opt.status === 'improved' || opt.status === 'ok' ? 'success' : 'warning'}>{optStatusLabel(opt.status)}</Badge>
              <p className="report-side-note">{metricLabel(opt.metric_name)} {fmt(opt.before_score)} → {fmt(opt.after_score)}</p>
              <p className="report-side-note">시도 {opt.n_trials || '-'}회 / 개선율 {fmt(opt.improvement)}%</p>
              {opt.reason && <p className="report-side-note">{opt.reason}</p>}
            </Panel>
          )}
          {tab === 'data' && (
            <Panel title="데이터 정리와 중요 정보">
              <p className="report-side-note">{summary.preprocessing?.summary || '전처리 요약이 없습니다.'}</p>
              {(summary.preprocessing?.auto_drop_cols || []).slice(0, 8).map(col => <span className="badge badge-violet" key={col}>{col}</span>)}
              {features.slice(0, 5).map(item => (
                <div key={item.feature} className="report-side-feature">
                  <span>{item.feature}</span>
                  <b>{fmt(item.importance)}</b>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )}
    </aside>
  )
}

function Panel({ title, children }) {
  return <div className="report-side-section"><h3>{title}</h3>{children}</div>
}
