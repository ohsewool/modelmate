import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Button } from '../components/ui/button'
import { STARTER_PACKS } from '../data/starterPacks'

const STEPS = [
  'CSV 확인',
  '예측값 추천',
  '문제 유형 판단',
  '모델 비교',
  '결과 생성',
  '분석 완료',
]

function confidenceLabel(value) {
  return { high: '높음', medium: '중간', low: '낮음', manual: '직접 선택' }[value] || '검토 필요'
}

function problemTypeLabel(value) {
  if (value === 'classification') return '분류 예측'
  if (value === 'regression') return '회귀 예측'
  return '검토 필요'
}

function candidateName(candidate) {
  return candidate?.column_name || candidate?.column || candidate?.name || ''
}

function friendlyError(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail?.progress_message) return detail.progress_message
  if (detail?.user_friendly_message) return detail.user_friendly_message
  if (detail?.message) return detail.message
  return error?.message || '빠른 자동 분석을 시작하지 못했습니다.'
}

function ProgressCard({ stage, result }) {
  const done = result?.status === 'succeeded' ? STEPS.length : Math.max(1, STEPS.findIndex(item => item === stage) + 1)
  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p className="section-title">진행 상태</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>{result?.status === 'succeeded' ? '분석 완료' : result?.status === 'needs_review' ? '추천 결과 확인 필요' : stage || '대기 중'}</h2>
        </div>
        <span className="status-pill">{result?.status === 'succeeded' ? '완료' : result?.status === 'needs_review' ? '확인 필요' : '진행 중'}</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {STEPS.map((step, index) => {
          const active = result?.status === 'succeeded' ? true : index < done
          return (
            <div key={step} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              borderRadius: 8,
              border: '1px solid var(--border-sub)',
              background: active ? 'rgba(37,99,235,0.06)' : 'var(--surface-alt)',
            }}>
              <span style={{ width: 20, height: 20, borderRadius: 99, display: 'grid', placeItems: 'center', background: active ? '#2563eb' : 'var(--border)', color: active ? 'white' : 'var(--text-label)', fontSize: 11, fontWeight: 900 }}>{index + 1}</span>
              <span style={{ fontSize: 13, color: active ? 'var(--text)' : 'var(--text-label)', fontWeight: active ? 800 : 600 }}>{step}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DatasetCard({ dataset, onStart }) {
  const quality = dataset.quality_summary?.target_quality || dataset.target_quality || {}
  const target = quality.recommended_target || dataset.target_col || quality.optional_prediction_candidate?.column_name
  return (
    <button type="button" className="card-compact" onClick={onStart} style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 8 }}>
      <strong>{dataset.original_filename || dataset.filename || '저장 데이터셋'}</strong>
      <span style={{ color: 'var(--text-2)', fontSize: 13 }}>
        {(dataset.row_count || dataset.rows || '-').toLocaleString?.() || dataset.row_count || dataset.rows || '-'}행 · {dataset.column_count || dataset.columns || '-'}컬럼
      </span>
      <span style={{ color: 'var(--text-label)', fontSize: 12 }}>
        추천 예측값: {target || '확인 필요'} · 신뢰도 {confidenceLabel(quality.confidence)}
      </span>
    </button>
  )
}

function SampleCard({ pack, onStart }) {
  return (
    <button type="button" className="card-compact" onClick={onStart} style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 8 }}>
      <strong>{pack.title}</strong>
      <span style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>{pack.shortDescription}</span>
      <span style={{ color: 'var(--text-label)', fontSize: 12 }}>추천 예측값: {pack.recommendedTarget}</span>
    </button>
  )
}

