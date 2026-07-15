import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, X, CheckCircle2, Clock, RotateCcw, Send, RefreshCw, ArrowRight, Link2, History } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { classNames, formatDateTime, formatDateShort } from '../../utils/helpers'
import { reportMonthLabel } from '../../types/monitoring'
import type { BillingDocumentStatus, BillingDocPhase, BillingDocumentActionType } from '../../types/monitoring'

const STATUS_META: Record<BillingDocumentStatus, { label: string; cls: string }> = {
  DRAFT:                { label: 'Draft',                cls: 'bg-slate-100 text-slate-700' },
  PENDING_KADEP_PARAF:  { label: 'Menunggu Paraf Kadep', cls: 'bg-cyan-100 text-cyan-700' },
  REVISION_REQUIRED:    { label: 'Revisi Diminta',       cls: 'bg-red-100 text-red-700' },
  PENDING_KADIV:        { label: 'Menunggu Kadiv',       cls: 'bg-blue-100 text-blue-700' },
  COMPLETED:            { label: 'Selesai',              cls: 'bg-emerald-100 text-emerald-700' },
}

const PHASE_STEPS: { key: BillingDocPhase; label: string }[] = [
  { key: 'doccon', label: 'Doccon' },
  { key: 'kadep', label: 'Paraf Kadep' },
  { key: 'kadiv', label: 'Kadiv' },
  { key: 'completed', label: 'Selesai' },
]

const ACTION_META: Record<BillingDocumentActionType, { label: string; icon: React.ReactNode; color: string }> = {
  CREATE:              { label: 'Dibuat',                icon: <Clock size={13} />,        color: 'bg-slate-500' },
  DOCCON_SUBMIT_KADEP: { label: 'Dikirim ke Kadep',       icon: <Send size={13} />,         color: 'bg-cyan-600' },
  KADEP_PARAF:         { label: 'Diparaf Kadep',          icon: <CheckCircle2 size={13} />, color: 'bg-cyan-700' },
  KADEP_REJECT:        { label: 'Revisi oleh Kadep',      icon: <RotateCcw size={13} />,    color: 'bg-pertamina-red' },
  DOCCON_RESUBMIT:     { label: 'Dikirim Ulang ke Kadep', icon: <RefreshCw size={13} />,    color: 'bg-violet-500' },
  KADIV_APPROVE:       { label: 'Disetujui Kadiv',        icon: <CheckCircle2 size={13} />, color: 'bg-emerald-600' },
  KADIV_REJECT:        { label: 'Dikembalikan Kadiv',     icon: <RotateCcw size={13} />,    color: 'bg-pertamina-red' },
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
  projectId?: string
  billingId?: string
}

