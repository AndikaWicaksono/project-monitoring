import { Fragment, useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { MonitoringCostMonthlyDetailModal } from '../../components/monitoring/MonitoringCostMonthlyDetailModal'
import { classNames, downloadCsv, formatDateShort } from '../../utils/helpers'
import { formatCurrency, getEffectiveCostStatus, type MonitoringCostStatus } from '../../types/monitoring'

// ── Constants ────────────────────────────────────────────────────────────────

const TODAY_MONTH = '2026-06'
const ALL_MONTHS = [
  '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
  '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
]

const MONTH_LABELS: Record<string, string> = {
  '2026-01':'Jan 2026','2026-02':'Feb 2026','2026-03':'Mar 2026','2026-04':'Apr 2026',
  '2026-05':'Mei 2026','2026-06':'Jun 2026','2026-07':'Jul 2026','2026-08':'Agu 2026',
  '2026-09':'Sep 2026','2026-10':'Okt 2026','2026-11':'Nov 2026','2026-12':'Des 2026',
}

type MonthBudgetStatus = 'on_budget' | 'warning' | 'over_budget' | 'under_budget' | 'not_yet'

const STATUS_META: Record<MonitoringCostStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  future:    { label: 'Future',    cls: 'bg-purple-100 text-purple-700' },
}

const MONTH_STATUS_META: Record<MonthBudgetStatus, { label: string; cls: string }> = {
  on_budget:    { label: 'On Budget',    cls: 'bg-emerald-100 text-emerald-700' },
  warning:      { label: 'Warning',      cls: 'bg-amber-100 text-amber-700' },
  over_budget:  { label: 'Over Budget',  cls: 'bg-red-100 text-red-700' },
  under_budget: { label: 'Under Budget', cls: 'bg-blue-100 text-blue-700' },
  not_yet:      { label: 'Not Yet',      cls: 'bg-slate-100 text-slate-500' },
}

const REAL_STATUS: Record<string, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeMonthStatus(planned: number, actual: number, month: string): MonthBudgetStatus {
  if (month > TODAY_MONTH) return 'not_yet'
  if (planned === 0) return 'not_yet'
  const ratio = actual / planned
  if (ratio > 1.0) return 'over_budget'
  if (ratio >= 0.9) return 'warning'
  if (ratio < 0.5) return 'under_budget'
  return 'on_budget'
}

