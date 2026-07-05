import { useMemo } from 'react'
import { Stamp, ArrowRight } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useUIStore } from '../../../store/useUIStore'
import { classNames } from '../../../utils/helpers'
import { reportMonthLabel } from '../../../types/monitoring'

export function KadivApprovalPanel() {
  const { projects, documents } = useMonitoringReportStore()
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)

  const pendingItems = useMemo(() => {
    return documents
      .filter((d) => d.status === 'PENDING_KADIV' && d.currentPhase === 'kadiv')
      .map((d) => ({ doc: d, proj: projects.find((p) => p.id === d.projectId) }))
      .filter((item) => item.proj)
  }, [documents, projects])

  if (pendingItems.length === 0) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-blue-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600">
          <Stamp size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900">
            {pendingItems.length} dokumen menunggu persetujuan Anda
          </h3>
          <p className="text-[11px] text-blue-700">
            Dokumen sudah melewati fase Doccon dan siap di-review
          </p>
        </div>
        <span className="rounded-full bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
          {pendingItems.length}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {pendingItems.map(({ doc, proj }) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg bg-white/70 border border-blue-100 px-3 py-2"
          >
            <div className="w-1 self-stretch rounded-full bg-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-pertamina-red">{proj!.kodeProject}</span>
                <span className={classNames(
                  'chip text-[9px]',
                  doc.docType === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700',
                )}>
                  {doc.docType === 'customer' ? 'Customer' : 'Vendor'}
                </span>
                <span className="text-[10px] text-ink-tertiary shrink-0">{reportMonthLabel(doc.period)}</span>
              </div>
              <p className="text-[11px] text-ink-secondary truncate mt-0.5">{doc.judul}</p>
            </div>
            <button
              onClick={() => {
                setReportDetailProjectId(proj!.id)
                setView('monitoring-report-detail')
              }}
              className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0"
            >
              Review <ArrowRight size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
