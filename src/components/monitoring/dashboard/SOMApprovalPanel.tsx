import { useMemo } from 'react'
import { Stamp, ArrowRight } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useMonitoringAssignmentStore } from '../../../store/useMonitoringAssignmentStore'
import { useMonitoringRole } from '../../../hooks/useMonitoringRole'
import { useUIStore } from '../../../store/useUIStore'
import { reportMonthLabel } from '../../../types/monitoring'

export function SOMApprovalPanel() {
  const { projects, documents } = useMonitoringReportStore()
  const assignments = useMonitoringAssignmentStore((s) => s.assignments)
  const { currentUserId } = useMonitoringRole()
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)

  // SOM di-assign per-project (kayak Doccon) — cuma dokumen dari project yang diassign
  // ke user yang login yang muncul di sini.
  const pendingItems = useMemo(() => {
    return documents
      .filter((d) => d.status === 'PENDING_SOM' && d.currentPhase === 'som')
      .map((d) => ({ doc: d, proj: projects.find((p) => p.id === d.projectId) }))
      .filter((item) => {
        if (!item.proj) return false
        const asgn = assignments.find((a) => a.kodeProject === item.proj!.kodeProject)
        return asgn?.assignedSOMId === currentUserId
      })
  }, [documents, projects, assignments, currentUserId])

  if (pendingItems.length === 0) return null

  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-teal-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-600">
          <Stamp size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-teal-900">
            {pendingItems.length} dokumen menunggu persetujuan Anda
          </h3>
          <p className="text-[11px] text-teal-700">
            Dokumen sudah melewati fase Doccon dan siap di-review
          </p>
        </div>
        <span className="rounded-full bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
          {pendingItems.length}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {pendingItems.map(({ doc, proj }) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg bg-white/70 border border-teal-100 px-3 py-2"
          >
            <div className="w-1 self-stretch rounded-full bg-teal-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-pertamina-red">{proj!.kodeProject}</span>
                <span className="chip text-[9px] bg-blue-100 text-blue-700">Customer</span>
                <span className="text-[10px] text-ink-tertiary shrink-0">{reportMonthLabel(doc.period)}</span>
              </div>
              <p className="text-[11px] text-ink-secondary truncate mt-0.5">{doc.judul}</p>
            </div>
            <button
              onClick={() => {
                setReportDetailProjectId(proj!.id)
                setView('monitoring-report-detail')
              }}
              className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-100 border border-teal-200 transition shrink-0"
            >
              Review <ArrowRight size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
