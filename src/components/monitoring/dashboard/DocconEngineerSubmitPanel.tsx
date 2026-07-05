import { useMemo } from 'react'
import { Inbox, ArrowRight } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useAuthStore } from '../../../store/useAuthStore'
import { useUIStore } from '../../../store/useUIStore'
import { classNames } from '../../../utils/helpers'
import { reportMonthLabel } from '../../../types/monitoring'

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'hari ini'
  if (diff === 1) return '1 hari lalu'
  return `${diff} hari lalu`
}

export function DocconEngineerSubmitPanel() {
  const { projects, documents } = useMonitoringReportStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)

  const currentUser = users.find((u) => u.id === session?.userId)

  const pendingItems = useMemo(() => {
    if (!currentUser) return []
    return documents
      .filter((d) => {
        if (d.status !== 'SUBMITTED' || d.currentPhase !== 'engineer') return false
        // dokumen yang di-assign ke Doccon ini, atau docconPIC cocok
        return d.assignedDocconUserId === currentUser.id || d.docconPIC === currentUser.name
      })
      .map((d) => ({ doc: d, proj: projects.find((p) => p.id === d.projectId) }))
      .filter((item) => item.proj)
      .sort((a, b) => new Date(a.doc.updatedAt).getTime() - new Date(b.doc.updatedAt).getTime())
  }, [documents, projects, currentUser])

  if (pendingItems.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
          <Inbox size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900">
            {pendingItems.length} dokumen siap dikompilasi
          </h3>
          <p className="text-[11px] text-amber-700">
            Engineer sudah submit — menunggu aksimu
          </p>
        </div>
        <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
          {pendingItems.length}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {pendingItems.map(({ doc, proj }) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg bg-white/70 border border-amber-100 px-3 py-2"
          >
            <div className="w-1 self-stretch rounded-full bg-amber-400 shrink-0" />
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
              <p className="text-[10px] text-amber-600 mt-0.5">Disubmit Engineer {daysAgo(doc.updatedAt)}</p>
            </div>
            <button
              onClick={() => {
                setReportDetailProjectId(proj!.id)
                setView('monitoring-report-detail')
              }}
              className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 border border-amber-200 transition shrink-0"
            >
              Buka <ArrowRight size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
