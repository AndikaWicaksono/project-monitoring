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
import { MonitoringReportDetailPage } from './pages/monitoring/MonitoringReportDetailPage'
import { MonitoringSLAPage } from './pages/monitoring/MonitoringSLAPage'
import { MonitoringSLADetailPage } from './pages/monitoring/MonitoringSLADetailPage'
import { MonitoringCostPage } from './pages/monitoring/MonitoringCostPage'
import { MonitoringCostDetailPage } from './pages/monitoring/MonitoringCostDetailPage'
import { MonitoringBAPPage } from './pages/monitoring/MonitoringBAPPage'
import { MonitoringAssignmentPage } from './pages/monitoring/MonitoringAssignmentPage'
import { SalesInboxPage } from './pages/SalesInboxPage'
import { useMonitoringRole } from './hooks/useMonitoringRole'

function App() {
  const view = useUIStore((s) => s.view)
  const { isAdminOSM, isDoccon, isSales, canViewCost, isKadep, isKadiv } = useMonitoringRole()
  useKeyboardShortcuts()

  function renderPage() {
    if (view === 'project-board') return <ProjectBoardPage />
    if (view === 'board') return <BoardPage />

    // Sales: hanya boleh akses Sales Inbox
    if (isSales) return <SalesInboxPage />

    if (view === 'monitoring-dashboard') return <MonitoringDashboardPage />

    // Guard: admin_osm tidak boleh akses SLA & Report
    if ((view === 'monitoring-sla' || view === 'monitoring-sla-detail') && isAdminOSM) return <MonitoringDashboardPage />
    if ((view === 'monitoring-report' || view === 'monitoring-report-detail') && isAdminOSM) return <MonitoringDashboardPage />

    // Guard: hanya admin_osm & kadiv yang boleh akses Cost
    if ((view === 'monitoring-cost' || view === 'monitoring-cost-detail') && !canViewCost) return <MonitoringDashboardPage />

    if (view === 'monitoring-report') return <MonitoringReportPage />
    if (view === 'monitoring-report-detail') return <MonitoringReportDetailPage />
    if (view === 'monitoring-sla') return <MonitoringSLAPage />
    if (view === 'monitoring-sla-detail') return <MonitoringSLADetailPage />
    if (view === 'monitoring-cost') return <MonitoringCostPage />
    if (view === 'monitoring-cost-detail') return <MonitoringCostDetailPage />
    if (view === 'monitoring-bap') return <MonitoringBAPPage />
    if (view === 'monitoring-assignment') {
      if (!isKadep && !isKadiv) return <MonitoringDashboardPage />
      return <MonitoringAssignmentPage />
    }
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
