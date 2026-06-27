import { MonitoringStatsOverview } from '../../components/monitoring/dashboard/MonitoringStatsOverview'
import { SLAAchievementTrendChart } from '../../components/monitoring/dashboard/SLAAchievementTrendChart'
import { ProjectMonitoringTrendChart } from '../../components/monitoring/dashboard/ProjectMonitoringTrendChart'
import { CostRealizationTrendChart } from '../../components/monitoring/dashboard/CostRealizationTrendChart'
import { ReportStatusDistributionChart } from '../../components/monitoring/dashboard/ReportStatusDistributionChart'
import { CostActualVsBudgetChart } from '../../components/monitoring/dashboard/CostActualVsBudgetChart'
import { CostLeadingLaggingChart } from '../../components/monitoring/dashboard/CostLeadingLaggingChart'
import { CostTopOverBudgetCard } from '../../components/monitoring/dashboard/CostTopOverBudgetCard'

export function MonitoringDashboardPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      <MonitoringStatsOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SLAAchievementTrendChart />
        <ProjectMonitoringTrendChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostRealizationTrendChart />
        <ReportStatusDistributionChart />
      </div>

      {/* Cost Overview */}
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
    </div>
  )
}
