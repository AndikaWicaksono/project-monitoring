import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useAuthStore } from '../../store/useAuthStore'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
}

export function MonitoringSLAProjectModal({ open, onClose, mode, projectId }: Props) {
  const store = useMonitoringSLAStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const existing = projectId ? store.getProjectById(projectId) : undefined

  const [kodeProject, setKodeProject] = useState('')
  const [namaProject, setNamaProject] = useState('')
  const [department, setDepartment] = useState('')
  const [pic, setPic] = useState('')
  const [targetSLA, setTargetSLA] = useState('98')
  const [catatan, setCatatan] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setKodeProject(existing.kodeProject)
      setNamaProject(existing.namaProject)
      setDepartment(existing.department)
      setPic(existing.pic)
      setTargetSLA(String(existing.targetSLA))
      setCatatan(existing.catatan)
    } else {
      setKodeProject(''); setNamaProject(''); setDepartment('')
      setPic(''); setTargetSLA('98'); setCatatan('')
    }
    setErrors({})
  }, [open, mode, projectId])

  function validate() {
    const e: Record<string, string> = {}
    if (!kodeProject.trim()) e.kodeProject = 'Kode project wajib diisi'
    if (!namaProject.trim()) e.namaProject = 'Nama project wajib diisi'
    if (!department.trim()) e.department = 'Department wajib diisi'
    const t = Number(targetSLA)
    if (isNaN(t) || t < 0 || t > 100) e.targetSLA = 'Target SLA harus 0–100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      kodeProject: kodeProject.trim(),
      namaProject: namaProject.trim(),
      department: department.trim(),
      pic: pic.trim(),
      targetSLA: Number(targetSLA),
      catatan: catatan.trim(),
      createdByUserId: currentUser?.id ?? '',
      createdByName: currentUser?.name ?? '',
    }
    if (mode === 'create') store.addProject(payload)
    else if (mode === 'edit' && projectId) store.updateProject(projectId, payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Project SLA' : 'Edit Project SLA'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Kode Project *" value={kodeProject} onChange={(e) => setKodeProject(e.target.value)} placeholder="MS-XXXX" />
            {errors.kodeProject && <p className="text-[11px] text-pertamina-red mt-1">{errors.kodeProject}</p>}
          </div>
          <div>
            <Input label="Target SLA (%) *" type="number" value={targetSLA} onChange={(e) => setTargetSLA(e.target.value)} placeholder="98" min={0} max={100} hint="0–100. Contoh: 98" />
            {errors.targetSLA && <p className="text-[11px] text-pertamina-red mt-1">{errors.targetSLA}</p>}
          </div>
        </div>
        <div>
          <Input label="Nama Project *" value={namaProject} onChange={(e) => setNamaProject(e.target.value)} placeholder="Nama project" />
          {errors.namaProject && <p className="text-[11px] text-pertamina-red mt-1">{errors.namaProject}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Department *" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Nama department" />
            {errors.department && <p className="text-[11px] text-pertamina-red mt-1">{errors.department}</p>}
          </div>
          <Input label="PIC" value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" />
        </div>
        <Textarea label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan…" rows={2} />
      </div>
    </Modal>
  )
}
