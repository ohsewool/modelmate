import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import api from '../api'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import ReportStoryPanel from '../components/report/ReportStoryPanel'
import ReportSidePanel from '../components/report/ReportSidePanel'
import AnalysisTracePanel from '../components/report/AnalysisTracePanel'
import TrustSummaryPanel from '../components/report/TrustSummaryPanel'
import EvidenceSummaryPanel from '../components/report/EvidenceSummaryPanel'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

const pct = value => `${Math.round((Number(value) || 0) * 100)}%`
const statusLabel = key => ({
  has_data: '데이터 준비',
  has_target: '정답 선택',
  has_model: '모델 학습',
  has_explanation: '이유 분석',
  has_deployment: '공유 준비',
  dataset_uploaded: '데이터 업로드',
  target_selected: '정답 선택',
  cv_completed: '모델 비교 완료',
  model_ready: '모델 준비 완료',
  optuna_checked: '성능 개선 확인',
}[key] || key.replaceAll('_', ' '))
const taskLabel = value => ({
  classification: '분류 예측',
  regression: '숫자 예측',
}[value] || value || '-')
const reportSummaryText = (summary, dataset, opt) => {
  const model = summary?.model_selection?.best_model || '선택된 모델'
  const target = dataset?.target_col || '정답값'
  if (opt?.status === 'skipped' || opt?.status === 'not_tunable') {
    return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다. 추가 자동 개선은 생략되었습니다.`
  }
  if (opt?.status === 'improved' || opt?.status === 'ok') {
    return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었고, 자동 개선도 완료되었습니다.`
  }
  if (opt?.status === 'no_change' || opt?.status === 'kept_original') {
    return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다. 자동 개선을 시도했지만 기존 모델보다 나은 조합은 찾지 못했습니다.`
  }
  return `${model} 모델이 '${target}' 예측에 가장 적합한 모델로 선택되었습니다.`
}

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
      reason: item?.optuna_reason || '저장된 실험 기록 기준으로 복원한 요약입니다.',
    },
    preprocessing: {
      summary: `${(item?.drop_cols || []).length + (item?.auto_drop_cols || []).length}개 컬럼을 제외하고 실험했습니다.`,
      auto_drop_cols: [...(item?.drop_cols || []), ...(item?.auto_drop_cols || [])],
    },
    business_summary: {
      headline: `${item?.best_model || '선택 모델'}로 ${item?.target || '목표값'} 예측 결과를 저장했습니다.`,
      use_case: '작업 기록에서 다시 연 저장 보고서입니다. 같은 설정 재분석, 새 데이터 예측, 공유/API 흐름으로 이어갈 수 있습니다.',
      recommended_decision: '같은 CSV를 다시 올리면 이전 타겟과 제외 컬럼을 참고해 분석을 이어갈 수 있습니다.',
      risk_notes: ['원본 CSV는 보안을 위해 저장하지 않으므로 재분석하려면 같은 파일을 다시 올려야 합니다.'],
      next_actions: ['같은 설정으로 재분석', '저장 모델로 새 데이터 예측', '공유/API 흐름 확인'],
    },
    presentation_points: [
      `데이터 분야: ${item?.dataset_domain || '기록 없음'}`,
      `맞힐 값: ${item?.target || '-'}`,
      `선택 모델: ${item?.best_model || '-'}`,
    ],
    executive_summary: item?.presentation_conclusion || '저장된 실험 기록을 바탕으로 복원한 결과 요약입니다.',
    feature_evidence: { items: item?.feature_importance || [] },
  }
}

function MiniStat({ label, value, tone = 'blue' }) {
  const colors = {
    blue: ['rgba(99,102,241,0.12)', '#4f46e5'],
    green: ['rgba(16,185,129,0.12)', '#059669'],
    amber: ['rgba(245,158,11,0.12)', '#d97706'],
  }
  const [bg, fg] = colors[tone] || colors.blue
  return (
    <div className="card-elevated" style={{ minHeight: 88 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 850, color: fg, lineHeight: 1 }}>
        {value}
      </p>
      <div style={{ height: 3, width: 36, borderRadius: 99, background: bg, marginTop: 12 }} />
    </div>
  )
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
            <Icon size={17} />
          </span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function BusinessSummary({ data }) {
  if (!data) return null
  return (
    <section className="card" style={{ borderColor: 'rgba(37,99,235,0.18)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>의사결정 요약</p>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
        {data.headline || '이 모델을 어디에 쓸지 정리했습니다'}
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
            {(data.risk_notes || [])[0] || '현재 흐름에서는 큰 위험 신호가 보이지 않습니다.'}
          </p>
        </div>
      </div>
      {data.model_evidence?.summary && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(15,118,110,0.07)', border: '1px solid rgba(15,118,110,0.18)' }}>
          <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 900, color: '#0f766e' }}>
            모델 선택 근거 · {data.model_evidence.gap_label || '검증 점수 기준'}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {data.model_evidence.summary}
          </p>
        </div>
      )}
      {data.agent_priority?.level && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)' }}>
          <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>
            에이전트 우선 판단 · {data.agent_priority.level}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {data.agent_priority.summary}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(data.agent_priority.focus || []).slice(0, 4).map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
          </div>
        </div>
      )}
      {!!data.next_actions?.length && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {data.next_actions.slice(0, 3).map(action => (
            <div key={action} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#4f46e5', fontSize: 12, lineHeight: 1.5 }}>
              다음 행동 · {action}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Report() {
  const nav = useNavigate()
  const location = useLocation()
  const historyReport = location.state?.historyReport
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
  const features = summary?.feature_evidence?.items || []
  const business = summary?.business_summary

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1120 }}>
        <div className="card empty-state">
          <Loader2 className="animate-spin" size={36} color="#6366f1" />
          <p className="empty-title" style={{ marginTop: 16 }}>결과 요약을 불러오는 중입니다</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <div className="card empty-state">
          <AlertCircle size={42} color="#e11d48" />
          <p className="empty-title" style={{ marginTop: 16 }}>아직 결과 요약이 준비되지 않았습니다</p>
          <p className="empty-desc">{error}</p>
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
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#2563eb' }}>
                결과 요약
              </p>
              <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: 0 }}>
                선택된 모델
              </h1>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>
                {reportSummaryText(summary, dataset, opt)}
              </p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>
                {new Date(summary.generated_at).toLocaleString()} / 맞히려는 값 {dataset.target_col || '-'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => window.open('/api/report/html', '_blank')}>
                <ExternalLink size={15} /> HTML로 열기
              </Button>
              <Button onClick={downloadReport} disabled={downloading}>
                {downloading ? <span className="spinner" /> : <Download size={15} />}
                내려받기
              </Button>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              HTML 리포트에는 분석 목표, 데이터 요약, 추천 타깃, 모델 비교, 성능 지표, 설명 근거, 한계와 다음 행동이 포함됩니다.
              모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.
            </p>
          </div>
        </div>

        {historyReport && (
          <div className="banner-success">
            <CheckCircle2 size={16} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
              작업 기록에서 다시 연 저장 보고서입니다. 현재 서버 상태가 아니라 선택한 과거 실험 기준으로 보여줍니다.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <MiniStat label="준비도" value={pct(summary.readiness_score)} tone="green" />
          <MiniStat label="선택된 모델" value={summary.model_selection?.best_model || '-'} />
          <MiniStat label="예측 유형" value={taskLabel(dataset.task_type)} tone="amber" />
          <MiniStat label="사용한 정보" value={dataset.training_shape?.[1] ?? '-'} />
        </div>

        <BusinessSummary data={business} />

        <TrustSummaryPanel summary={summary} models={topModels} primaryMetric={primaryMetric} />

        <EvidenceSummaryPanel
          summary={summary}
          models={topModels}
          primaryMetric={primaryMetric}
          features={features}
        />

        <AnalysisTracePanel summary={summary} />

        <ReportStoryPanel
          points={summary.presentation_points}
          summary={summary.executive_summary}
        />

        <div className="card" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, background: 'var(--surface-alt)',
        }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>
              다음 단계
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
              선택된 모델이 어떤 정보를 중요하게 봤는지 확인합니다.
            </p>
          </div>
          <Button onClick={() => nav('/xai')} style={{ flexShrink: 0 }}>
            이유 보기로 이동
          </Button>
        </div>
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
