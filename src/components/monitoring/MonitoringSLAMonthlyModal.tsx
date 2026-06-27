import { useState, useEffect } from 'react'
import { Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { useAuthStore } from '../../store/useAuthStore'
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

type Step = 'form' | 'sla-warning' | 'locked'

export function MonitoringSLAMonthlyModal({ open, onClose, mode, componentId, projectId, recordId, defaultMonth, defaultYear }: Props) {
  const store = useMonitoringSLAStore()
  const { isDoccon, canUnlockRecord } = useMonitoringRole()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = recordId ? store.monthlyRecords.find((r) => r.id === recordId) : undefined
  const component = componentId ? store.getComponentById(componentId) : undefined
  const project = projectId
    ? store.getProjectById(projectId)
    : (component ? store.getProjectById(component.projectId) : undefined)

  const now = new Date()
  const autoMonth = now.getMonth() + 1
  const autoYear  = now.getFullYear()

  const [step, setStep]             = useState<Step>('form')
  const [month, setMonth]           = useState(defaultMonth ?? autoMonth)
  const [year, setYear]             = useState(defaultYear ?? autoYear)
  const [achievement, setAchievement] = useState('')
  const [remark, setRemark]         = useState('')
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [savedAchievement, setSavedAchievement] = useState<number | null>(null)

  // Period is locked to current month for Doccon (feature b)
  const periodLocked = isDoccon

  // Detect if a record already exists for this component+month+year in create mode (feature a)
  const duplicateRecord = mode === 'create' && componentId
    ? store.monthlyRecords.find((r) => r.componentId === componentId && r.month === month && r.year === year)
    : undefined

  // Check lock state (feature e)
  const isLocked = existing?.lockedAt != null

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && existing) {
      setMonth(existing.month)
      setYear(existing.year)
      setAchievement(String(existing.achievement))
      setRemark(existing.remark)
      setStep(isLocked && !canUnlockRecord ? 'locked' : 'form')
    } else {
      setMonth(periodLocked ? autoMonth : (defaultMonth ?? autoMonth))
      setYear(periodLocked ? autoYear : (defaultYear ?? autoYear))
      setAchievement('')
      setRemark('')
      setStep('form')
    }
    setErrors({})
    setSavedAchievement(null)
  }, [open, mode, recordId])

  // Real-time validation for achievement field (feature a)
  function validateAchievementRealtime(val: string) {
    const n = Number(val)
    if (val === '') {
      setErrors((e) => ({ ...e, achievement: 'Achievement wajib diisi' }))
    } else if (isNaN(n) || n < 0 || n > 100) {
      setErrors((e) => ({ ...e, achievement: 'Achievement harus antara 0–100' }))
    } else {
      setErrors((e) => { const next = { ...e }; delete next.achievement; return next })
    }
  }

  function handleAchievementChange(val: string) {
    setAchievement(val)
    validateAchievementRealtime(val)
  }

  function validateAll() {
    const e: Record<string, string> = {}
    const ach = Number(achievement)
    if (achievement === '' || isNaN(ach) || ach < 0 || ach > 100) {
      e.achievement = 'Achievement harus antara 0–100'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validateAll()) return

    const ach = Number(achievement)
    const payload = {
      componentId: componentId ?? existing?.componentId ?? '',
      projectId:   projectId  ?? existing?.projectId   ?? component?.projectId ?? '',
      month,
      year,
      achievement: ach,
      remark: remark.trim(),
    }

    if (mode === 'create') {
      store.addMonthlyRecord(payload, currentUser?.name)
    } else if (mode === 'edit' && recordId) {
      store.updateMonthlyRecord(recordId, { ...payload, lockedAt: nowIso(), lockedByName: currentUser?.name ?? null })
    }

    setSavedAchievement(ach)

    // Feature c — cek SLA setelah simpan
    if (project && ach < project.targetSLA) {
      setStep('sla-warning')
    } else {
      toast.success('Data bulanan berhasil disimpan')
      onClose()
    }
  }

  function handleUnlock() {
    if (!recordId) return
    store.unlockRecord(recordId)
    setStep('form')
    toast.success('Data berhasil dibuka untuk diedit')
  }

  const yearOptions = [2023, 2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) }))
  const modalTitle = mode === 'create' ? 'Tambah Data Bulanan' : 'Edit Data Bulanan'
  const description = [project?.kodeProject, component?.componentName].filter(Boolean).join(' › ') || undefined

  // ── Locked state view ────────────────────────────────────────────────────────
  if (step === 'locked') {
    return (
      <Modal open={open} onClose={onClose} title={modalTitle} description={description} size="sm"
        footer={
          <>
            {canUnlockRecord && (
              <Button variant="ghost" onClick={handleUnlock} leftIcon={<Unlock size={13} />}>Buka Kunci</Button>
            )}
            <Button onClick={onClose}>Tutup</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="rounded-full bg-amber-50 p-3">
            <Lock size={22} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-ink-primary">Data terkunci</p>
          <p className="text-xs text-ink-secondary">
            Data ini telah dikunci{existing?.lockedByName ? ` oleh ${existing.lockedByName}` : ''} dan tidak dapat diubah.
            {canUnlockRecord ? ' Klik "Buka Kunci" untuk mengedit.' : ' Hubungi Admin OSM untuk membuka kunci.'}
          </p>
          <div className="w-full rounded-lg bg-black/[0.03] px-4 py-3 text-left text-xs space-y-1 mt-1">
            <div><span className="text-ink-tertiary">Periode:</span> {slaMonthLabel(existing?.month ?? month)} {existing?.year ?? year}</div>
            <div><span className="text-ink-tertiary">Achievement:</span> {existing?.achievement}%</div>
            {existing?.remark && <div><span className="text-ink-tertiary">Remark:</span> {existing.remark}</div>}
          </div>
        </div>
      </Modal>
    )
  }

  // ── SLA not achieved warning ─────────────────────────────────────────────────
  if (step === 'sla-warning') {
    return (
      <Modal open={open} onClose={onClose} title="SLA Tidak Tercapai" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="rounded-full bg-red-50 p-3">
            <AlertTriangle size={22} className="text-pertamina-red" />
          </div>
          <p className="text-sm font-semibold text-pertamina-red">SLA Tidak Tercapai!</p>
          <p className="text-xs text-ink-secondary">
            Achievement <strong>{savedAchievement}%</strong> berada di bawah target SLA <strong>{project?.targetSLA}%</strong> untuk {slaMonthLabel(month)} {year}.
          </p>
          <p className="text-xs text-ink-tertiary">
            Data telah tersimpan dan dikunci. Gunakan tombol "Minta Reconfirm" di halaman detail untuk mengirimkan permintaan recheck ke Engineer On Site.
          </p>
        </div>
      </Modal>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title={modalTitle} description={description} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Feature a — overwrite warning */}
        {duplicateRecord && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <span>Data untuk <strong>{slaMonthLabel(month)} {year}</strong> sudah ada ({duplicateRecord.achievement}%). Menyimpan akan menimpa data tersebut.</span>
          </div>
        )}

        {/* Feature b — period */}
        <div className="grid grid-cols-2 gap-4">
          {periodLocked ? (
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Periode</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-black/[0.02] px-3 py-2 text-xs text-ink-primary">
                <Lock size={11} className="text-ink-tertiary" />
                <span className="font-medium">{slaMonthLabel(month)} {year}</span>
                <span className="text-ink-tertiary ml-1">(otomatis)</span>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Feature a — real-time validated achievement */}
        <div>
          <Input
            label="Achievement (%) *"
            type="number"
            value={achievement}
            onChange={(e) => handleAchievementChange(e.target.value)}
            placeholder="Contoh: 99.9995"
            min={0}
            max={100}
            step={0.0001}
            hint="Toleransi hingga 4 angka desimal (0.0001)"
          />
          {errors.achievement
            ? <p className="text-[11px] text-pertamina-red mt-1">{errors.achievement}</p>
            : achievement !== '' && !isNaN(Number(achievement)) && Number(achievement) >= 0 && Number(achievement) <= 100 && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1">
                <CheckCircle2 size={11} /> Nilai valid
              </p>
            )
          }
          {/* Feature a — preview SLA status real-time */}
          {project && achievement !== '' && !errors.achievement && (
            <p className={`text-[11px] mt-1 font-medium ${Number(achievement) >= project.targetSLA ? 'text-emerald-600' : 'text-pertamina-red'}`}>
              {Number(achievement) >= project.targetSLA
                ? `✓ Memenuhi target SLA ${project.targetSLA}%`
                : `⚠ Di bawah target SLA ${project.targetSLA}% (selisih ${(project.targetSLA - Number(achievement)).toFixed(4)}%)`
              }
            </p>
          )}
        </div>

        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Catatan / keterangan…" rows={2} />
      </div>
    </Modal>
  )
}

function nowIso() {
  return new Date().toISOString()
}
