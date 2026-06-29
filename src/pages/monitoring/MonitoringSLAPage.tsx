import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter } from 'lucide-react'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames, downloadCsv } from '../../utils/helpers'
import {
  SLA_MONTHS, slaMonthLabel, computeProjectMonthAvg, computeProjectGrandAvg, slaStatusCalc, fmt2,
  type SLAStatus,
} from '../../types/monitoring'

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  TERCAPAI:      'bg-emerald-100 text-emerald-700',
  TIDAK_TERCAPAI: 'bg-red-100 text-red-700',
}

const YEAR = new Date().getFullYear()

export function MonitoringSLAPage() {
  const { projects, components, monthlyRecords, deleteProject } = useMonitoringSLAStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const setSlaDetailProjectId = useUIStore((s) => s.setSlaDetailProjectId)
  const { canDeleteMonitoring, canEditMonitoring } = useMonitoringRole()

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<SLAStatus | ''>('')
  const [sortBy, setSortBy] = useState<'kode-asc' | 'kode-desc' | 'nama-asc' | 'nama-desc'>('kode-asc')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const departments = useMemo(() => [...new Set(projects.map((p) => p.department).filter(Boolean))].sort(), [projects])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = projects.filter((p) => {
      if (deptFilter && p.department !== deptFilter) return false
      const avg = computeProjectGrandAvg(components, monthlyRecords, p.id, YEAR)
      if (statusFilter && slaStatusCalc(avg, p.targetSLA) !== statusFilter) return false
      if (q && !p.kodeProject.toLowerCase().includes(q) && !p.namaProject.toLowerCase().includes(q) && !p.department.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'kode-asc')  return a.kodeProject.localeCompare(b.kodeProject)
      if (sortBy === 'kode-desc') return b.kodeProject.localeCompare(a.kodeProject)
      if (sortBy === 'nama-asc')  return a.namaProject.localeCompare(b.namaProject)
      if (sortBy === 'nama-desc') return b.namaProject.localeCompare(a.namaProject)
      return 0
    })
  }, [projects, components, monthlyRecords, search, deptFilter, statusFilter, sortBy])

  function openDetail(projectId: string) {
    setSlaDetailProjectId(projectId)
    setView('monitoring-sla-detail')
  }

  function handleExport() {
    downloadCsv(
      filtered.map((p) => {
        const row: Record<string, string | number> = {
          'Kode Project': p.kodeProject,
          'Nama Project': p.namaProject,
          Department: p.department,
          PIC: p.pic,
          'Target SLA (%)': p.targetSLA,
        }
        SLA_MONTHS.forEach((m) => {
          const avg = computeProjectMonthAvg(components, monthlyRecords, p.id, m, YEAR)
          row[slaMonthLabel(m)] = avg !== null ? parseFloat(avg.toFixed(4)) : '-'
        })
        const grand = computeProjectGrandAvg(components, monthlyRecords, p.id, YEAR)
        row['Rata-rata (%)'] = grand !== null ? parseFloat(grand.toFixed(4)) : '-'
        row['Status'] = slaStatusCalc(grand, p.targetSLA)
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
              placeholder="Cari kode, nama project…"
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
            <option value="TERCAPAI">Tercapai</option>
            <option value="TIDAK_TERCAPAI">Tidak Tercapai</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="kode-asc">Kode A→Z</option>
            <option value="kode-desc">Kode Z→A</option>
            <option value="nama-asc">Nama A→Z</option>
            <option value="nama-desc">Nama Z→A</option>
          </select>

          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} project</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          {canEditMonitoring && <Button size="sm" onClick={() => openModal({ type: 'monitoring-sla-project-create' })} leftIcon={<Plus size={13} />}>Tambah</Button>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Kode</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Nama Project</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Dept</th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Target%</th>
                {SLA_MONTHS.map((m) => (
                  <th key={m} className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                    {slaMonthLabel(m)}
                  </th>
                ))}
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Avg</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((p) => {
                const grand = computeProjectGrandAvg(components, monthlyRecords, p.id, YEAR)
                const status = slaStatusCalc(grand, p.targetSLA)
                return (
                  <tr key={p.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-ink-primary whitespace-nowrap">{p.kodeProject}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary max-w-[160px] truncate" title={p.namaProject}>{p.namaProject}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{p.department}</td>
                    <td className="px-3 py-3 text-xs text-center text-ink-secondary">{p.targetSLA}%</td>
                    {SLA_MONTHS.map((m) => {
                      const avg = computeProjectMonthAvg(components, monthlyRecords, p.id, m, YEAR)
                      const ok = avg !== null && avg >= p.targetSLA
                      return (
                        <td key={m} className={classNames('px-2 py-3 text-xs text-center tabular-nums whitespace-nowrap', avg === null ? 'text-ink-muted' : ok ? 'text-emerald-700' : 'text-red-600')}>
                          {avg !== null ? fmt2(avg) : '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-xs text-center font-semibold text-ink-primary tabular-nums">
                      {grand !== null ? fmt2(grand) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={classNames('chip', SLA_STATUS_CLS[status])}>{status === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(p.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Lihat Detail"><Eye size={13} /></button>
                        {canEditMonitoring && <button onClick={() => openModal({ type: 'monitoring-sla-project-edit', projectId: p.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>}
                        {canDeleteMonitoring && <button onClick={() => setConfirmDeleteId(p.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>}
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
            <p className="text-sm mt-2">{projects.length === 0 ? 'Belum ada data SLA. Klik "Tambah" untuk membuat.' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Project SLA?</h3>
            <p className="text-sm text-ink-secondary mb-1">Semua komponen dan data bulanan project ini akan ikut terhapus.</p>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteProject(confirmDeleteId); setConfirmDeleteId(null) }}>Hapus</Button>
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
