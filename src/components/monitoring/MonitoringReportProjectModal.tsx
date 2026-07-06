import { useState, useEffect } from 'react'
import { TrendingUp, FileText } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
}

export function MonitoringReportProjectModal({ open, onClose, mode, projectId }: Props) {
  const reportStore   = useMonitoringReportStore()
  const slaStore      = useMonitoringSLAStore()
  const session       = useAuthStore((s) => s.session)
  const users         = useAuthStore((s) => s.users)
  const selectedMonth = useUIStore((s) => s.selectedReportMonth)
  const currentUser   = users.find((u) => u.id === session?.userId)
  const existing      = projectId ? reportStore.getProjectById(projectId) : undefined

  // ── Shared ──────────────────────────────────────────────────────────────
  const [kodeProject,   setKodeProject]   = useState('')
  const [namaKontrak,   setNamaKontrak]   = useState('')
  const [department,    setDepartment]    = useState('')
  const [catatan,       setCatatan]       = useState('')

  // ── Report-specific ─────────────────────────────────────────────────────
  const [client,        setClient]        = useState('')
  const [picLaporan,    setPicLaporan]    = useState('')
  const [salesCustomer, setSalesCustomer] = useState('')
  const [emailTujuan,   setEmailTujuan]   = useState('')
  const [kontrakMulai,  setKontrakMulai]  = useState('')

  // ── SLA-specific ─────────────────────────────────────────────────────────
  const [targetSLA,     setTargetSLA]     = useState<string>('99')

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setKodeProject(existing.kodeProject)
      setNamaKontrak(existing.namaKontrak)
      setDepartment(existing.department)
      setCatatan(existing.catatan)
      setClient(existing.client)
      setPicLaporan(existing.picLaporan)
      setSalesCustomer(existing.salesCustomer)
      setEmailTujuan(existing.emailTujuan)
      setKontrakMulai(existing.kontrakMulai)
      // Load current targetSLA from SLA store
      const existingSLA = slaStore.projects.find((p) => p.kodeProject === existing.kodeProject)
      setTargetSLA(existingSLA ? String(existingSLA.targetSLA) : '99')
    } else {
      setKodeProject(''); setNamaKontrak(''); setDepartment(''); setCatatan('')
      setClient(''); setPicLaporan(''); setSalesCustomer(''); setEmailTujuan('')
      setKontrakMulai(selectedMonth); setTargetSLA('99')
    }
    setErrors({})
  }, [open, mode, projectId])

  function validate() {
    const e: Record<string, string> = {}
    if (!kodeProject.trim())  e.kodeProject  = 'Kode Project wajib diisi'
    else if (mode === 'create') {
      const kode = kodeProject.trim().toLowerCase()
      const dupReport = reportStore.projects.find((p) => p.kodeProject.toLowerCase() === kode)
      if (dupReport) e.kodeProject = `Kode "${kodeProject.trim()}" sudah digunakan di Report Project`
    }
    if (!namaKontrak.trim())  e.namaKontrak  = 'Nama Project wajib diisi'
    if (!department.trim())   e.department   = 'Department wajib diisi'
    if (!client.trim())       e.client       = 'Client wajib diisi'
    if (!kontrakMulai.trim()) e.kontrakMulai = 'Periode mulai wajib diisi'
    const t = parseFloat(targetSLA)
    if (isNaN(t) || t <= 0 || t > 100) e.targetSLA = 'Target SLA harus antara 0.1 – 100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return

    const byId   = currentUser?.id   ?? ''
    const byName = currentUser?.name ?? ''

    // ── Create / Edit Report project ────────────────────────────────────
    const reportPayload = {
      kodeProject:    kodeProject.trim(),
      client:         client.trim(),
      namaKontrak:    namaKontrak.trim(),
      department:     department.trim(),
      picDocon:       '',
      picLaporan:     picLaporan.trim(),
      salesCustomer:  salesCustomer.trim(),
      emailTujuan:    emailTujuan.trim(),
      catatan:        catatan.trim(),
      kontrakMulai:   kontrakMulai.trim(),
      kontrakAkhir:   null as string | null,
      excludedMonths: [] as string[],
      createdByUserId: byId,
      createdByName:   byName,
    }

    if (mode === 'create') {
      reportStore.addProject(reportPayload)

      // ── Also create SLA project ──────────────────────────────────────
      slaStore.addProject({
        kodeProject: kodeProject.trim(),
        namaProject: namaKontrak.trim(),
        department:  department.trim(),
        pic:         picLaporan.trim(),
        targetSLA:   parseFloat(targetSLA),
        catatan:     catatan.trim(),
        createdByUserId: byId,
        createdByName:   byName,
      })
    } else if (mode === 'edit' && projectId) {
      const { kontrakAkhir: _, ...rest } = reportPayload
      reportStore.updateProject(projectId, rest)
      // Also update SLA project
      const existingSLA = slaStore.projects.find((p) => p.kodeProject === kodeProject.trim())
      if (existingSLA) {
        slaStore.updateProject(existingSLA.id, {
          namaProject: namaKontrak.trim(),
          department:  department.trim(),
          pic:         picLaporan.trim(),
          targetSLA:   parseFloat(targetSLA),
          catatan:     catatan.trim(),
        })
      }
    }

    onClose()
  }

  const isCreate = mode === 'create'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Tambah Project' : 'Edit Project Laporan'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>
            {isCreate ? 'Simpan ke Report & SLA' : 'Update'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* ── Shared info ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Kode Project *"
              value={kodeProject}
              onChange={(e) => setKodeProject(e.target.value)}
              placeholder="Contoh: PS-024-00"
              hint={isCreate ? 'Kode ini menghubungkan data Report dan SLA' : undefined}
              disabled={!isCreate}
            />
            {errors.kodeProject && <p className="text-[11px] text-danger mt-1">{errors.kodeProject}</p>}
          </div>
          <div>
            <Input
              label="Department *"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Nama departemen"
            />
            {errors.department && <p className="text-[11px] text-danger mt-1">{errors.department}</p>}
          </div>
        </div>

        <div>
          <Input
            label="Nama Project / Kontrak *"
            value={namaKontrak}
            onChange={(e) => setNamaKontrak(e.target.value)}
            placeholder="Nama lengkap pekerjaan / kontrak"
            hint={isCreate ? 'Dipakai sebagai Nama Project di SLA dan Nama Kontrak di Report' : undefined}
          />
          {errors.namaKontrak && <p className="text-[11px] text-danger mt-1">{errors.namaKontrak}</p>}
        </div>

        {/* ── Report section ───────────────────────────────────────────── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={13} className="text-blue-500 shrink-0" />
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Detail Report</span>
            <div className="flex-1 h-px bg-blue-100" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Client *"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Nama perusahaan client"
                />
                {errors.client && <p className="text-[11px] text-danger mt-1">{errors.client}</p>}
              </div>
              <div>
                <Input
                  label="Periode Mulai Kontrak *"
                  type="month"
                  value={kontrakMulai}
                  onChange={(e) => setKontrakMulai(e.target.value)}
                />
                {errors.kontrakMulai && <p className="text-[11px] text-danger mt-1">{errors.kontrakMulai}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="PIC Laporan"
                value={picLaporan}
                onChange={(e) => setPicLaporan(e.target.value)}
                placeholder="Penanggung jawab laporan"
              />
              <Input
                label="Sales Customer"
                value={salesCustomer}
                onChange={(e) => setSalesCustomer(e.target.value)}
                placeholder="Nama Sales"
              />
            </div>
            <Input
              label="Email Tujuan"
              type="email"
              value={emailTujuan}
              onChange={(e) => setEmailTujuan(e.target.value)}
              placeholder="email@domain.com"
            />
          </div>
        </div>

        {/* ── SLA section ──────────────────────────────────────────────── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-violet-500 shrink-0" />
            <span className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider">Data SLA</span>
            <div className="flex-1 h-px bg-violet-100" />
          </div>
          <div>
            <Input
              label="Target SLA (%) *"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={targetSLA}
              onChange={(e) => setTargetSLA(e.target.value)}
              placeholder="99"
              hint={isCreate ? 'Persentase pencapaian minimum yang harus dipenuhi setiap bulan' : undefined}
            />
            {errors.targetSLA && <p className="text-[11px] text-danger mt-1">{errors.targetSLA}</p>}
          </div>
        </div>

        {/* ── Catatan ──────────────────────────────────────────────────── */}
        <Textarea
          label="Catatan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan tambahan…"
          rows={2}
        />

        {/* ── Info box ─────────────────────────────────────────────────── */}
        {isCreate && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-2.5 text-[11px] text-blue-700 leading-relaxed">
            Project ini akan otomatis dibuat di <strong>Report Project</strong> dan <strong>SLA Monitoring</strong>.
            PIC Doccon akan terisi setelah Anda assign Doccon dari halaman ini.
          </div>
        )}
      </div>
    </Modal>
  )
}
