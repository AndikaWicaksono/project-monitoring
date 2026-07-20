import { ArrowLeft, Printer, Clock } from 'lucide-react'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/helpers'
import {
  SLA_MONTHS, slaMonthLabel, computeProjectMonthAvg, computeProjectGrandAvg, slaStatusCalc, fmt2,
  type SLAStatus,
} from '../../types/monitoring'

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  TERCAPAI:       'bg-emerald-100 text-emerald-700',
  TIDAK_TERCAPAI: 'bg-red-100 text-red-700',
}

const YEAR = new Date().getFullYear()

export function MonitoringSLAReportPage() {
  const { projects, components, monthlyRecords } = useMonitoringSLAStore()
  const setView = useUIStore((s) => s.setView)
  const { currentUserName } = useMonitoringRole()

  const generatedAt = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const rows = [...projects]
    .sort((a, b) => a.kodeProject.localeCompare(b.kodeProject))
    .map((p) => {
      const grand = computeProjectGrandAvg(components, monthlyRecords, p.id, YEAR)
      return { project: p, grand, status: slaStatusCalc(grand, p.targetSLA) }
    })

  const tercapaiCount = rows.filter((r) => r.status === 'TERCAPAI').length
  const tidakTercapaiCount = rows.length - tercapaiCount
  const gradedRows = rows.filter((r) => r.grand !== null)
  const overallAvg = gradedRows.length
    ? gradedRows.reduce((s, r) => s + (r.grand ?? 0), 0) / gradedRows.length
    : null

  // Department dengan project "Tidak Tercapai" terbanyak
  const deptTidakTercapai: Record<string, number> = {}
  for (const r of rows) {
    if (r.status === 'TIDAK_TERCAPAI' && r.project.department) {
      deptTidakTercapai[r.project.department] = (deptTidakTercapai[r.project.department] ?? 0) + 1
    }
  }
  const worstDept = Object.entries(deptTidakTercapai).sort((a, b) => b[1] - a[1])[0] ?? null

  const narrativeLines: string[] = [
    `Dari ${rows.length} project SLA, ${tercapaiCount} (${rows.length ? Math.round((tercapaiCount / rows.length) * 100) : 0}%) mencapai target tahun ${YEAR}, ${tidakTercapaiCount} belum tercapai.`
    + (overallAvg !== null ? ` Rata-rata pencapaian seluruh project ${fmt2(overallAvg)}%.` : ''),
  ]
  if (worstDept) {
    narrativeLines.push(`Department ${worstDept[0]} punya jumlah project belum tercapai target terbanyak (${worstDept[1]} project) — perlu perhatian.`)
  }

  return (
    <div className="relative w-full min-h-full overflow-y-auto p-6 print:p-0 print:overflow-visible">
      {/* Toolbar — gak ikut kecetak */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-sla')}>
          Kembali ke SLA Monitoring
        </Button>
        <Button size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
          Print / Simpan sebagai PDF
        </Button>
      </div>

      <div className="space-y-5">
        {/* Header */}
        <div className="border-b border-border-subtle pb-4">
          <h1 className="text-xl font-bold text-ink-primary">Laporan SLA — Semua Project</h1>
          <p className="text-xs text-ink-tertiary mt-1 flex items-center gap-1">
            <Clock size={11} /> Digenerate oleh {currentUserName ?? 'Sistem'} pada {generatedAt}
          </p>
        </div>

        {/* Narasi */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">Ringkasan</h2>
          {narrativeLines.map((text, i) => (
            <div
              key={i}
              className={classNames(
                'rounded-lg border-l-4 px-3.5 py-2.5 text-sm leading-relaxed',
                i === 0 && tidakTercapaiCount === 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800',
              )}
            >
              {text}
            </div>
          ))}
        </div>

        {/* Tabel semua project */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary mb-2">Detail per Project</h2>
          <div className="surface rounded-xl overflow-hidden print:border print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Kode</th>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Nama Project</th>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Dept</th>
                    <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Target%</th>
                    {SLA_MONTHS.map((m) => (
                      <th key={m} className="text-center px-1.5 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                        {slaMonthLabel(m)}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Avg</th>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map(({ project: p, grand, status }) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-xs font-medium text-ink-primary whitespace-nowrap">{p.kodeProject}</td>
                      <td className="px-3 py-2 text-xs text-ink-secondary max-w-[160px] truncate" title={p.namaProject}>{p.namaProject}</td>
                      <td className="px-3 py-2 text-xs text-ink-secondary whitespace-nowrap">{p.department}</td>
                      <td className="px-2 py-2 text-xs text-center text-ink-secondary">{p.targetSLA}%</td>
                      {SLA_MONTHS.map((m) => {
                        const avg = computeProjectMonthAvg(components, monthlyRecords, p.id, m, YEAR)
                        const ok = avg !== null && avg >= p.targetSLA
                        return (
                          <td key={m} className={classNames('px-1.5 py-2 text-[11px] text-center tabular-nums whitespace-nowrap', avg === null ? 'text-ink-muted' : ok ? 'text-emerald-700' : 'text-red-600')}>
                            {avg !== null ? fmt2(avg) : '—'}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-xs text-center font-semibold text-ink-primary tabular-nums">
                        {grand !== null ? fmt2(grand) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={classNames('chip text-[10px]', SLA_STATUS_CLS[status])}>{status === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle pt-3 text-[10px] text-ink-tertiary flex items-center gap-1.5">
          <Clock size={10} /> Laporan ini digenerate otomatis dari data sistem PRIME pada {generatedAt}.
        </div>
      </div>
    </div>
  )
}
