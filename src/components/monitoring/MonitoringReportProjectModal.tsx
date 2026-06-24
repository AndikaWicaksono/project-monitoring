import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
}

export function MonitoringReportProjectModal({ open, onClose, mode, projectId }: Props) {
  const store = useMonitoringReportStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const selectedReportMonth = useUIStore((s) => s.selectedReportMonth)
  const currentUser = users.find((u) => u.id === session?.userId)
  const existing = projectId ? store.getProjectById(projectId) : undefined

  const [kodeProject, setKodeProject] = useState('')
  const [client, setClient] = useState('')
  const [namaKontrak, setNamaKontrak] = useState('')
  const [department, setDepartment] = useState('')
  const [picDocon, setPicDocon] = useState('')
  const [picLaporan, setPicLaporan] = useState('')
  const [salesCustomer, setSalesCustomer] = useState('')
  const [emailTujuan, setEmailTujuan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [kontrakMulai, setKontrakMulai] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setKodeProject(existing.kodeProject); setClient(existing.client)
      setNamaKontrak(existing.namaKontrak); setDepartment(existing.department)
      setPicDocon(existing.picDocon); setPicLaporan(existing.picLaporan)
      setSalesCustomer(existing.salesCustomer); setEmailTujuan(existing.emailTujuan)
      setCatatan(existing.catatan); setKontrakMulai(existing.kontrakMulai)
    } else {
      setKodeProject(''); setClient(''); setNamaKontrak(''); setDepartment('')
      setPicDocon(''); setPicLaporan(''); setSalesCustomer(''); setEmailTujuan('')
      setCatatan(''); setKontrakMulai(selectedReportMonth)
    }
    setErrors({})
  }, [open, mode, projectId])

  function validate() {
    const e: Record<string, string> = {}
    if (!kodeProject.trim()) e.kodeProject = 'Kode Project wajib diisi'
    if (!client.trim()) e.client = 'Client wajib diisi'
    if (!namaKontrak.trim()) e.namaKontrak = 'Nama Kontrak wajib diisi'
    if (!department.trim()) e.department = 'Department wajib diisi'
    if (!picLaporan.trim()) e.picLaporan = 'PIC Laporan wajib diisi'
    if (!kontrakMulai.trim()) e.kontrakMulai = 'Periode mulai wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      kodeProject: kodeProject.trim(), client: client.trim(), namaKontrak: namaKontrak.trim(),
      department: department.trim(), picDocon: picDocon.trim(), picLaporan: picLaporan.trim(),
      salesCustomer: salesCustomer.trim(), emailTujuan: emailTujuan.trim(), catatan: catatan.trim(),
      kontrakMulai: kontrakMulai.trim(), kontrakAkhir: null as string | null,
      createdByUserId: currentUser?.id ?? '', createdByName: currentUser?.name ?? '',
    }
    if (mode === 'create') store.addProject(payload)
    else if (mode === 'edit' && projectId) {
      const { kontrakAkhir: _, ...rest } = payload
      store.updateProject(projectId, rest)
    }
    onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={mode === 'create' ? 'Tambah Project Laporan' : 'Edit Project Laporan'}
      size="xl"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave}>{mode === 'create' ? 'Simpan' : 'Update'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Kode Project *" value={kodeProject} onChange={(e) => setKodeProject(e.target.value)} placeholder="PGN-IT-001" />
            {errors.kodeProject && <p className="text-[11px] text-pertamina-red mt-1">{errors.kodeProject}</p>}
          </div>
          <div>
            <Input label="Client *" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nama perusahaan client" />
            {errors.client && <p className="text-[11px] text-pertamina-red mt-1">{errors.client}</p>}
          </div>
        </div>
        <div>
          <Input label="Nama Kontrak *" value={namaKontrak} onChange={(e) => setNamaKontrak(e.target.value)} placeholder="Nama kontrak lengkap" />
          {errors.namaKontrak && <p className="text-[11px] text-pertamina-red mt-1">{errors.namaKontrak}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Department *" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Nama departemen" />
            {errors.department && <p className="text-[11px] text-pertamina-red mt-1">{errors.department}</p>}
          </div>
          <div>
            <Input label="PIC Laporan *" value={picLaporan} onChange={(e) => setPicLaporan(e.target.value)} placeholder="Nama PIC Laporan" />
            {errors.picLaporan && <p className="text-[11px] text-pertamina-red mt-1">{errors.picLaporan}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="PIC Docon" value={picDocon} onChange={(e) => setPicDocon(e.target.value)} placeholder="Nama PIC Docon" />
          <Input label="Sales Customer" value={salesCustomer} onChange={(e) => setSalesCustomer(e.target.value)} placeholder="Nama Sales" />
        </div>
        <Input label="Email Tujuan" type="email" value={emailTujuan} onChange={(e) => setEmailTujuan(e.target.value)} placeholder="email@domain.com" />
        <div>
          <Input
            label="Periode Mulai Kontrak *"
            type="month"
            value={kontrakMulai}
            onChange={(e) => setKontrakMulai(e.target.value)}
            hint="Project akan muncul di list mulai dari periode ini"
          />
          {errors.kontrakMulai && <p className="text-[11px] text-pertamina-red mt-1">{errors.kontrakMulai}</p>}
        </div>
        <Textarea label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan…" rows={2} />
      </div>
    </Modal>
  )
}
