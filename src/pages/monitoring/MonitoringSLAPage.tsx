import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter } from 'lucide-react'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { classNames, downloadCsv } from '../../utils/helpers'
import { slaMonthKeys, slaMonthLabel, slaAverageAchievement, slaOverallStatus, type SLAStatus } from '../../types/monitoring'

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  GREEN:  'bg-emerald-100 text-emerald-700',
  YELLOW: 'bg-amber-100 text-amber-700',
  RED:    'bg-red-100 text-red-700',
}

const SLA_STATUS_LABEL: Record<SLAStatus, string> = {
  GREEN: 'Tercapai', YELLOW: 'Waspada', RED: 'Tidak Tercapai',
}

const MONTHS = slaMonthKeys()

export function MonitoringSLAPage() {
  const slaRecords = useMonitoringSLAStore((s) => s.slaRecords)
  const deleteSLA = useMonitoringSLAStore((s) => s.deleteSLA)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<SLAStatus | ''>('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const departments = useMemo(() => [...new Set(slaRecords.map((r) => r.departemen).filter(Boolean))].sort(), [slaRecords])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return slaRecords.filter((r) => {
      if (deptFilter && r.departemen !== deptFilter) return false
      if (statusFilter && slaOverallStatus(r) !== statusFilter) return false
      if (q && !r.kontrak.toLowerCase().includes(q) && !r.pekerjaan.toLowerCase().includes(q) && !r.departemen.toLowerCase().includes(q)) return false
      return true
    })
  }, [slaRecords, search, deptFilter, statusFilter])

  function handleExport() {
    downloadCsv(
      filtered.map((r) => {
        const avg = slaAverageAchievement(r)
        const row: Record<string, string | number> = {
          Kontrak: r.kontrak,
          Pekerjaan: r.pekerjaan,
          SOM: r.som,
          Departemen: r.departemen,
          'PIC Docon': r.picDocon,
          'Batas SLA (%)': r.batas,
        }
        MONTHS.forEach((m) => { row[slaMonthLabel(m)] = r[m] ?? '-' })
        row['Rata-rata (%)'] = avg !== null ? Math.round(avg * 10) / 10 : '-'
        row['Status'] = SLA_STATUS_LABEL[slaOverallStatus(r)]
        return row
      }),
      'monitoring-sla.csv',
    )
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      <div className="surface rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kontrak, pekerjaan…"
              className="input-base pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-ink-tertiary">
            <Filter size={12} />
          </div>

          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Dept</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SLAStatus | '')} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Status</option>
            <option value="GREEN">Tercapai</option>
            <option value="YELLOW">Waspada</option>
            <option value="RED">Tidak Tercapai</option>
          </select>

          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} data</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-sla-create' })} leftIcon={<Plus size={13} />}>Tambah</Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Kontrak</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Pekerjaan</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Dept</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Batas%</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                    {slaMonthLabel(m)}
                  </th>
                ))}
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Rata-rata</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((r) => {
                const avg = slaAverageAchievement(r)
                const overall = slaOverallStatus(r)
                return (
                  <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-ink-primary whitespace-nowrap max-w-[140px] truncate" title={r.kontrak}>{r.kontrak}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap max-w-[140px] truncate" title={r.pekerjaan}>{r.pekerjaan}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{r.departemen}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary text-center">{r.batas}%</td>
                    {MONTHS.map((m) => {
                      const val = r[m]
                      const ok = val !== null && val >= r.batas
                      return (
                        <td key={m} className={classNames('px-2 py-3 text-xs text-center tabular-nums whitespace-nowrap', val === null ? 'text-ink-muted' : ok ? 'text-emerald-700' : 'text-red-600')}>
                          {val !== null ? `${val}%` : '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-xs text-center font-semibold text-ink-primary tabular-nums">
                      {avg !== null ? `${Math.round(avg * 10) / 10}%` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={classNames('chip', SLA_STATUS_CLS[overall])}>{SLA_STATUS_LABEL[overall]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openModal({ type: 'monitoring-sla-detail', slaId: r.id })} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                        <button onClick={() => openModal({ type: 'monitoring-sla-edit', slaId: r.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
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
            <TrendingUpIcon />
            <p className="text-sm mt-2">{slaRecords.length === 0 ? 'Belum ada data SLA. Klik "Tambah" untuk membuat.' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Data SLA?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteSLA(confirmDeleteId); setConfirmDeleteId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
