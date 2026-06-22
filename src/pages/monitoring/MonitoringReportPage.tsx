import { useMemo, useState } from 'react'
import { Plus, Search, Download, Eye, Pencil, Trash2, Filter, FileText } from 'lucide-react'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { downloadCsv, formatDateShort } from '../../utils/helpers'

export function MonitoringReportPage() {
  const { projects, documents, billingDocuments, deleteProject } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)
  const { canDeleteMonitoring } = useMonitoringRole()

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const departments = useMemo(() => [...new Set(projects.map((p) => p.department).filter(Boolean))].sort(), [projects])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return projects.filter((p) => {
      if (deptFilter && p.department !== deptFilter) return false
      if (q && !p.kodeProject.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q) && !p.namaKontrak.toLowerCase().includes(q)) return false
      return true
    })
  }, [projects, search, deptFilter])

  function docCount(projectId: string) {
    return documents.filter((d) => d.projectId === projectId).length
  }
  function pendingCount(projectId: string) {
    return documents.filter((d) => d.projectId === projectId && d.status !== 'APPROVED').length
  }

  function openDetail(projectId: string) {
    setReportDetailProjectId(projectId)
    setView('monitoring-report-detail')
  }

  function handleExport() {
    downloadCsv(
      filtered.map((p) => ({
        'Kode Project': p.kodeProject,
        Client: p.client,
        'Nama Kontrak': p.namaKontrak,
        Department: p.department,
        'PIC Laporan': p.picLaporan,
        'Total Dokumen': docCount(p.id),
        'Pending': pendingCount(p.id),
        'Created': formatDateShort(p.createdAt),
      })),
      'monitoring-report-projects.csv',
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
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="">Semua Dept</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} project</span>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-report-project-create' })} leftIcon={<Plus size={13} />}>Tambah Project</Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {['Kode Project', 'Client', 'Nama Kontrak', 'Dept', 'PIC Laporan', 'Dok. Customer', 'Dok. Vendor', 'Billing', 'Pending', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((p) => {
                const custDocs = documents.filter((d) => d.projectId === p.id && d.docType === 'customer').length
                const vendDocs = documents.filter((d) => d.projectId === p.id && d.docType === 'vendor').length
                const pending = pendingCount(p.id)
                const billingDocs = billingDocuments.filter((b) => b.projectId === p.id)
                const billingDone = billingDocs.filter((b) => b.status === 'COMPLETED').length
                const billingPct = billingDocs.length > 0 ? Math.round((billingDone / billingDocs.length) * 100) : 0
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-black/[0.02] transition-colors cursor-pointer"
                    onClick={() => openDetail(p.id)}
                  >
                    <td className="px-4 py-3 text-xs font-mono font-medium text-pertamina-red whitespace-nowrap">{p.kodeProject}</td>
                    <td className="px-4 py-3 text-xs text-ink-primary whitespace-nowrap">{p.client}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary max-w-[220px] truncate" title={p.namaKontrak}>{p.namaKontrak}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{p.department}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{p.picLaporan}</td>
                    <td className="px-4 py-3 text-xs text-center text-ink-secondary">{custDocs}</td>
                    <td className="px-4 py-3 text-xs text-center text-ink-secondary">{vendDocs}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {billingDocs.length > 0 ? (
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-pertamina-red transition-all" style={{ width: `${billingPct}%` }} />
                          </div>
                          <span className="text-[10px] text-ink-tertiary whitespace-nowrap">{billingDone}/{billingDocs.length}</span>
                        </div>
                      ) : <span className="text-xs text-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pending > 0
                        ? <span className="chip bg-amber-100 text-amber-700">{pending} pending</span>
                        : <span className="text-xs text-ink-muted">—</span>
                      }
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(p.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                        <button onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: p.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
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
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{projects.length === 0 ? 'Belum ada project. Klik "Tambah Project" untuk membuat.' : 'Tidak ada data yang cocok.'}</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Project?</h3>
            <p className="text-sm text-ink-secondary mb-1">Semua dokumen laporan project ini akan ikut terhapus.</p>
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