export function MonitoringBillingModal({ open, onClose, mode, projectId, billingId }: Props) {
  const store = useMonitoringReportStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)
  const { isDoccon, isKadepParaf, isKadiv } = useMonitoringRole()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existing = billingId ? store.getBillingDocumentById(billingId) : undefined
  const projId = existing?.projectId ?? projectId

  const [docType, setDocType] = useState('')
  const [pic, setPic] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [actionComment, setActionComment] = useState('')
  const [showKadepRevisionPanel, setShowKadepRevisionPanel] = useState(false)
  const [pickerReportDocId, setPickerReportDocId] = useState('')

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setDocType(existing.docType)
      setPic(existing.pic)
      setTargetDate(existing.targetDate ?? '')
      setActualDate(existing.actualDate ?? '')
      setKeterangan(existing.keterangan)
    } else {
      setDocType(''); setPic(''); setTargetDate(''); setActualDate(''); setKeterangan('')
    }
    setErrors({})
    setActionComment('')
    setShowKadepRevisionPanel(false)
    setPickerReportDocId('')
  }, [open, mode, billingId])

  function handleSave() {
    const e: Record<string, string> = {}
    if (!docType.trim()) e.docType = 'Jenis dokumen wajib diisi'
    if (!pic.trim()) e.pic = 'PIC wajib diisi'
    setErrors(e)
    if (Object.keys(e).length) return

    if (mode === 'create' && projectId) {
      store.addBillingDocument({
        projectId, docType, pic: pic.trim(),
        targetDate: targetDate || null, actualDate: actualDate || null,
        keterangan: keterangan.trim(),
        createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '',
      })
    } else if (mode === 'edit' && billingId) {
      store.updateBillingDocument(billingId, {
        docType, pic: pic.trim(),
        targetDate: targetDate || null, actualDate: actualDate || null,
        keterangan: keterangan.trim(),
      })
    }
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!billingId || !currentUser) return
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      store.addBillingAttachment(billingId, { name: file.name, size: file.size, mimeType: file.type, uploadedByName: currentUser.name })
    })
    e.target.value = ''
  }

  function handleWorkflow(action: 'submitKadep' | 'kadepParaf' | 'kadepReject' | 'docconResubmit' | 'kadivApprove' | 'kadivReject') {
    if (!billingId || !currentUser) return
    const uid = currentUser.id
    const name = currentUser.name
    if (action === 'submitKadep') store.billingDocconSubmitToKadep(billingId, uid, name)
    else if (action === 'kadepParaf') store.billingKadepParaf(billingId, uid, name)
    else if (action === 'kadepReject') {
      if (!actionComment.trim()) { alert('Komentar wajib diisi untuk revisi'); return }
      store.billingKadepReject(billingId, uid, name, actionComment)
    }
    else if (action === 'docconResubmit') store.billingDocconResubmit(billingId, uid, name)
    else if (action === 'kadivApprove') store.billingKadivApprove(billingId, uid, name, actionComment)
    else if (action === 'kadivReject') {
      if (!actionComment.trim()) { alert('Komentar wajib diisi untuk revisi'); return }
      store.billingKadivReject(billingId, uid, name, actionComment)
    }
    setActionComment('')
    setShowKadepRevisionPanel(false)
    onClose()
  }

  const attachments = existing?.attachments ?? []
  const linkedAttachments = existing?.linkedAttachments ?? []

  // Report Customer documents milik project yang sama — sumber checklist lampiran
  const sourceReportDocs = projId
    ? store.documents.filter((d) => d.projectId === projId && d.docType === 'customer').sort((a, b) => b.period.localeCompare(a.period))
    : []
  const pickerDoc = sourceReportDocs.find((d) => d.id === pickerReportDocId)

  function isLinked(reportDocumentId: string, attachmentId: string) {
    return linkedAttachments.some((l) => l.reportDocumentId === reportDocumentId && l.attachmentId === attachmentId)
  }

  function toggleLink(reportDocumentId: string, attachmentId: string) {
    if (!billingId || !currentUser) return
    if (isLinked(reportDocumentId, attachmentId)) store.billingUnlinkAttachment(billingId, reportDocumentId, attachmentId)
    else store.billingLinkAttachment(billingId, reportDocumentId, attachmentId, currentUser.name)
  }

  const titleStr = mode === 'create' ? 'Tambah Dokumen Tracker' : mode === 'edit' ? 'Edit Dokumen Tracker' : 'Detail Dokumen Tracker'
  const descStr = existing ? `${existing.docType} — ${existing.pic}` : undefined

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
              <span className={classNames('chip', STATUS_META[existing.status].cls)}>{STATUS_META[existing.status].label}</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Jenis Dokumen</div>
              <span className="chip bg-violet-100 text-violet-700">{existing.docType}</span>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="rounded-xl border border-border-subtle bg-black/[0.02] px-4 py-3 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Phase Pipeline</div>
            <div className="flex flex-wrap items-center gap-2">
              {PHASE_STEPS.map((step, idx) => {
                const currentIdx = PHASE_STEPS.findIndex((s) => s.key === existing.currentPhase)
                const done = currentIdx >= 0 && idx < currentIdx
                const active = step.key === existing.currentPhase
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={classNames(
                      'rounded-md px-2.5 py-1 text-[11px] font-medium flex items-center gap-1',
                      done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-pertamina-red/10 text-pertamina-red' : 'bg-black/[0.04] text-ink-muted',
                    )}>
                      {done && <CheckCircle2 size={10} />}
                      {step.label}
                    </div>
                    {idx < PHASE_STEPS.length - 1 && <ArrowRight size={12} className="text-ink-muted" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">PIC</div>
              <div className="text-sm text-ink-primary mt-0.5 font-medium">{existing.pic}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Target Date</div>
              <div className="text-sm text-ink-secondary mt-0.5">{existing.targetDate ? formatDateShort(existing.targetDate) : '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Actual Date</div>
              <div className="text-sm text-ink-secondary mt-0.5">{existing.actualDate ? formatDateShort(existing.actualDate) : '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Dibuat</div>
              <div className="text-sm text-ink-secondary mt-0.5">{existing.createdByName} · {formatDateShort(existing.createdAt)}</div>
            </div>
          </div>
          {existing.keterangan && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Keterangan</div>
              <div className="text-sm text-ink-secondary mt-0.5">{existing.keterangan}</div>
            </div>
          )}

          {/* Revision history */}
          {existing.revisionHistory.length > 0 && (
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-3">
                <History size={12} /> Riwayat Revisi
              </div>
              <div className="space-y-2">
                {[...existing.revisionHistory].reverse().map((h, i) => (
                  <div key={i} className="rounded-lg border border-border-subtle bg-black/[0.02] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-secondary">
                        Revisi diminta oleh <span className="font-medium text-ink-primary">{h.changedByName}</span>
                      </span>
                      <span className="text-[10px] text-ink-muted shrink-0">{formatDateShort(h.changedAt)}</span>
                    </div>
                    {h.note && <p className="text-[10px] text-ink-secondary mt-0.5 italic">"{h.note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist lampiran dari Report Customer */}
          <div className="border-t border-border-subtle pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">
              <Link2 size={12} /> Checklist Lampiran dari Report Customer
            </div>
            {sourceReportDocs.length === 0 ? (
              <p className="text-xs text-ink-tertiary">Belum ada Report Customer di project ini.</p>
            ) : (
              <>
                <select
                  value={pickerReportDocId}
                  onChange={(e) => setPickerReportDocId(e.target.value)}
                  className="input-base appearance-none cursor-pointer pr-8 text-xs"
                >
                  <option value="">Pilih Report Customer…</option>
                  {sourceReportDocs.map((d) => (
                    <option key={d.id} value={d.id}>{reportMonthLabel(d.period)} — {d.judul}</option>
                  ))}
                </select>
                {pickerDoc && (
                  pickerDoc.attachments.length === 0 ? (
                    <p className="text-xs text-ink-tertiary">Dokumen ini belum ada attachment.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {pickerDoc.attachments.map((att) => (
                        <label key={att.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2 cursor-pointer hover:bg-black/[0.02]">
                          <input
                            type="checkbox"
                            checked={isLinked(pickerDoc.id, att.id)}
                            onChange={() => toggleLink(pickerDoc.id, att.id)}
                            disabled={isKadepParaf || isKadiv}
                            className="accent-pertamina-red disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <Paperclip size={13} className="text-ink-tertiary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-ink-primary truncate">{att.name}</div>
                            <div className="text-[10px] text-ink-tertiary">{fmtSize(att.size)} · {att.uploadedByName}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                )}
              </>
            )}

            {/* Lampiran terhubung (across all source docs) */}
            {linkedAttachments.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5">Lampiran Terhubung ({linkedAttachments.length})</div>
                <div className="space-y-1.5">
                  {linkedAttachments.map((link, i) => {
                    const srcDoc = store.getDocumentById(link.reportDocumentId)
                    const srcAtt = srcDoc?.attachments.find((a) => a.id === link.attachmentId)
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
                        <Link2 size={13} className={srcAtt ? 'text-emerald-500 shrink-0' : 'text-red-500 shrink-0'} />
                        <div className="flex-1 min-w-0">
                          {srcAtt ? (
                            <>
                              <div className="text-xs font-medium text-ink-primary truncate">{srcAtt.name}</div>
                              <div className="text-[10px] text-ink-tertiary truncate">dari {srcDoc ? reportMonthLabel(srcDoc.period) : ''} — {srcDoc?.judul}</div>
                            </>
                          ) : (
                            <div className="text-xs font-medium text-red-600">Attachment sumber sudah tidak ada</div>
                          )}
                        </div>
                        {!isKadepParaf && !isKadiv && (
                          <button
                            onClick={() => billingId && store.billingUnlinkAttachment(billingId, link.reportDocumentId, link.attachmentId)}
                            className="shrink-0 rounded p-0.5 text-ink-muted hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Manual attachments */}
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Attachment Manual ({attachments.length})</div>
              {!isKadepParaf && !isKadiv && (
                <>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={12} />}>Upload</Button>
                </>
              )}
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-ink-tertiary">Belum ada attachment manual.</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
                    <Paperclip size={13} className="text-ink-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink-primary truncate">{att.name}</div>
                      <div className="text-[10px] text-ink-tertiary">{fmtSize(att.size)} · {att.uploadedByName} · {formatDateShort(att.uploadedAt)}</div>
                    </div>
                    {!isKadepParaf && !isKadiv && (
                      <button
                        onClick={() => store.removeBillingAttachment(existing.id, att.id)}
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

          {/* Workflow actions */}
          {existing.currentPhase === 'doccon' && isDoccon && existing.status === 'DRAFT' && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Doccon</div>
              <Button size="sm" onClick={() => handleWorkflow('submitKadep')} leftIcon={<Send size={13} />}>Kirim ke Kadep</Button>
            </div>
          )}
          {existing.currentPhase === 'doccon' && isDoccon && existing.status === 'REVISION_REQUIRED' && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Dokumen Dikembalikan</div>
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
                {existing.revisionHistory[existing.revisionHistory.length - 1]?.changedByName ?? 'Kadep/Kadiv'} meminta revisi
                {existing.revisionHistory[existing.revisionHistory.length - 1]?.note ? `: "${existing.revisionHistory[existing.revisionHistory.length - 1].note}"` : '.'} Perbaiki checklist lampiran lalu kirim ulang.
              </div>
              <Button size="sm" onClick={() => handleWorkflow('docconResubmit')} leftIcon={<RefreshCw size={13} />}>Kirim Ulang ke Kadep</Button>
            </div>
          )}
          {existing.currentPhase === 'kadep' && isKadepParaf && existing.status === 'PENDING_KADEP_PARAF' && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Paraf Kadep</div>
              <div className="rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-[11px] text-cyan-800">
                Paraf untuk meneruskan ke Kadiv, atau kembalikan jika checklist lampiran masih perlu perbaikan.
              </div>
              {!showKadepRevisionPanel ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleWorkflow('kadepParaf')} leftIcon={<CheckCircle2 size={13} />}>
                    Paraf &amp; Kirim ke Kadiv
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowKadepRevisionPanel(true)} leftIcon={<RotateCcw size={13} />}>
                    Revisi ke Doccon
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    label="Catatan revisi (wajib)"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    rows={2}
                    placeholder="Jelaskan bagian mana yang perlu diperbaiki Doccon…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setShowKadepRevisionPanel(false); setActionComment('') }}>Batal</Button>
                    <Button size="sm" variant="danger" onClick={() => handleWorkflow('kadepReject')} leftIcon={<RotateCcw size={13} />}>
                      Kembalikan ke Doccon
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {existing.currentPhase === 'kadiv' && isKadiv && existing.status === 'PENDING_KADIV' && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Keputusan Kadiv</div>
              <Textarea label="Komentar (wajib untuk penolakan)" value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} placeholder="Catatan keputusan…" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleWorkflow('kadivApprove')} leftIcon={<CheckCircle2 size={13} />}>Approve &amp; Tanda Tangan</Button>
                <Button size="sm" variant="danger" onClick={() => handleWorkflow('kadivReject')} leftIcon={<RotateCcw size={13} />}>Minta Revisi</Button>
              </div>
            </div>
          )}
          {existing.currentPhase === 'completed' && (
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-700">Dokumen tracker selesai</div>
                  {existing.actualDate && <div className="text-[10px] text-emerald-600 mt-0.5">{formatDateShort(existing.actualDate)}</div>}
                </div>
              </div>
            </div>
          )}

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
              label="Jenis Dokumen *"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Contoh: BAP, BAPP, BAST, Invoice…"
            />
            {errors.docType && <p className="text-[11px] text-danger mt-1">{errors.docType}</p>}
          </div>

          <div>
            <Input
              label="PIC *"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              placeholder="Nama PIC dokumen"
            />
            {errors.pic && <p className="text-[11px] text-danger mt-1">{errors.pic}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <Input
              label="Actual Date"
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={2}
            placeholder="Catatan atau keterangan dokumen…"
          />

          {mode === 'create' && (
            <div className="rounded-lg border border-border-subtle bg-black/[0.02] px-4 py-3 text-xs text-ink-secondary">
              Dokumen akan dibuat dengan status <strong>Draft</strong>. Buka detail untuk menyusun checklist lampiran dan mengirim ke Kadep.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
