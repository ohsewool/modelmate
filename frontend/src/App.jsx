import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './AuthContext'
import { useAuth } from './AuthContext'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Upload from './pages/Upload'
import ModelLab from './pages/ModelLab'
import XAI from './pages/XAI'
import History from './pages/History'
import Report from './pages/Report'
import Agent from './pages/Agent'
import AgentMode from './pages/AgentMode'
import AgentRunDetail from './pages/AgentRunDetail'
import Predict from './pages/Predict'
import Deploy from './pages/Deploy'
import Login from './pages/Login'
import Pricing from './pages/Pricing'
import WorkspaceDashboard from './pages/workspace/WorkspaceDashboard'
import WorkspaceProjects from './pages/workspace/WorkspaceProjects'
import WorkspaceJobs from './pages/workspace/WorkspaceJobs'
import WorkspaceReports from './pages/workspace/WorkspaceReports'
import WorkspacePredictionApis from './pages/workspace/WorkspacePredictionApis'
import WorkspaceSettings from './pages/workspace/WorkspaceSettings'
import ProjectDetail from './pages/workspace/ProjectDetail'
import RunDetail from './pages/workspace/RunDetail'

const GOOGLE_CLIENT_ID = '373474705259-7b18amrkom84aqqt59n87lglhrgq1trj.apps.googleusercontent.com'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
        <span className="spinner-lg" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/*" element={
                <RequireAuth>
                  <AppLayout>
                    <Routes>
                      <Route path="/dashboard" element={<WorkspaceDashboard />} />
                      <Route path="/projects" element={<WorkspaceProjects />} />
                      <Route path="/projects/:projectId" element={<ProjectDetail />} />
                      <Route path="/projects/:projectId/runs/:runId" element={<RunDetail />} />
                      <Route path="/jobs" element={<WorkspaceJobs />} />
                      <Route path="/reports" element={<WorkspaceReports />} />
                      <Route path="/prediction-apis" element={<WorkspacePredictionApis />} />
                      <Route path="/settings" element={<WorkspaceSettings />} />
                      <Route path="/new" element={<Navigate to="/upload" replace />} />
                      <Route path="/analysis/new" element={<Navigate to="/upload" replace />} />
                      <Route path="/upload"    element={<Upload />} />
                      <Route path="/agent"     element={<Agent />} />
                      <Route path="/agent-mode" element={<AgentMode />} />
                      <Route path="/agent-mode/:agentRunId" element={<AgentRunDetail />} />
                      <Route path="/model-lab" element={<ModelLab />} />
                      <Route path="/predict"  element={<Predict />} />
                      <Route path="/deploy"   element={<Deploy />} />
                      <Route path="/xai"       element={<XAI />} />
                      <Route path="/history"   element={<History />} />
                      <Route path="/report"    element={<Report />} />
                      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </AppLayout>
                </RequireAuth>
              } />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
