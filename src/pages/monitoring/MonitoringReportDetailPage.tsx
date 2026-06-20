import { useState } from 'react'
import { ArrowLeft, Plus, Eye, Pencil, Trash2, Paperclip } from 'lucide-react'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames, formatDateShort } from '../../utils/helpers'
import type { ReportDocumentStatus, ReportDocumentType } from '../../types/monitoring'

const STATUS_META: Record<ReportDocumentStatus, { label: string; cls: string }> = {
  CREATE:          { label: 'Draft',             cls: 'bg-slate-100 text-slate-700' },
  UNDER_APPROVAL:  { label: 'Menunggu Approval',  cls: 'bg-amber-100 text-amber-700' },
  UNDER_REVISION:  { label: 'Revisi',             cls: 'bg-red-100 text-red-700' },
  APPROVED:        { label: 'Disetujui',           cls: 'bg-emerald-100 text-emerald-700' },
}

const REVISION_CLS: Record<string, string> = {
  R0: 'bg-slate-100 text-slate-600',
  R1: 'bg-blue-100 text-blue-700',
  R2: 'bg-violet-100 text-violet-700',
  R3: 'bg-amber-100 text-amber-700',
  R4: 'bg-red-100 text-red-700',
}

export function MonitoringReportDetailPage() {
  const { projects, documents, deleteDocument } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const reportDetailProjectId = useUIStore((s) => s.reportDetailProjectId)
  const { canDeleteMonitoring } = useMonitoringRole()

  const project = projects.find((p) => p.id === reportDetailProjectId)
  const [activeTab, setActiveTab] = useState<ReportDocumentType>('customer')
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null)

  const tabDocs = documents.filter((d) => d.projectId === reportDetailProjectId && d.docType === activeTab)

  if (!project) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ink-tertiary p-5">
        <p className="text-sm">Project tidak ditemukan.</p>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-report')}>Kembali</Button>
      </div>
    )
  }

  const tabs: { key: ReportDocumentType; label: string }[] = [
    { key: 'customer', label: 'Report Customer' },
    { key: 'vendor', label: 'Report Vendor' },
  ]

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('monitoring-report')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
        >
          <ArrowLeft size={13} />
          Report Project
        </button>
        <span className="text-ink-tertiary text-xs">/</span>
        <span className="text-xs text-ink-primary font-medium">{project.kodeProject}</span>
      </div>

      {/* Header card */}
      <div className="surface rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-pertamina-red uppercase tracking-widest mb-1">{project.kodeProject}</div>
            <h2 className="text-base font-semibold text-ink-primary">{project.namaKontrak}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              <span><span className="text-ink-tertiary">Client:</span> {project.client}</span>
              <span><span className="text-ink-tertiary">Dept:</span> {project.department}</span>
              <span><span className="text-ink-tertiary">PIC Laporan:</span> {project.picLaporan || '—'}</span>
              <span><span className="text-ink-tertiary">PIC Docon:</span> {project.picDocon || '—'}</span>
              <span><span className="text-ink-tertiary">Sales:</span> {project.salesCustomer || '—'}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: project.id })}
            leftIcon={<Pencil size={13} />}
          >
            Edit Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => {
            const count = documents.filter((d) => d.projectId === project.id && d.docType === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={classNames(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px',
                  activeTab === tab.key
                    ? 'border-pertamina-red text-pertamina-red'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary',
                )}
              >
                {tab.label}
                <span className={classNames(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  activeTab === tab.key ? 'bg-pertamina-red/10 text-pertamina-red' : 'bg-black/[0.05] text-ink-tertiary',
                )}>
                  {count}
                </span>
              </button>
            )
          })}
          <div className="ml-auto flex items-center px-4">
            <Button
              size="sm"
              onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab })}
              leftIcon={<Plus size={13} />}
            >
              Tambah Dokumen
            </Button>
          </div>
        </div>

        {/* Doc table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {['Judul Dokumen', 'Revisi', 'Status', 'Attachment', 'Dibuat', 'Diperbarui', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {tabDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-ink-primary max-w-[240px]">
                    <div className="truncate" title={doc.judul}>{doc.judul}</div>
                    {doc.deskripsi && <div className="text-[11px] text-ink-tertiary truncate mt-0.5">{doc.deskripsi}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={classNames('chip text-[10px]', REVISION_CLS[doc.revision] ?? 'bg-slate-100 text-slate-600')}>{doc.revision}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={classNames('chip', STATUS_META[doc.status].cls)}>{STATUS_META[doc.status].label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                    {doc.attachments.length > 0
                      ? <span className="flex items-center gap-1"><Paperclip size={11} /> {doc.attachments.length}</span>
                      : <span className="text-ink-muted">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{formatDateShort(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{formatDateShort(doc.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal({ type: 'monitoring-report-document-detail', documentId: doc.id })} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                      <button onClick={() => openModal({ type: 'monitoring-report-document-edit', documentId: doc.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                      {canDeleteMonitoring && <button onClick={() => setConfirmDeleteDocId(doc.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tabDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
            <p className="text-sm">Belum ada dokumen {activeTab === 'customer' ? 'customer' : 'vendor'}.</p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab })}
              leftIcon={<Plus size={13} />}
            >
              Tambah Dokumen Pertama
            </Button>
          </div>
        )}
      </div>

      {/* Confirm delete doc */}
      {confirmDeleteDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Dokumen?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteDocId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteDocument(confirmDeleteDocId); setConfirmDeleteDocId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
