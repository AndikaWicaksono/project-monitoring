import { useMemo, useState } from 'react'
import { Flag, X, ArrowRight, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useUIStore } from '../../../store/useUIStore'

export function DocconSalesWarningPanel() {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const documents     = useMonitoringReportStore((s) => s.documents)
  const reportProjects = useMonitoringReportStore((s) => s.projects)
  const openModal = useUIStore((s) => s.openModal)
  const setView   = useUIStore((s) => s.setView)

  const flaggedDocs = useMemo(
    () =>
      documents
        .filter((d) => d.salesFlagIssue)
        .map((d) => ({
          ...d,
          projectCode: reportProjects.find((p) => p.id === d.projectId)?.kodeProject ?? '—',
        })),
    [documents, reportProjects],
  )

  if (flaggedDocs.length === 0 || dismissed) return null

  return (
    <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-red-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-400/20 text-red-600">
          <Flag size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900">
            {flaggedDocs.length} dokumen dikembalikan oleh Sales
          </h3>
          <p className="text-[11px] text-red-700">
            Periksa catatan Sales dan kirim ulang setelah diperbaiki
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1.5 text-red-400 hover:bg-red-200/50 hover:text-red-800 transition"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1.5 text-red-300 hover:bg-red-200/50 hover:text-red-800 transition"
            title="Tutup"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          {flaggedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 rounded-lg bg-white/70 border border-red-100 px-3 py-2.5"
            >
              <div className="w-1 self-stretch rounded-full bg-red-400 shrink-0 mt-0.5" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-pertamina-red shrink-0">
                    {doc.projectCode}
                  </span>
                  <span className="text-[11px] text-ink-secondary truncate">{doc.judul}</span>
                  <span className="text-[10px] text-ink-tertiary shrink-0">{doc.period}</span>
                </div>
                {doc.salesIssueNote && (
                  <div className="mt-1 flex items-start gap-1">
                    <Flag size={9} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-red-700 italic">{doc.salesIssueNote}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openModal({ type: 'monitoring-report-document-detail', documentId: doc.id })}
                  className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-black/[0.05] border border-border-subtle transition"
                >
                  Detail
                </button>
                <button
                  onClick={() => openModal({ type: 'monitoring-report-document-detail', documentId: doc.id })}
                  className="flex items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50 border border-pertamina-red/20 transition"
                >
                  <RefreshCw size={10} /> Perbaiki
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setView('monitoring-report')}
            className="mt-1 flex items-center gap-1 text-[11px] text-red-700 hover:text-red-900 font-medium transition"
          >
            Buka Report Project <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
