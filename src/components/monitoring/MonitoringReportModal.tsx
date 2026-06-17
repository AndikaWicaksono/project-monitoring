import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, RotateCcw, Send, ArrowRight, RefreshCw } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useAuthStore } from '../../store/useAuthStore'
import { usePermissions } from '../../hooks/usePermissions'
import { classNames, formatDateTime } from '../../utils/helpers'
import type { MonitoringProjectReport, MonitoringReportActionType } from '../../types/monitoring'

// ─── Sub-types ───────────────────────────────────────────────
type ModalMode = 'create' | 'edit' | 'detail'

interface Props {
  open: boolean
  onClose: () => void
  mode: ModalMode
  reportId?: string
}

// ─── Status badge ─────────────────────────────────────────────
const STATUS_CLS: Record<string, string> = {
  CREATE:         'bg-slate-100 text-slate-700',
  UNDER_APPROVAL: 'bg-amber-100 text-amber-700',
  UNDER_REVISION: 'bg-red-100 text-red-700',
  APPROVED:       'bg-emerald-100 text-emerald-700',
}
const STATUS_LABEL: Record<string, string> = {
  CREATE: 'Draft', UNDER_APPROVAL: 'Menunggu Approval', UNDER_REVISION: 'Revisi', APPROVED: 'Disetujui',
}

// ─── Activity timeline ────────────────────────────────────────
const ACTION_META: Record<MonitoringReportActionType, { label: string; icon: React.ReactNode; color: string }> = {
  CREATE:           { label: 'Dibuat',          icon: <Clock size={13} />,        color: 'bg-slate-500' },
  SUBMIT:           { label: 'Disubmit',        icon: <Send size={13} />,         color: 'bg-blue-500' },
  APPROVE:          { label: 'Disetujui',        icon: <CheckCircle2 size={13} />, color: 'bg-emerald-500' },
  REQUEST_REVISION: { label: 'Revisi Diminta',   icon: <RotateCcw size={13} />,    color: 'bg-pertamina-red' },
  RESUBMIT:         { label: 'Resubmit',         icon: <RefreshCw size={13} />,    color: 'bg-violet-500' },
}

// ─── Empty form ────────────────────────────────────────────────
const EMPTY: Omit<MonitoringProjectReport, 'id' | 'revisionCount' | 'status' | 'activities' | 'createdAt' | 'updatedAt'> = {
  kodeProject: '', client: '', namaKontrak: '', keterangan: '', department: '', targetLaporan: '',
  picDocon: '', picLaporan: '', salesCustomer: '', emailTujuan: '',
  submitDate: null, feedbackDate: null, comment: '', submit: '', feedback: '',
  submitToSales: '', linkSharepoint: '', createdByUserId: '', createdByName: '',
}

