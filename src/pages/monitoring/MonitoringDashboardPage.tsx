import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { EngineerWarningPanel } from '../../components/monitoring/dashboard/EngineerWarningPanel'
import { DocconSalesWarningPanel } from '../../components/monitoring/dashboard/DocconSalesWarningPanel'
import { MonitoringStatsOverview } from '../../components/monitoring/dashboard/MonitoringStatsOverview'
import { SLAAchievementTrendChart } from '../../components/monitoring/dashboard/SLAAchievementTrendChart'
import { ProjectMonitoringTrendChart } from '../../components/monitoring/dashboard/ProjectMonitoringTrendChart'
import { ReportStatusDistributionChart } from '../../components/monitoring/dashboard/ReportStatusDistributionChart'
import { CostActualVsBudgetChart } from '../../components/monitoring/dashboard/CostActualVsBudgetChart'
import { CostLeadingLaggingChart } from '../../components/monitoring/dashboard/CostLeadingLaggingChart'
import { CostTopOverBudgetCard } from '../../components/monitoring/dashboard/CostTopOverBudgetCard'

export function MonitoringDashboardPage() {
  const { isAdminOSM, isDoccon, isEngineerOS, canViewCost } = useMonitoringRole()

  // admin_osm → Cost; doccon_osm & engineer_os → SLA & Report; kadiv → keduanya
  const showSLAReport = !isAdminOSM
  const showCost      = canViewCost

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Warning panel — engineer_os: SLA & dokumen pending */}
      {isEngineerOS && <EngineerWarningPanel />}
      {/* Warning panel — doccon: dokumen dikembalikan Sales */}
      {isDoccon && <DocconSalesWarningPanel />}

      <MonitoringStatsOverview />

      {showSLAReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SLAAchievementTrendChart />
          <ProjectMonitoringTrendChart />
        </div>
      )}

      {showSLAReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportStatusDistributionChart />
        </div>
      )}

      {/* Cost Overview */}
      {showCost && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink-primary">Cost Overview</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CostActualVsBudgetChart />
            <CostLeadingLaggingChart />
            <CostTopOverBudgetCard />
          </div>
        </div>
      )}
    </div>
  )
}
