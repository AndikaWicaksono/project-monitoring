import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { classNames, downloadCsv, formatDateShort } from '../../utils/helpers'
import { formatCurrency, type MonitoringCostStatus } from '../../types/monitoring'

const STATUS_META: Record<MonitoringCostStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
}

const REAL_STATUS: Record<string, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

export function MonitoringCostPage() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)
  const deleteCost = useMonitoringCostStore((s) => s.deleteCost)
  const deleteRealization = useMonitoringCostStore((s) => s.deleteRealization)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MonitoringCostStatus | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteRealId, setConfirmDeleteRealId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return costs.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false
      if (q && !c.projectCode.toLowerCase().includes(q) && !c.projectName.toLowerCase().includes(q) && !c.projectClient.toLowerCase().includes(q)) return false
      return true
    })
  }, [costs, search, statusFilter])

  const totalContractValue = useMemo(() => filtered.reduce((s, c) => s + c.projectValue, 0), [filtered])
  const totalActualCost = useMemo(() => filtered.reduce((s, c) => s + c.actualCost, 0), [filtered])

  function handleExport() {
    downloadCsv(
      filtered.map((c) => ({
        'Project Code': c.projectCode,
        'Project Name': c.projectName,
        Client: c.projectClient,
        Year: c.year,
        Status: STATUS_META[c.status].label,
        'Contract No': c.contractNumber,
        'Start Date': formatDateShort(c.startDate),
        'End Date': formatDateShort(c.endDate),
        'Project Value (IDR)': c.projectValue,
        'Actual Cost (IDR)': c.actualCost,
        'TKDN (%)': c.tkdn,
      })),
      'monitoring-cost.csv',
    )
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Nilai Kontrak', value: formatCurrency(totalContractValue), accent: 'from-blue-400 to-transparent', bg: 'bg-blue-100', tone: 'text-blue-700' },
          { label: 'Total Biaya Aktual', value: formatCurrency(totalActualCost), accent: 'from-pertamina-red to-transparent', bg: 'bg-pertamina-red-50', tone: 'text-pertamina-red' },
          { label: 'Margin', value: formatCurrency(totalContractValue - totalActualCost), accent: 'from-emerald-400 to-transparent', bg: 'bg-emerald-100', tone: 'text-emerald-700' },
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
          </select>
          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} data</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-cost-create' })} leftIcon={<Plus size={13} />}>Tambah</Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                <th className="w-8" />
                {['Kode Project', 'Nama Project', 'Client', 'Tahun', 'Status', 'Nilai Kontrak', 'Biaya Aktual', 'TKDN%', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id
                const costRealizations = realizations.filter((r) => r.projectId === c.id)
                return (
                  <>
                    <tr key={c.id} className="border-b border-border-subtle hover:bg-black/[0.02] transition-colors">
                      <td className="px-3 py-3">
                        {costRealizations.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="rounded p-0.5 text-ink-tertiary hover:text-ink-primary transition"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-primary whitespace-nowrap">{c.projectCode}</td>
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary max-w-[180px] truncate" title={c.projectName}>{c.projectName}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{c.projectClient}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">{c.year}</td>
                      <td className="px-4 py-3"><span className={classNames('chip', STATUS_META[c.status].cls)}>{STATUS_META[c.status].label}</span></td>
                      <td className="px-4 py-3 text-xs text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(c.projectValue)}</td>
                      <td className="px-4 py-3 text-xs text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(c.actualCost)}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary text-center">{c.tkdn}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal({ type: 'monitoring-cost-detail', costId: c.id })} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                          <button onClick={() => openModal({ type: 'monitoring-cost-edit', costId: c.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => openModal({ type: 'monitoring-cost-realization-create', costId: c.id })} className="rounded p-1 text-ink-tertiary hover:text-emerald-700 hover:bg-emerald-50 transition" title="Tambah Realisasi"><Plus size={13} /></button>
                          <button onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && costRealizations.map((real) => (
                      <tr key={real.id} className="bg-black/[0.015] border-b border-border-subtle">
                        <td className="px-3 py-2" />
                        <td colSpan={2} className="px-4 py-2 text-xs text-ink-secondary pl-8">{real.itemBiaya}</td>
                        <td className="px-4 py-2 text-xs text-ink-secondary">{real.vendor}</td>
                        <td className="px-4 py-2 text-xs text-ink-secondary">{real.satuanKerja}</td>
                        <td className="px-4 py-2"><span className={classNames('chip', REAL_STATUS[real.status]?.cls ?? 'bg-slate-100 text-slate-700')}>{REAL_STATUS[real.status]?.label ?? real.status}</span></td>
                        <td className="px-4 py-2 text-xs text-ink-primary tabular-nums whitespace-nowrap" colSpan={2}>{formatCurrency(real.realisasiBiaya)}</td>
                        <td className="px-4 py-2 text-xs text-ink-secondary">{real.pic}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openModal({ type: 'monitoring-cost-realization-edit', realizationId: real.id, costId: real.projectId })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition"><Pencil size={11} /></button>
                            <button onClick={() => setConfirmDeleteRealId(real.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
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
