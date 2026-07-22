import type { ReactNode } from 'react'
import { AlertCircle, Clock, Stamp, DollarSign } from 'lucide-react'
import { useUIStore } from '../../../store/useUIStore'
import { useMonitoringRole } from '../../../hooks/useMonitoringRole'
import { useExecutiveSummaryData } from '../../../utils/executiveSummary'

interface Chip {
  key: string
  label: string
  icon: ReactNode
  tone: string
  onClick: () => void
}

// Ringkasan risiko sekilas di puncak dashboard — beda level sama panel antrean per-role
// (KadivApprovalPanel dkk) yang isinya actionable list; ini cuma "lampu peringatan" agregat.
export function NeedAttentionBanner() {
  const setView = useUIStore((s) => s.setView)
  const { isCostAdmin, canViewCost } = useMonitoringRole()
  const data = useExecutiveSummaryData()

  const showReportChips = !isCostAdmin
  const deadlineCount   = data.deadlines.overdueCount + data.deadlines.todayCount + data.deadlines.soonCount
  const approvalCount   = data.report.pendingSomCount + data.report.pendingKadepCount + data.report.pendingKadivCount
  const overBudgetCount = data.cost.overBudgetCount

  const chips: Chip[] = []
  if (showReportChips && deadlineCount > 0) {
    chips.push({
      key: 'deadline',
      label: `${deadlineCount} dokumen mendekati deadline`,
      icon: <Clock size={13} />,
      tone: data.deadlines.overdueCount > 0
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-amber-100 text-amber-700 border-amber-200',
      onClick: () => setView('monitoring-report'),
    })
  }
  if (showReportChips && approvalCount > 0) {
    chips.push({
      key: 'approval',
      label: `${approvalCount} dokumen menunggu approval`,
      icon: <Stamp size={13} />,
      tone: 'bg-blue-100 text-blue-700 border-blue-200',
      onClick: () => setView('monitoring-report'),
    })
  }
  if (canViewCost && overBudgetCount > 0) {
    chips.push({
      key: 'budget',
      label: `${overBudgetCount} project over budget`,
      icon: <DollarSign size={13} />,
      tone: 'bg-orange-100 text-orange-700 border-orange-200',
      onClick: () => setView('monitoring-cost'),
    })
  }

  return (
    <div className="surface rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${chips.length > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
          <AlertCircle size={16} />
        </div>
        <span className="text-sm font-semibold text-ink-primary">Perlu Perhatian</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {chips.length === 0 ? (
          <span className="text-[12px] text-emerald-700">Semua dalam kondisi baik, tidak ada item mendesak saat ini.</span>
        ) : (
          chips.map((c) => (
            <button
              key={c.key}
              onClick={c.onClick}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:brightness-95 ${c.tone}`}
            >
              {c.icon} {c.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
