import { useLocation } from 'react-router-dom'
import WorkspaceShell from './workspace-shell/WorkspaceShell'

export default function AppLayout({ children }) {
  const { pathname } = useLocation()

  if (pathname === '/') return <>{children}</>

  return <WorkspaceShell>{children}</WorkspaceShell>
}
