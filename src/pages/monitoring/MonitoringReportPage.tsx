import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter } from 'lucide-react'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { Button } from '../../components/ui/Button'
import { classNames, downloadCsv, formatDateShort } from '../../utils/helpers'
import type { MonitoringReportStatus } from '../../types/monitoring'

const STATUS_META: Record<MonitoringReportStatus, { label: string; cls: string }> = {
  CREATE:          { label: 'Draft',            cls: 'bg-slate-100 text-slate-700' },
  UNDER_APPROVAL:  { label: 'Menunggu Approval', cls: 'bg-amber-100 text-amber-700' },
  UNDER_REVISION:  { label: 'Revisi',            cls: 'bg-red-100 text-red-700' },
  APPROVED:        { label: 'Disetujui',          cls: 'bg-emerald-100 text-emerald-700' },
}

const ALL_STATUS: MonitoringReportStatus[] = ['CREATE', 'UNDER_APPROVAL', 'UNDER_REVISION', 'APPROVED']

export function MonitoringReportPage() {
  const reports = useMonitoringReportStore((s) => s.reports)
  const deleteReport = useMonitoringReportStore((s) => s.deleteReport)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MonitoringReportStatus | ''>('')
  const [deptFilter, setDeptFilter] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const departments = useMemo(() => [...new Set(reports.map((r) => r.department).filter(Boolean))].sort(), [reports])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return reports.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (deptFilter && r.department !== deptFilter) return false
      if (q && !r.kodeProject.toLowerCase().includes(q) && !r.client.toLowerCase().includes(q) && !r.namaKontrak.toLowerCase().includes(q)) return false
      return true
    })
  }, [reports, search, statusFilter, deptFilter])

  function handleExport() {
    downloadCsv(
      filtered.map((r) => ({
        'Kode Project': r.kodeProject,
        Client: r.client,
        'Nama Kontrak': r.namaKontrak,
        Department: r.department,
        'PIC Laporan': r.picLaporan,
        Status: STATUS_META[r.status].label,
        'Revision Count': r.revisionCount,
        'Submit Date': formatDateShort(r.submitDate),
        'Created At': formatDateShort(r.createdAt),
      })),
      'monitoring-report.csv',
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
              placeholder="Cari kode, client, kontrak…"
              className="input-base pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-ink-tertiary">
            <Filter size={12} />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MonitoringReportStatus | '')}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua Status</option>
            {ALL_STATUS.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua Dept</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} data</span>

          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>
            Export
          </Button>
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-report-create' })} leftIcon={<Plus size={13} />}>
            Tambah
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {['Kode Project', 'Client', 'Nama Kontrak', 'Dept', 'PIC Laporan', 'Status', 'Rev', 'Submit Date', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-ink-primary whitespace-nowrap">{r.kodeProject}</td>
                  <td className="px-4 py-3 text-xs text-ink-primary whitespace-nowrap">{r.client}</td>
                  <td className="px-4 py-3 text-xs text-ink-primary max-w-[200px] truncate" title={r.namaKontrak}>{r.namaKontrak}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{r.department}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{r.picLaporan}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={classNames('chip', STATUS_META[r.status].cls)}>{STATUS_META[r.status].label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-center text-ink-secondary">{r.revisionCount}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{formatDateShort(r.submitDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal({ type: 'monitoring-report-detail', reportId: r.id })}
                        className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                        title="Detail"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => openModal({ type: 'monitoring-report-edit', reportId: r.id })}
                        className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
            <Search size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{reports.length === 0 ? 'Belum ada laporan. Klik "Tambah" untuk membuat.' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Laporan?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { deleteReport(confirmDeleteId); setConfirmDeleteId(null) }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
