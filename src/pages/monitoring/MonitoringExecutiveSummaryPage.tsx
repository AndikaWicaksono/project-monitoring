import { ArrowLeft, Printer, FileText, TrendingUp, Wallet, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/helpers'
import { useExecutiveSummaryData, generateNarrative } from '../../utils/executiveSummary'
import { formatCurrency } from '../../types/monitoring'

const TONE_CLS: Record<'positive' | 'warning' | 'critical', string> = {
  positive: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warning:  'border-amber-300 bg-amber-50 text-amber-800',
  critical: 'border-red-300 bg-red-50 text-red-800',
}

function KPICard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="surface relative overflow-hidden rounded-xl p-4 print:border print:shadow-none">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} print:hidden`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{label}</div>
          <div className="mt-1.5 text-xl font-semibold text-ink-primary">{value}</div>
        </div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.04] text-ink-tertiary print:hidden">{icon}</div>
      </div>
    </div>
  )
}

export function MonitoringExecutiveSummaryPage() {
  const setView = useUIStore((s) => s.setView)
  const { currentUserName } = useMonitoringRole()
  const data = useExecutiveSummaryData()
  const narrative = generateNarrative(data)

  const generatedAt = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const bottleneckRows = [
    { label: 'Engineer Phase', avg: data.report.bottleneck.engineerAvgNum, sla: 5, stuck: data.report.bottleneck.stuckEngineerItems.length },
    { label: 'Customer Phase', avg: data.report.bottleneck.customerAvgNum, sla: 3, stuck: data.report.bottleneck.stuckCustomerItems.length },
    { label: 'Doccon Phase',   avg: data.report.bottleneck.docconAvgNum,   sla: 2, stuck: data.report.bottleneck.stuckDocconItems.length },
  ]

  const attentionItems = [
    ...data.report.bottleneck.stuckEngineerItems.map((i) => ({ kodeProject: i.kodeProject, text: `${i.judul} — stuck ${i.days} hari di fase Engineer` })),
    ...data.report.bottleneck.stuckCustomerItems.map((i) => ({ kodeProject: i.kodeProject, text: `${i.judul} — stuck ${i.days} hari di fase Customer` })),
    ...data.report.bottleneck.stuckDocconItems.map((i) => ({ kodeProject: i.kodeProject, text: `${i.judul} — stuck ${i.days} hari di fase Doccon` })),
    ...data.deadlines.items.map((i) => ({
      kodeProject: i.kodeProject,
      text: `${i.judul} — ${i.diffDays < 0 ? `overdue ${Math.abs(i.diffDays)} hari` : i.diffDays === 0 ? 'deadline hari ini' : `H-${i.diffDays} deadline ke Sales`}`,
    })),
  ]

  return (
    <div className="relative w-full min-h-full overflow-y-auto p-6 print:p-0 print:overflow-visible">
      {/* Toolbar — gak ikut kecetak */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-dashboard')}>
          Kembali ke Dashboard
        </Button>
        <Button size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
          Print / Simpan sebagai PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="border-b border-border-subtle pb-4">
          <h1 className="text-xl font-bold text-ink-primary">Executive Summary</h1>
          <p className="text-xs text-ink-tertiary mt-1">
            Digenerate oleh {currentUserName ?? 'Sistem'} pada {generatedAt}
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
          <KPICard label="Project Report" value={String(data.report.totalProjects)} icon={<FileText size={15} />} accent="from-blue-400 to-transparent" />
          <KPICard label="SLA Achievement" value={data.sla.avgAchievement !== null ? `${data.sla.avgAchievement.toFixed(1)}%` : '—'} icon={<TrendingUp size={15} />} accent="from-violet-400 to-transparent" />
          <KPICard label="Total Nilai Kontrak" value={formatCurrency(data.cost.totalContractValue)} icon={<Wallet size={15} />} accent="from-emerald-400 to-transparent" />
          <KPICard label="Event-Based Report Selesai" value={`${data.billing.completed}/${data.billing.total}`} icon={<CheckCircle2 size={15} />} accent="from-amber-400 to-transparent" />
        </div>

        {/* Narasi */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">Ringkasan</h2>
          {narrative.map((line, i) => (
            <div key={i} className={classNames('rounded-lg border-l-4 px-3.5 py-2.5 text-sm leading-relaxed', TONE_CLS[line.tone])}>
              {line.text}
            </div>
          ))}
        </div>

        {/* Bottleneck table */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary mb-2">Fase Pengerjaan Dokumen</h2>
          <div className="surface rounded-xl overflow-hidden print:border print:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  {['Fase', 'Rata-rata (hari)', 'SLA (hari)', 'Stuck'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {bottleneckRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 font-medium text-ink-primary">{row.label}</td>
                    <td className={classNames('px-4 py-2.5 tabular-nums', row.avg !== null && row.avg > row.sla ? 'text-red-600 font-medium' : 'text-ink-secondary')}>
                      {row.avg !== null ? row.avg.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-tertiary tabular-nums">{row.sla}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {row.stuck > 0 ? <span className="chip bg-red-100 text-red-700 text-[10px] font-semibold">{row.stuck} stuck</span> : <span className="text-ink-tertiary">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Perlu Perhatian */}
        {attentionItems.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-600" /> Perlu Perhatian
            </h2>
            <div className="surface rounded-xl p-4 print:border print:shadow-none">
              <ul className="space-y-1.5">
                {attentionItems.map((item, i) => (
                  <li key={i} className="text-sm text-ink-secondary flex items-start gap-2">
                    <span className="font-mono font-semibold text-pertamina-red text-xs mt-0.5 shrink-0">{item.kodeProject}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border-subtle pt-3 text-[10px] text-ink-tertiary flex items-center gap-1.5">
          <Clock size={10} /> Ringkasan ini digenerate otomatis dari data sistem PRIME pada {generatedAt}.
        </div>
      </div>
    </div>
  )
}
