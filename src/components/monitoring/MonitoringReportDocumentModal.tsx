import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Clock, RotateCcw, Send, RefreshCw, Paperclip, X, Upload } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useAuthStore } from '../../store/useAuthStore'
import { usePermissions } from '../../hooks/usePermissions'
import { classNames, formatDateTime, formatDateShort } from '../../utils/helpers'
import type { ReportDocumentType, ReportDocumentActionType } from '../../types/monitoring'

const STATUS_CLS: Record<string, string> = {
  DRAFT:             'bg-slate-100 text-slate-700',
  SUBMITTED:         'bg-blue-100 text-blue-700',
  UNDER_REVIEW:      'bg-amber-100 text-amber-700',
  REVISION_REQUIRED: 'bg-red-100 text-red-700',
  APPROVED:          'bg-emerald-100 text-emerald-700',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  REVISION_REQUIRED: 'Revisi Diminta', APPROVED: 'Disetujui',
}
const REVISION_CLS: Record<string, string> = {
  R0: 'bg-slate-100 text-slate-600', R1: 'bg-blue-100 text-blue-700',
  R2: 'bg-violet-100 text-violet-700', R3: 'bg-amber-100 text-amber-700', R4: 'bg-red-100 text-red-700',
}

const ACTION_META: Record<ReportDocumentActionType, { label: string; icon: React.ReactNode; color: string }> = {
  CREATE:           { label: 'Dibuat',        icon: <Clock size={13} />,        color: 'bg-slate-500' },
  SUBMIT:           { label: 'Disubmit',      icon: <Send size={13} />,         color: 'bg-blue-500' },
  START_REVIEW:     { label: 'Mulai Review',  icon: <Clock size={13} />,        color: 'bg-amber-500' },
  APPROVE:          { label: 'Disetujui',     icon: <CheckCircle2 size={13} />, color: 'bg-emerald-500' },
  REQUEST_REVISION: { label: 'Revisi Diminta', icon: <RotateCcw size={13} />,  color: 'bg-pertamina-red' },
  RESUBMIT:         { label: 'Resubmit',      icon: <RefreshCw size={13} />,   color: 'bg-violet-500' },
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
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const { hasPermission } = usePermissions()

  const currentUser = users.find((u) => u.id === session?.userId)
  const canApprove = hasPermission('canApproveHandoff')
  const canEdit = hasPermission('canEditTask')

  const existing = documentId ? store.getDocumentById(documentId) : undefined
  const project = existing ? store.getProjectById(existing.projectId) : (projectId ? store.getProjectById(projectId) : undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [judul, setJudul] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [actionComment, setActionComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setJudul(existing.judul)
      setDeskripsi(existing.deskripsi)
    } else {
      setJudul(''); setDeskripsi('')
    }
    setErrors({})
    setActionComment('')
  }, [open, mode, documentId])

  function handleSave() {
    const e: Record<string, string> = {}
    if (!judul.trim()) e.judul = 'Judul dokumen wajib diisi'
    setErrors(e)
    if (Object.keys(e).length) return
    if (mode === 'create' && projectId && docType) {
      store.addDocument({
        projectId, docType, judul: judul.trim(), deskripsi: deskripsi.trim(),
        attachments: [],
        createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '',
      })
    } else if (mode === 'edit' && documentId) {
      store.updateDocument(documentId, { judul: judul.trim(), deskripsi: deskripsi.trim() })
    }
    onClose()
  }

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
  const descStr = project ? `${project.kodeProject} — ${existing?.docType === 'vendor' ? 'Report Vendor' : 'Report Customer'}` : undefined

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
              <span className={classNames('chip', STATUS_CLS[existing.status])}>{STATUS_LABEL[existing.status]}</span>
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
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Dibuat</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.createdByName} · {formatDateShort(existing.createdAt)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Diperbarui</div>
                <div className="text-sm text-ink-secondary mt-0.5">{formatDateShort(existing.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Attachment ({existing.attachments.length})</div>
              {existing.status !== 'APPROVED' && (
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

          {/* Workflow */}
          {(
            (status === 'DRAFT' && canEdit) ||
            (status === 'SUBMITTED' && canApprove) ||
            (status === 'UNDER_REVIEW' && canApprove) ||
            (status === 'REVISION_REQUIRED' && canEdit)
          ) && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Workflow</div>
              <Textarea
                label="Komentar (wajib untuk Revisi)"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={2}
                placeholder="Catatan…"
              />
              <div className="flex flex-wrap gap-2">
                {status === 'DRAFT' && (
                  <Button size="sm" onClick={() => handleWorkflow('submit')} leftIcon={<Send size={13} />}>Submit</Button>
                )}
                {status === 'SUBMITTED' && canApprove && (
                  <Button size="sm" onClick={() => handleWorkflow('startReview')} leftIcon={<Clock size={13} />}>Mulai Review</Button>
                )}
                {status === 'UNDER_REVIEW' && canApprove && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflow('approve')} leftIcon={<CheckCircle2 size={13} />}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => handleWorkflow('revision')} leftIcon={<RotateCcw size={13} />}>Minta Revisi</Button>
                  </>
                )}
                {status === 'REVISION_REQUIRED' && (
                  <Button size="sm" onClick={() => handleWorkflow('resubmit')} leftIcon={<RefreshCw size={13} />}>Resubmit</Button>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-border-subtle pt-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-4">Timeline Aktivitas</div>
            <div className="space-y-0">
              {existing.activities.map((activity, idx) => {
                const meta = ACTION_META[activity.action]
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
