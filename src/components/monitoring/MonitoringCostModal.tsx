import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useAuthStore } from '../../store/useAuthStore'
import { classNames, formatDateShort } from '../../utils/helpers'
import {
  formatCurrency,
  getEffectiveCostStatus,
  type MonitoringCostStatus,
  type MonitoringCostRealizationStatus,
} from '../../types/monitoring'

type ModalMode = 'create' | 'edit' | 'detail'

interface Props {
  open: boolean
  onClose: () => void
  mode: ModalMode
  costId?: string
}

const STATUS_META: Record<MonitoringCostStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  future:    { label: 'Future',    cls: 'bg-purple-100 text-purple-700' },
}

const REAL_STATUS_META: Record<MonitoringCostRealizationStatus, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function MonitoringCostModal({ open, onClose, mode, costId }: Props) {
  const store = useMonitoringCostStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = costId ? store.getCostById(costId) : undefined
  const realizations = costId ? store.getRealizationsByProjectId(costId) : []

  // Actual cost = sum semua realisasi (otomatis, seperti SUMIF)
  const computedActualCost = realizations.reduce((s, r) => s + r.realisasiBiaya, 0)

  const [form, setForm] = useState({
    projectId: '', projectCode: '', year: new Date().getFullYear(),
    isCancelled: false,
    projectClient: '', projectName: '', contractNumber: '',
    categoryContract: '', dateOfContract: '', startDate: '', endDate: '',
    projectValue: 0, costBased: 0,
    amandemen: '', tkdn: 0, description: '',
  })
  const [displayNums, setDisplayNums] = useState({ projectValue: '', costBased: '', tkdn: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setForm({
        projectId: existing.projectId,
        projectCode: existing.projectCode,
        year: existing.year,
        isCancelled: existing.status === 'cancelled',
        projectClient: existing.projectClient,
        projectName: existing.projectName,
        contractNumber: existing.contractNumber,
        categoryContract: existing.categoryContract,
        dateOfContract: existing.dateOfContract ?? '',
        startDate: existing.startDate ?? '',
        endDate: existing.endDate ?? '',
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
    } else if (mode === 'create') {
      setForm({
        projectId: '', projectCode: '', year: new Date().getFullYear(),
        isCancelled: false, projectClient: '', projectName: '', contractNumber: '',
        categoryContract: '', dateOfContract: '', startDate: '', endDate: '',
        projectValue: 0, costBased: 0, amandemen: '', tkdn: 0, description: '',
      })
      setDisplayNums({ projectValue: '', costBased: '', tkdn: '' })
    }
    setErrors({})
  }, [open, mode, costId])

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

  function validate() {
    const e: Record<string, string> = {}
    if (!form.projectCode.trim()) e.projectCode = 'Kode project wajib diisi'
    else if (mode === 'create') {
      const kode = form.projectCode.trim().toLowerCase()
      const dup = store.costs.find((c) => c.projectCode.toLowerCase() === kode && c.year === form.year)
      if (dup) e.projectCode = `Kode "${form.projectCode.trim()}" sudah ada di tahun ${form.year}`
    }
    if (!form.projectClient.trim()) e.projectClient = 'Client wajib diisi'
    if (!form.projectName.trim()) e.projectName = 'Nama project wajib diisi'
    if (form.year < 2000 || form.year > 2099) e.year = 'Tahun harus antara 2000–2099'
    if (form.projectValue < 0) e.projectValue = 'Nilai kontrak harus ≥ 0'
    if (form.tkdn < 0 || form.tkdn > 100) e.tkdn = 'TKDN harus 0–100'
    if (form.startDate && form.endDate && form.startDate >= form.endDate) e.endDate = 'End Date harus setelah Start Date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      projectId: form.projectId,
      projectCode: form.projectCode,
      year: form.year,
      status: (form.isCancelled ? 'cancelled' : 'active') as MonitoringCostStatus,
      projectClient: form.projectClient,
      projectName: form.projectName,
      contractNumber: form.contractNumber,
      categoryContract: form.categoryContract,
      dateOfContract: form.dateOfContract || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      projectValue: form.projectValue,
      costBased: form.costBased,
      actualCost: computedActualCost,
      amandemen: form.amandemen,
      tkdn: form.tkdn,
      description: form.description,
      createdByUserId: currentUser?.id ?? '',
      createdByName: currentUser?.name ?? '',
    }
    if (mode === 'create') store.addCost(payload)
    else if (mode === 'edit' && costId) store.updateCost(costId, payload)
    onClose()
  }

  const isReadonly = mode === 'detail'
  const title = mode === 'create' ? 'Tambah Cost Project' : mode === 'edit' ? 'Edit Cost Project' : 'Detail Cost Project'

  // Status dihitung otomatis dari tanggal; hanya 'cancelled' yang manual
  const effectiveStatus = existing
    ? getEffectiveCostStatus(existing.startDate, existing.endDate, existing.status === 'cancelled')
    : getEffectiveCostStatus(form.startDate || null, form.endDate || null, form.isCancelled)

  const baseValue = existing?.projectValue ?? form.projectValue
  const profitMargin = baseValue - computedActualCost
  const costAchievement = baseValue > 0 ? Math.round((computedActualCost / baseValue) * 1000) / 10 : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="2xl"
      footer={
        mode !== 'detail' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
          </>
        ) : undefined
      }
    >
      {mode === 'detail' && existing ? (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Nilai Kontrak',    value: formatCurrency(existing.projectValue), tone: 'text-ink-primary',    accent: 'from-blue-400 to-transparent' },
              { label: 'Biaya Aktual',     value: formatCurrency(computedActualCost),    tone: 'text-pertamina-red',  accent: 'from-pertamina-red to-transparent' },
              { label: 'Profit Margin',    value: formatCurrency(profitMargin),           tone: profitMargin >= 0 ? 'text-emerald-700' : 'text-pertamina-red', accent: 'from-emerald-400 to-transparent' },
              { label: 'Cost Achievement', value: `${costAchievement}%`,                 tone: 'text-amber-700',      accent: 'from-amber-400 to-transparent' },
            ].map((c) => (
              <div key={c.label} className="surface relative overflow-hidden rounded-xl p-4">
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
                <div className={classNames('mt-1 text-base font-semibold truncate', c.tone)}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Kode Project',     value: existing.projectCode },
              { label: 'Project ID',       value: existing.projectId || '—' },
              { label: 'Nama Project',     value: existing.projectName },
              { label: 'Client',           value: existing.projectClient },
              { label: 'Tahun',            value: String(existing.year) },
              { label: 'Status',           value: STATUS_META[effectiveStatus].label },
              { label: 'Nomor Kontrak',    value: existing.contractNumber },
              { label: 'Kategori Kontrak', value: existing.categoryContract },
              { label: 'Tanggal Kontrak',  value: formatDateShort(existing.dateOfContract) },
              { label: 'Start Date',       value: formatDateShort(existing.startDate) },
              { label: 'End Date',         value: formatDateShort(existing.endDate) },
              { label: 'TKDN (%)',         value: `${existing.tkdn}%` },
              { label: 'Amandemen',        value: existing.amandemen || '—' },
              { label: 'Cost Based',       value: formatCurrency(existing.costBased) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{label}</div>
                <div className="text-sm font-medium text-ink-primary mt-0.5">{value}</div>
              </div>
            ))}
            {existing.description && (
              <div className="col-span-2">
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Deskripsi</div>
                <div className="text-sm text-ink-secondary mt-0.5">{existing.description}</div>
              </div>
            )}
          </div>

          {/* Realizations */}
          {realizations.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-3">Realisasi Biaya ({realizations.length})</div>
              <div className="surface rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle bg-black/[0.02]">
                      {['Item Biaya', 'Satuan Kerja', 'PIC', 'Vendor', 'Status', 'Realisasi'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {realizations.map((r) => (
                      <tr key={r.id} className="hover:bg-black/[0.02]">
                        <td className="px-3 py-2 text-ink-primary">{r.itemBiaya}</td>
                        <td className="px-3 py-2 text-ink-secondary">{r.satuanKerja}</td>
                        <td className="px-3 py-2 text-ink-secondary">{r.pic}</td>
                        <td className="px-3 py-2 text-ink-secondary">{r.vendor}</td>
                        <td className="px-3 py-2">
                          <span className={classNames('chip', REAL_STATUS_META[r.status]?.cls ?? '')}>{REAL_STATUS_META[r.status]?.label ?? r.status}</span>
                        </td>
                        <td className="px-3 py-2 font-medium text-ink-primary tabular-nums whitespace-nowrap">{formatCurrency(r.realisasiBiaya)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input label="Kode Project *" value={form.projectCode} onChange={(e) => setField('projectCode', e.target.value)} placeholder="PGN-XXX-001" readOnly={isReadonly} />
              {errors.projectCode && <p className="text-[11px] text-danger mt-1">{errors.projectCode}</p>}
            </div>
            <Input label="Project ID" value={form.projectId} onChange={(e) => setField('projectId', e.target.value)} placeholder="ID sistem" readOnly={isReadonly} />
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Tahun *</span>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                    const n = parseInt(raw, 10)
                    if (!isNaN(n)) setField('year', Math.min(Math.max(n, 2000), 2099))
                  }}
                  min={2000}
                  max={2099}
                  className="input-base"
                  readOnly={isReadonly}
                />
              </label>
              {errors.year && <p className="text-[11px] text-danger mt-1">{errors.year}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Nama Project *" value={form.projectName} onChange={(e) => setField('projectName', e.target.value)} placeholder="Nama project" readOnly={isReadonly} />
              {errors.projectName && <p className="text-[11px] text-danger mt-1">{errors.projectName}</p>}
            </div>
            <div>
              <Input label="Client *" value={form.projectClient} onChange={(e) => setField('projectClient', e.target.value)} placeholder="Nama client" readOnly={isReadonly} />
              {errors.projectClient && <p className="text-[11px] text-danger mt-1">{errors.projectClient}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nomor Kontrak" value={form.contractNumber} onChange={(e) => setField('contractNumber', e.target.value)} placeholder="No. kontrak" readOnly={isReadonly} />
            <Input label="Kategori Kontrak" value={form.categoryContract} onChange={(e) => setField('categoryContract', e.target.value)} placeholder="Kategori" readOnly={isReadonly} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Tanggal Kontrak" type="date" value={form.dateOfContract} onChange={(e) => setField('dateOfContract', e.target.value)} readOnly={isReadonly} />
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} readOnly={isReadonly} />
            <div>
              <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} readOnly={isReadonly} />
              {errors.endDate && <p className="text-[11px] text-danger mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Nilai Kontrak (IDR) *</span>
                <input type="text" inputMode="numeric" value={displayNums.projectValue} onChange={(e) => handleIDRChange('projectValue', e.target.value)} className="input-base" placeholder="0" readOnly={isReadonly} />
              </label>
              {errors.projectValue && <p className="text-[11px] text-danger mt-1">{errors.projectValue}</p>}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Cost Based (IDR)</span>
              <input type="text" inputMode="numeric" value={displayNums.costBased} onChange={(e) => handleIDRChange('costBased', e.target.value)} className="input-base" placeholder="0" readOnly={isReadonly} />
            </label>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Biaya Aktual (IDR)</span>
              <div className="input-base bg-black/[0.02] text-ink-secondary select-none">{formatCurrency(computedActualCost)}</div>
              <p className="text-[10px] text-ink-tertiary mt-1">Otomatis dari realisasi</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">TKDN (%)</span>
                <input type="text" inputMode="decimal" value={displayNums.tkdn} onChange={(e) => handleTKDNChange(e.target.value)} className="input-base" placeholder="0" readOnly={isReadonly} />
              </label>
              {errors.tkdn && <p className="text-[11px] text-danger mt-1">{errors.tkdn}</p>}
            </div>
            <Input label="Amandemen" value={form.amandemen} onChange={(e) => setField('amandemen', e.target.value)} placeholder="Keterangan amandemen" readOnly={isReadonly} />
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Status</span>
              <span className={classNames('chip', STATUS_META[effectiveStatus].cls)}>{STATUS_META[effectiveStatus].label}</span>
              {!isReadonly && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isCancelled}
                    onChange={(e) => setField('isCancelled', e.target.checked)}
                    className="rounded border-border-default accent-pertamina-red"
                  />
                  <span className="text-xs text-ink-secondary">Batalkan Project</span>
                </label>
              )}
            </div>
          </div>

          <Textarea label="Deskripsi" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Catatan tambahan..." readOnly={isReadonly} rows={2} />
        </div>
      )}
    </Modal>
  )
}
