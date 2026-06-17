import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useAuthStore } from '../../store/useAuthStore'
import { classNames } from '../../utils/helpers'
import {
  slaMonthKeys, slaMonthLabel, slaAverageAchievement, slaMonthStatus, slaOverallStatus,
  type MonitoringSLA, type SLAStatus,
} from '../../types/monitoring'

type ModalMode = 'create' | 'edit' | 'detail'

interface Props {
  open: boolean
  onClose: () => void
  mode: ModalMode
  slaId?: string
}

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  GREEN:  'bg-emerald-100 text-emerald-700',
  YELLOW: 'bg-amber-100 text-amber-700',
  RED:    'bg-red-100 text-red-700',
}
const SLA_STATUS_LABEL: Record<SLAStatus, string> = {
  GREEN: 'Tercapai', YELLOW: 'Waspada', RED: 'Tidak Tercapai',
}

type MonthKey = ReturnType<typeof slaMonthKeys>[number]

const MONTHS = slaMonthKeys()

const EMPTY_MONTHS: Record<MonthKey, string> = {
  jan: '', feb: '', mar: '', apr: '', may: '', jun: '',
  jul: '', aug: '', sep: '', oct: '', nov: '', dec: '',
}

export function MonitoringSLAModal({ open, onClose, mode, slaId }: Props) {
  const store = useMonitoringSLAStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = slaId ? store.getById(slaId) : undefined

  const [kontrak, setKontrak] = useState('')
  const [pekerjaan, setPekerjaan] = useState('')
  const [som, setSom] = useState('')
  const [departemen, setDepartemen] = useState('')
  const [picDocon, setPicDocon] = useState('')
  const [batas, setBatas] = useState('95')
  const [catatan, setCatatan] = useState('')
  const [months, setMonths] = useState<Record<MonthKey, string>>({ ...EMPTY_MONTHS })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function loadExisting(r: MonitoringSLA) {
    setKontrak(r.kontrak); setPekerjaan(r.pekerjaan); setSom(r.som)
    setDepartemen(r.departemen); setPicDocon(r.picDocon)
    setBatas(String(r.batas)); setCatatan(r.catatan)
    const m: Record<MonthKey, string> = { ...EMPTY_MONTHS }
    MONTHS.forEach((key) => { m[key] = r[key] !== null ? String(r[key]) : '' })
    setMonths(m)
  }

  useEffect(() => {
    if ((mode === 'edit' || mode === 'detail') && existing) {
      loadExisting(existing)
    } else if (mode === 'create') {
      setKontrak(''); setPekerjaan(''); setSom(''); setDepartemen('')
      setPicDocon(''); setBatas('95'); setCatatan('')
      setMonths({ ...EMPTY_MONTHS })
    }
    setErrors({})
  }, [open, mode, slaId])

  function validate() {
    const e: Record<string, string> = {}
    if (!kontrak.trim()) e.kontrak = 'Kontrak wajib diisi'
    if (!pekerjaan.trim()) e.pekerjaan = 'Pekerjaan wajib diisi'
    if (!departemen.trim()) e.departemen = 'Departemen wajib diisi'
    const b = Number(batas)
    if (isNaN(b) || b < 0 || b > 100) e.batas = 'Batas harus 0-100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function parseMonth(v: string): number | null {
    if (v === '') return null
    const n = Number(v)
    return isNaN(n) ? null : Math.max(0, Math.min(100, n))
  }

  function buildPayload() {
    const monthValues: Record<MonthKey, number | null> = {} as Record<MonthKey, number | null>
    MONTHS.forEach((key) => { monthValues[key] = parseMonth(months[key]) })
    return {
      kontrak, pekerjaan, som, departemen, picDocon,
      batas: Number(batas), catatan,
      ...monthValues,
      createdByUserId: currentUser?.id ?? '',
      createdByName: currentUser?.name ?? '',
    }
  }

  function handleSave() {
    if (!validate()) return
    const payload = buildPayload()
    if (mode === 'create') {
      store.addSLA(payload)
    } else if (mode === 'edit' && slaId) {
      store.updateSLA(slaId, payload)
    }
    onClose()
  }

  const isReadonly = mode === 'detail'
  const title = mode === 'create' ? 'Tambah Data SLA' : mode === 'edit' ? 'Edit Data SLA' : 'Detail SLA'

  // For detail view, compute stats from existing record
  const detailSLA = existing
  const avg = detailSLA ? slaAverageAchievement(detailSLA) : null
  const overallStatus = detailSLA ? slaOverallStatus(detailSLA) : null

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
      {mode === 'detail' && detailSLA ? (
        <div className="space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="surface relative overflow-hidden rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Target SLA</div>
              <div className="mt-1 text-2xl font-semibold text-ink-primary">{detailSLA.batas}%</div>
            </div>
            <div className="surface relative overflow-hidden rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Rata-rata</div>
              <div className={classNames('mt-1 text-2xl font-semibold', avg !== null && avg >= detailSLA.batas ? 'text-emerald-700' : 'text-pertamina-red')}>
                {avg !== null ? `${Math.round(avg * 10) / 10}%` : '—'}
              </div>
            </div>
            <div className="surface relative overflow-hidden rounded-xl p-4 col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Status Keseluruhan</div>
              <div className="mt-1.5">
                {overallStatus && (
                  <span className={classNames('chip text-xs px-3 py-1', SLA_STATUS_CLS[overallStatus])}>
                    {SLA_STATUS_LABEL[overallStatus]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Kontrak', value: detailSLA.kontrak },
              { label: 'Pekerjaan', value: detailSLA.pekerjaan },
              { label: 'SOM', value: detailSLA.som },
              { label: 'Departemen', value: detailSLA.departemen },
              { label: 'PIC Docon', value: detailSLA.picDocon },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{label}</div>
                <div className="text-sm font-medium text-ink-primary mt-0.5">{value || '—'}</div>
              </div>
            ))}
          </div>

          {/* Monthly achievement grid */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-tertiary font-semibold mb-3">Pencapaian Bulanan</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MONTHS.map((key) => {
                const val = detailSLA[key]
                const st = slaMonthStatus(val, detailSLA.batas)
                return (
                  <div key={key} className={classNames('rounded-xl border p-3 text-center', SLA_STATUS_CLS[st], st === 'GREEN' ? 'border-emerald-200' : st === 'YELLOW' ? 'border-amber-200' : 'border-red-200')}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide">{slaMonthLabel(key)}</div>
                    <div className="mt-1 text-lg font-bold">{val !== null ? `${val}%` : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {detailSLA.catatan && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">Catatan</div>
              <div className="text-sm text-ink-secondary mt-0.5">{detailSLA.catatan}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Kontrak *" value={kontrak} onChange={(e) => setKontrak(e.target.value)} placeholder="Nama kontrak" readOnly={isReadonly} />
              {errors.kontrak && <p className="text-[11px] text-pertamina-red mt-1">{errors.kontrak}</p>}
            </div>
            <div>
              <Input label="Pekerjaan *" value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} placeholder="Deskripsi pekerjaan" readOnly={isReadonly} />
              {errors.pekerjaan && <p className="text-[11px] text-pertamina-red mt-1">{errors.pekerjaan}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="SOM" value={som} onChange={(e) => setSom(e.target.value)} placeholder="SOM" readOnly={isReadonly} />
            <div>
              <Input label="Departemen *" value={departemen} onChange={(e) => setDepartemen(e.target.value)} placeholder="Nama departemen" readOnly={isReadonly} />
              {errors.departemen && <p className="text-[11px] text-pertamina-red mt-1">{errors.departemen}</p>}
            </div>
            <Input label="PIC Docon" value={picDocon} onChange={(e) => setPicDocon(e.target.value)} placeholder="Nama PIC" readOnly={isReadonly} />
          </div>

          <div>
            <Input
              label="Batas SLA (%) *"
              type="number"
              value={batas}
              onChange={(e) => setBatas(e.target.value)}
              placeholder="95"
              min={0}
              max={100}
              readOnly={isReadonly}
              hint="Angka 0–100. Contoh: 95 berarti target SLA 95%"
            />
            {errors.batas && <p className="text-[11px] text-pertamina-red mt-1">{errors.batas}</p>}
          </div>

          {/* Monthly input grid */}
          <div>
            <div className="mb-2 block text-xs font-medium text-ink-secondary">Pencapaian Bulanan (%)</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MONTHS.map((key) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] text-ink-tertiary text-center">{slaMonthLabel(key)}</span>
                  <input
                    type="number"
                    value={months[key]}
                    onChange={(e) => setMonths((m) => ({ ...m, [key]: e.target.value }))}
                    className="input-base text-xs text-center px-1"
                    placeholder="—"
                    min={0}
                    max={100}
                    readOnly={isReadonly}
                  />
                </label>
              ))}
            </div>
          </div>

          <Textarea label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." readOnly={isReadonly} rows={2} />
        </div>
      )}
    </Modal>
  )
}
