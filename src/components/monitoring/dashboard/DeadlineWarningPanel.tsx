import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useUIStore } from '../../../store/useUIStore'
import { isDocCompleted, type DocPhase } from '../../../types/monitoring'

const PHASE_LABELS: Record<DocPhase, string> = {
  engineer:        'Engineer',
  doccon:          'Doccon',
  som:             'Site Ops Manager',
  kadep:           'Kadep',
  kadiv:           'Kadiv',
  customer_email:  'Customer',
  vendor_confirm:  'Vendor',
  sales:           'Sales',
  completed:       'Selesai',
  customer:        'Customer', // legacy phase, backward compat
}

export function DeadlineWarningPanel() {
  const { projects, documents } = useMonitoringReportStore()
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)

  const urgentItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return documents
      .filter((d) => {
        if (!d.deadlineToSales) return false
        if (isDocCompleted(d)) return false
        const deadline = new Date(d.deadlineToSales)
        deadline.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
        return diffDays <= 5
      })
      .map((d) => {
        const proj = projects.find((p) => p.id === d.projectId)
        const deadline = new Date(d.deadlineToSales!)
        deadline.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
        return { doc: d, proj, diffDays }
      })
      .filter((item) => item.proj)
      .sort((a, b) => a.diffDays - b.diffDays)
  }, [documents, projects])

  if (urgentItems.length === 0) return null

  const overdueCount = urgentItems.filter((i) => i.diffDays < 0).length
  const todayCount   = urgentItems.filter((i) => i.diffDays === 0).length
  const soonCount    = urgentItems.filter((i) => i.diffDays > 0).length

  const panelColor = overdueCount > 0 || todayCount > 0
    ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
    : 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
  const iconColor  = overdueCount > 0 || todayCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
  const titleColor = overdueCount > 0 || todayCount > 0 ? 'text-red-900' : 'text-amber-900'
  const subColor   = overdueCount > 0 || todayCount > 0 ? 'text-red-700' : 'text-amber-700'

  return (
    <div className={`rounded-xl border overflow-hidden ${panelColor}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${overdueCount > 0 ? 'border-red-200/60' : 'border-amber-200/60'}`}>
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconColor}`}>
          <AlertTriangle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${titleColor}`}>
            {urgentItems.length} dokumen mendekati/melewati deadline
          </h3>
          <p className={`text-[11px] ${subColor}`}>
            {overdueCount > 0 && <span className="font-semibold text-red-600">{overdueCount} overdue</span>}
            {overdueCount > 0 && todayCount > 0 && ' · '}
            {todayCount > 0 && <span className="font-semibold text-red-500">{todayCount} hari ini</span>}
            {(overdueCount > 0 || todayCount > 0) && soonCount > 0 && ' · '}
            {soonCount > 0 && <span>{soonCount} dalam 5 hari</span>}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {urgentItems.map(({ doc, proj, diffDays }) => {
          const isOverdue = diffDays < 0
          const isToday   = diffDays === 0
          const isCritical = isOverdue || isToday || diffDays <= 1

          const badgeColor = isOverdue
            ? 'bg-red-100 text-red-700 font-semibold'
            : isToday
              ? 'bg-red-50 text-red-600 font-semibold'
              : diffDays <= 1
                ? 'bg-red-50 text-red-500'
                : diffDays <= 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-yellow-100 text-yellow-700'

          const badgeLabel = isOverdue
            ? `Overdue ${Math.abs(diffDays)}h`
            : isToday
              ? 'Hari ini!'
              : `H-${diffDays}`

          const borderColor = isCritical ? 'border-red-100' : 'border-amber-100'

          return (
            <div
              key={doc.id}
              className={`flex items-center gap-3 rounded-lg bg-white/70 border ${borderColor} px-3 py-2`}
            >
              <div className={`w-1 self-stretch rounded-full shrink-0 ${isCritical ? 'bg-red-400' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-pertamina-red">{proj!.kodeProject}</span>
                  <span className="text-[11px] text-ink-secondary truncate">{doc.judul}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`chip text-[9px] px-1.5 py-0.5 ${badgeColor}`}>{badgeLabel}</span>
                  <span className="text-[10px] text-ink-tertiary flex items-center gap-0.5">
                    <Clock size={8} />
                    {(doc.currentPhase ? PHASE_LABELS[doc.currentPhase] : undefined) ?? 'Draft'}
                  </span>
                  {doc.assignedDocconName && (
                    <span className="text-[10px] text-ink-tertiary">· {doc.assignedDocconName}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setReportDetailProjectId(proj!.id)
                  setView('monitoring-report-detail')
                }}
                className={`flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium border transition shrink-0 ${
                  isCritical
                    ? 'text-red-700 hover:bg-red-100 border-red-200'
                    : 'text-amber-700 hover:bg-amber-100 border-amber-200'
                }`}
              >
                Lihat <ArrowRight size={10} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
