import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Clock, GitCompare, LogIn, RefreshCw, Trash2, UserRound } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AdminDashboard from '../components/admin/AdminDashboard'
import ExperimentComparePanel from '../components/history/ExperimentComparePanel'
import ExperimentDetail from '../components/history/ExperimentDetail'
import RecentExperimentSummary from '../components/history/RecentExperimentSummary'
import DatasetList from '../components/workspace/DatasetList'
import WorkspaceBanner from '../components/workspace/WorkspaceBanner'
import WorkspaceContinuityPanel from '../components/workspace/WorkspaceContinuityPanel'
import WorkspaceValuePanel from '../components/workspace/WorkspaceValuePanel'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

function getPrimaryMetric(item) {
  const first = item.results?.[0] || {}
  const label = item.tuned_metric || (item.task_type === 'regression' ? 'R2' : 'ROC-AUC')
  const value = item.tuned_score ?? first.roc_auc ?? first.r2 ?? first.accuracy
  return { label, value }
}

function taskLabel(task) {
  if (task === 'regression') return '숫자 예측'
  if (task === 'classification') return '분류 예측'
  return '분석'
}

function datasetMatchesExperiment(dataset, item) {
  if (item.dataset_ref?.id && dataset.id) return item.dataset_ref.id === dataset.id
  const sameTarget = String(item.target || '') === String(dataset.target_col || '')
  const sameRows = Number(item.data_shape?.[0]) === Number(dataset.rows)
  const sameDomain = !dataset.domain || !item.dataset_domain || item.dataset_domain === dataset.domain
  return sameTarget && sameRows && sameDomain
}

function experimentsForDataset(dataset, history) {
  return history.filter(item => datasetMatchesExperiment(dataset, item)).slice(0, 5)
}

function experimentKey(item) {
  return `${item.timestamp || ''}-${item.owner_email || ''}-${item.best_model || ''}-${item.target || ''}`
}

