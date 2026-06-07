import { CheckCircle2, FileText, ListFilter, Sparkles } from 'lucide-react'
import DatasetQualityCard from './DatasetQualityCard'
import UploadAgentTrace from './UploadAgentTrace'
import UploadReadinessChecklist from './UploadReadinessChecklist'

const tabs = [
  ['readiness', CheckCircle2, '준비도'],
  ['trace', Sparkles, 'AI 판단'],
  ['quality', FileText, '품질'],
  ['drops', ListFilter, '제외'],
]

export default function UploadSidePanel({
  open,
  setOpen,
  activeTab,
  setActiveTab,
  uploadInfo,
  aiAnalysis,
  domain,
  domainConfidence,
  target,
  targetCategory,
  targetReason,
  targetConfidence,
  activeCount,
  dropCount,
  dropSuggestions,
  colLabels,
  labelFor,
}) {
  const hasDrops = dropSuggestions?.length > 0
  const visibleTabs = tabs.filter(([key]) => key !== 'drops' || hasDrops)

  return (
    <aside className={`upload-side-panel ${open ? 'upload-side-open' : ''}`}>
      <button type="button" className="upload-side-toggle" onClick={() => setOpen(!open)}>
        {open ? '접기' : '자세히'}
      </button>
      {open && (
        <div className="upload-side-head">
          <div>
            <p className="upload-side-kicker">보조 정보</p>
            <h2 className="upload-side-title">필요할 때 펼쳐보기</h2>
          </div>
          <span className="badge badge-blue">{visibleTabs.length}개</span>
        </div>
      )}

      <div className="upload-side-tabs">
        {visibleTabs.map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setActiveTab(key); setOpen(true) }}
            className={`upload-side-tab ${activeTab === key ? 'upload-side-tab-active' : ''}`}
          >
            <Icon size={17} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </div>

      {open && <div className="upload-side-body">
        {activeTab === 'readiness' && (
          <UploadReadinessChecklist
            rows={uploadInfo.shape?.[0]}
            cols={uploadInfo.shape?.[1]}
            missingTotal={uploadInfo.missing_total || 0}
            domain={domain}
            domainConfidence={domainConfidence}
            target={target}
            targetConfidence={targetConfidence}
            activeCount={activeCount}
            dropCount={dropCount}
          />
        )}
        {activeTab === 'trace' && (
          <UploadAgentTrace
            domain={domain}
            domainReason={aiAnalysis?.dataset_domain_reason}
            domainConfidence={domainConfidence}
            target={target}
            targetCategory={targetCategory}
            targetReason={targetReason}
            targetConfidence={targetConfidence}
            activeCount={activeCount}
            dropCount={dropCount}
          />
        )}
        {activeTab === 'quality' && <DatasetQualityCard quality={uploadInfo.dataset_quality} />}
        {activeTab === 'drops' && hasDrops && (
          <div className="card">
            <h2 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 12px' }}>AI가 제외를 추천한 이유</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {dropSuggestions.map((item, idx) => (
                <div key={`${item.col}-${idx}`} style={{ padding: 12, borderRadius: 10, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.14)' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', margin: '0 0 4px' }}>{labelFor(item.col, colLabels)}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
    </aside>
  )
}
