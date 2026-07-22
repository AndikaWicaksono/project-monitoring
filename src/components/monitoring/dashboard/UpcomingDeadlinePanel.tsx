import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useUIStore } from '../../../store/useUIStore'
import { classNames, deadlineLabel, formatDateShort } from '../../../utils/helpers'
import { isDocCompleted } from '../../../types/monitoring'

const TONE_CLS: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700',
  today:   'bg-red-50 text-red-600',
  soon:    'bg-amber-100 text-amber-700',
  normal:  'bg-slate-100 text-slate-600',
}

export function UpcomingDeadlinePanel() {
  const { projects, documents } = useMonitoringReportStore()
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)

  const items = useMemo(() => {
    return documents
      .filter((d) => d.deadlineToSales && !isDocCompleted(d))
      .map((d) => ({ doc: d, proj: projects.find((p) => p.id === d.projectId) }))
      .filter((item) => item.proj)
      .sort((a, b) => new Date(a.doc.deadlineToSales ?? 0).getTime() - new Date(b.doc.deadlineToSales ?? 0).getTime())
      .slice(0, 6)
  }, [documents, projects])

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
          <CalendarClock size={14} className="text-ink-tertiary" /> Upcoming Deadline
        </h3>
        <span className="text-[11px] text-ink-tertiary">{items.length} dokumen</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-ink-tertiary">Tidak ada deadline mendatang</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-1.5">
          {items.map(({ doc, proj }) => {
            const { text, tone } = deadlineLabel(doc.deadlineToSales ?? null)
            return (
              <button
                key={doc.id}
                onClick={() => { setReportDetailProjectId(proj!.id); setView('monitoring-report-detail') }}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-black/[0.03] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-pertamina-red shrink-0">{proj!.kodeProject}</span>
                    <span className="text-[11px] text-ink-secondary truncate">{doc.judul}</span>
                  </div>
                  <span className="text-[10px] text-ink-tertiary">{formatDateShort(doc.deadlineToSales ?? null)}</span>
                </div>
                <span className={classNames('chip text-[9px] shrink-0', TONE_CLS[tone])}>{text}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
