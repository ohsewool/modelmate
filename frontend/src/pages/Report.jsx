import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Download, ExternalLink, Loader2 } from 'lucide-react'
import api from '../api'
import { Button } from '../components/ui/button'
import ReportStoryPanel from '../components/report/ReportStoryPanel'
import ReportSidePanel from '../components/report/ReportSidePanel'
import AnalysisTracePanel from '../components/report/AnalysisTracePanel'
import TrustSummaryPanel from '../components/report/TrustSummaryPanel'
import EvidenceSummaryPanel from '../components/report/EvidenceSummaryPanel'
import StatusRecoveryPanel from '../components/StatusRecoveryPanel'
import { goalContext } from '../utils/goalContext'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

const pct = value => `${Math.round((Number(value) || 0) * 100)}%`
const taskLabel = value => ({
  classification: '분류 예측',
  regression: '숫자 예측',
}[value] || value || '-')

function summaryFromExperiment(item) {
  const results = item?.results || []
  const first = results[0] || {}
  const primary = item?.tuned_metric || (item?.task_type === 'regression' ? 'r2' : 'roc_auc')
  const score = item?.tuned_score ?? first[primary] ?? first.roc_auc ?? first.r2 ?? first.accuracy
  return {
    generated_at: item?.timestamp || new Date().toISOString(),
    readiness_score: item?.best_model ? 1 : 0.6,
    readiness: {
      dataset_uploaded: true,
      target_selected: Boolean(item?.target),
      cv_completed: results.length > 0,
      model_ready: Boolean(item?.best_model),
      optuna_checked: item?.optuna_status !== undefined || item?.optuna_applied !== undefined,
    },
    dataset: {
      target_col: item?.target,
      task_type: item?.task_type,
      training_shape: item?.data_shape,
      domain: item?.dataset_domain,
    },
    model_selection: {
      best_model: item?.best_model,
      models: results,
      score_info: { primary },
    },
    optimization: {
      status: item?.optuna_status || (item?.optuna_applied ? 'improved' : 'skipped'),
      metric_name: primary,
      before_score: score,
      after_score: item?.tuned_score ?? score,
      improvement: item?.optuna_improvement ?? 0,
      n_trials: item?.optuna_trials,
      reason: item?.optuna_reason || '저장된 실험 기록을 기준으로 복원한 결과입니다.',
    },
    preprocessing: {
      summary: `${(item?.drop_cols || []).length + (item?.auto_drop_cols || []).length}개 컬럼을 제외하고 실험했습니다.`,
      auto_drop_cols: [...(item?.drop_cols || []), ...(item?.auto_drop_cols || [])],
    },
    business_summary: {
      headline: `${item?.best_model || '선택된 모델'}로 ${item?.target || '목표값'} 예측 결과를 정리했습니다.`,
      use_case: '저장된 실험 기록에서 다시 연 보고서입니다. 같은 설정 재분석, 새 데이터 예측, 공유/API 흐름으로 이어갈 수 있습니다.',
      recommended_decision: '보고서를 내려받아 공유하거나, 이유 보기와 새 데이터 예측으로 결과를 검토하세요.',
      risk_notes: ['원본 CSV가 저장되어 있지 않은 경우 재분석에는 같은 파일을 다시 업로드해야 합니다.'],
      next_actions: ['이유 보기에서 주요 근거 확인', '새 데이터 예측으로 재사용', 'HTML 보고서로 공유'],
    },
    presentation_points: [
      `데이터 분야: ${item?.dataset_domain || '기록 없음'}`,
      `타깃 값: ${item?.target || '-'}`,
      `선택 모델: ${item?.best_model || '-'}`,
    ],
    executive_summary: item?.presentation_conclusion || '저장된 실험 기록을 바탕으로 복원한 결과 요약입니다.',
    feature_evidence: { items: item?.feature_importance || [] },
  }
}

