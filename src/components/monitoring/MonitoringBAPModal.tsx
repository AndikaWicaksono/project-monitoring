import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringBAPStore } from '../../store/useMonitoringBAPStore'
import { useAuthStore } from '../../store/useAuthStore'
import { classNames } from '../../utils/helpers'
import {
  bapChecklistProgress,
  type MonitoringBAPDocumentType,
  type MonitoringBAPStatus,
  type MonitoringBAPChecklist,
} from '../../types/monitoring'

type ModalMode = 'create' | 'edit' | 'detail'

interface Props {
  open: boolean
  onClose: () => void
  mode: ModalMode
  bapId?: string
}

const STATUS_META: Record<MonitoringBAPStatus, { label: string; cls: string }> = {
  NOT_STARTED:      { label: 'Belum Mulai',    cls: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS:      { label: 'On Progress',     cls: 'bg-blue-100 text-blue-700' },
  WAITING_CUSTOMER: { label: 'Tunggu Customer', cls: 'bg-amber-100 text-amber-700' },
  APPROVED:         { label: 'Approved',         cls: 'bg-violet-100 text-violet-700' },
  COMPLETED:        { label: 'Completed',        cls: 'bg-emerald-100 text-emerald-700' },
}

const CHECKLIST_ITEMS: { key: keyof MonitoringBAPChecklist; label: string }[] = [
  { key: 'documentCreated', label: 'Document Created' },
  { key: 'internalReview',  label: 'Internal Review' },
  { key: 'customerReview',  label: 'Customer Review' },
  { key: 'approved',        label: 'Approved' },
  { key: 'signed',          label: 'Signed' },
  { key: 'readyBilling',    label: 'Ready Billing' },
  { key: 'completed',       label: 'Completed' },
]

const EMPTY_CHECKLIST: MonitoringBAPChecklist = {
  documentCreated: false, internalReview: false, customerReview: false,
  approved: false, signed: false, readyBilling: false, completed: false,
}

export function MonitoringBAPModal({ open, onClose, mode, bapId }: Props) {
  const store = useMonitoringBAPStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = bapId ? store.getById(bapId) : undefined

  const [projectId, setProjectId] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [client, setClient] = useState('')
  const [documentType, setDocumentType] = useState<MonitoringBAPDocumentType>('BAP')
  const [status, setStatus] = useState<MonitoringBAPStatus>('NOT_STARTED')
  const [pic, setPic] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [remark, setRemark] = useState('')
  const [linkDocument, setLinkDocument] = useState('')
  const [checklist, setChecklist] = useState<MonitoringBAPChecklist>({ ...EMPTY_CHECKLIST })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setProjectId(existing.projectId); setProjectCode(existing.projectCode)
      setClient(existing.client); setDocumentType(existing.documentType)
      setStatus(existing.status); setPic(existing.pic)
      setTargetDate(existing.targetDate ?? ''); setActualDate(existing.actualDate ?? '')
      setRemark(existing.remark); setLinkDocument(existing.linkDocument)
      setChecklist({ ...existing.checklist })
    } else if (mode === 'create') {
      setProjectId(''); setProjectCode(''); setClient('')
      setDocumentType('BAP'); setStatus('NOT_STARTED'); setPic('')
      setTargetDate(''); setActualDate(''); setRemark(''); setLinkDocument('')
      setChecklist({ ...EMPTY_CHECKLIST })
    }
    setErrors({})
  }, [open, mode, bapId])

  function validate() {
    const e: Record<string, string> = {}
    if (!projectCode.trim()) e.projectCode = 'Kode project wajib diisi'
    if (!client.trim()) e.client = 'Client wajib diisi'
    if (!pic.trim()) e.pic = 'PIC wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      projectId, projectCode, client, documentType, status, pic,
      targetDate: targetDate || null,
      actualDate: actualDate || null,
      remark, linkDocument, checklist,
      createdByUserId: currentUser?.id ?? '',
      createdByName: currentUser?.name ?? '',
    }
    if (mode === 'create') store.addBAP(payload)
    else if (mode === 'edit' && bapId) store.updateBAP(bapId, payload)
    onClose()
  }

  function handleChecklistToggle(key: keyof MonitoringBAPChecklist) {
    if (mode === 'detail' && bapId) {
      store.updateChecklist(bapId, { [key]: !checklist[key] })
      setChecklist((c) => ({ ...c, [key]: !c[key] }))
    } else {
      setChecklist((c) => ({ ...c, [key]: !c[key] }))
    }
  }

  const isReadonly = mode === 'detail'
  const progress = bapChecklistProgress(checklist)
  const title = mode === 'create' ? 'Tambah Dokumen BAP' : mode === 'edit' ? 'Edit Dokumen BAP' : 'Detail Dokumen BAP'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        mode !== 'detail' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {mode === 'detail' && existing && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-black/[0.02] border border-border-subtle">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">Status</div>
              <span className={classNames('chip text-xs', STATUS_META[existing.status].cls)}>{STATUS_META[existing.status].label}</span>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">Tipe Dokumen</div>
              <span className="chip bg-pertamina-red-50 text-pertamina-red">{existing.documentType}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Kode Project *" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="PGN-XXX-001" readOnly={isReadonly} />
            {errors.projectCode && <p className="text-[11px] text-pertamina-red mt-1">{errors.projectCode}</p>}
          </div>
          <Input label="Project ID" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="ID sistem" readOnly={isReadonly} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Client *" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nama client" readOnly={isReadonly} />
            {errors.client && <p className="text-[11px] text-pertamina-red mt-1">{errors.client}</p>}
          </div>
          <div>
            <Input label="PIC *" value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" readOnly={isReadonly} />
            {errors.pic && <p className="text-[11px] text-pertamina-red mt-1">{errors.pic}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipe Dokumen"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as MonitoringBAPDocumentType)}
            options={[
              { value: 'BAP', label: 'BAP' },
              { value: 'BAPP', label: 'BAPP' },
              { value: 'BAST', label: 'BAST' },
            ]}
            disabled={isReadonly}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MonitoringBAPStatus)}
            options={[
              { value: 'NOT_STARTED',      label: 'Belum Mulai' },
              { value: 'IN_PROGRESS',      label: 'On Progress' },
              { value: 'WAITING_CUSTOMER', label: 'Tunggu Customer' },
              { value: 'APPROVED',         label: 'Approved' },
              { value: 'COMPLETED',        label: 'Completed' },
            ]}
            disabled={isReadonly}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Target Date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} readOnly={isReadonly} />
          <Input label="Actual Date" type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} readOnly={isReadonly} />
        </div>

        <Input label="Link Dokumen" value={linkDocument} onChange={(e) => setLinkDocument(e.target.value)} placeholder="https://..." readOnly={isReadonly} />

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-ink-secondary">Checklist Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                <div
                  className={classNames('h-full rounded-full transition-all', progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-pertamina-red')}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-ink-tertiary tabular-nums">{progress}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHECKLIST_ITEMS.map(({ key, label }) => {
              const checked = checklist[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChecklistToggle(key)}
                  className={classNames(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs text-left transition',
                    checked
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-white text-ink-secondary hover:border-border-strong hover:bg-black/[0.02]',
                  )}
                >
                  <span className={classNames(
                    'grid h-4 w-4 shrink-0 place-items-center rounded border',
                    checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border-strong',
                  )}>
                    {checked && <Check size={10} />}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Catatan tambahan..." readOnly={isReadonly} rows={2} />
      </div>
    </Modal>
  )
}
