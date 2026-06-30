import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Clock, RotateCcw, Send, RefreshCw, Paperclip, X, Upload, ArrowRight, Flag, User, FileText, Mail } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useAuthStore } from '../../store/useAuthStore'
import { usePermissions } from '../../hooks/usePermissions'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { classNames, formatDateTime, formatDateShort } from '../../utils/helpers'
import { reportMonthLabel } from '../../types/monitoring'
import type { ReportDocumentType, ReportDocumentActionType, DocPhase } from '../../types/monitoring'

const STATUS_CLS: Record<string, string> = {
  DRAFT:             'bg-slate-100 text-slate-700',
  SUBMITTED:         'bg-blue-100 text-blue-700',
  UNDER_REVIEW:      'bg-amber-100 text-amber-700',
  REVISION_REQUIRED: 'bg-red-100 text-red-700',
  APPROVED:          'bg-emerald-100 text-emerald-700',
  COMPILING:         'bg-violet-100 text-violet-700',
  PENDING_KADIV:     'bg-blue-100 text-blue-700',
  KADIV_APPROVED:    'bg-teal-100 text-teal-700',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  REVISION_REQUIRED: 'Revisi Diminta', APPROVED: 'Disetujui',
  COMPILING: 'Kompilasi Doccon',
  PENDING_KADIV: 'Menunggu Kadiv',
  KADIV_APPROVED: 'Disetujui Kadiv',
}
const REVISION_CLS: Record<string, string> = {
  R0: 'bg-slate-100 text-slate-600', R1: 'bg-blue-100 text-blue-700',
  R2: 'bg-violet-100 text-violet-700', R3: 'bg-amber-100 text-amber-700', R4: 'bg-red-100 text-red-700',
}

const ACTION_META: Record<ReportDocumentActionType, { label: string; icon: React.ReactNode; color: string }> = {
  CREATE:             { label: 'Dibuat',               icon: <Clock size={13} />,         color: 'bg-slate-500' },
  SUBMIT:             { label: 'Submit ke Doccon',      icon: <Send size={13} />,          color: 'bg-blue-500' },
  START_REVIEW:       { label: 'Mulai Review',          icon: <Clock size={13} />,         color: 'bg-amber-500' },
  APPROVE:            { label: 'Disetujui',             icon: <CheckCircle2 size={13} />,  color: 'bg-emerald-500' },
  REQUEST_REVISION:   { label: 'Revisi Diminta',        icon: <RotateCcw size={13} />,    color: 'bg-pertamina-red' },
  RESUBMIT:           { label: 'Resubmit',              icon: <RefreshCw size={13} />,    color: 'bg-violet-500' },
  DOCCON_COMPILE:     { label: 'Mulai Kompilasi',       icon: <FileText size={13} />,     color: 'bg-violet-500' },
  SUBMIT_KADIV:       { label: 'Dikirim ke Kadiv',      icon: <Send size={13} />,         color: 'bg-blue-600' },
  KADIV_APPROVE:      { label: 'Disetujui Kadiv',       icon: <CheckCircle2 size={13} />, color: 'bg-emerald-600' },
  KADIV_REJECT:       { label: 'Dikembalikan Kadiv',    icon: <RotateCcw size={13} />,   color: 'bg-pertamina-red' },
  CUSTOMER_NOTIFIED:  { label: 'Customer Dinotifikasi', icon: <Mail size={13} />,         color: 'bg-cyan-500' },
  CUSTOMER_CONFIRMED: { label: 'Customer Konfirmasi',   icon: <CheckCircle2 size={13} />, color: 'bg-teal-600' },
  VENDOR_CONFIRMED:   { label: 'Vendor Konfirmasi',     icon: <CheckCircle2 size={13} />, color: 'bg-indigo-600' },
  SUBMIT_SALES:       { label: 'Dikirim ke Sales',      icon: <Send size={13} />,         color: 'bg-pertamina-red' },
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'detail'
  documentId?: string
  projectId?: string
  docType?: ReportDocumentType
}

