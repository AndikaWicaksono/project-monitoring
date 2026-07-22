import type { ReactNode } from 'react'
import { FileText, TrendingUp, DollarSign, ClipboardList, FileBarChart } from 'lucide-react'
import { useUIStore } from '../../../store/useUIStore'
import { useMonitoringRole } from '../../../hooks/useMonitoringRole'
import type { PageView } from '../../../types'

interface QuickAccessItem {
  view: PageView
  label: string
  icon: ReactNode
  tone: string
  show: boolean
}

export function QuickAccessPanel() {
  const setView = useUIStore((s) => s.setView)
  const { isCostAdmin, isPcrm, isKadep, isKadiv, isKadepParaf, isSuperAdmin, canViewCost } = useMonitoringRole()

  const allItems: QuickAccessItem[] = [
    { view: 'monitoring-report', label: 'Report Project', icon: <FileText size={16} />, tone: 'text-violet-600 bg-violet-100', show: !isCostAdmin && !isPcrm },
    { view: 'monitoring-sla', label: 'SLA Monitoring', icon: <TrendingUp size={16} />, tone: 'text-cyan-600 bg-cyan-100', show: !isCostAdmin && !isPcrm },
    { view: 'monitoring-cost', label: 'Cost Monitoring', icon: <DollarSign size={16} />, tone: 'text-amber-600 bg-amber-100', show: canViewCost },
    { view: 'monitoring-assignment', label: 'Master Data', icon: <ClipboardList size={16} />, tone: 'text-blue-600 bg-blue-100', show: isKadep || isKadiv },
    { view: 'monitoring-executive-summary', label: 'Executive Summary', icon: <FileBarChart size={16} />, tone: 'text-pertamina-red bg-pertamina-red-50', show: isKadiv || isKadepParaf || isSuperAdmin },
  ]
  const items = allItems.filter((i) => i.show)

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      <h3 className="text-sm font-semibold text-ink-primary mb-3">Quick Access</h3>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-ink-tertiary">Belum ada akses cepat tersedia</div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-2.5 content-start overflow-auto">
          {items.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className="flex flex-col items-start gap-2 rounded-lg border border-black/[0.06] p-3 text-left hover:bg-black/[0.03] hover:border-black/[0.1] transition"
            >
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${item.tone}`}>{item.icon}</div>
              <span className="text-[12px] font-medium text-ink-primary">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
