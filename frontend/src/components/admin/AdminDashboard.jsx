import { ShieldCheck } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export default function AdminDashboard({ summary }) {
  if (!summary) return null
  const domains = summary.domain_counts || []
  const datasets = summary.recent_datasets || []

  return (
    <Card style={{ borderColor: 'rgba(37,99,235,0.22)' }}>
      <CardHeader>
        <CardTitle><ShieldCheck size={18} /> 관리자 운영 현황</CardTitle>
        <CardDescription>사용자, 데이터셋, 실험 흐름을 운영자 관점에서 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          <AdminStat label="사용자" value={summary.user_count} />
          <AdminStat label="프로젝트" value={summary.project_count} />
          <AdminStat label="데이터셋" value={summary.dataset_count} />
          <AdminStat label="실험" value={summary.experiment_count} />
          <AdminStat label="최고 성능" value={summary.best_score ?? '-'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 12 }}>
          <div className="card-elevated" style={{ padding: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 900 }}>도메인 분포</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {domains.length ? domains.map(row => <DomainBar key={row.domain} row={row} max={domains[0].n} />) : (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)' }}>아직 저장된 데이터셋이 없습니다.</p>
              )}
            </div>
          </div>
          <div className="card-elevated" style={{ padding: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 900 }}>최근 업로드</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {datasets.length ? datasets.map(item => <DatasetLine key={`${item.filename}-${item.created_at}`} item={item} />) : (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)' }}>최근 업로드가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminStat({ label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
      <p style={{ margin: '0 0 5px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, color: 'var(--text)', fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function DomainBar({ row, max }) {
  const width = Math.max(8, Math.round((row.n / Math.max(max, 1)) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 800 }}>{row.domain}</span><span>{row.n}개</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: '#2563eb' }} />
      </div>
    </div>
  )
}

function DatasetLine({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10, background: 'var(--surface-alt)' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>{item.filename}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-label)' }}>
          {item.owner_email || '-'} · {item.rows || 0}행 / {item.columns || 0}열
        </p>
      </div>
      <Badge variant="secondary">{item.domain || '확인 필요'}</Badge>
    </div>
  )
}
