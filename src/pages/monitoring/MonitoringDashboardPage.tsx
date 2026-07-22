import { FileDown } from 'lucide-react'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/helpers'
import { EngineerWarningPanel } from '../../components/monitoring/dashboard/EngineerWarningPanel'
import { DocconSalesWarningPanel } from '../../components/monitoring/dashboard/DocconSalesWarningPanel'
import { MonitoringStatsOverview } from '../../components/monitoring/dashboard/MonitoringStatsOverview'
import { NeedAttentionBanner } from '../../components/monitoring/dashboard/NeedAttentionBanner'
import { UpcomingDeadlinePanel } from '../../components/monitoring/dashboard/UpcomingDeadlinePanel'
import { QuickAccessPanel } from '../../components/monitoring/dashboard/QuickAccessPanel'
import { SLAAchievementTrendChart } from '../../components/monitoring/dashboard/SLAAchievementTrendChart'
import { ProjectMonitoringTrendChart } from '../../components/monitoring/dashboard/ProjectMonitoringTrendChart'
import { ReportStatusDistributionChart } from '../../components/monitoring/dashboard/ReportStatusDistributionChart'
import { DocconWorkloadChart } from '../../components/monitoring/dashboard/DocconWorkloadChart'
import { AdminOsmWorkloadChart } from '../../components/monitoring/dashboard/AdminOsmWorkloadChart'
import { SOMWorkloadChart } from '../../components/monitoring/dashboard/SOMWorkloadChart'
import { DocconConfirmationPanel } from '../../components/monitoring/dashboard/DocconConfirmationPanel'
import { DocconEngineerSubmitPanel } from '../../components/monitoring/dashboard/DocconEngineerSubmitPanel'
import { DeadlineWarningPanel } from '../../components/monitoring/dashboard/DeadlineWarningPanel'
import { KadivApprovalPanel } from '../../components/monitoring/dashboard/KadivApprovalPanel'
import { SOMApprovalPanel } from '../../components/monitoring/dashboard/SOMApprovalPanel'
import { CostActualVsBudgetChart } from '../../components/monitoring/dashboard/CostActualVsBudgetChart'
import { CostLeadingLaggingChart } from '../../components/monitoring/dashboard/CostLeadingLaggingChart'
import { CostTopOverBudgetCard } from '../../components/monitoring/dashboard/CostTopOverBudgetCard'

export function MonitoringDashboardPage() {
  const { isCostAdmin, isDoccon, isEngineerOS, isKadiv, isKadep, isKadepParaf, isSOM, isSuperAdmin, canViewCost } = useMonitoringRole()
  const setView = useUIStore((s) => s.setView)

  // cost admin (OSM/DMO/SCS) → Cost only; doccon & engineer → SLA & Report; kadiv/kadep → keduanya
  const showSLAReport = !isCostAdmin
  const showCost      = canViewCost
  const canExportSummary = isKadiv || isKadepParaf || isSuperAdmin

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {canExportSummary && (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" leftIcon={<FileDown size={14} />} onClick={() => setView('monitoring-executive-summary')}>
            Export Executive Summary
          </Button>
        </div>
      )}
      {isEngineerOS && <EngineerWarningPanel />}
      {isDoccon && <DocconEngineerSubmitPanel />}
      {isDoccon && <DocconSalesWarningPanel />}
      {isDoccon && <DocconConfirmationPanel />}
      {isKadiv && <KadivApprovalPanel />}
      {isSOM && <SOMApprovalPanel />}
      {!isCostAdmin && !isKadiv && !isDoccon && !isEngineerOS && !isSOM && <DeadlineWarningPanel />}

      <MonitoringStatsOverview />

      <NeedAttentionBanner />

      {showSLAReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SLAAchievementTrendChart />
          <ProjectMonitoringTrendChart />
        </div>
      )}

      {showSLAReport && (
        <div className={classNames('grid grid-cols-1 gap-4', (isKadiv || isKadep) ? 'lg:grid-cols-4' : 'lg:grid-cols-2')}>
          <ReportStatusDistributionChart />
          {(isKadiv || isKadep) && <DocconWorkloadChart />}
          {(isKadiv || isKadep) && <AdminOsmWorkloadChart />}
          {(isKadiv || isKadep) && <SOMWorkloadChart />}
        </div>
      )}

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

      {showSLAReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UpcomingDeadlinePanel />
          <QuickAccessPanel />
        </div>
      )}
    </div>
  )
}
