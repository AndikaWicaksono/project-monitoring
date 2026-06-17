import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useAuthStore } from '../../store/useAuthStore'
import { classNames, formatDateShort } from '../../utils/helpers'
import { formatCurrency, type MonitoringCostStatus, type MonitoringCostRealizationStatus } from '../../types/monitoring'

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
}

const REAL_STATUS_META: Record<MonitoringCostRealizationStatus, { label: string; cls: string }> = {
  PAID:             { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700' },
  POPAY:            { label: 'PO/Pay',           cls: 'bg-blue-100 text-blue-700' },
  READY_TO_RELEASE: { label: 'Ready to Release', cls: 'bg-amber-100 text-amber-700' },
}

export function MonitoringCostModal({ open, onClose, mode, costId }: Props) {
  const store = useMonitoringCostStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = costId ? store.getCostById(costId) : undefined
  const realizations = costId ? store.getRealizationsByProjectId(costId) : []

  const [form, setForm] = useState({
    projectId: '', projectCode: '', year: new Date().getFullYear(),
    status: 'active' as MonitoringCostStatus,
    projectClient: '', projectName: '', contractNumber: '',
    categoryContract: '', dateOfContract: '', startDate: '', endDate: '',
    projectValue: 0, costBased: 0, actualCost: 0,
    amandemen: '', tkdn: 0, description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      setForm({
        projectId: existing.projectId,
        projectCode: existing.projectCode,
        year: existing.year,
        status: existing.status,
        projectClient: existing.projectClient,
        projectName: existing.projectName,
        contractNumber: existing.contractNumber,
        categoryContract: existing.categoryContract,
        dateOfContract: existing.dateOfContract ?? '',
        startDate: existing.startDate ?? '',
        endDate: existing.endDate ?? '',
        projectValue: existing.projectValue,
        costBased: existing.costBased,
        actualCost: existing.actualCost,
        amandemen: existing.amandemen,
        tkdn: existing.tkdn,
        description: existing.description,
      })
    } else if (mode === 'create') {
      setForm({
        projectId: '', projectCode: '', year: new Date().getFullYear(),
        status: 'active', projectClient: '', projectName: '', contractNumber: '',
        categoryContract: '', dateOfContract: '', startDate: '', endDate: '',
        projectValue: 0, costBased: 0, actualCost: 0, amandemen: '', tkdn: 0, description: '',
      })
    }
    setErrors({})
  }, [open, mode, costId])

  function setField<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.projectCode.trim()) e.projectCode = 'Kode project wajib diisi'
    if (!form.projectClient.trim()) e.projectClient = 'Client wajib diisi'
    if (!form.projectName.trim()) e.projectName = 'Nama project wajib diisi'
    if (form.projectValue < 0) e.projectValue = 'Nilai kontrak harus ≥ 0'
    if (form.actualCost < 0) e.actualCost = 'Biaya aktual harus ≥ 0'
    if (form.tkdn < 0 || form.tkdn > 100) e.tkdn = 'TKDN harus 0–100'
    if (form.startDate && form.endDate && form.startDate >= form.endDate) e.endDate = 'End Date harus setelah Start Date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      ...form,
      dateOfContract: form.dateOfContract || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      createdByUserId: currentUser?.id ?? '',
      createdByName: currentUser?.name ?? '',
    }
    if (mode === 'create') store.addCost(payload)
    else if (mode === 'edit' && costId) store.updateCost(costId, payload)
    onClose()
  }

  const isReadonly = mode === 'detail'
  const title = mode === 'create' ? 'Tambah Cost Project' : mode === 'edit' ? 'Edit Cost Project' : 'Detail Cost Project'
  const profitMargin = existing ? existing.projectValue - existing.actualCost : form.projectValue - form.actualCost
  const costAchievement = form.projectValue > 0 ? Math.round((form.actualCost / form.projectValue) * 1000) / 10 : 0

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
              { label: 'Nilai Kontrak', value: formatCurrency(existing.projectValue), tone: 'text-ink-primary', accent: 'from-blue-400 to-transparent' },
              { label: 'Biaya Aktual', value: formatCurrency(existing.actualCost), tone: 'text-pertamina-red', accent: 'from-pertamina-red to-transparent' },
              { label: 'Profit Margin', value: formatCurrency(profitMargin), tone: profitMargin >= 0 ? 'text-emerald-700' : 'text-pertamina-red', accent: 'from-emerald-400 to-transparent' },
              { label: 'Cost Achievement', value: `${costAchievement}%`, tone: 'text-amber-700', accent: 'from-amber-400 to-transparent' },
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
              { label: 'Kode Project', value: existing.projectCode },
              { label: 'Project ID', value: existing.projectId || '—' },
              { label: 'Nama Project', value: existing.projectName },
              { label: 'Client', value: existing.projectClient },
              { label: 'Tahun', value: String(existing.year) },
              { label: 'Status', value: STATUS_META[existing.status].label },
              { label: 'Nomor Kontrak', value: existing.contractNumber },
              { label: 'Kategori Kontrak', value: existing.categoryContract },
              { label: 'Tanggal Kontrak', value: formatDateShort(existing.dateOfContract) },
              { label: 'Start Date', value: formatDateShort(existing.startDate) },
              { label: 'End Date', value: formatDateShort(existing.endDate) },
              { label: 'TKDN (%)', value: `${existing.tkdn}%` },
              { label: 'Amandemen', value: existing.amandemen || '—' },
              { label: 'Cost Based', value: formatCurrency(existing.costBased) },
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
              {errors.projectCode && <p className="text-[11px] text-pertamina-red mt-1">{errors.projectCode}</p>}
            </div>
            <Input label="Project ID" value={form.projectId} onChange={(e) => setField('projectId', e.target.value)} placeholder="ID sistem" readOnly={isReadonly} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Tahun *</span>
              <input type="number" value={form.year} onChange={(e) => setField('year', Number(e.target.value))} className="input-base" readOnly={isReadonly} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Nama Project *" value={form.projectName} onChange={(e) => setField('projectName', e.target.value)} placeholder="Nama project" readOnly={isReadonly} />
              {errors.projectName && <p className="text-[11px] text-pertamina-red mt-1">{errors.projectName}</p>}
            </div>
            <div>
              <Input label="Client *" value={form.projectClient} onChange={(e) => setField('projectClient', e.target.value)} placeholder="Nama client" readOnly={isReadonly} />
              {errors.projectClient && <p className="text-[11px] text-pertamina-red mt-1">{errors.projectClient}</p>}
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
              {errors.endDate && <p className="text-[11px] text-pertamina-red mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Nilai Kontrak (IDR) *</span>
                <input type="number" value={form.projectValue} onChange={(e) => setField('projectValue', Number(e.target.value))} className="input-base" min={0} readOnly={isReadonly} />
              </label>
              {errors.projectValue && <p className="text-[11px] text-pertamina-red mt-1">{errors.projectValue}</p>}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Cost Based (IDR)</span>
              <input type="number" value={form.costBased} onChange={(e) => setField('costBased', Number(e.target.value))} className="input-base" min={0} readOnly={isReadonly} />
            </label>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Biaya Aktual (IDR) *</span>
                <input type="number" value={form.actualCost} onChange={(e) => setField('actualCost', Number(e.target.value))} className="input-base" min={0} readOnly={isReadonly} />
              </label>
              {errors.actualCost && <p className="text-[11px] text-pertamina-red mt-1">{errors.actualCost}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">TKDN (%)</span>
                <input type="number" value={form.tkdn} onChange={(e) => setField('tkdn', Number(e.target.value))} className="input-base" min={0} max={100} readOnly={isReadonly} />
              </label>
              {errors.tkdn && <p className="text-[11px] text-pertamina-red mt-1">{errors.tkdn}</p>}
            </div>
            <Input label="Amandemen" value={form.amandemen} onChange={(e) => setField('amandemen', e.target.value)} placeholder="Keterangan amandemen" readOnly={isReadonly} />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value as MonitoringCostStatus)}
              options={[
                { value: 'active', label: 'Aktif' },
                { value: 'closed', label: 'Closed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              disabled={isReadonly}
            />
          </div>

          <Textarea label="Deskripsi" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Catatan tambahan..." readOnly={isReadonly} rows={2} />
        </div>
      )}
    </Modal>
  )
}
