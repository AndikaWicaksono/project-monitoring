import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
  componentId?: string
}

export function MonitoringSLAComponentModal({ open, onClose, mode, projectId, componentId }: Props) {
  const store = useMonitoringSLAStore()
  const existing = componentId ? store.getComponentById(componentId) : undefined
  const project = projectId ? store.getProjectById(projectId) : undefined

  const [componentName, setComponentName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setComponentName(existing.componentName)
    } else {
      setComponentName('')
    }
    setErrors({})
  }, [open, mode, componentId])

  function handleSave() {
    const e: Record<string, string> = {}
    if (!componentName.trim()) e.componentName = 'Nama komponen wajib diisi'
    setErrors(e)
    if (Object.keys(e).length) return

    if (mode === 'create' && projectId) {
      store.addComponent({ projectId, componentName: componentName.trim() })
    } else if (mode === 'edit' && componentId) {
      store.updateComponent(componentId, { componentName: componentName.trim() })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Komponen SLA' : 'Edit Komponen SLA'}
      description={project ? `${project.kodeProject} — ${project.namaProject}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Input
            label="Nama Komponen *"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            placeholder="Contoh: Region I, LCD Projector, UPS…"
            autoFocus
          />
          {errors.componentName && <p className="text-[11px] text-danger mt-1">{errors.componentName}</p>}
        </div>
      </div>
    </Modal>
  )
}
