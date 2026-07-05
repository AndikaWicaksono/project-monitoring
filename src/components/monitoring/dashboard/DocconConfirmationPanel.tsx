import { useMemo } from 'react'
import { CheckCircle2, ArrowRight, X } from 'lucide-react'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { useUIStore } from '../../../store/useUIStore'
import { slaMonthLabel } from '../../../types/monitoring'

const MONTH_NAMES: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
  5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Ags',
  9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

export function DocconConfirmationPanel() {
  const { projects, components, monthlyRecords, dismissedConfirmations, dismissConfirmation } = useMonitoringSLAStore()
  const setView = useUIStore((s) => s.setView)
  const setSlaDetailProjectId = useUIStore((s) => s.setSlaDetailProjectId)

  const newConfirmations = useMemo(() => {
    return monthlyRecords
      .filter((r) => {
        const confirmed = (r as typeof r & { engineerConfirmedAt?: string | null }).engineerConfirmedAt
        return confirmed != null && !dismissedConfirmations.includes(r.id)
      })
      .map((r) => {
        const comp = components.find((c) => c.id === r.componentId)
        const proj = projects.find((p) => p.id === r.projectId)
        return { record: r, comp, proj }
      })
      .filter((item) => item.comp && item.proj)
  }, [monthlyRecords, components, projects, dismissedConfirmations])

  if (newConfirmations.length === 0) return null

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/25 text-emerald-600">
          <CheckCircle2 size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-emerald-900">
            {newConfirmations.length} konfirmasi baru dari Engineer
          </h3>
          <p className="text-[11px] text-emerald-700">
            Engineer On Site telah memverifikasi data SLA berikut
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {newConfirmations.map(({ record, comp, proj }) => {
          const r = record as typeof record & { engineerConfirmedAt?: string | null }
          return (
            <div
              key={record.id}
              className="flex items-center gap-3 rounded-lg bg-white/70 border border-emerald-100 px-3 py-2"
            >
              <div className="w-1 self-stretch rounded-full bg-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-pertamina-red">{proj!.kodeProject}</span>
                  <span className="text-[11px] text-ink-secondary truncate">{comp!.componentName}</span>
                  <span className="text-[10px] text-ink-tertiary shrink-0">
                    {MONTH_NAMES[record.month]} {record.year}
                  </span>
                </div>
                {record.engineerReconfirmNote && (
                  <p className="text-[10px] text-ink-secondary mt-0.5 italic truncate">
                    "{record.engineerReconfirmNote}"
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSlaDetailProjectId(proj!.id)
                  setView('monitoring-sla-detail')
                }}
                className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shrink-0"
              >
                Lihat <ArrowRight size={10} />
              </button>
              <button
                onClick={() => dismissConfirmation(record.id)}
                className="rounded p-1 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 transition shrink-0"
                title="Tandai sudah dibaca"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
