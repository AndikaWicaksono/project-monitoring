import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { BoardPage } from './pages/BoardPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectBoardPage } from './pages/ProjectBoardPage'
import { ModalsRoot } from './components/modals/ModalsRoot'
import { ActivityLogPanel } from './components/log/ActivityLog'
import { useUIStore } from './store/useUIStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AuthGate } from './components/auth/AuthGate'
import { PendingApprovalNotifier } from './components/auth/PendingApprovalNotifier'
import { MonitoringDashboardPage } from './pages/monitoring/MonitoringDashboardPage'
import { MonitoringReportPage } from './pages/monitoring/MonitoringReportPage'
import { MonitoringSLAPage } from './pages/monitoring/MonitoringSLAPage'
import { MonitoringCostPage } from './pages/monitoring/MonitoringCostPage'
import { MonitoringBAPPage } from './pages/monitoring/MonitoringBAPPage'

function App() {
  const view = useUIStore((s) => s.view)
  useKeyboardShortcuts()

  function renderPage() {
    if (view === 'project-board') return <ProjectBoardPage />
    if (view === 'board') return <BoardPage />
    if (view === 'monitoring-dashboard') return <MonitoringDashboardPage />
    if (view === 'monitoring-report') return <MonitoringReportPage />
    if (view === 'monitoring-sla') return <MonitoringSLAPage />
    if (view === 'monitoring-cost') return <MonitoringCostPage />
    if (view === 'monitoring-bap') return <MonitoringBAPPage />
    return <DashboardPage />
  }

  return (
    <>
      <AuthGate>
        <AppShell>
          {renderPage()}
        </AppShell>
        <ModalsRoot />
        <ActivityLogPanel />
        <PendingApprovalNotifier />
      </AuthGate>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid rgba(15,23,42,0.08)',
            fontSize: 13,
            borderRadius: 10,
            boxShadow: '0 12px 30px rgba(15,23,42,0.14)',
          },
        }}
      />
    </>
  )
}

export default App
