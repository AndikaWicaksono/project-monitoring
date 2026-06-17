import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter } from 'lucide-react'
import { useMonitoringBAPStore } from '../../store/useMonitoringBAPStore'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { classNames, downloadCsv, formatDateShort } from '../../utils/helpers'
import { bapChecklistProgress, type MonitoringBAPDocumentType, type MonitoringBAPStatus } from '../../types/monitoring'

const STATUS_META: Record<MonitoringBAPStatus, { label: string; cls: string }> = {
  NOT_STARTED:      { label: 'Belum Mulai',     cls: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS:      { label: 'On Progress',      cls: 'bg-blue-100 text-blue-700' },
  WAITING_CUSTOMER: { label: 'Tunggu Customer',  cls: 'bg-amber-100 text-amber-700' },
  APPROVED:         { label: 'Approved',          cls: 'bg-violet-100 text-violet-700' },
  COMPLETED:        { label: 'Completed',         cls: 'bg-emerald-100 text-emerald-700' },
}

const DOC_TYPES: MonitoringBAPDocumentType[] = ['BAP', 'BAPP', 'BAST']
const ALL_STATUS: MonitoringBAPStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'APPROVED', 'COMPLETED']

export function MonitoringBAPPage() {
  const bapRecords = useMonitoringBAPStore((s) => s.bapRecords)
  const deleteBAP = useMonitoringBAPStore((s) => s.deleteBAP)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MonitoringBAPStatus | ''>('')
  const [docTypeFilter, setDocTypeFilter] = useState<MonitoringBAPDocumentType | ''>('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bapRecords.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (docTypeFilter && r.documentType !== docTypeFilter) return false
      if (q && !r.projectCode.toLowerCase().includes(q) && !r.client.toLowerCase().includes(q) && !r.pic.toLowerCase().includes(q)) return false
      return true
    })
  }, [bapRecords, search, statusFilter, docTypeFilter])

  const stats = useMemo(() => ({
    total: bapRecords.length,
    completed: bapRecords.filter((r) => r.status === 'COMPLETED').length,
    pending: bapRecords.filter((r) => r.status !== 'COMPLETED').length,
    late: bapRecords.filter((r) => r.targetDate && r.status !== 'COMPLETED' && new Date(r.targetDate) < new Date()).length,
  }), [bapRecords])

  function handleExport() {
    downloadCsv(
      filtered.map((r) => ({
        'Project Code': r.projectCode,
        Client: r.client,
        'Document Type': r.documentType,
        Status: STATUS_META[r.status].label,
        PIC: r.pic,
        'Target Date': formatDateShort(r.targetDate),
        'Actual Date': formatDateShort(r.actualDate),
        'Progress (%)': bapChecklistProgress(r.checklist),
        Remark: r.remark,
      })),
      'monitoring-bap.csv',
    )
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Summary mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Dokumen', value: stats.total, accent: 'from-slate-300 to-transparent', tone: 'text-ink-primary' },
          { label: 'Completed', value: stats.completed, accent: 'from-emerald-400 to-transparent', tone: 'text-emerald-700' },
          { label: 'Pending', value: stats.pending, accent: 'from-amber-400 to-transparent', tone: 'text-amber-700' },
          { label: 'Terlambat', value: stats.late, accent: 'from-pertamina-red to-transparent', tone: 'text-pertamina-red' },
        ].map((c) => (
          <div key={c.label} className="surface relative overflow-hidden rounded-xl p-4">
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
            <div className={`mt-1.5 text-2xl font-semibold ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="surface rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode project, client, PIC…" className="input-base pl-9 text-xs" />
          </div>
          <Filter size={12} className="text-ink-tertiary" />
          <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value as MonitoringBAPDocumentType | '')} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Tipe</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MonitoringBAPStatus | '')} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Status</option>
            {ALL_STATUS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} data</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-bap-create' })} leftIcon={<Plus size={13} />}>Tambah</Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {['Kode Project', 'Client', 'Tipe', 'Status', 'PIC', 'Target Date', 'Actual Date', 'Progress', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((r) => {
                const progress = bapChecklistProgress(r.checklist)
                const isLate = r.targetDate && r.status !== 'COMPLETED' && new Date(r.targetDate) < new Date()
                return (
                  <tr key={r.id} className={classNames('hover:bg-black/[0.02] transition-colors', isLate ? 'bg-red-50/40' : '')}>
                    <td className="px-4 py-3 text-xs font-mono text-ink-primary whitespace-nowrap">{r.projectCode}</td>
                    <td className="px-4 py-3 text-xs text-ink-primary whitespace-nowrap">{r.client}</td>
                    <td className="px-4 py-3">
                      <span className="chip bg-pertamina-red-50 text-pertamina-red">{r.documentType}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={classNames('chip', STATUS_META[r.status].cls)}>{STATUS_META[r.status].label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{r.pic}</td>
                    <td className={classNames('px-4 py-3 text-xs whitespace-nowrap', isLate ? 'text-pertamina-red font-medium' : 'text-ink-secondary')}>{formatDateShort(r.targetDate)}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{formatDateShort(r.actualDate)}</td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                          <div className={classNames('h-full rounded-full', progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-pertamina-red')} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-ink-tertiary tabular-nums">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openModal({ type: 'monitoring-bap-detail', bapId: r.id })} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                        <button onClick={() => openModal({ type: 'monitoring-bap-edit', bapId: r.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDeleteId(r.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
            <Search size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{bapRecords.length === 0 ? 'Belum ada dokumen BAP. Klik "Tambah".' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-2">Hapus Dokumen BAP?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteBAP(confirmDeleteId); setConfirmDeleteId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
