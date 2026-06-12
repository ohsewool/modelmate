import { useState } from 'react'
import { AlertTriangle, Database, Trash2, Upload } from 'lucide-react'
import api from '../../api'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import DatasetDetail from './DatasetDetail'

export default function DatasetList({ datasets, onUpload, getExperiments, onSelectExperiment, onDeleted }) {
  const [selected, setSelected] = useState(null)
  const [impact, setImpact] = useState(null)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function showDeleteImpact(item) {
    setMessage('')
    try {
      const res = await api.get(`/datasets/${item.id}/delete-impact`)
      setImpact(res.data)
    } catch (e) {
      setMessage(e.response?.data?.detail?.user_friendly_message || e.response?.data?.detail || e.message)
    }
  }

  async function deleteDataset(item) {
    setDeleting(true)
    setMessage('')
    try {
      await api.delete(`/datasets/${item.id}`)
      setSelected(null)
      setImpact(null)
      setMessage('데이터셋을 삭제했습니다. 기존 보고서는 이력 요약으로 남을 수 있지만, 원본 CSV가 필요한 재실행은 비활성화됩니다.')
      await onDeleted?.()
    } catch (e) {
      setMessage(e.response?.data?.detail?.user_friendly_message || e.response?.data?.detail || e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <CardTitle>내 데이터셋</CardTitle>
            <CardDescription>업로드한 CSV 메타데이터와 연결된 분석 이력을 확인합니다.</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onUpload}><Upload size={14} /> 데이터 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!datasets.length ? (
          <div className="empty-state" style={{ padding: '34px 16px' }}>
            <Database size={32} color="#94a3b8" />
            <p className="empty-title" style={{ marginTop: 12 }}>저장된 데이터셋이 없습니다</p>
            <p className="empty-desc">로그인 후 CSV를 업로드하면 이곳에서 데이터셋과 분석 이력을 다시 열 수 있습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {datasets.slice(0, 6).map(item => (
              <DatasetRow
                key={item.id}
                item={item}
                active={selected?.id === item.id}
                onClick={() => {
                  setImpact(null)
                  setMessage('')
                  setSelected(selected?.id === item.id ? null : item)
                }}
              />
            ))}
            {selected && (
              <div style={{ display: 'grid', gap: 10 }}>
                <DatasetDetail
                  item={selected}
                  experiments={getExperiments?.(selected) || []}
                  onSelectExperiment={onSelectExperiment}
                  onUpload={() => onUpload(selected)}
                />
                <div style={{ border: '1px solid #fecaca', background: '#fff7ed', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <AlertTriangle size={18} color="#ea580c" />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#9a3412' }}>위험 구역</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9a3412', lineHeight: 1.55 }}>
                          이 데이터셋을 삭제하면 원본 CSV가 필요한 재실행은 불가능해질 수 있습니다. 기존 보고서는 이력 요약으로 남을 수 있고, 연결된 예측 API는 비활성화될 수 있습니다.
                        </p>
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => showDeleteImpact(selected)} disabled={deleting}>
                      <Trash2 size={14} /> 삭제 영향 확인
                    </Button>
                  </div>
                  {impact && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#7c2d12', lineHeight: 1.55 }}>
                        영향 범위: 재실행 비활성화, 분석 실행 {impact.linked_analysis_runs || 0}개, 보고서 {impact.linked_reports || 0}개, 예측 API {impact.linked_prediction_apis || 0}개에 영향을 줄 수 있습니다.
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#7c2d12' }}>{impact.retention_note}</p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" size="sm" onClick={() => setImpact(null)}>취소</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteDataset(selected)} disabled={deleting}>
                          {deleting && <span className="spinner" />} 데이터셋 삭제
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {message && (
                  <div className={message.includes('삭제') ? 'banner-success' : 'banner-warning'}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DatasetRow({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 13, borderRadius: 8, border: active ? '1px solid #2563eb' : '1px solid var(--border-sub)', background: active ? '#eff6ff' : 'var(--surface-alt)', textAlign: 'left', cursor: 'pointer' }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{item.filename}</p>
          <Badge variant="default">{item.domain || '도메인 확인 필요'}</Badge>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
          {item.rows?.toLocaleString?.() || item.rows}행 · {item.columns}열 · 타깃 {item.target_col || '-'}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
        {String(item.created_at || '').slice(0, 10)}
      </p>
    </button>
  )
}
