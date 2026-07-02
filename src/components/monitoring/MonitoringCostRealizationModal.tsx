import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import type { MonitoringCostRealizationStatus } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  costId: string
  realizationId?: string
}

export function MonitoringCostRealizationModal({ open, onClose, mode, costId, realizationId }: Props) {
  const store = useMonitoringCostStore()
  const { costSatker } = useMonitoringRole()

  const cost = store.getCostById(costId)
  const existing = realizationId ? store.realizations.find((r) => r.id === realizationId) : undefined

  const [itemBiaya, setItemBiaya] = useState('')
  const [satuanKerja, setSatuanKerja] = useState('')
  const [pic, setPic] = useState('')
  const [realisasiBiaya, setRealisasiBiaya] = useState('0')
  const [status, setStatus] = useState<MonitoringCostRealizationStatus>('POPAY')
  const [vendor, setVendor] = useState('')
  const [period, setPeriod] = useState('')
  const [tanggalRealisasi, setTanggalRealisasi] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setItemBiaya(existing.itemBiaya); setSatuanKerja(existing.satuanKerja)
      setPic(existing.pic); setRealisasiBiaya(String(existing.realisasiBiaya))
      setStatus(existing.status); setVendor(existing.vendor)
      setPeriod(existing.period ?? ''); setTanggalRealisasi(existing.tanggalRealisasi ?? '')
    } else {
      setItemBiaya(''); setSatuanKerja(costSatker ?? ''); setPic('')
      setRealisasiBiaya('0'); setStatus('POPAY'); setVendor('')
      setPeriod(''); setTanggalRealisasi('')
    }
    setErrors({})
  }, [open, mode, realizationId, costSatker])

  function validate() {
    const e: Record<string, string> = {}
    if (!itemBiaya.trim()) e.itemBiaya = 'Item biaya wajib diisi'
    if (Number(realisasiBiaya) < 0) e.realisasiBiaya = 'Realisasi biaya harus ≥ 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      kodeProject: cost?.projectCode ?? '',
      projectId: costId,
      itemBiaya, satuanKerja, pic,
      realisasiBiaya: Number(realisasiBiaya),
      status, vendor,
      period: period || null,
      tanggalRealisasi: tanggalRealisasi || null,
    }
    if (mode === 'create') store.addRealization(payload)
    else if (mode === 'edit' && realizationId) store.updateRealization(realizationId, payload)
    onClose()
  }

  const title = mode === 'create' ? 'Tambah Realisasi Biaya' : 'Edit Realisasi Biaya'
  const subtitle = cost ? `${cost.projectCode} — ${cost.projectName}` : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={subtitle}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Input label="Item Biaya *" value={itemBiaya} onChange={(e) => setItemBiaya(e.target.value)} placeholder="Nama item biaya" />
          {errors.itemBiaya && <p className="text-[11px] text-danger mt-1">{errors.itemBiaya}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Satuan Kerja"
              value={satuanKerja}
              onChange={(e) => !costSatker && setSatuanKerja(e.target.value)}
              placeholder="Unit kerja"
              readOnly={!!costSatker}
              className={costSatker ? 'bg-black/[0.03] cursor-default text-ink-secondary font-medium' : ''}
            />
            {costSatker && (
              <p className="mt-1 text-[11px] text-ink-tertiary">Otomatis sesuai role Anda</p>
            )}
          </div>
          <Input label="PIC" value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Realisasi Biaya (IDR) *</span>
              <input
                type="number"
                value={realisasiBiaya}
                onChange={(e) => setRealisasiBiaya(e.target.value)}
                className="input-base"
                min={0}
                placeholder="0"
              />
            </label>
            {errors.realisasiBiaya && <p className="text-[11px] text-danger mt-1">{errors.realisasiBiaya}</p>}
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MonitoringCostRealizationStatus)}
            options={[
              { value: 'POPAY', label: 'PO/Pay' },
              { value: 'READY_TO_RELEASE', label: 'Ready to Release' },
              { value: 'PAID', label: 'Paid' },
            ]}
          />
        </div>

        <Input label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nama vendor" />

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Bulan Realisasi (YYYY-MM)</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input-base"
            />
          </label>
          <Input
            label="Tanggal Realisasi"
            type="date"
            value={tanggalRealisasi}
            onChange={(e) => setTanggalRealisasi(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
