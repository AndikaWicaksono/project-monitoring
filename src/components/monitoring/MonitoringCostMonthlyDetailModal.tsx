import { useMemo } from 'react'
import { Modal } from '../ui/Modal'
import { classNames, getCurrentPeriod } from '../../utils/helpers'
import {
  formatCurrency,
  reportMonthLabel,
  type MonitoringCost,
  type MonitoringCostRealization,
  type CostBasedMonthlyItem,
} from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  cost: MonitoringCost
  month: string  // YYYY-MM
  realizations: MonitoringCostRealization[]
}

type MonthBudgetStatus = 'on_budget' | 'warning' | 'over_budget' | 'under_budget' | 'not_yet'

const STATUS_META: Record<MonthBudgetStatus, { label: string; cls: string }> = {
  on_budget:    { label: 'On Budget',    cls: 'bg-emerald-100 text-emerald-700' },
  warning:      { label: 'Warning',      cls: 'bg-amber-100 text-amber-700' },
  over_budget:  { label: 'Over Budget',  cls: 'bg-red-100 text-red-700' },
  under_budget: { label: 'Under Budget', cls: 'bg-blue-100 text-blue-700' },
  not_yet:      { label: 'Not Yet',      cls: 'bg-slate-100 text-slate-600' },
}

const REAL_STATUS: Record<string, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

function computeStatus(planned: number, actual: number, month: string, todayMonth: string): MonthBudgetStatus {
  if (month > todayMonth) return 'not_yet'
  if (planned === 0) return 'not_yet'
  const ratio = actual / planned
  if (ratio > 1.0) return 'over_budget'
  if (ratio >= 0.9) return 'warning'
  if (ratio < 0.5) return 'under_budget'
  return 'on_budget'
}

function variantClass(variance: number): string {
  if (variance > 0) return 'text-red-600'
  if (variance < 0) return 'text-emerald-600'
  return 'text-ink-secondary'
}

