import React from 'react'
import api from '../api'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: '', requestId: '', feedbackSent: false, feedbackError: '' }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    this.capturedError = error
    const payload = {
      name: error?.name || 'FrontendError',
      message: error?.message || '화면 오류',
      route: window.location.pathname,
      user_agent: navigator.userAgent,
      stack: info?.componentStack ? 'component stack captured' : '',
    }
    api.post('/monitoring/frontend-error', payload)
      .then(res => this.setState({ errorId: res.data?.error_id || '', requestId: res.data?.request_id || '' }))
      .catch(() => this.setState({ errorId: '보고 실패', requestId: '' }))
  }

  sendFeedback = () => {
    const payload = {
      category: 'bug',
      severity: 'high',
      title: '화면 오류가 발생했습니다',
      message: `화면을 불러오지 못했습니다. route=${window.location.pathname}`,
      route: window.location.pathname,
      page_url: window.location.href,
      request_id: this.state.requestId,
      error_id: this.state.errorId && this.state.errorId !== '보고 실패' ? this.state.errorId : '',
    }
    api.post('/feedback', payload)
      .then(() => this.setState({ feedbackSent: true, feedbackError: '' }))
      .catch(() => this.setState({ feedbackError: '문제 보고를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' }))
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)', color: 'var(--text)' }}>
        <section className="card" style={{ width: 'min(520px, 100%)', padding: 28, display: 'grid', gap: 14 }}>
          <p className="section-title">화면 오류</p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>화면을 불러오지 못했습니다.</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            일시적인 오류가 발생했습니다. 새로고침하거나 대시보드로 돌아가세요.
          </p>
          {(this.state.errorId || this.state.requestId) && (
            <div className="banner-warning">
              <p style={{ margin: 0, fontSize: 13 }}>
                {this.state.errorId && <>오류 ID: {this.state.errorId}</>}
                {this.state.errorId && this.state.requestId && ' / '}
                {this.state.requestId && <>request ID: {this.state.requestId}</>}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" type="button" onClick={() => window.location.reload()}>새로고침</button>
            <button className="btn-secondary" type="button" onClick={() => { window.location.href = '/dashboard' }}>대시보드로 이동</button>
            <button className="btn-secondary" type="button" onClick={this.sendFeedback}>문제 보고</button>
          </div>
          {this.state.feedbackSent && <div className="banner-success"><p style={{ margin: 0 }}>오류 ID가 포함된 피드백을 접수했습니다.</p></div>}
          {this.state.feedbackError && <div className="banner-danger"><p style={{ margin: 0 }}>{this.state.feedbackError}</p></div>}
        </section>
      </div>
    )
  }
}