export default function History() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [datasets, setDatasets] = useState([])
  const [adminSummary, setAdminSummary] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [compareItems, setCompareItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [profileRes, historyRes, datasetsRes] = await Promise.all([
        api.get('/profile/summary'),
        api.get('/history'),
        api.get('/datasets').catch(() => ({ data: [] })),
      ])
      setProfile(profileRes.data)
      setHistory(historyRes.data || [])
      setDatasets(datasetsRes.data || [])
      if (profileRes.data?.is_admin) {
        const adminRes = await api.get('/admin/summary').catch(() => ({ data: null }))
        setAdminSummary(adminRes.data)
      } else {
        setAdminSummary(null)
      }
      setSelectedItem(null)
      setCompareItems([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function clearMyHistory() {
    setClearing(true)
    setMessage('')
    try {
      await api.delete('/history')
      setConfirmClear(false)
      setMessage(profile?.is_admin ? '전체 실험 기록을 삭제했습니다.' : '내 실험 기록을 삭제했습니다.')
      await load()
    } catch (e) {
      setMessage(e.response?.data?.detail || e.message)
    } finally {
      setClearing(false)
    }
  }

  function toggleCompare(item) {
    setCompareItems(prev => {
      const key = experimentKey(item)
      if (prev.some(row => experimentKey(row) === key)) {
        return prev.filter(row => experimentKey(row) !== key)
      }
      return [item, ...prev].slice(0, 3)
    })
  }

  const latest = history[0]
  const optunaCount = history.filter(h => h.optuna_applied).length
  const best = useMemo(() => {
    let max = null
    history.forEach(item => {
      const value = Number(getPrimaryMetric(item).value)
      if (!Number.isNaN(value)) max = max === null ? value : Math.max(max, value)
    })
    return max
  }, [history])

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1040 }}>
        <Card className="empty-state">
          <RefreshCw className="animate-spin" size={32} color="#2563eb" />
          <p className="empty-title" style={{ marginTop: 14 }}>계정 정보를 불러오는 중입니다</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <CardContent className="pt-5">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                {user?.picture ? (
                  <img src={user.picture} alt="" style={{ width: 54, height: 54, borderRadius: '50%', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 54, height: 54, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: '#2563eb' }}>
                    <UserRound size={26} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: 'var(--text)' }}>
                      {user ? `${user.name || '사용자'}님의 작업 공간` : '비로그인 작업 공간'}
                    </h1>
                    <Badge variant={profile?.is_admin ? 'default' : user ? 'success' : 'warning'}>
                      {profile?.is_admin ? '관리자' : user ? '계정 저장 중' : '임시 저장'}
                    </Badge>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                    {user ? user.email : '로그인하면 실험 기록이 계정별로 저장되고 다른 사람 기록과 섞이지 않습니다.'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {user ? (
                  <Button variant="secondary" onClick={logout}>로그아웃</Button>
                ) : (
                  <Button onClick={() => nav('/login')}><LogIn size={15} /> 로그인</Button>
                )}
                <Button variant="outline" onClick={load}><RefreshCw size={15} /> 새로고침</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <WorkspaceBanner profile={profile} />

        <WorkspaceValuePanel
          user={user}
          profile={profile}
          datasets={datasets}
          history={history}
          onStart={() => nav('/upload')}
          onLogin={() => nav('/login')}
        />

        {profile?.is_admin && <AdminDashboard summary={adminSummary} />}

        <DatasetList
          datasets={datasets}
          getExperiments={item => experimentsForDataset(item, history)}
          onSelectExperiment={setSelectedItem}
          onUpload={item => nav('/upload', { state: item ? { reanalysisDataset: item } : null })}
        />

        <WorkspaceContinuityPanel
          datasets={datasets}
          history={history}
          onOpenExperiment={setSelectedItem}
          onUpload={() => nav('/upload')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          <StatCard label={profile?.is_admin ? '전체 실험 기록' : '내 실험 기록'} value={history.length} sub={profile?.is_admin ? '관리자 기준' : user ? '계정 기준' : '임시 기록'} />
          <StatCard label="최고 성능" value={best === null ? '-' : best.toFixed(4)} sub="가장 좋은 점수" />
          <StatCard label="자동 개선" value={optunaCount} sub="Optuna 적용" />
          <StatCard label={profile?.is_admin ? '사용자 수' : '최근 실행'} value={profile?.is_admin ? profile.user_count ?? '-' : latest ? taskLabel(latest.task_type) : '-'} sub={profile?.is_admin ? '등록 계정' : latest?.timestamp || profile?.last_experiment_at || '기록 없음'} />
        </div>

        {latest && (
          <RecentExperimentSummary
            item={latest}
            metric={getPrimaryMetric(latest)}
            onOpen={() => setSelectedItem(latest)}
            onModelLab={() => nav('/model-lab')}
          />
        )}

        {compareItems.length > 0 && (
          <ExperimentComparePanel
            items={compareItems}
            onRemove={toggleCompare}
            onClear={() => setCompareItems([])}
            onOpen={setSelectedItem}
          />
        )}

        {!user && (
          <Card style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
            <CardContent className="pt-5">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                <div>
                  <CardTitle style={{ color: '#92400e' }}>로그인 기능을 실용적으로 쓰려면 계정 저장을 사용하세요</CardTitle>
                  <CardDescription style={{ color: '#b45309', marginTop: 6 }}>
                    로그인 후 실행한 모델 비교와 성능 개선 기록은 내 계정에 따로 저장됩니다.
                  </CardDescription>
                </div>
                <Button onClick={() => nav('/login')}>로그인하기</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <CardTitle>{profile?.is_admin ? '전체 실험 기록' : '최근 실험 기록'}</CardTitle>
                <CardDescription>
                  {profile?.is_admin ? '관리자는 모든 사용자의 실험 기록을 확인할 수 있습니다.' : '행을 클릭하면 실험 세부사항을 확인할 수 있습니다.'}
                </CardDescription>
              </div>
              {history.length > 0 && (
                <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)} disabled={clearing}>
                  <Trash2 size={14} /> 기록 삭제
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {confirmClear && (
              <div className="banner-warning" style={{ marginBottom: 12, justifyContent: 'space-between', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                  {profile?.is_admin ? '관리자는 모든 사용자의 실험 기록을 삭제합니다.' : '현재 작업공간의 실험 기록을 삭제합니다.'}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>취소</Button>
                  <Button variant="danger" size="sm" onClick={clearMyHistory} disabled={clearing}>
                    {clearing && <span className="spinner" />} 삭제 확인
                  </Button>
                </div>
              </div>
            )}
            {message && (
              <div className={message.includes('삭제했습니다') ? 'banner-success' : 'banner-warning'} style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{message}</p>
              </div>
            )}
            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: '52px 20px' }}>
                <BarChart3 size={36} color="#94a3b8" />
                <p className="empty-title" style={{ marginTop: 14 }}>아직 저장된 실험이 없습니다</p>
                <p className="empty-desc">모델 고르기 화면에서 모델 비교를 실행하면 자동으로 저장됩니다.</p>
                <Button style={{ marginTop: 18 }} onClick={() => nav('/model-lab')}>모델 비교하러 가기</Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>시간</th>
                      {profile?.is_admin && <th>사용자</th>}
                      <th>데이터</th>
                      <th>분야</th>
                      <th>맞히려는 값</th>
                      <th>예측 유형</th>
                      <th>선택 모델</th>
                      <th>성능</th>
                      <th>개선</th>
                      <th>비교</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => {
                      const metric = getPrimaryMetric(item)
                      const inCompare = compareItems.some(row => experimentKey(row) === experimentKey(item))
                      return (
                        <tr
                          key={`${item.timestamp}-${idx}`}
                          onClick={() => setSelectedItem(item)}
                          style={{
                            cursor: 'pointer',
                            background: selectedItem === item ? 'rgba(37,99,235,0.06)' : undefined,
                          }}
                        >
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={13} color="#94a3b8" /> {item.timestamp || '-'}
                            </span>
                          </td>
                          {profile?.is_admin && <td>{item.owner_email || item.owner_name || '-'}</td>}
                          <td>{item.data_shape?.join(' x ') || '-'}</td>
                          <td>{item.dataset_domain || '-'}</td>
                          <td>{item.target || '-'}</td>
                          <td>{taskLabel(item.task_type)}</td>
                          <td style={{ fontWeight: 750, color: 'var(--text)' }}>
                            {item.best_model || '-'} {item.agent_run && <Badge variant="default">AI</Badge>}
                          </td>
                          <td style={{ fontWeight: 750, color: '#2563eb' }}>{metric.label} {fmt(metric.value)}</td>
                          <td>
                            <Badge variant={item.optuna_applied ? 'success' : 'secondary'}>
                              {item.optuna_applied ? '적용됨' : '기본'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant={inCompare ? 'default' : 'secondary'}
                              size="sm"
                              onClick={event => {
                                event.stopPropagation()
                                toggleCompare(item)
                              }}
                            >
                              <GitCompare size={13} /> {inCompare ? '선택됨' : '비교'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedItem && (
          <ExperimentDetail
            item={selectedItem}
            owner={selectedItem.owner_email || user?.email || '내 기록'}
            onNavigate={(path, state) => nav(path, state ? { state } : undefined)}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 750, color: 'var(--text-label)' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 850, color: 'var(--text)' }}>{value}</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{sub}</p>
      </CardContent>
    </Card>
  )
}
