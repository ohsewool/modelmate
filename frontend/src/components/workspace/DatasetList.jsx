import { Database, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

export default function DatasetList({ datasets, onUpload }) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <CardTitle>저장된 데이터셋</CardTitle>
            <CardDescription>업로드한 CSV 메타데이터를 작업공간에 보관합니다.</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onUpload}><Upload size={14} /> 데이터 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!datasets.length ? (
          <div className="empty-state" style={{ padding: '34px 16px' }}>
            <Database size={32} color="#94a3b8" />
            <p className="empty-title" style={{ marginTop: 12 }}>저장된 데이터셋이 없습니다</p>
            <p className="empty-desc">로그인 후 CSV를 업로드하면 이곳에 데이터셋 메타가 쌓입니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {datasets.slice(0, 6).map(item => <DatasetRow key={item.id} item={item} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DatasetRow({ item }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 13, borderRadius: 12, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{item.filename}</p>
          <Badge variant="default">{item.domain || '도메인 확인 필요'}</Badge>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
          {item.rows?.toLocaleString?.() || item.rows}행 · {item.columns}열 · 맞힐 값 {item.target_col || '-'}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
        {String(item.created_at || '').slice(0, 10)}
      </p>
    </div>
  )
}
