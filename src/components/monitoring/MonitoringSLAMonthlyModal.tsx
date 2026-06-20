import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { slaMonthLabel, SLA_MONTHS } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  componentId?: string
  projectId?: string
  recordId?: string
  defaultMonth?: number
  defaultYear?: number
}

export function MonitoringSLAMonthlyModal({ open, onClose, mode, componentId, projectId, recordId, defaultMonth, defaultYear }: Props) {
  const store = useMonitoringSLAStore()
  const existing = recordId ? store.monthlyRecords.find((r) => r.id === recordId) : undefined
  const component = componentId ? store.getComponentById(componentId) : undefined
  const project = projectId ? store.getProjectById(projectId) : (component ? store.getProjectById(component.projectId) : undefined)

  const [month, setMonth] = useState(defaultMonth ?? new Date().getMonth() + 1)
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear())
  const [achievement, setAchievement] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const yearOptions = [2023, 2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) }))

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setMonth(existing.month)
      setYear(existing.year)
      setAchievement(String(existing.achievement))
      setRemark(existing.remark)
    } else {
      setMonth(defaultMonth ?? new Date().getMonth() + 1)
      setYear(defaultYear ?? new Date().getFullYear())
      setAchievement('')
      setRemark('')
    }
    setErrors({})
  }, [open, mode, recordId])

  function validate() {
    const e: Record<string, string> = {}
    const ach = Number(achievement)
    if (achievement === '' || isNaN(ach) || ach < 0 || ach > 100) e.achievement = 'Achievement harus 0–100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      componentId: componentId ?? existing?.componentId ?? '',
      projectId: projectId ?? existing?.projectId ?? component?.projectId ?? '',
      month,
      year,
      achievement: Number(achievement),
      remark: remark.trim(),
    }
    if (mode === 'create') store.addMonthlyRecord(payload)
    else if (mode === 'edit' && recordId) store.updateMonthlyRecord(recordId, payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Data Bulanan' : 'Edit Data Bulanan'}
      description={[project?.kodeProject, component?.componentName].filter(Boolean).join(' › ') || undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Bulan"
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            options={SLA_MONTHS.map((m) => ({ value: String(m), label: slaMonthLabel(m) }))}
          />
          <Select
            label="Tahun"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            options={yearOptions}
          />
        </div>
        <div>
          <Input
            label="Achievement (%) *"
            type="number"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            placeholder="0–100. Contoh: 99.91"
            min={0}
            max={100}
            hint="Nilai pencapaian SLA bulan ini"
          />
          {errors.achievement && <p className="text-[11px] text-pertamina-red mt-1">{errors.achievement}</p>}
        </div>
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Catatan / keterangan…" rows={2} />
      </div>
    </Modal>
  )
}