function ReviewPanel({ result, onConfirm, onSelectTarget, loading }) {
  const quality = result?.target_quality || {}
  const candidates = [
    quality.recommended,
    quality.optional_prediction_candidate,
    ...(quality.candidates || []),
  ].filter(Boolean)
  const uniqueCandidates = candidates.filter((item, index, arr) => {
    const name = candidateName(item)
    return name && arr.findIndex(other => candidateName(other) === name) === index
  })
  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.06)' }}>
      <div>
        <p className="section-title">추천 결과 확인 필요</p>
        <h2 style={{ margin: '4px 0 6px', fontSize: 20 }}>예측할 값을 자동으로 확정하기 어렵습니다.</h2>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {result?.message || '추천 타깃을 확인하거나 분석할 컬럼을 직접 선택해 주세요.'}
        </p>
      </div>
      {result?.recommended_target && (
        <div className="card-compact" style={{ display: 'grid', gap: 6 }}>
          <strong>추천 예측값: {result.recommended_target}</strong>
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{problemTypeLabel(result.problem_type)} · 신뢰도 {confidenceLabel(result.confidence)}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {result?.recommended_target && (
          <Button onClick={() => onConfirm(result.recommended_target)} disabled={loading}>
            {result.recommended_target}로 계속 실행
          </Button>
        )}
        {uniqueCandidates.slice(0, 5).map(candidate => {
          const name = candidateName(candidate)
          if (!name || name === result?.recommended_target) return null
          return (
            <Button key={name} variant="secondary" onClick={() => onSelectTarget(name)} disabled={loading}>
              {name} 선택
            </Button>
          )
        })}
        <Button variant="secondary" onClick={() => onSelectTarget('')} disabled={loading}>직접 업로드 화면에서 선택</Button>
      </div>
    </section>
  )
}

