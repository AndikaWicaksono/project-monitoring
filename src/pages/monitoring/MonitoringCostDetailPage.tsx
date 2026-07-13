import { ArrowLeft } from 'lucide-react'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { CostLeadingLaggingDetailChart } from '../../components/monitoring/CostLeadingLaggingDetailChart'
import { classNames, formatDateShort } from '../../utils/helpers'
import {
  formatCurrency,
  getEffectiveCostStatus,
  type MonitoringCostStatus,
  type MonitoringCostRealizationStatus,
} from '../../types/monitoring'

const STATUS_META: Record<MonitoringCostStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  future:    { label: 'Future',    cls: 'bg-purple-100 text-purple-700' },
}

const REAL_STATUS_META: Record<MonitoringCostRealizationStatus, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

export function MonitoringCostDetailPage() {
  const store = useMonitoringCostStore()
  const setView = useUIStore((s) => s.setView)
  const costDetailId = useUIStore((s) => s.costDetailId)

  const cost = costDetailId ? store.getCostById(costDetailId) : undefined
  const realizations = costDetailId ? store.getRealizationsByProjectId(costDetailId) : []

  if (!cost) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ink-tertiary p-5">
        <p className="text-sm">Project tidak ditemukan.</p>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-cost')}>Kembali</Button>
      </div>
    )
  }

  const computedActualCost = realizations.reduce((s, r) => s + r.realisasiBiaya, 0)
  const effectiveStatus = getEffectiveCostStatus(cost.startDate, cost.endDate, cost.status === 'cancelled')
  const profitMargin = cost.projectValue - computedActualCost
  const costAchievement = cost.projectValue > 0 ? Math.round((computedActualCost / cost.projectValue) * 1000) / 10 : 0

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('monitoring-cost')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
        >
          <ArrowLeft size={13} />
          Cost Monitoring
        </button>
        <span className="text-ink-tertiary text-xs">/</span>
        <span className="text-xs text-ink-primary font-medium">{cost.projectCode}</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nilai Kontrak',    value: formatCurrency(cost.projectValue), tone: 'text-ink-primary',    accent: 'from-blue-400 to-transparent' },
          { label: 'Biaya Aktual',     value: formatCurrency(computedActualCost), tone: 'text-pertamina-red',  accent: 'from-pertamina-red to-transparent' },
          { label: 'Profit Margin',    value: formatCurrency(profitMargin),       tone: profitMargin >= 0 ? 'text-emerald-700' : 'text-pertamina-red', accent: 'from-emerald-400 to-transparent' },
          { label: 'Cost Achievement', value: `${costAchievement}%`,             tone: 'text-amber-700',      accent: 'from-amber-400 to-transparent' },
        ].map((c) => (
          <div key={c.label} className="surface relative overflow-hidden rounded-xl p-4">
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
            <div className={classNames('mt-1 text-base font-semibold truncate', c.tone)}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="surface rounded-xl p-5 grid grid-cols-2 gap-4">
        {[
          { label: 'Kode Project',     value: cost.projectCode },
          { label: 'Project ID',       value: cost.projectId || '—' },
          { label: 'Nama Project',     value: cost.projectName },
          { label: 'Client',           value: cost.projectClient },
          { label: 'Tahun',            value: String(cost.year) },
          { label: 'Status',           value: STATUS_META[effectiveStatus].label },
          { label: 'Nomor Kontrak',    value: cost.contractNumber },
          { label: 'Kategori Kontrak', value: cost.categoryContract },
          { label: 'Tanggal Kontrak',  value: formatDateShort(cost.dateOfContract) },
          { label: 'Start Date',       value: formatDateShort(cost.startDate) },
          { label: 'End Date',         value: formatDateShort(cost.endDate) },
          { label: 'TKDN (%)',         value: `${cost.tkdn}%` },
          { label: 'Amandemen',        value: cost.amandemen || '—' },
          { label: 'Cost Based',       value: formatCurrency(cost.costBased) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{label}</div>
            <div className="text-sm font-medium text-ink-primary mt-0.5">{value}</div>
          </div>
        ))}
        {cost.description && (
          <div className="col-span-2">
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Deskripsi</div>
            <div className="text-sm text-ink-secondary mt-0.5">{cost.description}</div>
          </div>
        )}
      </div>

      {/* Leading / Lagging chart */}
      <CostLeadingLaggingDetailChart cost={cost} realizations={realizations} />

      {/* Realizations */}
      {realizations.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-3">Realisasi Biaya ({realizations.length})</div>
          <div className="surface rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  {['Item Biaya', 'Satuan Kerja', 'PIC', 'Vendor', 'Status', 'Realisasi'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {realizations.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className="px-3 py-2 text-ink-primary">{r.itemBiaya}</td>
                    <td className="px-3 py-2 text-ink-secondary">{r.satuanKerja}</td>
                    <td className="px-3 py-2 text-ink-secondary">{r.pic}</td>
                    <td className="px-3 py-2 text-ink-secondary">{r.vendor}</td>
                    <td className="px-3 py-2">
                      <span className={classNames('chip', REAL_STATUS_META[r.status]?.cls ?? '')}>{REAL_STATUS_META[r.status]?.label ?? r.status}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(r.realisasiBiaya)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
