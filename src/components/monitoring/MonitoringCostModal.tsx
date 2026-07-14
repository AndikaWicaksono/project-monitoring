import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { classNames, formatDateShort } from '../../utils/helpers'
import {
  formatCurrency,
  getEffectiveCostStatus,
  type MonitoringCostStatus,
} from '../../types/monitoring'

type TabKey = 'info' | 'finansial'

interface Props {
  open: boolean
  onClose: () => void
  costId: string
}

const STATUS_META: Record<MonitoringCostStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  future:    { label: 'Future',    cls: 'bg-purple-100 text-purple-700' },
}

function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">{label}</div>
      <div className="text-sm text-ink-primary">{value}</div>
    </div>
  )
}

export function MonitoringCostModal({ open, onClose, costId }: Props) {
  const store = useMonitoringCostStore()
  const existing = store.getCostById(costId)
  const realizations = store.getRealizationsByProjectId(costId)

  // Actual cost = sum semua realisasi (otomatis, seperti SUMIF)
  const computedActualCost = realizations.reduce((s, r) => s + r.realisasiBiaya, 0)

  const [form, setForm] = useState({
    projectId: '', projectValue: 0, costBased: 0,
    amandemen: '', tkdn: 0, description: '',
  })
  const [displayNums, setDisplayNums] = useState({ projectValue: '', costBased: '', tkdn: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<TabKey>('info')

  useEffect(() => {
    if (existing) {
      setForm({
        projectId: existing.projectId,
        projectValue: existing.projectValue,
        costBased: existing.costBased,
        amandemen: existing.amandemen,
        tkdn: existing.tkdn,
        description: existing.description,
      })
      setDisplayNums({
        projectValue: fmtIDR(existing.projectValue),
        costBased: fmtIDR(existing.costBased),
        tkdn: existing.tkdn === 0 ? '' : String(existing.tkdn),
      })
    }
    setErrors({})
    setActiveTab('info')
  }, [open, costId])

  function setField<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  function handleIDRChange(key: 'projectValue' | 'costBased', raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    const numVal = digits === '' ? 0 : parseInt(digits, 10)
    const formatted = digits === '' ? '' : fmtIDR(numVal)
    setDisplayNums((d) => ({ ...d, [key]: formatted }))
    setField(key, numVal)
  }

  function handleTKDNChange(raw: string) {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
    setDisplayNums((d) => ({ ...d, tkdn: sanitized }))
    setField('tkdn', parseFloat(sanitized) || 0)
  }

  function getValidationErrors() {
    const e: Record<string, string> = {}
    if (form.projectValue < 0) e.projectValue = 'Nilai kontrak harus ≥ 0'
    if (form.tkdn < 0 || form.tkdn > 100) e.tkdn = 'TKDN harus 0–100'
    return e
  }

  function handleSave() {
    const e = getValidationErrors()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setActiveTab('finansial')
      return
    }
    if (!existing) return
    store.updateCost(existing.id, {
      projectId: form.projectId,
      projectValue: form.projectValue,
      costBased: form.costBased,
      actualCost: computedActualCost,
      amandemen: form.amandemen,
      tkdn: form.tkdn,
      description: form.description,
    })
    onClose()
  }

  if (!existing) return null

  const effectiveStatus = getEffectiveCostStatus(existing.startDate, existing.endDate, existing.status === 'cancelled')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Cost Project"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>Update</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-black/[0.03] p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={classNames(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              activeTab === 'info' ? 'bg-white shadow-sm text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            Info Project
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finansial')}
            className={classNames(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              activeTab === 'finansial' ? 'bg-white shadow-sm text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            Finansial
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-2.5 text-[11px] text-blue-700 leading-relaxed">
              Identitas & kontrak project ini dikelola dari <strong>Master Data</strong> (Tambah/Edit Project) supaya konsisten di Report, SLA, dan Cost Monitoring. Buka Master Data untuk mengubahnya.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Kode Project" value={existing.projectCode} />
              <InfoRow label="Tahun" value={String(existing.year)} />
              <InfoRow label="Nama Project" value={existing.projectName} />
              <InfoRow label="Client" value={existing.projectClient} />
              <InfoRow label="Nomor Kontrak" value={existing.contractNumber || '—'} />
              <InfoRow label="Kategori Kontrak" value={existing.categoryContract || '—'} />
              <InfoRow label="Tanggal Kontrak" value={formatDateShort(existing.dateOfContract)} />
              <InfoRow label="Start Date" value={formatDateShort(existing.startDate)} />
              <InfoRow label="End Date" value={formatDateShort(existing.endDate)} />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary mb-1">Status</div>
                <span className={classNames('chip', STATUS_META[effectiveStatus].cls)}>{STATUS_META[effectiveStatus].label}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input label="Project ID" value={form.projectId} onChange={(e) => setField('projectId', e.target.value)} placeholder="ID sistem" />
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Nilai Kontrak (IDR) *</span>
                  <input type="text" inputMode="numeric" value={displayNums.projectValue} onChange={(e) => handleIDRChange('projectValue', e.target.value)} className="input-base" placeholder="0" />
                </label>
                {errors.projectValue && <p className="text-[11px] text-danger mt-1">{errors.projectValue}</p>}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Cost Based (IDR)</span>
                <input type="text" inputMode="numeric" value={displayNums.costBased} onChange={(e) => handleIDRChange('costBased', e.target.value)} className="input-base" placeholder="0" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Biaya Aktual (IDR)</span>
                <div className="input-base bg-black/[0.02] text-ink-secondary select-none">{formatCurrency(computedActualCost)}</div>
                <p className="text-[10px] text-ink-tertiary mt-1">Otomatis dari realisasi</p>
              </div>
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink-secondary">TKDN (%)</span>
                  <input type="text" inputMode="decimal" value={displayNums.tkdn} onChange={(e) => handleTKDNChange(e.target.value)} className="input-base" placeholder="0" />
                </label>
                {errors.tkdn && <p className="text-[11px] text-danger mt-1">{errors.tkdn}</p>}
              </div>
              <Input label="Amandemen" value={form.amandemen} onChange={(e) => setField('amandemen', e.target.value)} placeholder="Keterangan amandemen" />
            </div>

            <Textarea label="Deskripsi" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Catatan tambahan..." rows={2} />
          </div>
        )}
      </div>
    </Modal>
  )
}