function reportSummaryText(summary, dataset, opt) {
  const model = summary?.model_selection?.best_model
  const target = dataset?.target_col || '타깃'
  if (!model) {
    return '모델 비교 결과가 아직 준비되지 않았습니다. 먼저 CSV 업로드, 타깃 확인, 모델 비교를 완료해 주세요.'
  }
  if (opt?.status === 'improved' || opt?.status === 'ok') {
    return `${model}이 '${target}' 예측에 가장 적합한 모델로 선택되었고, 자동 개선 결과까지 반영되었습니다.`
  }
  if (opt?.status === 'no_change' || opt?.status === 'kept_original') {
    return `${model}이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다. 자동 개선을 시도했지만 기존 모델이 더 안정적이었습니다.`
  }
  return `${model}이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다.`
}

function MiniStat({ label, value, tone = 'blue' }) {
  const colors = {
    blue: ['#eff6ff', '#2563eb'],
    green: ['#f0fdf4', '#059669'],
    amber: ['#fffbeb', '#d97706'],
  }
  const [bg, fg] = colors[tone] || colors.blue
  const displayValue = value === null || value === undefined || value === '' || value === '-' ? '확인 필요' : value
  return (
    <div className="card-elevated" style={{ minHeight: 88, background: bg }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--text-label)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 23, fontWeight: 900, color: fg, lineHeight: 1.1 }}>{displayValue}</p>
    </div>
  )
}

