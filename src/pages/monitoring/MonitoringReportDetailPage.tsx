import { useState } from 'react'
import { ArrowLeft, Plus, Eye, Pencil, Trash2, Paperclip, CheckCircle2 } from 'lucide-react'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames, formatDateShort } from '../../utils/helpers'
import type { ReportDocumentStatus, BillingDocumentStatus } from '../../types/monitoring'

type ActiveTab = 'customer' | 'vendor' | 'billing'

const DOC_STATUS_META: Record<ReportDocumentStatus, { label: string; cls: string }> = {
  DRAFT:             { label: 'Draft',          cls: 'bg-slate-100 text-slate-700' },
  SUBMITTED:         { label: 'Submitted',       cls: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW:      { label: 'Under Review',    cls: 'bg-amber-100 text-amber-700' },
  REVISION_REQUIRED: { label: 'Revisi Diminta',  cls: 'bg-red-100 text-red-700' },
  APPROVED:          { label: 'Disetujui',        cls: 'bg-emerald-100 text-emerald-700' },
}

const BILLING_STATUS_META: Record<BillingDocumentStatus, { label: string; cls: string }> = {
  BELUM_DIBUAT: { label: 'Belum Dibuat', cls: 'bg-slate-100 text-slate-600' },
  DRAFT:        { label: 'Draft',        cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:    { label: 'Submitted',    cls: 'bg-amber-100 text-amber-700' },
  APPROVED:     { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:     { label: 'Rejected',     cls: 'bg-red-100 text-red-700' },
  COMPLETED:    { label: 'Completed',    cls: 'bg-pertamina-red-50 text-pertamina-red font-semibold' },
}

const REVISION_CLS: Record<string, string> = {
  R0: 'bg-slate-100 text-slate-600',
  R1: 'bg-blue-100 text-blue-700',
  R2: 'bg-violet-100 text-violet-700',
  R3: 'bg-amber-100 text-amber-700',
  R4: 'bg-red-100 text-red-700',
}

export function MonitoringReportDetailPage() {
  const { projects, documents, billingDocuments, deleteDocument, deleteBillingDocument } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const reportDetailProjectId = useUIStore((s) => s.reportDetailProjectId)
  const { canDeleteMonitoring } = useMonitoringRole()

  const project = projects.find((p) => p.id === reportDetailProjectId)
  const [activeTab, setActiveTab] = useState<ActiveTab>('customer')
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null)
  const [confirmDeleteBillingId, setConfirmDeleteBillingId] = useState<string | null>(null)

  const custDocs = documents.filter((d) => d.projectId === reportDetailProjectId && d.docType === 'customer')
  const vendDocs = documents.filter((d) => d.projectId === reportDetailProjectId && d.docType === 'vendor')
  const billingDocs = billingDocuments.filter((b) => b.projectId === reportDetailProjectId)
  const billingCompleted = billingDocs.filter((b) => b.status === 'COMPLETED').length
  const billingProgress = billingDocs.length > 0 ? Math.round((billingCompleted / billingDocs.length) * 100) : 0

  const tabDocs = activeTab === 'customer' ? custDocs : activeTab === 'vendor' ? vendDocs : []

  if (!project) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ink-tertiary p-5">
        <p className="text-sm">Project tidak ditemukan.</p>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-report')}>Kembali</Button>
      </div>
    )
  }

  const tabs: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'customer', label: 'Report Customer', count: custDocs.length },
    { key: 'vendor',   label: 'Report Vendor',   count: vendDocs.length },
    { key: 'billing',  label: 'Billing Tracker', count: billingDocs.length },
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

      {/* Billing Progress Card — always visible */}
      <div className="surface rounded-xl p-4 flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pertamina-red-50">
          <CheckCircle2 size={22} className="text-pertamina-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink-primary">Billing Progress</span>
            <span className="text-xs font-semibold text-pertamina-red">{billingCompleted}/{billingDocs.length} Dokumen Selesai</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-pertamina-red transition-all duration-500"
              style={{ width: `${billingProgress}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-ink-tertiary">{billingProgress}% completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => (
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
                {tab.count}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center px-4">
            {activeTab !== 'billing' ? (
              <Button
                size="sm"
                onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab as 'customer' | 'vendor' })}
                leftIcon={<Plus size={13} />}
              >
                Tambah Dokumen
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => openModal({ type: 'monitoring-billing-create', projectId: project.id })}
                leftIcon={<Plus size={13} />}
              >
                Tambah Billing
              </Button>
            )}
          </div>
        </div>

        {/* Report Customer / Report Vendor table */}
        {activeTab !== 'billing' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {['Judul Dokumen', 'Tgl Submit', 'Tgl Feedback', 'Revisi', 'Status', 'Attachment', 'Aksi'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {tabDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary max-w-[220px]">
                        <div className="truncate" title={doc.judul}>{doc.judul}</div>
                        {doc.deskripsi && <div className="text-[11px] text-ink-tertiary truncate mt-0.5">{doc.deskripsi}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.tanggalSubmit ? formatDateShort(doc.tanggalSubmit) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.tanggalFeedback ? formatDateShort(doc.tanggalFeedback) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip text-[10px]', REVISION_CLS[doc.revision] ?? 'bg-slate-100 text-slate-600')}>{doc.revision}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip', DOC_STATUS_META[doc.status].cls)}>{DOC_STATUS_META[doc.status].label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.attachments.length > 0
                          ? <span className="flex items-center gap-1"><Paperclip size={11} /> {doc.attachments.length}</span>
                          : <span className="text-ink-muted">—</span>
                        }
                      </td>
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
                  size="sm" className="mt-3"
                  onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab as 'customer' | 'vendor' })}
                  leftIcon={<Plus size={13} />}
                >
                  Tambah Dokumen Pertama
                </Button>
              </div>
            )}
          </>
        )}

        {/* Billing Tracker table */}
        {activeTab === 'billing' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {['Jenis Dokumen', 'PIC', 'Target Date', 'Actual Date', 'Status', 'Keterangan', 'Attachment', 'Aksi'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {billingDocs.map((b) => (
                    <tr key={b.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-ink-primary whitespace-nowrap">{b.docType}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{b.pic || '—'}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.targetDate ? formatDateShort(b.targetDate) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.actualDate ? formatDateShort(b.actualDate) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip', BILLING_STATUS_META[b.status].cls)}>{BILLING_STATUS_META[b.status].label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary max-w-[180px]">
                        <div className="truncate" title={b.keterangan}>{b.keterangan || <span className="text-ink-muted">—</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.attachments.length > 0
                          ? <span className="flex items-center gap-1"><Paperclip size={11} /> {b.attachments.length}</span>
                          : <span className="text-ink-muted">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal({ type: 'monitoring-billing-edit', billingId: b.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                          {canDeleteMonitoring && <button onClick={() => setConfirmDeleteBillingId(b.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {billingDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
                <p className="text-sm">Belum ada billing document untuk project ini.</p>
                <Button
                  size="sm" className="mt-3"
                  onClick={() => openModal({ type: 'monitoring-billing-create', projectId: project.id })}
                  leftIcon={<Plus size={13} />}
                >
                  Tambah Billing Pertama
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm delete report doc */}
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

      {/* Confirm delete billing doc */}
      {confirmDeleteBillingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Billing Document?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteBillingId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteBillingDocument(confirmDeleteBillingId); setConfirmDeleteBillingId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
