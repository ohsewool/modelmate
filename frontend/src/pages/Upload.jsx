import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { Button } from '../components/ui/button'
import DatasetQualityCard from '../components/upload/DatasetQualityCard'
import DemoDatasetGuide from '../components/upload/DemoDatasetGuide'
import ReanalysisNotice from '../components/upload/ReanalysisNotice'
import UploadJudgmentBrief from '../components/upload/UploadJudgmentBrief'
import UploadSidePanel from '../components/upload/UploadSidePanel'
import StatusRecoveryPanel from '../components/StatusRecoveryPanel'
import { clearUploadDraft, loadUploadDraft, saveUploadDraft, uploadDraftMatchesState } from '../uploadDraftStorage'

export default function Upload() {
  const [dragging, setDragging] = useState(false)
  const draft = useRef(loadUploadDraft())
  const [uploadInfo, setUploadInfo] = useState(() => draft.current?.uploadInfo || null)
  const [aiAnalysis, setAiAnalysis] = useState(() => draft.current?.aiAnalysis || null)
  const [target, setTarget] = useState(() => draft.current?.target || '')
  const [dropCols, setDropCols] = useState(() => draft.current?.dropCols || [])
  const [colLabels, setColLabels] = useState(() => draft.current?.colLabels || {})
  const [edaInfo, setEdaInfo] = useState(() => draft.current?.edaInfo || null)
  const [modelResult, setModelResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [operationalStatus, setOperationalStatus] = useState(null)
  const [usageLimits, setUsageLimits] = useState(null)
  const [targetError, setTargetError] = useState('')
  const [modelError, setModelError] = useState('')
  const [needsReupload, setNeedsReupload] = useState(false)
  const [sideTab, setSideTab] = useState('readiness')
  const [sideOpen, setSideOpen] = useState(false)
  const [loading, setLoading] = useState('')
  const [selectedStarterPack, setSelectedStarterPack] = useState(null)
  const fileRef = useRef()
  const nav = useNavigate()
  const location = useLocation()
  const uploadParams = new URLSearchParams(location.search)
  const shouldReturnToAgentMode = uploadParams.get('returnTo') === 'agent-mode'
  const reanalysisDataset = location.state?.reanalysisDataset || null
  const reanalysisExperiment = location.state?.reanalysisExperiment || null
  const reanalysisItem = reanalysisDataset || reanalysisExperiment

  useEffect(() => {
    if (!draft.current?.uploadInfo) return
    api.get('/state').then(r => {
      setOperationalStatus(r.data?.analysis_status || null)
      setUsageLimits(r.data?.usage_limits || null)
      if (!r.data?.has_data) {
        clearUploadState('이전 화면 정보는 남아 있지만 서버에 원본 CSV가 없습니다. 같은 CSV를 다시 올려 주세요.')
      }
      if (r.data?.has_data && !uploadDraftMatchesState(draft.current, r.data)) {
        clearUploadState('현재 서버의 CSV와 저장된 화면 상태가 일치하지 않아 이전 분석 정보를 지웠습니다. CSV를 다시 선택하거나 업로드해 주세요.')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!uploadInfo) return
    saveUploadDraft({ uploadInfo, aiAnalysis, target, dropCols, colLabels, edaInfo })
  }, [uploadInfo, aiAnalysis, target, dropCols, colLabels, edaInfo])

  async function handleStarterPack(pack) {
    setUploadError(null)
    setSelectedStarterPack(pack)
    setLoading('sample')
    try {
      const response = await fetch(pack.samplePath)
      if (!response.ok) throw new Error('샘플 CSV를 불러오지 못했습니다. 배포된 샘플 파일 경로를 확인해 주세요.')
      const text = await response.text()
      const trimmed = text.trimStart().toLowerCase()
      if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || trimmed.includes('<head>')) {
        throw new Error('샘플 CSV를 불러오지 못했습니다. 배포된 샘플 파일 경로를 확인해 주세요.')
      }
      const header = text.split(/\r?\n/)[0] || ''
      if (!header.includes(',') || !header.split(',').map(col => col.trim()).includes(pack.recommendedTarget)) {
        throw new Error('샘플 CSV의 형식이 올바르지 않습니다. 추천 타깃 컬럼을 찾을 수 없습니다.')
      }
      const file = new File([text], pack.sampleFile, { type: 'text/csv' })
      await handleFile(file, pack)
    } catch (error) {
      setLoading('')
      setUploadError({
        message: error.message || '샘플 데이터를 준비하지 못했습니다.',
        tips: ['직접 CSV를 업로드하거나 잠시 후 다시 시도해 주세요.'],
      })
    }
  }

  async function handleFile(file, starterPack = null) {
    if (!file) return
    resetDatasetDependentState()
    setUploadError(null)
    setLoading(starterPack ? 'sample' : 'upload')
    if (starterPack) setSelectedStarterPack(starterPack)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/upload', fd)
      setOperationalStatus(data.analysis_status || null)
      setUsageLimits(data.usage_guardrails?.limits || null)

      const preferredTarget = starterPack?.recommendedTarget
      const reuseTarget = reanalysisItem?.target_col || reanalysisItem?.target
      const backendRecommendedTarget = data.has_meaningful_target !== false && data.default_target && data.columns?.includes(data.default_target)
        ? data.default_target
        : ''
      const targetToUse = preferredTarget && data.columns?.includes(preferredTarget)
        ? preferredTarget
        : reuseTarget && data.columns?.includes(reuseTarget)
          ? reuseTarget
          : backendRecommendedTarget
      const reuseDrops = [
        ...(reanalysisItem?.drop_cols || []),
        ...(reanalysisItem?.auto_drop_cols || []),
      ].filter(c => data.columns?.includes(c) && c !== targetToUse)

      setUploadInfo(data)
      setNeedsReupload(false)
      setTarget(targetToUse)
      setDropCols(reuseDrops.length ? [...new Set(reuseDrops)] : data.suggested_drop || [])
      setEdaInfo(null)

      if (shouldReturnToAgentMode && data.saved_dataset?.id) {
        const params = new URLSearchParams({
          dataset_id: data.saved_dataset.id,
        })
        if (data.saved_dataset.project_id) params.set('project_id', data.saved_dataset.project_id)
        nav(`/agent-mode?${params.toString()}`)
        return
      }

      setLoading('ai')
      try {
        const { data: ai } = await api.post('/analyze-columns')
        setAiAnalysis(ai)
        if (ai.col_labels) setColLabels(ai.col_labels)
        const aiConfidence = ai.target_quality?.confidence || ai.confidence
        const aiCanSuggestTarget = ai.has_meaningful_target !== false && aiConfidence !== 'low'
        if (!preferredTarget && !reuseTarget && aiCanSuggestTarget && ai.target_suggestion && data.columns.includes(ai.target_suggestion)) {
          setTarget(ai.target_suggestion)
        }
        if (!reuseDrops.length && ai.drop_suggestions?.length) {
          setDropCols(ai.drop_suggestions.map(d => d.col).filter(c => data.columns.includes(c) && c !== targetToUse))
        }
      } catch (_) {
        setAiAnalysis(null)
      }
    } catch (e) {
      const detail = e.response?.data?.detail
      if (typeof detail === 'object') {
        setOperationalStatus(detail.analysis_status || {
          status: 'failed',
          current_step: detail.failed_stage || 'csv_upload',
          progress_message: detail.user_friendly_message || detail.message,
          error_message: detail.technical_message || detail.raw_error,
          recommended_next_action: detail.recommended_next_action || detail.tips?.[0],
        })
      } else {
        setOperationalStatus({
          status: 'failed',
          current_step: 'csv_upload',
          progress_message: detail || e.message,
          recommended_next_action: 'CSV 파일 형식과 첫 행의 컬럼명을 확인한 뒤 다시 업로드하세요.',
        })
      }
      setUploadError(typeof detail === 'object'
        ? { ...detail, message: detail.message || detail.user_friendly_message }
        : { message: detail || e.message, tips: ['CSV 파일 형식과 첫 행의 컬럼명을 확인해 주세요.'] })
    } finally {
      setLoading('')
    }
  }

  async function handleSetTarget() {
    if (!target) {
      setTargetError('예측할 타깃 컬럼을 먼저 선택해 주세요.')
      return
    }
    setLoading('target')
    setTargetError('')
    setModelError('')
    setModelResult(null)
    try {
      const { data } = await api.post('/set-target', { target_col: target, drop_cols: dropCols, col_labels: colLabels })
      setEdaInfo(data)
      setOperationalStatus(data.analysis_status || null)
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      const message = typeof detail === 'object'
        ? (detail.user_friendly_message || detail.message || detail.technical_message)
        : detail
      if (typeof detail === 'object') {
        setOperationalStatus({
          status: 'failed',
          current_step: detail.failed_stage,
          progress_message: detail.user_friendly_message || detail.message,
          error_message: detail.technical_message,
          recommended_next_action: detail.recommended_next_action,
        })
      }
      if (String(message).includes('파일 없음') || String(message).includes('데이터가 없습니다') || String(message).includes('업로드 원본')) {
        clearUploadState('서버 재시작 또는 배포로 업로드 원본이 사라졌습니다. 같은 CSV를 다시 올려 주세요.')
      } else {
        setTargetError(message)
      }
    } finally {
      setLoading('')
    }
  }

  async function handleRunModelComparison() {
    if (!edaInfo || !target) {
      setModelError('모델 비교를 시작하려면 먼저 타깃과 문제 유형을 확인해 주세요.')
      return
    }
    if (loading === 'model') return
    setLoading('model')
    setModelError('')
    try {
      const { data } = await api.post('/run-cv')
      setModelResult(data)
      setOperationalStatus(data.analysis_status || null)
    } catch (e) {
      const detail = e.response?.data?.detail
      const message = typeof detail === 'object'
        ? (detail.user_friendly_message || detail.message || detail.technical_message)
        : detail || e.message
      if (typeof detail === 'object') {
        setOperationalStatus({
          status: 'failed',
          current_step: detail.failed_stage || 'automl_training',
          progress_message: detail.user_friendly_message || detail.message,
          error_message: detail.technical_message,
          recommended_next_action: detail.recommended_next_action,
        })
      }
      setModelError(message || '모델 비교 중 문제가 발생했습니다. 데이터 형식이나 타깃값을 확인한 뒤 다시 실행해 주세요.')
    } finally {
      setLoading('')
    }
  }

  function toggleDrop(col) {
    setDropCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
  }

  function reset() {
    clearUploadState()
  }

  function clearUploadState(message = '') {
    setUploadInfo(null)
    setAiAnalysis(null)
    setTarget('')
    setDropCols([])
    setColLabels({})
    setEdaInfo(null)
    setModelResult(null)
    setSelectedStarterPack(null)
    setUploadError(message ? { message, tips: ['파일 선택을 눌러 같은 CSV를 다시 올리면 분석을 이어갈 수 있습니다.'] } : null)
    setTargetError('')
    setModelError('')
    setNeedsReupload(false)
    clearUploadDraft()
  }

  function resetDatasetDependentState() {
    setUploadInfo(null)
    setAiAnalysis(null)
    setTarget('')
    setDropCols([])
    setColLabels({})
    setEdaInfo(null)
    setModelResult(null)
    setOperationalStatus(null)
    setUsageLimits(null)
    setTargetError('')
    setModelError('')
    setNeedsReupload(false)
    clearUploadDraft()
  }

  function clearReanalysis() {
    nav('/upload', { replace: true, state: null })
  }

  const activeCols = uploadInfo?.columns?.filter(c => c !== target && !dropCols.includes(c)) || []
  const targetCategory = selectedStarterPack
    ? (selectedStarterPack.problemType === 'regression' ? '회귀 예측' : '분류 예측')
    : aiAnalysis?.target_category || (aiAnalysis?.task_type === 'regression' ? '연속값 예측' : '목표 확인 필요')
  const targetReason = selectedStarterPack?.businessQuestion || aiAnalysis?.target_category_reason || '데이터 구조만으로는 실제 업무 의미를 완전히 판단하기 어렵습니다.'
  const confidenceLabel = value => ({ high: '높음', medium: '중간', low: '낮음' }[value] || value || '중간')
  const targetConfidence = confidenceLabel(aiAnalysis?.target_quality?.confidence || aiAnalysis?.target_category_confidence || '중간')
  const datasetDomain = selectedStarterPack?.category || aiAnalysis?.dataset_domain || '도메인 확인 필요'
  const domainConfidence = selectedStarterPack ? '높음' : aiAnalysis?.dataset_domain_confidence || targetConfidence
  const targetQuality = aiAnalysis?.target_quality || uploadInfo?.target_quality || {}
  const targetQualityConfidence = targetQuality?.confidence || aiAnalysis?.confidence || uploadInfo?.target_quality?.confidence
  const requiresTargetReview = targetQualityConfidence === 'medium' || targetQuality?.requires_review
  const requiresManualTarget = uploadInfo && (!target || targetQualityConfidence === 'low' || uploadInfo.has_meaningful_target === false)
  const canPrepareAnalysis = !!target && !needsReupload && !loading
  const currentStep = getAnalysisStep({ uploadInfo, aiAnalysis, target, edaInfo, modelResult, loading, requiresManualTarget, requiresTargetReview })
  const modelRows = modelResult?.results || []
  const modelSummary = summarizeModelResult(modelResult, target, uploadInfo?.filename)

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1240 }}>
      <section style={{
        borderRadius: 8, padding: '22px 24px', marginBottom: 18,
        background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 8px' }}>분석 흐름 · 데이터 넣기</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', letterSpacing: 0 }}>CSV 업로드</h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          CSV를 직접 올리거나 사용 사례 샘플로 시작하세요. ModelMate가 데이터 구조, 추천 타깃, 제외 후보를 먼저 정리합니다.
        </p>
      </section>

      <StepProgress current={currentStep} />

      {!uploadInfo ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {reanalysisItem && <ReanalysisNotice item={reanalysisItem} onClear={clearReanalysis} />}
          <StatusRecoveryPanel status={operationalStatus} limits={usageLimits} compact />
          <DemoDatasetGuide onStart={handleStarterPack} />
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? '#2563eb' : 'rgba(37,99,235,0.24)'}`,
              borderRadius: 8, padding: '56px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(37,99,235,0.07)' : 'var(--surface)',
              transition: 'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {loading ? (
              <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
                <span className="spinner" />
                <p style={{ color: 'var(--text)', fontWeight: 800, margin: 0 }}>
                  {loading === 'sample' ? '샘플 CSV를 준비하는 중입니다' : loading === 'ai' ? '데이터 구조를 읽는 중입니다' : '파일을 올리는 중입니다'}
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>잠시만 기다려 주세요.</p>
              </div>
            ) : (
              <>
                <div style={{ width: 56, height: 56, borderRadius: 8, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                  <UploadIcon />
                </div>
                <p style={{ color: 'var(--text)', fontWeight: 900, fontSize: 18, margin: '0 0 8px' }}>
                  CSV 파일을 끌어오거나 클릭해서 선택하세요
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 18px' }}>
                  CSV, TSV, TXT 파일을 지원합니다. 첫 행에는 컬럼명이 있어야 합니다.
                </p>
                <Button asChild>
                  <span style={{ pointerEvents: 'none' }}>파일 선택</span>
                </Button>
              </>
            )}
          </div>
          <DatasetQualityCard error={uploadError} onRetry={() => fileRef.current.click()} />
        </div>
      ) : (
        <div className={`animate-slide-up upload-workspace ${sideOpen ? 'upload-workspace-open' : ''}`}>
          <div className="upload-main-flow">
            {selectedStarterPack && (
              <div className="banner-success">
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)' }}>{selectedStarterPack.title}</strong> 샘플로 시작했습니다. 이 데이터는 기능 시연을 위한 합성 데이터이며 실제 의사결정에는 사용자의 실제 CSV로 다시 검증해야 합니다.
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <KPICard label="데이터 행" value={uploadInfo.shape?.[0]?.toLocaleString?.() || uploadInfo.shape?.[0]} color="blue" />
              <KPICard label="전체 컬럼" value={uploadInfo.shape?.[1]} color="cyan" />
              <KPICard label="결측값" value={uploadInfo.missing_total ?? 0} color={(uploadInfo.missing_total ?? 0) > 0 ? 'amber' : 'green'} />
              <KPICard label="맞힐 값" value={shortName(target, colLabels)} color="violet" />
              <KPICard label="데이터 종류" value={datasetDomain} color={domainConfidence === '낮음' ? 'amber' : 'green'} />
            </div>

            <UploadJudgmentBrief
              domain={datasetDomain}
              domainConfidence={domainConfidence}
              targetName={shortName(target, colLabels)}
              targetCategory={targetCategory}
              targetReason={targetReason}
              activeCount={activeCols.length}
              dropCount={dropCols.length}
            />

            <StatusRecoveryPanel status={operationalStatus} limits={usageLimits} compact />

            {uploadInfo.saved_dataset && (
              <div className="banner-success">
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                  {uploadInfo.saved_dataset.project_name}에 데이터셋 메타가 저장되었습니다.
                </p>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>분석에 사용할 설정</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                    {uploadInfo.filename ? `${uploadInfo.filename} 기준으로 ` : ''}모델이 무엇을 예측하고 어떤 정보를 참고할지 정하는 단계입니다. 필요하면 직접 바꿀 수 있습니다.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <Button onClick={handleSetTarget} disabled={!!loading || needsReupload}>
                    {loading === 'target' && <span className="spinner" />}
                    이 설정으로 분석 준비
                  </Button>
                  <Button onClick={reset} variant="secondary">다시 올리기</Button>
                </div>
              </div>

              {selectedStarterPack && (
                <div style={{ padding: 14, borderRadius: 8, border: '1px solid rgba(5,150,105,0.2)', background: 'rgba(5,150,105,0.07)', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#059669', margin: '0 0 6px' }}>사용 사례 설명</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{selectedStarterPack.businessQuestion}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-label)', lineHeight: 1.6, margin: '8px 0 0' }}>{selectedStarterPack.expectedReportFraming}</p>
                </div>
              )}

              {aiAnalysis?.dataset_summary && (
                <div style={{ padding: 14, borderRadius: 8, border: '1px solid rgba(37,99,235,0.16)', background: 'rgba(37,99,235,0.06)', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 6px' }}>데이터 판단 요약</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{aiAnalysis.dataset_summary}</p>
                  {aiAnalysis?.target_category && (
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: '8px 0 0' }}>
                      데이터 종류: <strong style={{ color: 'var(--text)' }}>{datasetDomain}</strong> · 맞힐 값: <strong style={{ color: 'var(--text)' }}>{targetCategory}</strong> · 신뢰도 {targetConfidence}
                      <br />{targetReason}
                    </p>
                  )}
                </div>
              )}

              {targetError && (
                <div className="banner-warning" style={{ marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{targetError}</p>
                </div>
              )}

              {requiresManualTarget && (
                <div className="banner-warning" style={{ marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    예측할 값을 자동으로 확정하기 어렵습니다. 분석할 컬럼을 직접 선택해 주세요.
                  </p>
                </div>
              )}

              {!requiresManualTarget && requiresTargetReview && (
                <div className="banner-warning" style={{ marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    추천 결과를 확인해 주세요. 이 타깃으로 모델을 학습해도 괜찮다면 아래 설정으로 분석 준비를 눌러 주세요.
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gap: 14 }}>
                <SettingPanel
                  title="맞히려는 값"
                  desc={`예측 모델이 최종적으로 맞혀야 하는 값입니다. 현재는 ${targetCategory} 문제로 보고 있습니다.`}
                  color="#2563eb"
                >
                  <select value={target} onChange={e => { setTarget(e.target.value); setDropCols(prev => prev.filter(c => c !== e.target.value)) }} className="input" style={{ maxWidth: 360 }}>
                    {!target && <option value="">예측할 타깃을 선택해 주세요</option>}
                    {uploadInfo.columns.map(c => <option key={c} value={c}>{labelFor(c, colLabels)}</option>)}
                  </select>
                </SettingPanel>

                <SettingPanel
                  title={`예측에 사용할 정보 ${activeCols.length}개`}
                  desc="모델이 정답을 맞히기 위해 참고할 정보입니다. 누르면 제외 목록으로 이동합니다."
                  color="#059669"
                >
                  <ChipList items={activeCols} colLabels={colLabels} empty="사용할 컬럼이 없습니다." onClick={toggleDrop} tone="green" />
                </SettingPanel>

                <SettingPanel
                  title={`예측에서 제외할 정보 ${dropCols.length}개`}
                  desc="ID, 날짜, 이미 정답을 알려주는 컬럼처럼 예측을 방해할 수 있는 정보입니다. 누르면 다시 포함합니다."
                  color="#dc2626"
                >
                  <ChipList items={dropCols} colLabels={colLabels} empty="제외할 컬럼이 없습니다." onClick={toggleDrop} tone="red" />
                </SettingPanel>
              </div>
            </div>

            {edaInfo && (
              <div className="card animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>분석 준비가 끝났습니다</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                      이제 여러 모델을 비교해서 이 데이터에 가장 잘 맞는 모델을 찾을 수 있습니다.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button onClick={handleRunModelComparison} disabled={!!loading}>
                      {loading === 'model' && <span className="spinner" />}
                      모델 비교 시작
                    </Button>
                    <Button variant="secondary" onClick={() => nav('/model-lab')}>고급 모델 화면</Button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  <KPICard label="학습 데이터" value={edaInfo.n_samples?.toLocaleString?.() || edaInfo.n_samples} color="blue" />
                  <KPICard label="사용 정보" value={edaInfo.n_features} color="cyan" />
                  <KPICard label="정답 비율" value={edaInfo.failure_rate != null ? `${edaInfo.failure_rate}%` : '-'} color="green" />
                </div>
                {modelError && (
                  <div className="banner-warning" style={{ marginTop: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{modelError}</p>
                  </div>
                )}
              </div>
            )}

            {modelResult && (
              <div className="card animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 900, color: '#059669', margin: '0 0 6px' }}>분석 완료</p>
                    <h2 style={{ fontSize: 19, color: 'var(--text)', margin: '0 0 6px' }}>{modelSummary.title}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>{modelSummary.description}</p>
                  </div>
                  <span className="badge badge-green">완료</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <KPICard label="선택 타깃" value={shortName(target, colLabels)} color="violet" />
                  <KPICard label="문제 유형" value={modelResult.task_type === 'regression' ? '회귀 예측' : '분류 예측'} color="cyan" />
                  <KPICard label="최고 모델" value={shortModel(modelResult.best_model)} color="green" />
                  <KPICard label="대표 지표" value={modelSummary.metric} color="blue" />
                </div>
                {modelRows.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>모델</th>
                          <th>상태</th>
                          <th>{modelResult.task_type === 'regression' ? 'R2' : 'Accuracy'}</th>
                          {modelResult.task_type !== 'regression' && <th>F1</th>}
                          {modelResult.task_type !== 'regression' && <th>ROC-AUC</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {modelRows.map(row => (
                          <tr key={row.model}>
                            <td style={{ fontWeight: 800 }}>{shortModel(row.model)}</td>
                            <td>{row.status === 'ok' ? '완료' : '실패'}</td>
                            <td>{formatMetric(modelResult.task_type === 'regression' ? row.r2 : row.accuracy)}</td>
                            {modelResult.task_type !== 'regression' && <td>{formatMetric(row.f1)}</td>}
                            {modelResult.task_type !== 'regression' && <td>{formatMetric(row.roc_auc)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {modelResult.feature_importance?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 900, color: 'var(--text)', margin: '0 0 8px' }}>중요 요인</p>
                    <ChipList
                      items={modelResult.feature_importance.slice(0, 6).map(item => item.feature)}
                      colLabels={colLabels}
                      empty="중요 요인을 아직 표시할 수 없습니다."
                      onClick={() => {}}
                      tone="green"
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Button onClick={() => nav('/report')}>보고서 보기</Button>
                  <Button variant="secondary" onClick={() => nav('/predict')}>새 데이터 예측하기</Button>
                  <Button variant="secondary" onClick={() => nav('/prediction-apis')}>예측 API 만들기</Button>
                  <Button variant="secondary" onClick={reset}>다른 CSV로 분석하기</Button>
                  <Button variant="secondary" onClick={() => nav('/projects')}>상세 실행 기록 보기</Button>
                </div>
              </div>
            )}
          </div>

          <UploadSidePanel
            open={sideOpen}
            setOpen={setSideOpen}
            activeTab={sideTab}
            setActiveTab={setSideTab}
            uploadInfo={uploadInfo}
            aiAnalysis={aiAnalysis}
            domain={datasetDomain}
            domainConfidence={domainConfidence}
            target={shortName(target, colLabels)}
            targetCategory={targetCategory}
            targetReason={targetReason}
            targetConfidence={targetConfidence}
            activeCount={activeCols.length}
            dropCount={dropCols.length}
            dropSuggestions={aiAnalysis?.drop_suggestions || []}
            colLabels={colLabels}
            labelFor={labelFor}
          />
        </div>
      )}
    </div>
  )
}

function SettingPanel({ title, desc, color, children }) {
  return (
    <div style={{ borderRadius: 8, padding: 16, border: `1px solid ${color}33`, background: `${color}0d` }}>
      <p style={{ fontSize: 14, fontWeight: 900, color, margin: '0 0 4px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.55 }}>{desc}</p>
      {children}
    </div>
  )
}

function ChipList({ items, colLabels, empty, onClick, tone }) {
  if (!items.length) return <p style={{ fontSize: 12, color: 'var(--text-label)', margin: 0 }}>{empty}</p>
  const isGreen = tone === 'green'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(col => (
        <button key={col} type="button" onClick={() => onClick(col)} style={{
          padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          border: `1px solid ${isGreen ? 'rgba(5,150,105,0.28)' : 'rgba(220,38,38,0.28)'}`,
          background: isGreen ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
          color: isGreen ? '#047857' : '#dc2626',
        }}>
          {labelFor(col, colLabels)}
        </button>
      ))}
    </div>
  )
}

function labelFor(col, labels) {
  return labels[col] ? `${labels[col]} (${col})` : col
}

function shortName(col, labels) {
  return labels[col] || col || '-'
}

function shortModel(name) {
  return String(name || '-').split(' ')[0]
}

function formatMetric(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(4) : '-'
}

function summarizeModelResult(result, target, filename) {
  const taskType = result?.task_type === 'regression' ? 'regression' : 'classification'
  const rows = result?.results || []
  const bestRow = rows.find(row => row.model === result?.best_model) || rows.find(row => row.status === 'ok') || {}
  const metricValue = taskType === 'regression'
    ? bestRow.r2 ?? result?.final_r2
    : bestRow.roc_auc ?? bestRow.accuracy ?? result?.final_accuracy ?? result?.final_f1
  const metricLabel = taskType === 'regression' ? 'R2' : (bestRow.roc_auc != null ? 'ROC-AUC' : 'Accuracy')
  const targetText = target || '선택한 타깃'
  return {
    title: `${targetText} 예측 분석이 완료되었습니다.`,
    description: `${filename || '선택한 CSV'} 기준으로 ${rows.length || '여러'}개 모델을 비교했고, ${shortModel(result?.best_model)} 모델이 가장 적합한 후보로 선택되었습니다. 보고서에서 성능, 중요 요인, 주의사항을 확인한 뒤 예측 API나 새 데이터 예측으로 이어갈 수 있습니다.`,
    metric: metricValue != null ? `${metricLabel} ${formatMetric(metricValue)}` : '확인 필요',
  }
}

function getAnalysisStep({ uploadInfo, aiAnalysis, target, edaInfo, modelResult, loading, requiresManualTarget, requiresTargetReview }) {
  if (modelResult) return 'completed'
  if (loading === 'model') return 'model'
  if (edaInfo) return 'model_ready'
  if (loading === 'target') return 'confirm'
  if (uploadInfo && (requiresManualTarget || requiresTargetReview || target)) return 'target'
  if (uploadInfo || aiAnalysis || loading === 'ai') return 'summary'
  if (loading === 'upload' || loading === 'sample') return 'upload'
  return 'upload'
}

function StepProgress({ current }) {
  const steps = [
    ['upload', 'CSV 업로드'],
    ['summary', '데이터 구조 확인'],
    ['target', '예측값 추천'],
    ['confirm', '예측값 확인'],
    ['model', '모델 비교'],
    ['completed', '분석 완료'],
  ]
  const currentIndex = Math.max(0, steps.findIndex(([key]) => key === current))
  return (
    <section className="card" style={{ marginBottom: 18, padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {steps.map(([key, label], index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <div key={key} style={{
              borderRadius: 8,
              padding: '10px 12px',
              border: `1px solid ${active ? 'rgba(37,99,235,0.35)' : done ? 'rgba(5,150,105,0.25)' : 'var(--border-sub)'}`,
              background: active ? 'rgba(37,99,235,0.08)' : done ? 'rgba(5,150,105,0.07)' : 'var(--surface-alt)',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: active ? '#2563eb' : done ? '#059669' : 'var(--text-label)' }}>
                {done ? '완료' : active ? '현재 단계' : '대기'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function UploadIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
}