export function MonitoringCostMonthlyDetailModal({ open, onClose, cost, month, realizations }: Props) {
  const todayMonth = useMemo(() => getCurrentPeriod(), [])
  const plan = cost.costBasedMonthly?.[month]

  const monthRealizations = useMemo(
    () => realizations.filter((r) => r.projectId === cost.id && r.period === month),
    [realizations, cost.id, month],
  )

  const totalActual = useMemo(
    () => monthRealizations.reduce((s, r) => s + r.realisasiBiaya, 0),
    [monthRealizations],
  )

  const totalPlanned = plan?.planned ?? 0
  const variance = totalActual - totalPlanned
  const variancePct = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0
  const status = computeStatus(totalPlanned, totalActual, month, todayMonth)
  const isFuture = month > todayMonth

  // Build item comparison: merge planned items with actual per-item actuals
  const itemRows = useMemo(() => {
    const planned = plan?.items ?? []
    const actualByItem = new Map<string, number>()
    monthRealizations.forEach((r) => {
      actualByItem.set(r.itemBiaya, (actualByItem.get(r.itemBiaya) ?? 0) + r.realisasiBiaya)
    })

    const rows: Array<CostBasedMonthlyItem & { actual: number; variance: number; variancePct: number; status: MonthBudgetStatus }> = []

    planned.forEach((item) => {
      const actual = actualByItem.get(item.itemBiaya) ?? 0
      const v = actual - item.planned
      const vPct = item.planned > 0 ? (v / item.planned) * 100 : 0
      rows.push({ ...item, actual, variance: v, variancePct: vPct, status: computeStatus(item.planned, actual, month, todayMonth) })
      actualByItem.delete(item.itemBiaya)
    })

    // Items that have actual but no planned (extra spend)
    actualByItem.forEach((actual, itemBiaya) => {
      rows.push({ itemBiaya, satuanKerja: '—', planned: 0, actual, variance: actual, variancePct: 100, status: 'over_budget' })
    })

    return rows
  }, [plan, monthRealizations, month, todayMonth])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail Breakdown — ${reportMonthLabel(month)}`}
      description={`${cost.projectCode} · ${cost.projectName}`}
      size="2xl"
    >
      <div className="space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'CB Planned',    value: isFuture ? '—' : formatCurrency(totalPlanned),  accent: 'from-blue-400 to-transparent',         tone: 'text-ink-primary' },
            { label: 'Actual Cost',   value: isFuture ? '—' : formatCurrency(totalActual),   accent: 'from-pertamina-red to-transparent',     tone: 'text-pertamina-red' },
            {
              label: 'Variance',
              value: isFuture ? '—' : (variance >= 0 ? '+' : '') + formatCurrency(variance),
              accent: variance > 0 ? 'from-red-400 to-transparent' : 'from-emerald-400 to-transparent',
              tone: variance > 0 ? 'text-red-600' : 'text-emerald-600',
            },
            { label: 'Status',
              value: STATUS_META[status].label,
              accent: 'from-slate-400 to-transparent',
              tone: status === 'on_budget' ? 'text-emerald-700' : status === 'warning' ? 'text-amber-700' : status === 'over_budget' ? 'text-red-600' : status === 'under_budget' ? 'text-blue-700' : 'text-slate-500',
            },
          ].map((c) => (
            <div key={c.label} className="surface relative overflow-hidden rounded-xl p-4">
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
              <div className={classNames('mt-1 text-sm font-semibold truncate', c.tone)}>{c.value}</div>
              {c.label === 'Variance' && !isFuture && (
                <div className={classNames('text-[10px] mt-0.5', tone(variancePct))}>
                  {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Item Biaya Comparison */}
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">
            Perbandingan Item Biaya
          </div>
          <div className="surface rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  {['Item Biaya', 'Satuan Kerja', 'Planned', 'Actual', 'Variance', 'Variance %', 'Status'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {itemRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-5 text-center text-ink-tertiary">
                      {isFuture ? 'Bulan ini belum berjalan.' : 'Belum ada data item biaya.'}
                    </td>
                  </tr>
                ) : (
                  itemRows.map((row) => (
                    <tr key={row.itemBiaya} className={classNames('hover:bg-black/[0.02]', row.status === 'over_budget' && 'bg-red-50/60')}>
                      <td className="px-3 py-2.5 font-medium text-ink-primary">{row.itemBiaya}</td>
                      <td className="px-3 py-2.5 text-ink-secondary">{row.satuanKerja}</td>
                      <td className="px-3 py-2.5 tabular-nums text-ink-primary whitespace-nowrap">
                        {row.planned > 0 ? formatCurrency(row.planned) : '—'}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-ink-primary whitespace-nowrap">
                        {isFuture ? '—' : row.actual > 0 ? formatCurrency(row.actual) : '—'}
                      </td>
                      <td className={classNames('px-3 py-2.5 tabular-nums whitespace-nowrap font-medium', variantClass(row.variance))}>
                        {isFuture ? '—' : (row.variance >= 0 ? '+' : '') + formatCurrency(row.variance)}
                      </td>
                      <td className={classNames('px-3 py-2.5 tabular-nums whitespace-nowrap', variantClass(row.variance))}>
                        {isFuture ? '—' : (row.variancePct >= 0 ? '+' : '') + row.variancePct.toFixed(1) + '%'}
                      </td>
                      <td className="px-3 py-2.5">
                        {!isFuture && <span className={classNames('chip', STATUS_META[row.status].cls)}>{STATUS_META[row.status].label}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {itemRows.length > 0 && !isFuture && (
                <tfoot>
                  <tr className="border-t border-border-subtle bg-black/[0.02]">
                    <td colSpan={2} className="px-3 py-2 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Total</td>
                    <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(totalPlanned)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(totalActual)}</td>
                    <td className={classNames('px-3 py-2 text-xs font-semibold tabular-nums whitespace-nowrap', variantClass(variance))}>
                      {(variance >= 0 ? '+' : '') + formatCurrency(variance)}
                    </td>
                    <td className={classNames('px-3 py-2 text-xs font-semibold tabular-nums', variantClass(variance))}>
                      {(variancePct >= 0 ? '+' : '') + variancePct.toFixed(1) + '%'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={classNames('chip', STATUS_META[status].cls)}>{STATUS_META[status].label}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Realization Transactions */}
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">
            Transaksi Realisasi
            {monthRealizations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-mono">{monthRealizations.length}</span>
            )}
          </div>
          <div className="surface rounded-xl overflow-hidden">
            {monthRealizations.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-tertiary">
                {isFuture ? 'Bulan ini belum berjalan.' : 'Belum ada transaksi realisasi untuk bulan ini.'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {['Item Biaya', 'Vendor', 'Satuan Kerja', 'PIC', 'Tanggal', 'Status Bayar', 'Realisasi'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {monthRealizations.map((r) => (
                    <tr key={r.id} className="hover:bg-black/[0.02]">
                      <td className="px-3 py-2 font-medium text-ink-primary">{r.itemBiaya}</td>
                      <td className="px-3 py-2 text-ink-secondary">{r.vendor}</td>
                      <td className="px-3 py-2 text-ink-secondary">{r.satuanKerja}</td>
                      <td className="px-3 py-2 text-ink-secondary">{r.pic}</td>
                      <td className="px-3 py-2 text-ink-secondary whitespace-nowrap">{r.tanggalRealisasi ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={classNames('chip', REAL_STATUS[r.status]?.cls ?? 'bg-slate-100 text-slate-700')}>
                          {REAL_STATUS[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(r.realisasiBiaya)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-subtle bg-black/[0.02]">
                    <td colSpan={6} className="px-3 py-2 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Total Realisasi</td>
                    <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(totalActual)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function tone(pct: number): string {
  if (pct > 0) return 'text-red-500'
  if (pct < 0) return 'text-emerald-600'
  return 'text-ink-tertiary'
}
