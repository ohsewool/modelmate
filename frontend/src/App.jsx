import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './AuthContext'
import AppLayout from './components/AppLayout'
import Home from './pages/Home'
import Upload from './pages/Upload'
import ModelLab from './pages/ModelLab'
import XAI from './pages/XAI'
import History from './pages/History'
import Report from './pages/Report'
import Agent from './pages/Agent'
import Predict from './pages/Predict'
import Deploy from './pages/Deploy'
import Login from './pages/Login'

const GOOGLE_CLIENT_ID = '373474705259-7b18amrkom84aqqt59n87lglhrgq1trj.apps.googleusercontent.com'

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <AppLayout>
                <Routes>
                  <Route path="/upload"    element={<Upload />} />
                  <Route path="/agent"     element={<Agent />} />
                  <Route path="/model-lab" element={<ModelLab />} />
                  <Route path="/predict"  element={<Predict />} />
                  <Route path="/deploy"   element={<Deploy />} />
                  <Route path="/xai"       element={<XAI />} />
                  <Route path="/history"   element={<History />} />
                  <Route path="/report"    element={<Report />} />
                  <Route path="*"          element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
