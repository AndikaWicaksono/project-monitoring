import { useMemo, useState } from 'react'
import { AlertTriangle, X, FileText, TrendingDown, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useUIStore } from '../../../store/useUIStore'

const MONTH_NAMES: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
  5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Ags',
  9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  REVISION_REQUIRED: 'Perlu Revisi',
}

interface SLAWarning {
  key: string
  projectId: string
  projectCode: string
  componentName: string
  month: number
  year: number
  achievement: number
  target: number
  gap: number
}

interface ReportWarning {
  key: string
  projectCode: string
  documentTitle: string
  status: string
  period: string
  projectId: string
  daysLeft?: number
}

export function EngineerWarningPanel() {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const setView             = useUIStore((s) => s.setView)
  const setSlaDetailProject = useUIStore((s) => s.setSlaDetailProjectId)
  const openModal           = useUIStore((s) => s.openModal)

  const { projects: slaProjects, components, monthlyRecords } = useMonitoringSLAStore()
  const { projects: reportProjects, documents } = useMonitoringReportStore()

  // ── SLA warnings: most recent record per component that's below target ──────
  const slaWarnings = useMemo<SLAWarning[]>(() => {
    const warnings: SLAWarning[] = []
    const YEAR = 2026

    for (const proj of slaProjects) {
      const projComps = components.filter((c) => c.projectId === proj.id)

      for (const comp of projComps) {
        const latest = monthlyRecords
          .filter((r) => r.componentId === comp.id && r.year === YEAR)
          .sort((a, b) => b.month - a.month)[0]

        if (latest && latest.achievement < proj.targetSLA && latest.reconfirmRequested) {
          const gap = proj.targetSLA - latest.achievement
          warnings.push({
            key: `${comp.id}-${latest.month}`,
            projectId: proj.id,
            projectCode: proj.kodeProject,
            componentName: comp.componentName,
            month: latest.month,
            year: latest.year,
            achievement: latest.achievement,
            target: proj.targetSLA,
            gap,
          })
        }
      }
    }

    // Sort by gap descending (most critical first)
    return warnings.sort((a, b) => b.gap - a.gap)
  }, [slaProjects, components, monthlyRecords])

  // ── Report warnings: documents stuck in engineer phase ─────────────────────
  const reportWarnings = useMemo<ReportWarning[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return documents
      .filter((d) => {
        const phase = d.currentPhase ?? 'engineer'
        if (phase !== 'engineer') return false
        // Revisi diminta → selalu urgent
        if (d.status === 'REVISION_REQUIRED') return true
        // DRAFT → hanya tampil jika deadline sudah lewat atau ≤ 3 hari lagi
        if (d.status === 'DRAFT') {
          if (!d.deadlineToSales) return false
          const deadline = new Date(d.deadlineToSales)
          deadline.setHours(0, 0, 0, 0)
          const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / 86_400_000)
          return daysLeft <= 3
        }
        return false
      })
      .map((d) => {
        const proj = reportProjects.find((p) => p.id === d.projectId)
        let daysLeft: number | undefined
        if (d.status === 'DRAFT' && d.deadlineToSales) {
          const deadline = new Date(d.deadlineToSales)
          deadline.setHours(0, 0, 0, 0)
          const today2 = new Date(); today2.setHours(0, 0, 0, 0)
          daysLeft = Math.floor((deadline.getTime() - today2.getTime()) / 86_400_000)
        }
        return {
          key: d.id,
          projectCode: proj?.kodeProject ?? '—',
          documentTitle: d.judul,
          status: d.status,
          period: d.period,
          projectId: d.projectId,
          daysLeft,
        }
      })
      // Revisi required first
      .sort((a, b) => (b.status === 'REVISION_REQUIRED' ? 1 : 0) - (a.status === 'REVISION_REQUIRED' ? 1 : 0))
  }, [documents, reportProjects])

  const total = slaWarnings.length + reportWarnings.length
  if (total === 0 || dismissed) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-200/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/25 text-amber-600">
          <AlertTriangle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900">
            {total} item memerlukan tindakan Anda
          </h3>
          <p className="text-[11px] text-amber-700">
            {slaWarnings.length > 0 && `${slaWarnings.length} SLA di bawah target`}
            {slaWarnings.length > 0 && reportWarnings.length > 0 && ' · '}
            {reportWarnings.length > 0 && `${reportWarnings.length} dokumen laporan belum selesai`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1.5 text-amber-500 hover:bg-amber-200/50 hover:text-amber-800 transition"
            title={expanded ? 'Kecilkan' : 'Perluas'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1.5 text-amber-400 hover:bg-amber-200/50 hover:text-amber-800 transition"
            title="Tutup (sesi ini)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4">

          {/* SLA Warnings */}
          {slaWarnings.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={12} className="text-red-500" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-red-700">
                  SLA di bawah target
                </span>
                <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {slaWarnings.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {slaWarnings.map((w) => (
                  <div
                    key={w.key}
                    className="flex items-center gap-3 rounded-lg bg-white/70 border border-red-100 px-3 py-2"
                  >
                    {/* Indicator bar */}
                    <div className="w-1 self-stretch rounded-full bg-red-400 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-pertamina-red">{w.projectCode}</span>
                        <span className="text-[11px] text-ink-secondary truncate">{w.componentName}</span>
                        <span className="text-[10px] text-ink-tertiary shrink-0">
                          {MONTH_NAMES[w.month]} {w.year}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-black/[0.06] overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{ width: `${Math.min((w.achievement / w.target) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-red-600 tabular-nums">
                          {w.achievement.toFixed(2)}%
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          target {w.target}%
                        </span>
                        <span className="chip bg-red-100 text-red-700 text-[9px] font-semibold">
                          -{w.gap.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSlaDetailProject(w.projectId)
                        setView('monitoring-sla-detail')
                      }}
                      className="flex items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50 border border-pertamina-red/20 transition shrink-0"
                    >
                      Lihat <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setView('monitoring-sla')}
                className="mt-2 flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium transition"
              >
                Buka SLA Monitoring <ArrowRight size={11} />
              </button>
            </div>
          )}

          {/* Report Warnings */}
          {reportWarnings.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={12} className="text-orange-500" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-700">
                  Dokumen laporan belum selesai
                </span>
                <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                  {reportWarnings.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {reportWarnings.map((w) => (
                  <div
                    key={w.key}
                    className="flex items-center gap-3 rounded-lg bg-white/70 border border-orange-100 px-3 py-2"
                  >
                    <div
                      className={`w-1 self-stretch rounded-full shrink-0 ${
                        w.status === 'REVISION_REQUIRED' ? 'bg-red-400' : 'bg-orange-300'
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-pertamina-red shrink-0">{w.projectCode}</span>
                        <span className="text-[11px] text-ink-secondary truncate">{w.documentTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`chip text-[9px] font-semibold ${
                            w.status === 'REVISION_REQUIRED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABEL[w.status] ?? w.status}
                        </span>
                        <span className="text-[10px] text-ink-tertiary">{w.period}</span>
                        {w.status === 'DRAFT' && w.daysLeft !== undefined && (
                          <span className={`chip text-[9px] font-semibold ${w.daysLeft < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {w.daysLeft < 0 ? `Lewat ${Math.abs(w.daysLeft)}h` : w.daysLeft === 0 ? 'Hari ini' : `${w.daysLeft}h lagi`}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openModal({ type: 'monitoring-report-document-detail', documentId: w.key })}
                      className="flex items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50 border border-pertamina-red/20 transition shrink-0"
                    >
                      Kerjakan <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setView('monitoring-report')}
                className="mt-2 flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium transition"
              >
                Buka Report Project <ArrowRight size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