function BusinessSummary({ data }) {
  if (!data) return null
  return (
    <section className="card" style={{ borderColor: 'rgba(37,99,235,0.18)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>결정 요약</p>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
        {data.headline || '선택된 모델과 판단 근거를 정리했습니다'}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
        {data.use_case}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div className="banner-success" style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {data.recommended_decision}
          </p>
        </div>
        <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
          <AlertCircle size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {(data.risk_notes || [])[0] || '현재 흐름에서 즉시 차단할 위험 신호는 보이지 않습니다.'}
          </p>
        </div>
      </div>
      {!!data.next_actions?.length && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {data.next_actions.slice(0, 3).map(action => (
            <div key={action} style={{ padding: '8px 10px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, lineHeight: 1.5, fontWeight: 700 }}>
              다음 행동 · {action}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function reportTarget(dataset) {
  return dataset?.target_col || dataset?.target_column || '예측 타깃'
}

function reportDatasetName(summary, dataset) {
  return dataset?.filename || dataset?.original_filename || dataset?.dataset_name || summary?.project_name || '업로드한 CSV'
}

function detectReportDomain(summary, dataset) {
  const text = `${reportTarget(dataset)} ${reportDatasetName(summary, dataset)} ${summary?.executive_summary || ''}`.toLowerCase()
  if (/(diabetes|outcome|glucose|bmi|당뇨)/.test(text)) return 'diabetes'
  if (/(churn|이탈|retention)/.test(text)) return 'churn'
  if (/(failure|defect|fault|고장|불량)/.test(text)) return 'failure'
  if (/(sales|revenue|demand|price|매출|수요|가격)/.test(text)) return 'business'
  return 'general'
}

function reportConclusion(summary, dataset, opt) {
  const target = reportTarget(dataset)
  const model = summary?.model_selection?.best_model
  const noTarget = !dataset?.target_col && !dataset?.target_column
  if (noTarget) {
    return {
      status: '검토 필요',
      title: '명확한 예측 타깃이 부족해 탐색 보고서로 보는 것이 더 적합합니다.',
      body: '먼저 어떤 값을 예측하고 싶은지 정한 뒤 타깃 컬럼을 다시 선택하는 것을 권장합니다. 분석 결과를 억지로 확정하지 않습니다.',
    }
  }
  return {
    status: model ? '보고서 준비됨' : '주의 필요',
    title: model ? `${target} 예측 분석 보고서가 준비되었습니다.` : '분석 결과 요약을 준비하려면 모델 비교가 필요합니다.',
    body: model
      ? reportSummaryText(summary, dataset, opt)
      : '선택 모델 정보가 충분하지 않아 결과 해석에는 주의가 필요합니다.',
  }
}

function ReportConclusion({ summary, dataset, opt }) {
  const conclusion = reportConclusion(summary, dataset, opt)
  const domain = detectReportDomain(summary, dataset)
  const target = reportTarget(dataset)
  const domainCopy = {
    diabetes: '이 결과는 의료 진단을 대체하지 않으며, 참고용 예측 분석으로만 사용해야 합니다.',
    churn: '이탈 가능성이 높은 고객을 우선 확인하고 유지 전략을 세우는 참고 자료로 사용할 수 있습니다.',
    failure: '고장 또는 불량 위험이 높은 대상을 우선 점검하는 참고 지표로 사용할 수 있습니다.',
    business: '수요, 매출, 가격 관련 운영 계획을 세울 때 참고할 수 있습니다.',
    general: '모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.',
  }
  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: conclusion.status === '주의 필요' || conclusion.status === '검토 필요' ? '#fcd34d' : 'rgba(16,185,129,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 6 }}>핵심 요약</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{conclusion.title}</h2>
        </div>
        <span className={conclusion.status === '보고서 준비됨' ? 'badge badge-green' : 'badge badge-amber'}>{conclusion.status}</span>
      </div>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{conclusion.body}</p>
      <div className="workspace-grid four-columns">
        <MiniStat label="예측 목표" value={target} />
        <MiniStat label="CSV" value={reportDatasetName(summary, dataset)} />
        <MiniStat label="문제 유형" value={taskLabel(dataset.task_type)} tone="amber" />
        <MiniStat label="선택 모델" value={summary?.model_selection?.best_model || '확인 필요'} tone={summary?.model_selection?.best_model ? 'green' : 'amber'} />
      </div>
      <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
        <AlertCircle size={16} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{domainCopy[domain]}</p>
      </div>
    </section>
  )
}

function ImportantFactors({ features }) {
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">중요 요인</p>
      {features?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {features.slice(0, 5).map((item, index) => {
            const name = item.feature || item.name || item.column || `요인 ${index + 1}`
            const value = item.importance ?? item.value ?? item.score
            return (
              <div key={`${name}-${index}`} className="card-elevated" style={{ padding: 12 }}>
                <strong>{name}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>
                  이 컬럼은 모델이 예측할 때 중요하게 사용한 정보입니다. 원인이라고 단정하지 말고 결과 해석의 참고 근거로 확인하세요.
                  {value !== undefined ? ` 중요도: ${fmt(value)}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
          <AlertCircle size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            아직 중요 요인이 계산되지 않았습니다. 분석을 계속하거나 이유 보기 화면에서 확인해 주세요.
          </p>
        </div>
      )}
    </section>
  )
}

function PerformanceSection({ summary, models, primaryMetric }) {
  const metricRows = models
    .map(model => ({
      name: model.model || model.name || model.model_name || '모델',
      value: model[primaryMetric] ?? model.score ?? model.metric,
    }))
    .filter(row => row.value !== undefined && row.value !== null)
  const weak = metricRows.some(row => Number(row.value) < 0.65)
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">예측 성능</p>
      {metricRows.length ? (
        <>
          <div className="workspace-grid four-columns">
            {metricRows.slice(0, 4).map(row => <MiniStat key={row.name} label={row.name} value={fmt(row.value)} tone={weak ? 'amber' : 'green'} />)}
          </div>
          <p style={{ margin: 0, color: weak ? '#92400e' : 'var(--text-2)', lineHeight: 1.6 }}>
            {weak
              ? '현재 성능 지표가 충분히 높지 않을 수 있어 실제 의사결정에는 주의가 필요합니다. 데이터를 보완한 뒤 다시 실행하는 것을 권장합니다.'
              : '현재 성능 지표는 업로드된 데이터와 검증 결과를 기준으로 계산되었습니다. 실제 사용 전에는 데이터 품질과 주의사항을 함께 확인하세요.'}
          </p>
        </>
      ) : (
        <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
          <AlertCircle size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            아직 표시할 성능 지표가 없습니다. 모델 비교가 완료된 뒤 보고서를 다시 열어 주세요.
          </p>
        </div>
      )}
    </section>
  )
}

function ReportLimitations({ summary, dataset }) {
  const domain = detectReportDomain(summary, dataset)
  const notes = [
    '모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.',
    '데이터가 부족하거나 결측값이 많으면 결과 신뢰도가 낮아질 수 있습니다.',
    '예측 타깃이 불명확하거나 데이터 누수 가능성이 있으면 실제 사용 전 확인이 필요합니다.',
    '운영 API에 연결하기 전에는 입력 형식, 성능, 사용 목적을 다시 검토해야 합니다.',
  ]
  if (domain === 'diabetes') notes.unshift('이 결과는 의료 진단을 대체하지 않으며 참고용 예측 분석으로만 사용해야 합니다.')
  return (
    <section className="card" style={{ display: 'grid', gap: 10 }}>
      <p className="section-title">주의사항</p>
      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
        {notes.map(note => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}

function ReportNextSteps({ nav, noTarget }) {
  const actions = noTarget
    ? [
      ['데이터 요약 보고서 보기', '/report'],
      ['타깃 직접 선택', '/agent-mode'],
      ['목표 다시 입력', '/agent-mode'],
    ]
    : [
      ['새 데이터로 예측', '/predict'],
      ['예측 API 보기', '/prediction-apis'],
      ['다른 CSV로 다시 분석', '/upload'],
      ['상세 실행 기록 보기', '/agent-mode'],
    ]
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p className="section-title">다음에 할 일</p>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
        보고서의 성능, 중요 요인, 주의사항을 확인한 뒤 예측 재사용 여부를 결정하세요.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map(([label, path], index) => (
          <Button key={label} variant={index === 0 ? 'default' : 'secondary'} onClick={() => nav(path)}>{label}</Button>
        ))}
      </div>
    </section>
  )
}

function GoalBasedReportContext({ run }) {
  if (!run) return null
  const goal = run.user_goal || run.interpreted_goal?.goal_text
  if (!goal) return null
  const context = goalContext(goal)
  return (
    <section className="card" style={{ display: 'grid', gap: 10 }}>
      <p className="section-title">분석 목표</p>
      <strong>{goal}</strong>
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{context.interpretation}</p>
      <div>
        <p style={{ margin: '0 0 6px', fontWeight: 800 }}>다음 행동 제안</p>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
          {context.actions.map(action => <li key={action}>{action}</li>)}
        </ul>
      </div>
    </section>
  )
}

function featureName(item) {
  return item?.feature || item?.name || item?.column || ''
}

function filterFeaturesForDataset(features, dataset) {
  const columns = [
    ...(Array.isArray(dataset?.columns) ? dataset.columns : []),
    ...(Array.isArray(dataset?.feature_columns) ? dataset.feature_columns : []),
  ].map(String)
  if (!columns.length) return features || []
  return (features || []).filter(item => columns.includes(String(featureName(item))))
}

export default function Report() {
  const nav = useNavigate()
  const location = useLocation()
  const historyReport = location.state?.historyReport
  const agentRun = location.state?.agentRun
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [sideOpen, setSideOpen] = useState(false)
  const [sideTab, setSideTab] = useState('status')

  async function loadSummary() {
    if (historyReport) {
      setSummary(summaryFromExperiment(historyReport))
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/report/summary')
      setSummary(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [historyReport])

  async function downloadReport() {
    setDownloading(true)
    try {
      const res = await api.get('/report/html', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'ModelMate_Report.html'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setDownloading(false)
    }
  }

  const topModels = useMemo(() => summary?.model_selection?.models?.slice(0, 5) || [], [summary])
  const primaryMetric = summary?.model_selection?.score_info?.primary
  const opt = summary?.optimization || {}
  const dataset = summary?.dataset || {}
  const features = filterFeaturesForDataset(summary?.feature_evidence?.items || [], dataset)
  const business = summary?.business_summary

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1120 }}>
        <div className="card empty-state">
          <Loader2 className="animate-spin" size={36} color="#2563eb" />
          <p className="empty-title" style={{ marginTop: 16 }}>결과 요약을 불러오는 중입니다</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <div className="card empty-state">
          <AlertCircle size={42} color="#dc2626" />
          <p className="empty-title" style={{ marginTop: 16 }}>아직 보고서가 준비되지 않았어요.</p>
          <p className="empty-desc">분석이 끝나면 결과를 한눈에 정리해 드립니다. {error}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => nav('/dashboard')}>대시보드로 이동</Button>
            <Button onClick={() => nav('/upload')}>새 분석 시작</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1280 }}>
      <div className={`report-workspace ${sideOpen ? 'report-workspace-open' : ''}`}>
        <div className="report-main-flow">
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>결과 요약</p>
                <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: 0 }}>
                  선택된 모델과 다음 행동
                </h1>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>
                  {reportSummaryText(summary, dataset, opt)}
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>
                  {new Date(summary.generated_at).toLocaleString()} / 타깃 {dataset.target_col || '타깃 확인 필요'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => window.open('/api/report/html', '_blank')}>
                  <ExternalLink size={15} /> HTML로 열기
                </Button>
                <Button onClick={downloadReport} disabled={downloading}>
                  {downloading ? <span className="spinner" /> : <Download size={15} />}
                  보고서 다운로드
                </Button>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-sub)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                HTML 보고서에는 분석 목표, 데이터 요약, 추천 타깃, 모델 비교, 성능 지표, 설명 근거, 한계와 다음 행동이 포함됩니다.
                모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.
              </p>
            </div>
          </div>

          {historyReport && (
            <div className="banner-success">
              <CheckCircle2 size={16} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
                작업 기록에서 다시 연 보고서입니다. 현재 서버 상태가 아니라 선택한 과거 실험 기록을 기준으로 보여줍니다.
              </p>
            </div>
          )}

          <ReportConclusion summary={summary} dataset={dataset} opt={opt} />
          <GoalBasedReportContext run={agentRun} />

          <StatusRecoveryPanel status={summary.analysis_status} limits={summary.usage_limits} compact />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }} className="report-stat-grid">
            <MiniStat label="준비도" value={pct(summary.readiness_score)} tone="green" />
            <MiniStat label="선택 모델" value={summary.model_selection?.best_model || '모델 결과 없음'} />
            <MiniStat label="예측 유형" value={taskLabel(dataset.task_type)} tone="amber" />
            <MiniStat label="사용 정보" value={dataset.training_shape?.[1] ?? '데이터 요약 없음'} />
          </div>

          <BusinessSummary data={business} />
          <ImportantFactors features={features} />
          <PerformanceSection summary={summary} models={topModels} primaryMetric={primaryMetric} />
          <ReportLimitations summary={summary} dataset={dataset} />
          <TrustSummaryPanel summary={summary} models={topModels} primaryMetric={primaryMetric} />
          <EvidenceSummaryPanel summary={summary} models={topModels} primaryMetric={primaryMetric} features={features} />
          <AnalysisTracePanel summary={summary} />
          <ReportStoryPanel points={summary.presentation_points} summary={summary.executive_summary} />

          <ReportNextSteps nav={nav} noTarget={!dataset.target_col && !dataset.target_column} />
        </div>
        <ReportSidePanel
          open={sideOpen}
          setOpen={setSideOpen}
          tab={sideTab}
          setTab={setSideTab}
          summary={summary}
          models={topModels}
          primaryMetric={primaryMetric}
          opt={opt}
          features={features}
        />
      </div>
    </div>
  )
}