export function MonitoringReportDocumentModal({ open, onClose, mode, documentId, projectId, docType }: Props) {
  const store = useMonitoringReportStore()
  const selectedMonth = useUIStore((s) => s.selectedReportMonth)
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const { hasPermission } = usePermissions()
  const { isDoccon, isAdminOSM, isKadiv, isEngineerOS } = useMonitoringRole()

  const currentUser = users.find((u) => u.id === session?.userId)
  const canApprove = hasPermission('canApproveHandoff')
  const canEdit = hasPermission('canEditTask')
  const canAdvanceDoccon = isDoccon

  const existing = documentId ? store.getDocumentById(documentId) : undefined
  const project = existing ? store.getProjectById(existing.projectId) : (projectId ? store.getProjectById(projectId) : undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [judul, setJudul] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [deadlineToSales, setDeadlineToSales] = useState('')
  const [engineerPIC, setEngineerPIC] = useState('')
  const [customerPIC, setCustomerPIC] = useState('')
  const [docconPIC, setDocconPIC] = useState('')
  const [actionComment, setActionComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showResubmitPanel, setShowResubmitPanel] = useState(false)
  const [showCustomerConfirmPanel, setShowCustomerConfirmPanel] = useState(false)
  const [showVendorConfirmPanel, setShowVendorConfirmPanel] = useState(false)

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setJudul(existing.judul)
      setDeskripsi(existing.deskripsi)
      setDeadlineToSales(existing.deadlineToSales ?? '')
      setEngineerPIC(existing.engineerPIC ?? '')
      setCustomerPIC(existing.customerPIC ?? '')
      setDocconPIC(existing.docconPIC ?? '')
    } else {
      setJudul(''); setDeskripsi('')
      setDeadlineToSales(''); setEngineerPIC(''); setCustomerPIC(''); setDocconPIC('')
    }
    setErrors({})
    setActionComment('')
    setShowResubmitPanel(false)
    setShowCustomerConfirmPanel(false)
    setShowVendorConfirmPanel(false)
  }, [open, mode, documentId])

  function handleSave() {
    const e: Record<string, string> = {}
    if (!judul.trim()) e.judul = 'Judul dokumen wajib diisi'
    setErrors(e)
    if (Object.keys(e).length) return
    const extraFields = {
      deadlineToSales: deadlineToSales.trim() || null,
      engineerPIC: engineerPIC.trim(),
      customerPIC: customerPIC.trim(),
      docconPIC: docconPIC.trim(),
    }
    if (mode === 'create' && projectId && docType) {
      store.addDocument({
        projectId, docType, judul: judul.trim(), deskripsi: deskripsi.trim(),
        period: selectedMonth,
        attachments: [],
        createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '',
        ...extraFields,
      })
    } else if (mode === 'edit' && documentId) {
      store.updateDocument(documentId, { judul: judul.trim(), deskripsi: deskripsi.trim(), ...extraFields })
    }
    onClose()
  }

  // Legacy workflow handler (keep for backward compat with old-flow documents)
  function handleWorkflow(action: 'submit' | 'startReview' | 'approve' | 'revision' | 'resubmit') {
    if (!documentId || !currentUser) return
    const userId = currentUser.id
    const name = currentUser.name
    if (action === 'submit') store.submitDocument(documentId, userId, name, actionComment)
    else if (action === 'startReview') store.startReview(documentId, userId, name)
    else if (action === 'approve') store.approveDocument(documentId, userId, name, actionComment)
    else if (action === 'revision') {
      if (!actionComment.trim()) { alert('Komentar revisi wajib diisi'); return }
      store.requestDocumentRevision(documentId, userId, name, actionComment)
    }
    else if (action === 'resubmit') store.resubmitDocument(documentId, userId, name, actionComment)
    setActionComment('')
    onClose()
  }

  // New workflow handler
  function handleNewWorkflow(action: 'compile' | 'toKadiv' | 'kadivApprove' | 'kadivReject' | 'customerConfirm' | 'vendorConfirm' | 'toSales') {
    if (!documentId || !currentUser) return
    const uid = currentUser.id
    const name = currentUser.name
    if (action === 'compile') store.docconCompile(documentId, uid, name)
    else if (action === 'toKadiv') store.submitToKadiv(documentId, uid, name)
    else if (action === 'kadivApprove') store.kadivApprove(documentId, uid, name, actionComment)
    else if (action === 'kadivReject') {
      if (!actionComment.trim()) { alert('Komentar wajib diisi untuk penolakan'); return }
      store.kadivReject(documentId, uid, name, actionComment)
    }
    else if (action === 'customerConfirm') store.recordCustomerConfirmed(documentId, uid, name)
    else if (action === 'vendorConfirm') store.recordVendorConfirmed(documentId, uid, name, actionComment)
    else if (action === 'toSales') store.submitToSales(documentId, uid, name)
    setActionComment('')
    setShowCustomerConfirmPanel(false)
    setShowVendorConfirmPanel(false)
    onClose()
  }

  function handleDocconAdvance(next: 'qc_review' | 'ready_to_sales' | 'delivered') {
    if (!documentId) return
    store.advanceDocconPhase(documentId, next)
    onClose()
  }

  function handleResubmitToSales() {
    if (!documentId) return
    store.docconResubmitToSales(documentId)
    setShowResubmitPanel(false)
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!documentId || !currentUser) return
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      store.addAttachment(documentId, {
        name: file.name, size: file.size, mimeType: file.type, uploadedByName: currentUser.name,
      })
    })
    e.target.value = ''
  }

  const status = existing?.status
  const titleStr = mode === 'create' ? 'Tambah Dokumen' : mode === 'edit' ? 'Edit Dokumen' : 'Detail Dokumen'
  const periodLabel = mode === 'create' ? ` — ${reportMonthLabel(selectedMonth)}` : ''
  const descStr = project ? `${project.kodeProject} — ${existing?.docType === 'vendor' ? 'Report Vendor' : 'Report Customer'}${periodLabel}` : undefined

  return (
    <Modal
      open={open} onClose={onClose}
      title={titleStr}
      description={descStr}
      size={mode === 'detail' ? '2xl' : 'lg'}
      footer={
        mode !== 'detail' ? (
          <><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button></>
        ) : undefined
      }
    >
      {mode === 'detail' && existing ? (
        <div className="space-y-5">
          {/* Status row */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-black/[0.02] border border-border-subtle">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Status</div>
              <span className={classNames('chip', STATUS_CLS[existing.status] ?? 'bg-slate-100 text-slate-700')}>{STATUS_LABEL[existing.status] ?? existing.status}</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Revisi</div>
              <span className={classNames('chip text-[11px]', REVISION_CLS[existing.revision] ?? '')}>{existing.revision}</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Tipe</div>
              <span className={classNames('chip', existing.docType === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700')}>
                {existing.docType === 'customer' ? 'Customer' : 'Vendor'}
              </span>
            </div>
          </div>

          {/* Phase stepper — two variants */}
          {existing.currentPhase && (() => {
            const isVendorDoc = existing.docType === 'vendor'
            const phase = existing.currentPhase as string

            const CUSTOMER_PHASES: { key: string; label: string }[] = [
              { key: 'engineer', label: 'Engineer' },
              { key: 'doccon',   label: 'Doccon' },
              { key: 'kadiv',    label: 'Kadiv' },
              { key: 'customer_email', label: 'Customer' },
              { key: 'sales',    label: 'Sales' },
            ]
            const VENDOR_PHASES: { key: string; label: string }[] = [
              { key: 'doccon',        label: 'Input' },
              { key: 'kadiv',         label: 'Kadiv' },
              { key: 'vendor_confirm', label: 'Vendor' },
              { key: 'completed',     label: 'Selesai' },
            ]

            // Legacy 3-step phases (keep backward compat for old 'customer' phase)
            const LEGACY_PHASES: { key: string; label: string }[] = [
              { key: 'engineer', label: 'Engineer' },
              { key: 'customer', label: 'Customer' },
              { key: 'doccon',   label: 'Doccon' },
            ]

            const isLegacy = phase === 'customer' || (
              !isVendorDoc &&
              !['engineer','doccon','kadiv','customer_email','sales'].includes(phase)
            )

            let PHASES: { key: string; label: string }[]
            let isDone: (p: string) => boolean

            if (isLegacy) {
              PHASES = LEGACY_PHASES
              isDone = (p: string) => {
                if (p === 'engineer') return phase === 'customer' || phase === 'doccon'
                if (p === 'customer') return phase === 'doccon'
                if (p === 'doccon') return existing.docconSubStatus === 'delivered'
                return false
              }
            } else if (isVendorDoc) {
              PHASES = VENDOR_PHASES
              isDone = (p: string) => {
                if (p === 'doccon') return ['kadiv','vendor_confirm','completed'].includes(phase)
                if (p === 'kadiv') return ['vendor_confirm','completed'].includes(phase)
                if (p === 'vendor_confirm') return phase === 'completed'
                if (p === 'completed') return false
                return false
              }
            } else {
              PHASES = CUSTOMER_PHASES
              isDone = (p: string) => {
                if (p === 'engineer') return ['doccon','kadiv','customer_email','sales'].includes(phase)
                if (p === 'doccon') return ['kadiv','customer_email','sales'].includes(phase)
                if (p === 'kadiv') return ['customer_email','sales'].includes(phase)
                if (p === 'customer_email') return phase === 'sales'
                if (p === 'sales') return false
                return false
              }
            }

            return (
              <div className="rounded-xl border border-border-subtle bg-black/[0.02] px-4 py-3 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Phase Pipeline</div>
                <div className="flex flex-wrap items-center gap-2">
                  {PHASES.map((step, idx) => {
                    const done = isDone(step.key)
                    const active = step.key === phase
                    return (
                      <div key={step.key} className="flex items-center gap-2">
                        <div className={classNames(
                          'rounded-md px-2.5 py-1 text-[11px] font-medium flex items-center gap-1',
                          done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-pertamina-red/10 text-pertamina-red' : 'bg-black/[0.04] text-ink-muted',
                        )}>
                          {done && <CheckCircle2 size={10} />}
                          {step.label}
                        </div>
                        {idx < PHASES.length - 1 && <ArrowRight size={12} className="text-ink-muted" />}
                      </div>
                    )
                  })}
                  {existing.hasConflict && <span className="chip bg-orange-100 text-orange-700 text-[10px]">Conflict</span>}
                </div>
                {/* Legacy doccon sub-status */}
                {isLegacy && existing.currentPhase === 'doccon' && existing.docconSubStatus && (
                  <div className="text-[11px] text-ink-secondary">
                    Doccon: <span className="font-medium capitalize">{existing.docconSubStatus.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {/* Kadiv approval info */}
                {existing.kadivApprovedAt && (
                  <div className="flex items-center gap-2 mt-1 rounded-lg bg-teal-50 border border-teal-200 px-3 py-2">
                    <CheckCircle2 size={12} className="text-teal-600 shrink-0" />
                    <div className="text-[11px] text-teal-700 font-medium">
                      Disetujui Kadiv: {existing.kadivApprovedByName} · {formatDateTime(existing.kadivApprovedAt)}
                    </div>
                  </div>
                )}
                {/* Sales feedback */}
                {existing.salesFlagIssue && (
                  <div className="flex items-start gap-2 mt-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                    <Flag size={12} className="text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-orange-700">Dikembalikan oleh Sales</div>
                      {existing.salesIssueNote && <div className="text-[11px] text-orange-600 mt-0.5">{existing.salesIssueNote}</div>}
                    </div>
                  </div>
                )}
                {/* Legacy: delivered confirmation */}
                {isLegacy && existing.docconSubStatus === 'delivered' && existing.salesAcceptedAt && !existing.salesFlagIssue && (
                  <div className="flex items-center gap-2 mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700">Diterima Sales</div>
                      <div className="text-[10px] text-emerald-600">{formatDateTime(existing.salesAcceptedAt)}</div>
                    </div>
                  </div>
                )}
                {isLegacy && existing.docconSubStatus === 'delivered' && !existing.salesAcceptedAt && !existing.salesFlagIssue && (
                  <div className="flex items-center gap-2 mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                    <Clock size={12} className="text-blue-500 shrink-0" />
                    <div className="text-[11px] text-blue-700 font-medium">Menunggu konfirmasi Sales</div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Info */}
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Judul Dokumen</div>
              <div className="text-sm text-ink-primary mt-0.5 font-medium">{existing.judul}</div>
            </div>
            {existing.deskripsi && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Deskripsi</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.deskripsi}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Tgl Submit</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.tanggalSubmit ? formatDateShort(existing.tanggalSubmit) : '—'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Tgl Feedback</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.tanggalFeedback ? formatDateShort(existing.tanggalFeedback) : '—'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Deadline ke Sales</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.deadlineToSales ? formatDateShort(existing.deadlineToSales) : '—'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Diperbarui</div>
                <div className="text-sm text-ink-secondary mt-0.5">{formatDateShort(existing.updatedAt)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Dibuat</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.createdByName} · {formatDateShort(existing.createdAt)}</div>
              </div>
            </div>
            {/* PIC accountability */}
            {(existing.engineerPIC || existing.customerPIC || existing.docconPIC) && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">PIC</div>
                <div className="flex flex-wrap gap-3 text-xs text-ink-secondary">
                  {existing.engineerPIC && <span className="flex items-center gap-1"><User size={11} className="text-blue-400" /><span className="text-ink-tertiary">Eng:</span> {existing.engineerPIC}</span>}
                  {existing.customerPIC && <span className="flex items-center gap-1"><User size={11} className="text-purple-400" /><span className="text-ink-tertiary">Cust:</span> {existing.customerPIC}</span>}
                  {existing.docconPIC && <span className="flex items-center gap-1"><User size={11} className="text-amber-500" /><span className="text-ink-tertiary">Doccon:</span> {existing.docconPIC}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Attachment ({existing.attachments.length})</div>
              {(existing.status !== 'APPROVED' || existing.salesFlagIssue) && (
                <>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={12} />}>Upload</Button>
                </>
              )}
            </div>
            {existing.attachments.length === 0 ? (
              <p className="text-xs text-ink-tertiary">Belum ada attachment.</p>
            ) : (
              <div className="space-y-1.5">
                {existing.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
                    <Paperclip size={13} className="text-ink-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink-primary truncate">{att.name}</div>
                      <div className="text-[10px] text-ink-tertiary">{fmtSize(att.size)} · {att.uploadedByName} · {formatDateShort(att.uploadedAt)}</div>
                    </div>
                    {existing.status !== 'APPROVED' && (
                      <button
                        onClick={() => store.removeAttachment(existing.id, att.id)}
                        className="shrink-0 rounded p-0.5 text-ink-muted hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Workflow Baru ── */}
          {mode === 'detail' && existing && (() => {
            const phase = existing.currentPhase ?? 'engineer'
            const st = existing.status
            const isVendor = existing.docType === 'vendor'

            // Determine if we're in the legacy (old 3-phase) flow
            const isLegacyFlow = phase === 'customer' ||
              (st === 'UNDER_REVIEW' && phase !== 'kadiv') ||
              (st === 'APPROVED' && existing.docconSubStatus === 'delivered' && !existing.kadivApprovedAt && !existing.customerConfirmedAt && !existing.vendorConfirmedAt)

            if (isLegacyFlow) {
              // Show legacy workflow panels (read-only info for old documents)
              return (
                <div className="border-t border-border-subtle pt-4">
                  <div className="rounded-xl bg-black/[0.02] border border-border-subtle px-4 py-3">
                    <div className="text-[11px] text-ink-secondary">
                      Dokumen ini menggunakan alur lama. Status: <span className="font-semibold">{STATUS_LABEL[st] ?? st}</span>
                    </div>
                  </div>
                </div>
              )
            }

            const panels: React.ReactNode[] = []

            // ── Customer doc — Engineer submit ke Doccon ──
            if (!isVendor && st === 'DRAFT' && phase === 'engineer' && isEngineerOS) {
              panels.push(
                <div key="eng-submit" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Engineer</div>
                  <Textarea label="Komentar" value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} placeholder="Catatan opsional…" />
                  <Button size="sm" onClick={() => handleWorkflow('submit')} leftIcon={<Send size={13} />}>Submit ke Doccon</Button>
                </div>
              )
            }

            // ── Customer doc — Engineer resubmit after Kadiv rejection ──
            if (!isVendor && st === 'REVISION_REQUIRED' && phase === 'engineer' && isEngineerOS) {
              panels.push(
                <div key="eng-resubmit" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Perbaikan Diperlukan</div>
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
                    Kadiv meminta revisi. Perbaiki dan resubmit ke Doccon.
                  </div>
                  <Textarea label="Komentar" value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} placeholder="Catatan perbaikan…" />
                  <Button size="sm" onClick={() => handleWorkflow('resubmit')} leftIcon={<RefreshCw size={13} />}>Resubmit ke Doccon</Button>
                </div>
              )
            }

            // ── Customer doc — Doccon compile (after Engineer submitted) ──
            if (!isVendor && st === 'SUBMITTED' && phase === 'engineer' && isDoccon) {
              panels.push(
                <div key="doccon-compile" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Doccon</div>
                  <Button size="sm" onClick={() => handleNewWorkflow('compile')} leftIcon={<FileText size={13} />}>Mulai Kompilasi</Button>
                </div>
              )
            }

            // ── Customer doc — Doccon submit ke Kadiv (after compiling) ──
            if (!isVendor && st === 'COMPILING' && phase === 'doccon' && isDoccon) {
              panels.push(
                <div key="doccon-to-kadiv" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Doccon</div>
                  <Button size="sm" onClick={() => handleNewWorkflow('toKadiv')} leftIcon={<Send size={13} />}>Submit ke Kadiv</Button>
                </div>
              )
            }

            // ── Vendor doc — Doccon submit ke Kadiv (langsung dari DRAFT/SUBMITTED) ──
            if (isVendor && (st === 'DRAFT' || st === 'SUBMITTED' || st === 'REVISION_REQUIRED') && phase === 'doccon' && isDoccon) {
              panels.push(
                <div key="vendor-doccon-to-kadiv" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Doccon</div>
                  {st === 'REVISION_REQUIRED' && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
                      Kadiv meminta revisi. Perbaiki dokumen vendor dan submit ulang ke Kadiv.
                    </div>
                  )}
                  <Button size="sm" onClick={() => handleNewWorkflow('toKadiv')} leftIcon={<Send size={13} />}>Submit ke Kadiv</Button>
                </div>
              )
            }

            // ── Kadiv approval (both types) ──
            if (st === 'PENDING_KADIV' && phase === 'kadiv' && isKadiv) {
              panels.push(
                <div key="kadiv-actions" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Keputusan Kadiv</div>
                  <Textarea label="Komentar (wajib untuk penolakan)" value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} placeholder="Catatan keputusan…" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleNewWorkflow('kadivApprove')} leftIcon={<CheckCircle2 size={13} />}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => handleNewWorkflow('kadivReject')} leftIcon={<RotateCcw size={13} />}>Minta Revisi</Button>
                  </div>
                </div>
              )
            }

            // ── Customer doc — Doccon catat konfirmasi customer ──
            if (!isVendor && st === 'KADIV_APPROVED' && phase === 'customer_email' && isDoccon) {
              panels.push(
                <div key="customer-confirm" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Konfirmasi Customer</div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-[11px] text-cyan-800">
                    Kirim email ke customer. Setelah customer membalas konfirmasi, catat di sini.
                  </div>
                  {!showCustomerConfirmPanel ? (
                    <Button size="sm" onClick={() => setShowCustomerConfirmPanel(true)} leftIcon={<Mail size={13} />}>
                      Catat Konfirmasi Customer
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-ink-secondary">Konfirmasi bahwa customer sudah memberikan persetujuan via email?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowCustomerConfirmPanel(false)}>Batal</Button>
                        <Button size="sm" onClick={() => handleNewWorkflow('customerConfirm')} leftIcon={<CheckCircle2 size={13} />}>
                          Ya, Customer Sudah Konfirmasi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Customer doc — Doccon submit ke Sales (after customer confirmed) ──
            if (!isVendor && st === 'APPROVED' && phase === 'sales' && isDoccon && !existing.salesSubmittedAt) {
              panels.push(
                <div key="to-sales" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Kirim ke Sales</div>
                  <Button size="sm" onClick={() => handleNewWorkflow('toSales')} leftIcon={<Send size={13} />}>
                    Kirim ke Sales
                  </Button>
                </div>
              )
            }

            // ── Customer doc — Sales submitted confirmation ──
            if (!isVendor && st === 'APPROVED' && phase === 'sales' && existing.salesSubmittedAt) {
              panels.push(
                <div key="sales-done" className="border-t border-border-subtle pt-4">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">Dokumen sudah dikirim ke Sales</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">
                        {new Date(existing.salesSubmittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // ── Vendor doc — Doccon catat vendor konfirmasi ──
            if (isVendor && st === 'KADIV_APPROVED' && phase === 'vendor_confirm' && isDoccon) {
              panels.push(
                <div key="vendor-confirm" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Konfirmasi Vendor</div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-[11px] text-indigo-800">
                    Kirim email konfirmasi ke vendor. Setelah vendor membalas, catat di sini.
                  </div>
                  {!showVendorConfirmPanel ? (
                    <Button size="sm" onClick={() => setShowVendorConfirmPanel(true)} leftIcon={<Mail size={13} />}>
                      Catat Konfirmasi Vendor
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea label="Komentar opsional" value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} placeholder="Catatan dari vendor…" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowVendorConfirmPanel(false)}>Batal</Button>
                        <Button size="sm" onClick={() => handleNewWorkflow('vendorConfirm')} leftIcon={<CheckCircle2 size={13} />}>
                          Ya, Vendor Sudah Konfirmasi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Vendor doc — completed ──
            if (isVendor && st === 'APPROVED' && phase === 'completed') {
              panels.push(
                <div key="vendor-completed" className="border-t border-border-subtle pt-4">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">Alur Vendor Selesai</div>
                      {existing.vendorConfirmedAt && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          Vendor konfirmasi: {new Date(existing.vendorConfirmedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            // Legacy doccon pipeline actions (for backward compat with docconSubStatus-based flow)
            // Vendor docs never use this pipeline — they end at vendor_confirm, not Sales
            const isLegacyDocconPhase = existing.currentPhase === 'doccon' &&
              existing.docconSubStatus != null &&
              existing.docType !== 'vendor' &&
              !existing.kadivApprovedAt &&
              !['COMPILING','PENDING_KADIV','KADIV_APPROVED'].includes(st)

            if (isLegacyDocconPhase && (existing.docconSubStatus !== 'delivered' || existing.salesFlagIssue) && canAdvanceDoccon) {
              panels.push(
                <div key="legacy-doccon" className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Doccon Pipeline</div>
                  <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-black/[0.02] px-4 py-3">
                    {(['compiling', 'qc_review', 'ready_to_sales', 'delivered'] as const).map((step, idx, arr) => {
                      const labels: Record<string, string> = {
                        compiling: 'Compiling', qc_review: 'QC Review',
                        ready_to_sales: 'Ready to Sales', delivered: 'Delivered',
                      }
                      const cur = existing.docconSubStatus ?? 'compiling'
                      const stepIdx = arr.indexOf(step)
                      const curIdx  = arr.indexOf(cur)
                      const done   = stepIdx < curIdx
                      const active = step === cur
                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div className={classNames(
                            'rounded-md px-2.5 py-1 text-[10px] font-medium flex items-center gap-1 whitespace-nowrap',
                            done  ? 'bg-emerald-100 text-emerald-700' :
                            active ? 'bg-amber-100 text-amber-700' :
                            'bg-black/[0.04] text-ink-muted',
                          )}>
                            {done && <CheckCircle2 size={9} />}
                            {labels[step]}
                          </div>
                          {idx < arr.length - 1 && <ArrowRight size={9} className="text-ink-muted shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    {existing.docconSubStatus === 'compiling' && (
                      <Button size="sm" onClick={() => handleDocconAdvance('qc_review')} leftIcon={<ArrowRight size={13} />}>
                        Mulai QC Review
                      </Button>
                    )}
                    {existing.docconSubStatus === 'qc_review' && (
                      <Button size="sm" onClick={() => handleDocconAdvance('ready_to_sales')} leftIcon={<CheckCircle2 size={13} />}>
                        Ready to Sales
                      </Button>
                    )}
                    {existing.docconSubStatus === 'ready_to_sales' && (
                      <Button size="sm" onClick={() => handleDocconAdvance('delivered')} leftIcon={<Send size={13} />}>
                        Submit ke Sales
                      </Button>
                    )}
                    {existing.docconSubStatus === 'delivered' && existing.salesFlagIssue && !showResubmitPanel && (
                      <Button size="sm" onClick={() => setShowResubmitPanel(true)} leftIcon={<RefreshCw size={13} />}>
                        Kirim Ulang ke Sales
                      </Button>
                    )}
                  </div>
                </div>
              )
            }

            // Legacy resubmit panel
            if (existing.currentPhase === 'doccon' && existing.docType !== 'vendor' && existing.docconSubStatus === 'delivered' && existing.salesFlagIssue && showResubmitPanel && canAdvanceDoccon) {
              panels.push(
                <div key="legacy-resubmit" className="border-t border-border-subtle pt-4">
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
                    <p className="text-[11px] text-red-700">
                      Upload file revisi di bagian <strong>Attachment</strong> di atas, lalu klik Konfirmasi untuk mengirim ulang ke Sales.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowResubmitPanel(false)}>Batal</Button>
                      <Button size="sm" onClick={handleResubmitToSales} leftIcon={<Send size={12} />}>
                        Konfirmasi Kirim Ulang
                      </Button>
                    </div>
                  </div>
                </div>
              )
            }

            // Legacy delivered confirmation panel (no flag)
            if (existing.currentPhase === 'doccon' && existing.docType !== 'vendor' && existing.docconSubStatus === 'delivered' && !existing.salesFlagIssue && !existing.kadivApprovedAt) {
              panels.push(
                <div key="legacy-delivered" className="border-t border-border-subtle pt-4">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">Dokumen sudah dikirim ke Sales</div>
                      {existing.docconDeliveredAt && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          Delivered: {new Date(existing.docconDeliveredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            if (panels.length === 0) return null
            return <>{panels}</>
          })()}

          {/* Timeline */}
          <div className="border-t border-border-subtle pt-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-4">Timeline Aktivitas</div>
            <div className="space-y-0">
              {existing.activities.map((activity, idx) => {
                const meta = ACTION_META[activity.action] ?? { label: activity.action, icon: <Clock size={13} />, color: 'bg-slate-400' }
                const isLast = idx === existing.activities.length - 1
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={classNames('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', meta.color)}>{meta.icon}</div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border-subtle mt-1 mb-1 min-h-[20px]" />}
                    </div>
                    <div className={classNames('pb-4 pt-0.5 min-w-0 flex-1', isLast ? 'pb-0' : '')}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink-primary">{meta.label}</span>
                        <span className="text-[10px] text-ink-muted">·</span>
                        <span className="text-[10px] text-ink-tertiary">{activity.byName}</span>
                        <span className="text-[10px] text-ink-muted ml-auto">{formatDateTime(activity.timestamp)}</span>
                      </div>
                      {activity.comment && (
                        <div className="mt-1.5 text-xs text-ink-secondary rounded-lg bg-black/[0.03] border border-border-subtle px-3 py-2">{activity.comment}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* CREATE / EDIT form */
        <div className="space-y-4">
          <div>
            <Input
              label="Judul Dokumen *"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Laporan Progress Bulan Januari 2025"
              autoFocus
            />
            {errors.judul && <p className="text-[11px] text-pertamina-red mt-1">{errors.judul}</p>}
          </div>
          <Textarea
            label="Deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Keterangan dokumen, konteks, atau catatan penting…"
            rows={3}
          />
          <Input
            label="Deadline ke Sales (YYYY-MM-DD)"
            type="date"
            value={deadlineToSales}
            onChange={(e) => setDeadlineToSales(e.target.value)}
          />
          {(() => {
            const activeDocType = docType ?? existing?.docType
            const isVendorForm = activeDocType === 'vendor'
            return (
              <div className={isVendorForm ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3'}>
                {!isVendorForm && (
                  <Input
                    label="PIC Engineer"
                    value={engineerPIC}
                    onChange={(e) => setEngineerPIC(e.target.value)}
                    placeholder="Nama engineer"
                  />
                )}
                <Input
                  label={isVendorForm ? 'PIC Vendor' : 'PIC Customer'}
                  value={customerPIC}
                  onChange={(e) => setCustomerPIC(e.target.value)}
                  placeholder={isVendorForm ? 'Nama vendor PIC' : 'Nama customer PIC'}
                />
                <Input
                  label="PIC Doccon"
                  value={docconPIC}
                  onChange={(e) => setDocconPIC(e.target.value)}
                  placeholder="Nama doccon PIC"
                />
              </div>
            )
          })()}
          {mode === 'create' && (
            <div className="rounded-lg border border-border-subtle bg-black/[0.02] px-4 py-3 text-xs text-ink-secondary">
              Dokumen akan dibuat dengan status <strong>Draft (R0)</strong>. Setelah disimpan, buka detail untuk upload attachment dan submit approval.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