function varianceClass(v: number) {
  if (v > 0) return 'text-red-600'
  if (v < 0) return 'text-emerald-600'
  return 'text-ink-secondary'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MonitoringCostPage() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)
  const deleteCost = useMonitoringCostStore((s) => s.deleteCost)
  const deleteRealization = useMonitoringCostStore((s) => s.deleteRealization)
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const setCostDetailId = useUIStore((s) => s.setCostDetailId)
  const { canEditCost, canManageCostMaster } = useMonitoringRole()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MonitoringCostStatus | ''>('')
  const [sortBy, setSortBy] = useState<'kode-asc' | 'kode-desc' | 'nama-asc' | 'nama-desc'>('kode-asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'breakdown' | 'realizations'>('breakdown')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteRealId, setConfirmDeleteRealId] = useState<string | null>(null)
  const [monthDetail, setMonthDetail] = useState<{ costId: string; month: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = costs.filter((c) => {
      const effStatus = getEffectiveCostStatus(c.startDate, c.endDate, c.status === 'cancelled')
      if (statusFilter && effStatus !== statusFilter) return false
      if (q && !c.projectCode.toLowerCase().includes(q) && !c.projectName.toLowerCase().includes(q) && !c.projectClient.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'kode-asc')  return a.projectCode.localeCompare(b.projectCode)
      if (sortBy === 'kode-desc') return b.projectCode.localeCompare(a.projectCode)
      if (sortBy === 'nama-asc')  return a.projectName.localeCompare(b.projectName)
      if (sortBy === 'nama-desc') return b.projectName.localeCompare(a.projectName)
      return 0
    })
  }, [costs, search, statusFilter, sortBy])

  const totalContractValue = useMemo(() => filtered.reduce((s, c) => s + c.projectValue, 0), [filtered])
  const totalActualCost = useMemo(() =>
    filtered.reduce((s, c) => {
      const costReal = realizations.filter((r) => r.projectId === c.id)
      return s + costReal.reduce((sum, r) => sum + r.realisasiBiaya, 0)
    }, 0),
  [filtered, realizations])
  const totalCostBased = useMemo(() => filtered.reduce((s, c) => s + c.costBased, 0), [filtered])
  const totalMargin = totalContractValue - totalActualCost

  function handleExport() {
    downloadCsv(
      filtered.map((c) => {
        const effStatus = getEffectiveCostStatus(c.startDate, c.endDate, c.status === 'cancelled')
        const costReal = realizations.filter((r) => r.projectId === c.id)
        const computedActual = costReal.reduce((s, r) => s + r.realisasiBiaya, 0)
        return {
          'Project Code': c.projectCode,
          'Project Name': c.projectName,
          Client: c.projectClient,
          Year: c.year,
          Status: STATUS_META[effStatus].label,
          'Contract No': c.contractNumber,
          'Start Date': formatDateShort(c.startDate),
          'End Date': formatDateShort(c.endDate),
          'Project Value (IDR)': c.projectValue,
          'Cost Based (IDR)': c.costBased,
          'Actual Cost (IDR)': computedActual,
          'TKDN (%)': c.tkdn,
        }
      }),
      'monitoring-cost.csv',
    )
  }

  const monthDetailCost = monthDetail ? costs.find((c) => c.id === monthDetail.costId) : undefined

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Nilai Kontrak', value: formatCurrency(totalContractValue), accent: 'from-blue-400 to-transparent',         tone: 'text-blue-700' },
          { label: 'Total Cost Based',    value: formatCurrency(totalCostBased),     accent: 'from-slate-400 to-transparent',        tone: 'text-ink-secondary' },
          { label: 'Total Biaya Aktual',  value: formatCurrency(totalActualCost),    accent: 'from-pertamina-red to-transparent',    tone: 'text-pertamina-red' },
          { label: 'Margin',              value: formatCurrency(totalMargin),         accent: totalMargin >= 0 ? 'from-emerald-400 to-transparent' : 'from-red-400 to-transparent', tone: totalMargin >= 0 ? 'text-emerald-700' : 'text-red-600' },
        ].map((card) => (
          <div key={card.label} className="surface relative overflow-hidden rounded-xl p-4">
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.accent}`} />
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{card.label}</div>
            <div className={`mt-1.5 text-lg font-semibold truncate ${card.tone}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="surface rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode, nama, client…" className="input-base pl-9 text-xs" />
          </div>
          <Filter size={12} className="text-ink-tertiary" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MonitoringCostStatus | '')} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
            <option value="future">Future</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="kode-asc">Kode A→Z</option>
            <option value="kode-desc">Kode Z→A</option>
            <option value="nama-asc">Nama A→Z</option>
            <option value="nama-desc">Nama Z→A</option>
          </select>
          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} data</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          {canManageCostMaster && <Button size="sm" onClick={() => openModal({ type: 'monitoring-cost-create' })} leftIcon={<Plus size={13} />}>Tambah</Button>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                <th className="w-8" />
                {['Kode Project', 'Nama Project', 'Client', 'Tahun', 'Status', 'Nilai Kontrak', 'Cost Based', 'Biaya Aktual', 'TKDN%', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id
                const costRealizations = realizations.filter((r) => r.projectId === c.id)
                const effectiveStatus = getEffectiveCostStatus(c.startDate, c.endDate, c.status === 'cancelled')
                const computedActual = costRealizations.reduce((s, r) => s + r.realisasiBiaya, 0)
                const hasMonthlData = !!c.costBasedMonthly && Object.keys(c.costBasedMonthly).length > 0

                // Monthly breakdown rows
                const monthRows = hasMonthlData ? ALL_MONTHS.map((m) => {
                  const plan = c.costBasedMonthly?.[m]
                  const planned = plan?.planned ?? 0
                  const monthReals = costRealizations.filter((r) => r.period === m)
                  const actual = monthReals.reduce((s, r) => s + r.realisasiBiaya, 0)
                  return { month: m, planned, actual, status: computeMonthStatus(planned, actual, m) }
                }) : []

                // Cumulative
                let cumPlanned = 0
                let cumActual = 0
                const monthRowsWithCum = monthRows.map((r) => {
                  cumPlanned += r.planned
                  cumActual += r.actual
                  return { ...r, cumPlanned, cumActual, cumVariance: cumActual - cumPlanned }
                })

                return (
                  <Fragment key={c.id}>
                    <tr
                      className={classNames(
                        'border-b border-border-subtle hover:bg-black/[0.02] transition-colors cursor-pointer',
                        isExpanded && 'bg-black/[0.015] border-b-0',
                      )}
                      onClick={() => { setExpandedId(isExpanded ? null : c.id); setPanelTab('breakdown'); setExpandedMonth(null) }}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setExpandedId(isExpanded ? null : c.id); setPanelTab('breakdown'); setExpandedMonth(null) }}
                          className="rounded p-0.5 text-ink-tertiary hover:text-ink-primary transition"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-pertamina-red whitespace-nowrap">{c.projectCode}</td>
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary max-w-[180px] truncate" title={c.projectName}>{c.projectName}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{c.projectClient}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">{c.year}</td>
                      <td className="px-4 py-3"><span className={classNames('chip', STATUS_META[effectiveStatus].cls)}>{STATUS_META[effectiveStatus].label}</span></td>
                      <td className="px-4 py-3 text-xs text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(c.projectValue)}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary tabular-nums whitespace-nowrap">{formatCurrency(c.costBased)}</td>
                      <td className="px-4 py-3 text-xs text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(computedActual)}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary text-center">{c.tkdn}%</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setCostDetailId(c.id); setView('monitoring-cost-detail') }} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                          {canManageCostMaster && <button onClick={() => openModal({ type: 'monitoring-cost-edit', costId: c.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>}
                          {canManageCostMaster && <button onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${c.id}-panel`} className="border-b border-border-subtle">
                        <td colSpan={11} className="px-4 pb-4 pt-0 bg-black/[0.015]">
                          <div className="rounded-lg border border-border-subtle overflow-hidden bg-white">
                            {/* Panel tabs */}
                            <div className="flex items-center justify-between px-3 py-2 bg-black/[0.02] border-b border-border-subtle">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setPanelTab('breakdown')}
                                  className={classNames(
                                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                                    panelTab === 'breakdown' ? 'bg-white shadow-sm text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
                                  )}
                                >
                                  <BarChart2 size={11} /> Breakdown Bulanan
                                </button>
                                <button
                                  onClick={() => setPanelTab('realizations')}
                                  className={classNames(
                                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                                    panelTab === 'realizations' ? 'bg-white shadow-sm text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
                                  )}
                                >
                                  Semua Realisasi
                                  {costRealizations.length > 0 && (
                                    <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-mono">{costRealizations.length}</span>
                                  )}
                                </button>
                              </div>
                              {panelTab === 'realizations' && canEditCost && (
                                <button
                                  onClick={() => openModal({ type: 'monitoring-cost-realization-create', costId: c.id })}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
                                >
                                  <Plus size={11} /> Tambah Realisasi
                                </button>
                              )}
                              {panelTab === 'breakdown' && canManageCostMaster && (
                                <button
                                  onClick={() => openModal({ type: 'monitoring-cost-planning', costId: c.id })}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
                                >
                                  <BarChart2 size={11} /> Kelola Breakdown Bulanan
                                </button>
                              )}
                            </div>

                            {/* ── Tab: Breakdown Bulanan ─────────────────── */}
                            {panelTab === 'breakdown' && (
                              hasMonthlData ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border-subtle bg-black/[0.01]">
                                        {['Bulan', 'CB Planned', 'Actual Cost', 'Variance', 'Var %', 'Cum Planned', 'Cum Actual', 'Cum Variance', 'Status', 'Detail'].map((h) => (
                                          <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                      {monthRowsWithCum.map((row) => {
                                        const isFuture = row.month > TODAY_MONTH
                                        const variance = row.actual - row.planned
                                        const variancePct = row.planned > 0 ? (variance / row.planned) * 100 : 0
                                        const isMonthExpanded = expandedMonth === `${c.id}:${row.month}`
                                        return (
                                          <>
                                            <tr
                                              key={row.month}
                                              className={classNames(
                                                'hover:bg-black/[0.02] transition-colors',
                                                row.status === 'over_budget' && 'bg-red-50/40',
                                                isMonthExpanded && 'border-b-0',
                                              )}
                                            >
                                              <td className="px-3 py-2.5 font-medium text-ink-primary whitespace-nowrap">{MONTH_LABELS[row.month]}</td>
                                              <td className="px-3 py-2.5 tabular-nums text-ink-secondary whitespace-nowrap">
                                                {row.planned > 0 ? formatCurrency(row.planned) : '—'}
                                              </td>
                                              <td className="px-3 py-2.5 tabular-nums text-ink-primary whitespace-nowrap">
                                                {isFuture ? '—' : formatCurrency(row.actual)}
                                              </td>
                                              <td className={classNames('px-3 py-2.5 tabular-nums font-medium whitespace-nowrap', varianceClass(variance))}>
                                                {isFuture ? '—' : (variance >= 0 ? '+' : '') + formatCurrency(variance)}
                                              </td>
                                              <td className={classNames('px-3 py-2.5 tabular-nums whitespace-nowrap', varianceClass(variance))}>
                                                {isFuture ? '—' : (variancePct >= 0 ? '+' : '') + variancePct.toFixed(1) + '%'}
                                              </td>
                                              <td className="px-3 py-2.5 tabular-nums text-ink-tertiary whitespace-nowrap">{formatCurrency(row.cumPlanned)}</td>
                                              <td className="px-3 py-2.5 tabular-nums text-ink-tertiary whitespace-nowrap">{isFuture ? '—' : formatCurrency(row.cumActual)}</td>
                                              <td className={classNames('px-3 py-2.5 tabular-nums whitespace-nowrap', varianceClass(row.cumVariance))}>
                                                {isFuture ? '—' : (row.cumVariance >= 0 ? '+' : '') + formatCurrency(row.cumVariance)}
                                              </td>
                                              <td className="px-3 py-2.5">
                                                <span className={classNames('chip', MONTH_STATUS_META[row.status].cls)}>
                                                  {MONTH_STATUS_META[row.status].label}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2.5">
                                                <button
                                                  onClick={() => setMonthDetail({ costId: c.id, month: row.month })}
                                                  className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                                                  title={`Detail ${MONTH_LABELS[row.month]}`}
                                                >
                                                  <Eye size={12} />
                                                </button>
                                              </td>
                                            </tr>
                                          </>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-border-subtle bg-black/[0.02]">
                                        <td className="px-3 py-2 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Total Tahunan</td>
                                        <td className="px-3 py-2 text-xs font-semibold text-ink-secondary tabular-nums whitespace-nowrap">{formatCurrency(c.costBased)}</td>
                                        <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(computedActual)}</td>
                                        <td className={classNames('px-3 py-2 text-xs font-semibold tabular-nums whitespace-nowrap', varianceClass(computedActual - c.costBased))}>
                                          {(computedActual - c.costBased >= 0 ? '+' : '') + formatCurrency(computedActual - c.costBased)}
                                        </td>
                                        <td colSpan={6} />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <div className="py-8 text-center">
                                  <BarChart2 size={28} className="mx-auto mb-2 text-ink-tertiary opacity-40" />
                                  <p className="text-xs text-ink-tertiary">Belum ada data breakdown bulanan untuk project ini.</p>
                                  <p className="text-[10px] text-ink-tertiary mt-0.5">Data breakdown tersedia setelah cost based monthly dikonfigurasi.</p>
                                </div>
                              )
                            )}

                            {/* ── Tab: Semua Realisasi ───────────────────── */}
                            {panelTab === 'realizations' && (
                              costRealizations.length === 0 ? (
                                <div className="py-6 text-center text-xs text-ink-tertiary">Belum ada realisasi biaya.</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border-subtle bg-black/[0.01]">
                                      {['Bulan', 'Item Biaya', 'Vendor', 'Satuan Kerja', 'PIC', 'Tanggal', 'Status', 'Realisasi Biaya', 'Aksi'].map((h) => (
                                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-subtle">
                                    {costRealizations.map((real) => (
                                      <tr key={real.id} className="hover:bg-black/[0.02] transition-colors">
                                        <td className="px-3 py-2.5 text-ink-tertiary whitespace-nowrap">
                                          {real.period ? MONTH_LABELS[real.period] ?? real.period : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-ink-primary">{real.itemBiaya}</td>
                                        <td className="px-3 py-2.5 text-ink-secondary">{real.vendor}</td>
                                        <td className="px-3 py-2.5 text-ink-secondary">{real.satuanKerja}</td>
                                        <td className="px-3 py-2.5 text-ink-secondary">{real.pic}</td>
                                        <td className="px-3 py-2.5 text-ink-secondary whitespace-nowrap">{real.tanggalRealisasi ?? '—'}</td>
                                        <td className="px-3 py-2.5">
                                          <span className={classNames('chip', REAL_STATUS[real.status]?.cls ?? 'bg-slate-100 text-slate-700')}>
                                            {REAL_STATUS[real.status]?.label ?? real.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 tabular-nums text-ink-primary whitespace-nowrap">{formatCurrency(real.realisasiBiaya)}</td>
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-1">
                                            {canEditCost && <button onClick={() => openModal({ type: 'monitoring-cost-realization-edit', realizationId: real.id, costId: real.projectId })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={11} /></button>}
                                            {canEditCost && <button onClick={() => setConfirmDeleteRealId(real.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={11} /></button>}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-border-subtle bg-black/[0.02]">
                                      <td colSpan={7} className="px-3 py-2 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Total</td>
                                      <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(computedActual)}</td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
            <Search size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{costs.length === 0 ? 'Belum ada data cost. Klik "Tambah".' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {/* Monthly Detail Modal */}
      {monthDetail && monthDetailCost && (
        <MonitoringCostMonthlyDetailModal
          open={!!monthDetail}
          onClose={() => setMonthDetail(null)}
          cost={monthDetailCost}
          month={monthDetail.month}
          realizations={realizations}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-2">Hapus Cost Project?</h3>
            <p className="text-sm text-ink-secondary mb-6">Semua data realisasi terkait juga akan dihapus.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteCost(confirmDeleteId); setConfirmDeleteId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteRealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-2">Hapus Realisasi?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteRealId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteRealization(confirmDeleteRealId); setConfirmDeleteRealId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