function ResultPanel({ result, nav }) {
  const model = result?.model_result || {}
  const dataset = result?.dataset || {}
  const features = model.feature_importance || []
  return (
    <section className="card" style={{ display: 'grid', gap: 16 }}>
      <div>
        <p className="section-title">빠른 자동 분석 결과</p>
        <h2 style={{ margin: '4px 0 6px', fontSize: 22 }}>분석이 완료되었습니다.</h2>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {dataset.filename || '선택한 CSV'}에서 <strong style={{ color: 'var(--text)' }}>{result.selected_target}</strong> 예측을 기준으로 모델 비교를 완료했습니다.
        </p>
      </div>
      <div className="workspace-grid four-columns">
        <div className="card-compact"><p className="section-title">문제 유형</p><strong>{problemTypeLabel(result.problem_type)}</strong></div>
        <div className="card-compact"><p className="section-title">추천 신뢰도</p><strong>{confidenceLabel(result.confidence)}</strong></div>
        <div className="card-compact"><p className="section-title">선택 모델</p><strong>{model.best_model || '확인 필요'}</strong></div>
        <div className="card-compact"><p className="section-title">데이터</p><strong>{dataset.row_count ? `${dataset.row_count}행` : '확인 필요'}</strong></div>
      </div>
      {!!features.length && (
        <div className="card-compact">
          <p className="section-title">중요 요인</p>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>
            {features.slice(0, 5).map(item => item.feature).join(', ')}
          </p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={() => nav('/report')}>결과 요약 보기</Button>
        <Button variant="secondary" onClick={() => nav('/projects')}>프로젝트 보기</Button>
        <Button variant="secondary" onClick={() => nav('/prediction-apis')}>예측 API 확인</Button>
        <Button variant="secondary" onClick={() => nav('/upload')}>다른 CSV로 분석</Button>
      </div>
    </section>
  )
}

export default function Agent() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pendingRequest, setPendingRequest] = useState(null)
  const fileRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    api.get('/datasets')
      .then(({ data }) => setDatasets(Array.isArray(data) ? data : []))
      .catch(() => setDatasets([]))
  }, [])

  const recentDatasets = useMemo(() => datasets.filter(item => !item.deleted_at).slice(0, 6), [datasets])

  async function startQuick(payload, stage = 'CSV 확인') {
    setError('')
    setResult(null)
    setLoading(stage)
    setPendingRequest(payload)
    try {
      const { data } = await api.post('/quick-analysis/start', payload)
      setResult(data)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setLoading('')
    }
  }

  async function handleFile(file) {
    if (!file) return
    setError('')
    setResult(null)
    setLoading('CSV 업로드')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post('/upload', fd)
      await startQuick({ confirm_target: false }, '예측값 추천')
    } catch (e) {
      setError(friendlyError(e))
      setLoading('')
    }
  }

  function confirmTarget(target) {
    const payload = { ...(pendingRequest || {}), confirm_target: true }
    if (target) payload.target_col = target
    startQuick(payload, '모델 비교')
  }

  function selectTarget(target) {
    if (!target) {
      nav('/upload')
      return
    }
    const payload = { ...(pendingRequest || {}), target_col: target, confirm_target: true }
    startQuick(payload, '모델 비교')
  }

  return (
    <div className="workspace-page animate-fade-in">
      <section className="workspace-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow">빠른 자동 분석</p>
            <h1 style={{ margin: '4px 0 8px', fontSize: 28 }}>CSV를 고르면 모델 비교까지 빠르게 실행합니다</h1>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
              데이터 점검, 예측값 추천, 문제 유형 판단, 모델 비교를 하나의 짧은 흐름으로 진행합니다. 추천 신뢰도가 낮으면 학습 전에 멈추고 확인을 요청합니다.
            </p>
          </div>
          <div className="workspace-hero-actions">
            <Button onClick={() => fileRef.current?.click()}>CSV 올리고 바로 시작</Button>
            <Button variant="secondary" onClick={() => nav('/agent-mode')}>목표 기반 분석</Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </section>

      {error && (
        <section className="card" style={{ marginBottom: 18, borderColor: 'rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.05)' }}>
          <p className="section-title" style={{ color: '#dc2626' }}>진행할 수 없습니다</p>
          <p style={{ margin: '6px 0 12px', color: 'var(--text-2)' }}>{error}</p>
          <Button variant="secondary" onClick={() => nav('/upload')}>CSV 다시 선택</Button>
        </section>
      )}

      {(loading || result) && (
        <div style={{ marginBottom: 18 }}>
          <ProgressCard stage={loading} result={result} />
        </div>
      )}

      {result?.status === 'needs_review' && (
        <div style={{ marginBottom: 18 }}>
          <ReviewPanel result={result} onConfirm={confirmTarget} onSelectTarget={selectTarget} loading={!!loading} />
        </div>
      )}

      {result?.status === 'succeeded' && <ResultPanel result={result} nav={nav} />}

      {!result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18 }} className="admin-detail-grid">
          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="section-title">최근 데이터셋으로 시작</p>
              <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>최근 업로드한 CSV를 선택해 빠르게 분석합니다.</p>
            </div>
            {recentDatasets.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {recentDatasets.map(dataset => (
                  <DatasetCard
                    key={dataset.id || dataset.dataset_id}
                    dataset={dataset}
                    onStart={() => startQuick({ dataset_id: dataset.id || dataset.dataset_id, confirm_target: false }, 'CSV 확인')}
                  />
                ))}
              </div>
            ) : (
              <div className="card-compact" style={{ textAlign: 'center' }}>
                <strong>저장된 데이터셋이 없습니다.</strong>
                <p style={{ color: 'var(--text-2)', fontSize: 13 }}>CSV를 올리거나 샘플 데이터셋으로 시작해 주세요.</p>
                <Button onClick={() => fileRef.current?.click()}>CSV 올리기</Button>
              </div>
            )}
          </section>

          <section className="card" style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="section-title">샘플 데이터로 시작</p>
              <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>합성 샘플 CSV로 빠른 분석 흐름을 체험합니다.</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {STARTER_PACKS.slice(0, 5).map(pack => (
                <SampleCard
                  key={pack.id}
                  pack={pack}
                  onStart={() => startQuick({ sample_file: pack.sampleFile, confirm_target: false }, 'CSV 확인')}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