export function MonitoringReportModal({ open, onClose, mode, reportId }: Props) {
  const store = useMonitoringReportStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const { hasPermission } = usePermissions()

  const currentUser = users.find((u) => u.id === session?.userId)
  const canApprove = hasPermission('canApproveHandoff')
  const canEdit = hasPermission('canEditTask')

  const existing = reportId ? store.getById(reportId) : undefined

  const [form, setForm] = useState({ ...EMPTY })
  const [actionComment, setActionComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setForm({
        kodeProject: existing.kodeProject,
        client: existing.client,
        namaKontrak: existing.namaKontrak,
        keterangan: existing.keterangan,
        department: existing.department,
        targetLaporan: existing.targetLaporan,
        picDocon: existing.picDocon,
        picLaporan: existing.picLaporan,
        salesCustomer: existing.salesCustomer,
        emailTujuan: existing.emailTujuan,
        submitDate: existing.submitDate,
        feedbackDate: existing.feedbackDate,
        comment: existing.comment,
        submit: existing.submit,
        feedback: existing.feedback,
        submitToSales: existing.submitToSales,
        linkSharepoint: existing.linkSharepoint,
        createdByUserId: existing.createdByUserId,
        createdByName: existing.createdByName,
      })
    } else if (mode === 'create') {
      setForm({ ...EMPTY, createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '' })
    }
    setErrors({})
    setActionComment('')
  }, [open, mode, reportId])

  function setField<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.kodeProject.trim()) e.kodeProject = 'Kode Project wajib diisi'
    if (!form.client.trim()) e.client = 'Client wajib diisi'
    if (!form.namaKontrak.trim()) e.namaKontrak = 'Nama Kontrak wajib diisi'
    if (!form.department.trim()) e.department = 'Department wajib diisi'
    if (!form.picLaporan.trim()) e.picLaporan = 'PIC Laporan wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    if (mode === 'create') {
      store.addReport({ ...form, createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '' })
    } else if (mode === 'edit' && reportId) {
      store.updateReport(reportId, form)
    }
    onClose()
  }

  function handleWorkflowAction(action: 'submit' | 'approve' | 'revision' | 'resubmit') {
    if (!reportId || !currentUser) return
    const uid = currentUser.id
    const name = currentUser.name
    if (action === 'submit') store.submitReport(reportId, uid, name, actionComment)
    else if (action === 'approve') store.approveReport(reportId, uid, name, actionComment)
    else if (action === 'revision') {
      if (!actionComment.trim()) { alert('Komentar revisi wajib diisi'); return }
      store.requestRevision(reportId, uid, name, actionComment)
    }
    else if (action === 'resubmit') store.resubmitReport(reportId, uid, name, actionComment)
    setActionComment('')
    onClose()
  }

  const isReadonly = mode === 'detail'
  const status = existing?.status

  const title = mode === 'create' ? 'Tambah Laporan' : mode === 'edit' ? 'Edit Laporan' : 'Detail Laporan'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={mode === 'detail' ? '2xl' : 'xl'}
      footer={
        mode !== 'detail' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
          </>
        ) : undefined
      }
    >
      {/* ── DETAIL VIEW ── */}
      {mode === 'detail' && existing ? (
        <div className="space-y-6">
          {/* Header status */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-black/[0.02] border border-border-subtle">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">Status</div>
              <span className={classNames('chip text-xs', STATUS_CLS[existing.status])}>{STATUS_LABEL[existing.status]}</span>
            </div>
            {existing.revisionCount > 0 && (
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">Revisi ke-</div>
                <span className="text-2xl font-semibold text-pertamina-red">{existing.revisionCount}</span>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { label: 'Kode Project', value: existing.kodeProject },
              { label: 'Client', value: existing.client },
              { label: 'Nama Kontrak', value: existing.namaKontrak },
              { label: 'Department', value: existing.department },
              { label: 'Target Laporan', value: existing.targetLaporan },
              { label: 'PIC Docon', value: existing.picDocon },
              { label: 'PIC Laporan', value: existing.picLaporan },
              { label: 'Sales Customer', value: existing.salesCustomer },
              { label: 'Email Tujuan', value: existing.emailTujuan },
              { label: 'Submit To Sales', value: existing.submitToSales },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{label}</div>
                <div className="text-sm text-ink-primary mt-0.5 font-medium">{value || '—'}</div>
              </div>
            ))}
            {existing.linkSharepoint && (
              <div className="col-span-2">
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Link Sharepoint</div>
                <a href={existing.linkSharepoint} target="_blank" rel="noopener noreferrer" className="text-sm text-pertamina-red underline mt-0.5 break-all">{existing.linkSharepoint}</a>
              </div>
            )}
            {existing.keterangan && (
              <div className="col-span-2">
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Keterangan</div>
                <div className="text-sm text-ink-primary mt-0.5">{existing.keterangan}</div>
              </div>
            )}
          </div>

          {/* Workflow actions */}
          {(
            (status === 'CREATE' && canEdit) ||
            (status === 'UNDER_APPROVAL' && canApprove) ||
            (status === 'UNDER_REVISION' && canEdit)
          ) && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold">Aksi Workflow</div>
              <Textarea
                label="Komentar (opsional, kecuali untuk Revisi)"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={2}
                placeholder="Tambahkan catatan..."
              />
              <div className="flex flex-wrap gap-2">
                {status === 'CREATE' && (
                  <Button size="sm" onClick={() => handleWorkflowAction('submit')} leftIcon={<Send size={13} />}>
                    Submit untuk Approval
                  </Button>
                )}
                {status === 'UNDER_APPROVAL' && canApprove && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflowAction('approve')} leftIcon={<CheckCircle2 size={13} />}>
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleWorkflowAction('revision')} leftIcon={<RotateCcw size={13} />}>
                      Minta Revisi
                    </Button>
                  </>
                )}
                {status === 'UNDER_REVISION' && (
                  <Button size="sm" onClick={() => handleWorkflowAction('resubmit')} leftIcon={<RefreshCw size={13} />}>
                    Resubmit
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-border-subtle pt-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-4">Timeline Aktivitas</div>
            <div className="space-y-0">
              {existing.activities.map((act, index) => {
                const meta = ACTION_META[act.action]
                const isLast = index === existing.activities.length - 1
                return (
                  <div key={act.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={classNames('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', meta.color)}>
                        {meta.icon}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border-subtle mt-1 mb-1 min-h-[20px]" />}
                    </div>
                    <div className={classNames('pb-4 pt-0.5 min-w-0 flex-1', isLast ? 'pb-0' : '')}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink-primary">{meta.label}</span>
                        <span className="text-[10px] text-ink-muted">·</span>
                        <span className="text-[10px] text-ink-tertiary">{act.byName}</span>
                        <span className="text-[10px] text-ink-muted ml-auto">{formatDateTime(act.timestamp)}</span>
                      </div>
                      {act.comment && (
                        <div className="mt-1.5 text-xs text-ink-secondary rounded-lg bg-black/[0.03] border border-border-subtle px-3 py-2">
                          {act.comment}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── CREATE / EDIT FORM ── */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Kode Project *" value={form.kodeProject} onChange={(e) => setField('kodeProject', e.target.value)} placeholder="PGN-XXX-001" readOnly={isReadonly} />
              {errors.kodeProject && <p className="text-[11px] text-pertamina-red mt-1">{errors.kodeProject}</p>}
            </div>
            <div>
              <Input label="Client *" value={form.client} onChange={(e) => setField('client', e.target.value)} placeholder="Nama client" readOnly={isReadonly} />
              {errors.client && <p className="text-[11px] text-pertamina-red mt-1">{errors.client}</p>}
            </div>
          </div>

          <div>
            <Input label="Nama Kontrak *" value={form.namaKontrak} onChange={(e) => setField('namaKontrak', e.target.value)} placeholder="Nama kontrak" readOnly={isReadonly} />
            {errors.namaKontrak && <p className="text-[11px] text-pertamina-red mt-1">{errors.namaKontrak}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Department *" value={form.department} onChange={(e) => setField('department', e.target.value)} placeholder="Nama departemen" readOnly={isReadonly} />
              {errors.department && <p className="text-[11px] text-pertamina-red mt-1">{errors.department}</p>}
            </div>
            <Input label="Target Laporan" value={form.targetLaporan} onChange={(e) => setField('targetLaporan', e.target.value)} placeholder="e.g. Laporan Bulanan" readOnly={isReadonly} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="PIC Docon" value={form.picDocon} onChange={(e) => setField('picDocon', e.target.value)} placeholder="Nama PIC Docon" readOnly={isReadonly} />
            <div>
              <Input label="PIC Laporan *" value={form.picLaporan} onChange={(e) => setField('picLaporan', e.target.value)} placeholder="Nama PIC Laporan" readOnly={isReadonly} />
              {errors.picLaporan && <p className="text-[11px] text-pertamina-red mt-1">{errors.picLaporan}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Sales Customer" value={form.salesCustomer} onChange={(e) => setField('salesCustomer', e.target.value)} placeholder="Nama sales" readOnly={isReadonly} />
            <Input label="Email Tujuan" type="email" value={form.emailTujuan} onChange={(e) => setField('emailTujuan', e.target.value)} placeholder="email@domain.com" readOnly={isReadonly} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Submit" value={form.submit} onChange={(e) => setField('submit', e.target.value)} placeholder="Versi/tanggal submit" readOnly={isReadonly} />
            <Input label="Submit to Sales" value={form.submitToSales} onChange={(e) => setField('submitToSales', e.target.value)} placeholder="Keterangan submit" readOnly={isReadonly} />
          </div>

          <Input label="Link Sharepoint" value={form.linkSharepoint} onChange={(e) => setField('linkSharepoint', e.target.value)} placeholder="https://..." readOnly={isReadonly} />

          <Textarea label="Keterangan" value={form.keterangan} onChange={(e) => setField('keterangan', e.target.value)} placeholder="Catatan tambahan..." readOnly={isReadonly} rows={3} />
        </div>
      )}
    </Modal>
  )
}
