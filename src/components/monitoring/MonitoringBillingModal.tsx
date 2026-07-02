import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useAuthStore } from '../../store/useAuthStore'
import { classNames, formatDateShort } from '../../utils/helpers'
import type { BillingDocumentStatus } from '../../types/monitoring'

const STATUS_META: Record<BillingDocumentStatus, { label: string; cls: string }> = {
  BELUM_DIBUAT: { label: 'Belum Dibuat', cls: 'bg-slate-100 text-slate-600' },
  DRAFT:        { label: 'Draft',        cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:    { label: 'Submitted',    cls: 'bg-amber-100 text-amber-700' },
  APPROVED:     { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:     { label: 'Rejected',     cls: 'bg-red-100 text-red-700' },
  COMPLETED:    { label: 'Completed',    cls: 'bg-pertamina-red-50 text-pertamina-red font-semibold' },
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
  billingId?: string
}

export function MonitoringBillingModal({ open, onClose, mode, projectId, billingId }: Props) {
  const store = useMonitoringReportStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existing = billingId ? store.getBillingDocumentById(billingId) : undefined

  const [docType, setDocType] = useState('')
  const [pic, setPic] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [status, setStatus] = useState<BillingDocumentStatus>('BELUM_DIBUAT')
  const [keterangan, setKeterangan] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setDocType(existing.docType)
      setPic(existing.pic)
      setTargetDate(existing.targetDate ?? '')
      setActualDate(existing.actualDate ?? '')
      setStatus(existing.status)
      setKeterangan(existing.keterangan)
    } else {
      setDocType(''); setPic(''); setTargetDate(''); setActualDate('')
      setStatus('BELUM_DIBUAT'); setKeterangan('')
    }
    setErrors({})
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
        status, keterangan: keterangan.trim(), attachments: [],
        createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '',
      })
    } else if (mode === 'edit' && billingId) {
      store.updateBillingDocument(billingId, {
        docType, pic: pic.trim(),
        targetDate: targetDate || null, actualDate: actualDate || null,
        status, keterangan: keterangan.trim(),
      })
    }
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const id = billingId ?? (mode === 'create' ? null : null)
    if (!id || !currentUser) return
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      store.addBillingAttachment(id, { name: file.name, size: file.size, mimeType: file.type, uploadedByName: currentUser.name })
    })
    e.target.value = ''
  }

  const attachments = existing?.attachments ?? []

  return (
    <Modal
      open={open} onClose={onClose}
      title={mode === 'create' ? 'Tambah Billing Document' : 'Edit Billing Document'}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Jenis Dokumen *"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Contoh: BAP, Invoice, SPK…"
            />
            {errors.docType && <p className="text-[11px] text-danger mt-1">{errors.docType}</p>}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Status *</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as BillingDocumentStatus)} className="input-base appearance-none cursor-pointer pr-8">
              {(Object.entries(STATUS_META) as [BillingDocumentStatus, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
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

        {/* Status badge preview */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-tertiary">Preview status:</span>
          <span className={classNames('chip', STATUS_META[status].cls)}>{STATUS_META[status].label}</span>
        </div>

        {/* Attachments — only in edit mode */}
        {mode === 'edit' && existing && (
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Attachment ({attachments.length})</div>
              <>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={12} />}>Upload</Button>
              </>
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-ink-tertiary">Belum ada attachment.</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
                    <Paperclip size={13} className="text-ink-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink-primary truncate">{att.name}</div>
                      <div className="text-[10px] text-ink-tertiary">{fmtSize(att.size)} · {att.uploadedByName} · {formatDateShort(att.uploadedAt)}</div>
                    </div>
                    <button
                      onClick={() => store.removeBillingAttachment(existing.id, att.id)}
                      className="shrink-0 rounded p-0.5 text-ink-muted hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
