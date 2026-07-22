import { useState, useEffect } from 'react'
import { TrendingUp, FileText, ClipboardList, Plus, Trash2, FileSignature, Wallet } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { useMonitoringAssignmentStore } from '../../store/useMonitoringAssignmentStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { uid } from '../../utils/helpers'
import type { DeliverablePlanItem, DeliverablePlanTargetType, MonitoringCostStatus } from '../../types/monitoring'

function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

const TARGET_TYPE_OPTIONS: { value: DeliverablePlanTargetType; label: string }[] = [
  { value: 'report_customer', label: 'Laporan Customer' },
  { value: 'report_vendor', label: 'Laporan Vendor' },
  { value: 'billing_tracker', label: 'Event-Based Report (BAPP, dst)' },
]

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  projectId?: string
}

export function MonitoringReportProjectModal({ open, onClose, mode, projectId }: Props) {
  const reportStore     = useMonitoringReportStore()
  const slaStore        = useMonitoringSLAStore()
  const costStore       = useMonitoringCostStore()
  const assignmentStore = useMonitoringAssignmentStore()
  const session         = useAuthStore((s) => s.session)
  const users           = useAuthStore((s) => s.users)
  const selectedMonth   = useUIStore((s) => s.selectedReportMonth)
  const currentUser     = users.find((u) => u.id === session?.userId)
  const existing        = projectId ? reportStore.getProjectById(projectId) : undefined
  const docconUsers     = users.filter((u) => u.role === 'doccon_osm' && u.active)
  const adminOsmUsers   = users.filter((u) => u.role === 'admin_osm' && u.active)
  const somUsers        = users.filter((u) => u.role === 'site_ops_manager' && u.active)

  // ── Shared ──────────────────────────────────────────────────────────────
  const [kodeProject,   setKodeProject]   = useState('')
  const [namaKontrak,   setNamaKontrak]   = useState('')
  const [department,    setDepartment]    = useState('')
  const [catatan,       setCatatan]       = useState('')

  // ── Kontrak (satu sumber — dipakai Report, SLA, dan Cost Monitoring) ──────
  const [client,           setClient]           = useState('')
  const [contractNumber,   setContractNumber]   = useState('')
  const [categoryContract, setCategoryContract] = useState('')
  const [dateOfContract,   setDateOfContract]   = useState('')
  const [startDate,        setStartDate]        = useState('')
  const [endDate,          setEndDate]          = useState('')
  const [isCancelled,      setIsCancelled]      = useState(false)

  // ── Report-specific ─────────────────────────────────────────────────────
  const [picLaporan,    setPicLaporan]    = useState('')
  const [salesCustomer, setSalesCustomer] = useState('')
  const [emailTujuan,   setEmailTujuan]   = useState('')

  // ── SLA-specific ─────────────────────────────────────────────────────────
  const [targetSLA,     setTargetSLA]     = useState<string>('99')

  // ── Cost Monitoring-specific ────────────────────────────────────────────
  const [projectValue,        setProjectValue]        = useState(0)
  const [costBased,           setCostBased]           = useState(0)
  const [displayProjectValue, setDisplayProjectValue] = useState('')
  const [displayCostBased,    setDisplayCostBased]    = useState('')

  function handleIDRChange(field: 'projectValue' | 'costBased', raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    const numVal = digits === '' ? 0 : parseInt(digits, 10)
    const formatted = digits === '' ? '' : fmtIDR(numVal)
    if (field === 'projectValue') { setProjectValue(numVal); setDisplayProjectValue(formatted) }
    else { setCostBased(numVal); setDisplayCostBased(formatted) }
  }

  // ── Deliverable Plan ─────────────────────────────────────────────────────
  const [deliverablePlan, setDeliverablePlan] = useState<DeliverablePlanItem[]>([])
  const [assignDocconId,  setAssignDocconId]  = useState('')
  const [assignAdminOsmId, setAssignAdminOsmId] = useState('')
  const [assignSOMId, setAssignSOMId] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setKodeProject(existing.kodeProject)
      setNamaKontrak(existing.namaKontrak)
      setDepartment(existing.department)
      setCatatan(existing.catatan)
      setClient(existing.client)
      setContractNumber(existing.contractNumber ?? '')
      setCategoryContract(existing.categoryContract ?? '')
      setDateOfContract(existing.dateOfContract ?? '')
      setStartDate(existing.startDate ?? '')
      setEndDate(existing.endDate ?? '')
      setIsCancelled(existing.isCancelled ?? false)
      setPicLaporan(existing.picLaporan)
      setSalesCustomer(existing.salesCustomer)
      setEmailTujuan(existing.emailTujuan)
      // Load current targetSLA from SLA store
      const existingSLA = slaStore.projects.find((p) => p.kodeProject === existing.kodeProject)
      setTargetSLA(existingSLA ? String(existingSLA.targetSLA) : '99')
      // Load current Nilai Kontrak / Cost Based from Cost Monitoring store
      const existingCost = costStore.costs.find((c) => c.projectCode === existing.kodeProject)
      setProjectValue(existingCost?.projectValue ?? 0)
      setCostBased(existingCost?.costBased ?? 0)
      setDisplayProjectValue(existingCost?.projectValue ? fmtIDR(existingCost.projectValue) : '')
      setDisplayCostBased(existingCost?.costBased ? fmtIDR(existingCost.costBased) : '')
      setDeliverablePlan(existing.deliverablePlan ?? [])
      setAssignDocconId('')
      setAssignAdminOsmId('')
      setAssignSOMId('')
    } else {
      setKodeProject(''); setNamaKontrak(''); setDepartment(''); setCatatan('')
      setClient(''); setContractNumber(''); setCategoryContract(''); setDateOfContract('')
      setStartDate(`${selectedMonth}-01`); setEndDate(''); setIsCancelled(false)
      setPicLaporan(''); setSalesCustomer(''); setEmailTujuan('')
      setTargetSLA('99')
      setProjectValue(0); setCostBased(0); setDisplayProjectValue(''); setDisplayCostBased('')
      setDeliverablePlan([]); setAssignDocconId(''); setAssignAdminOsmId(''); setAssignSOMId('')
    }
    setErrors({})
  }, [open, mode, projectId])

  function addDeliverableItem() {
    setDeliverablePlan((items) => [
      ...items,
      { id: uid('dpi'), label: '', targetType: 'report_customer', cadenceMonths: 1, startPhase: 'engineer', active: true },
    ])
  }

  function updateDeliverableItem(id: string, patch: Partial<DeliverablePlanItem>) {
    setDeliverablePlan((items) => items.map((it) => it.id === id ? { ...it, ...patch } : it))
  }

  function removeDeliverableItem(id: string) {
    setDeliverablePlan((items) => items.filter((it) => it.id !== id))
  }

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
    if (!startDate.trim())    e.startDate    = 'Start Date wajib diisi'
    if (endDate.trim() && startDate.trim() && endDate.trim() < startDate.trim()) e.endDate = 'End Date tidak boleh sebelum Start Date'
    const t = parseFloat(targetSLA)
    if (isNaN(t) || t <= 0 || t > 100) e.targetSLA = 'Target SLA harus antara 0.1 – 100'
    for (const item of deliverablePlan) {
      if (!item.label.trim()) e[`deliverable_${item.id}_label`] = 'Nama deliverable wajib diisi'
      if (!Number.isFinite(item.cadenceMonths) || item.cadenceMonths < 1) e[`deliverable_${item.id}_cadence`] = 'Cadence minimal 1 bulan'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return

    const byId   = currentUser?.id   ?? ''
    const byName = currentUser?.name ?? ''

    // Periode bulanan Report/SLA (kontrakMulai/kontrakAkhir) diturunkan otomatis dari
    // Start/End Date — satu-satunya input tanggal yang diisi Nurlaela.
    const startDateTrim = startDate.trim()
    const endDateTrim   = endDate.trim()
    const kontrakMulai  = startDateTrim.slice(0, 7)
    const kontrakAkhir  = endDateTrim ? endDateTrim.slice(0, 7) : null
    const costStatus: MonitoringCostStatus = isCancelled ? 'cancelled' : 'active'

    // ── Create / Edit Report project ────────────────────────────────────
    // excludedMonths sengaja gak dimasukkan di sini — itu dikelola lewat "Hapus dari bulan ini saja"
    // di halaman List Project, bukan dari form ini, jadi gak boleh ketimpa waktu edit.
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
      kontrakMulai,
      kontrakAkhir,
      contractNumber:   contractNumber.trim(),
      categoryContract: categoryContract.trim(),
      dateOfContract:   dateOfContract.trim() || null,
      startDate:        startDateTrim || null,
      endDate:          endDateTrim || null,
      isCancelled,
      deliverablePlan: deliverablePlan.map((d) => ({ ...d, label: d.label.trim() })),
      createdByUserId: byId,
      createdByName:   byName,
    }

    // Field kontrak yang disinkronkan ke Cost Monitoring — Master Data adalah satu-satunya sumber.
    const costSyncFields = {
      projectClient:    client.trim(),
      projectName:      namaKontrak.trim(),
      contractNumber:   contractNumber.trim(),
      categoryContract: categoryContract.trim(),
      dateOfContract:   dateOfContract.trim() || null,
      startDate:        startDateTrim || null,
      endDate:          endDateTrim || null,
      status:           costStatus,
      projectValue,
      costBased,
    }

    if (mode === 'create') {
      const createdProject = reportStore.addProject({ ...reportPayload, excludedMonths: [] })

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

      // ── Also create Cost Monitoring shell record (data finansial diisi belakangan) ──
      costStore.addCost({
        projectId: kodeProject.trim(),
        projectCode: kodeProject.trim(),
        year: parseInt(kontrakMulai.split('-')[0], 10) || new Date().getFullYear(),
        ...costSyncFields,
        actualCost: 0,
        amandemen: '',
        tkdn: 0,
        description: '',
        createdByUserId: byId,
        createdByName:   byName,
      })

      // ── Assign Doccon (opsional) — men-trigger generate deliverable otomatis ──
      if (assignDocconId) {
        assignmentStore.assign(createdProject.kodeProject, assignDocconId, byId, byName)
      }
      // ── Assign Admin OSM (opsional) ──
      if (assignAdminOsmId) {
        const adminOsm = adminOsmUsers.find((u) => u.id === assignAdminOsmId)
        assignmentStore.assignAdminOsm(createdProject.kodeProject, assignAdminOsmId, adminOsm?.name ?? '', byId, byName)
      }
      // ── Assign Site Operation Manager (opsional) ──
      if (assignSOMId) {
        const som = somUsers.find((u) => u.id === assignSOMId)
        assignmentStore.assignSOM(createdProject.kodeProject, assignSOMId, som?.name ?? '', byId, byName)
      }
    } else if (mode === 'edit' && projectId) {
      reportStore.updateProject(projectId, reportPayload)
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
      // Also sync Cost Monitoring's identity/contract fields — sebelumnya cuma disinkron
      // waktu create, jadi edit di sini gak pernah kepakai ke Cost (sumber drift status).
      const existingCost = costStore.costs.find((c) => c.projectCode === kodeProject.trim())
      if (existingCost) {
        costStore.updateCost(existingCost.id, costSyncFields)
      }
      // Kalau project sudah pernah diassign, generate ulang sekarang juga —
      // supaya perubahan/penambahan deliverable langsung kepakai, gak nunggu Doccon buka halaman detail.
      const asgn = assignmentStore.getByKode(kodeProject.trim())
      if (asgn?.assignedDocconId) {
        reportStore.generateDeliverablesForKodeProject(kodeProject.trim(), asgn.assignedDocconId)
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

        {/* ── Kontrak section — satu sumber, dipakai Report, SLA, dan Cost Monitoring ──── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <FileSignature size={13} className="text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Kontrak</span>
            <div className="flex-1 h-px bg-amber-100" />
          </div>
          <p className="text-[11px] text-ink-tertiary mb-3">
            Field di bawah ini jadi satu sumber untuk Report, SLA, dan Cost Monitoring — gak perlu diisi ulang di masing-masing modul.
          </p>
          <div className="space-y-4">
            <div>
              <Input
                label="Client *"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nama perusahaan client"
              />
              {errors.client && <p className="text-[11px] text-danger mt-1">{errors.client}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nomor Kontrak"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="No. kontrak"
              />
              <Input
                label="Kategori Kontrak"
                value={categoryContract}
                onChange={(e) => setCategoryContract(e.target.value)}
                placeholder="Kategori"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Tanggal Kontrak"
                type="date"
                value={dateOfContract}
                onChange={(e) => setDateOfContract(e.target.value)}
              />
              <div>
                <Input
                  label="Start Date *"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {errors.startDate && <p className="text-[11px] text-danger mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  hint="Kosongkan kalau kontrak masih aktif"
                />
                {errors.endDate && <p className="text-[11px] text-danger mt-1">{errors.endDate}</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCancelled}
                onChange={(e) => setIsCancelled(e.target.checked)}
                className="rounded border-border-default accent-pertamina-red"
              />
              <span className="text-xs text-ink-secondary">Batalkan Project</span>
            </label>
          </div>
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

        {/* ── Cost Monitoring section ──────────────────────────────────── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={13} className="text-emerald-600 shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Data Cost Monitoring</span>
            <div className="flex-1 h-px bg-emerald-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Nilai Kontrak (IDR)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayProjectValue}
                  onChange={(e) => handleIDRChange('projectValue', e.target.value)}
                  className="input-base"
                  placeholder="0"
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Cost Based (IDR)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayCostBased}
                  onChange={(e) => handleIDRChange('costBased', e.target.value)}
                  className="input-base"
                  placeholder="0"
                />
              </label>
            </div>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Bisa juga diisi/diubah nanti dari halaman Cost Monitoring.</p>
        </div>

        {/* ── Deliverable Plan section ─────────────────────────────────── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={13} className="text-emerald-600 shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Deliverable Plan</span>
            <div className="flex-1 h-px bg-emerald-100" />
          </div>
          <p className="text-[11px] text-ink-tertiary mb-3">
            Dokumen deliverable yang wajib ada untuk project ini. Begitu project diassign ke Doccon, dokumen untuk periode yang jatuh tempo langsung dibuat otomatis (status Draft).
          </p>
          {deliverablePlan.length > 0 && (
            <div className="space-y-2.5 mb-2.5">
              {deliverablePlan.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-subtle bg-black/[0.015] p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Select
                        value={item.targetType}
                        onChange={(e) => updateDeliverableItem(item.id, { targetType: e.target.value as DeliverablePlanTargetType })}
                        options={TARGET_TYPE_OPTIONS}
                        className="text-xs py-1.5"
                      />
                      <div>
                        <Input
                          value={item.label}
                          onChange={(e) => updateDeliverableItem(item.id, { label: e.target.value })}
                          placeholder="Nama deliverable, contoh: Laporan Bulanan"
                          className="text-xs py-1.5"
                        />
                        {errors[`deliverable_${item.id}_label`] && <p className="text-[11px] text-danger mt-1">{errors[`deliverable_${item.id}_label`]}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeliverableItem(item.id)}
                      className="shrink-0 rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition mt-0.5"
                      title="Hapus deliverable"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                      Tiap
                      <input
                        type="number"
                        min={1}
                        value={item.cadenceMonths}
                        onChange={(e) => updateDeliverableItem(item.id, { cadenceMonths: parseInt(e.target.value, 10) || 1 })}
                        className="input-base w-14 text-xs py-1 text-center"
                      />
                      bulan
                    </label>
                    {errors[`deliverable_${item.id}_cadence`] && <p className="text-[11px] text-danger">{errors[`deliverable_${item.id}_cadence`]}</p>}
                    {item.targetType === 'report_customer' && (
                      <div className="flex items-center gap-3 ml-auto">
                        <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer">
                          <input type="radio" name={`startPhase-${item.id}`} checked={item.startPhase !== 'doccon'} onChange={() => updateDeliverableItem(item.id, { startPhase: 'engineer' })} className="accent-pertamina-red" />
                          Perlu input Engineer
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer">
                          <input type="radio" name={`startPhase-${item.id}`} checked={item.startPhase === 'doccon'} onChange={() => updateDeliverableItem(item.id, { startPhase: 'doccon' })} className="accent-pertamina-red" />
                          Doccon langsung
                        </label>
                      </div>
                    )}
                  </div>
                  {(item.targetType === 'report_customer' || item.targetType === 'report_vendor') && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-ink-tertiary">Approval:</span>
                      <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer">
                        <input type="radio" name={`requiresKadiv-${item.id}`} checked={item.requiresKadiv !== false} onChange={() => updateDeliverableItem(item.id, { requiresKadiv: true })} className="accent-pertamina-red" />
                        Perlu approval Kadiv
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer">
                        <input type="radio" name={`requiresKadiv-${item.id}`} checked={item.requiresKadiv === false} onChange={() => updateDeliverableItem(item.id, { requiresKadiv: false })} className="accent-pertamina-red" />
                        Cukup Kadep saja
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addDeliverableItem}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
          >
            <Plus size={11} /> Tambah Deliverable
          </button>

          {isCreate && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Select
                  label="Assign Doccon (opsional)"
                  value={assignDocconId}
                  onChange={(e) => setAssignDocconId(e.target.value)}
                  options={[{ value: '', label: '— Belum diassign —' }, ...docconUsers.map((u) => ({ value: u.id, label: u.name }))]}
                  className="text-xs py-1.5"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">Bisa juga diassign nanti dari halaman "Penugasan Project · Doccon".</p>
              </div>
              <div>
                <Select
                  label="Assign Admin OSM (opsional)"
                  value={assignAdminOsmId}
                  onChange={(e) => setAssignAdminOsmId(e.target.value)}
                  options={[{ value: '', label: '— Belum diassign —' }, ...adminOsmUsers.map((u) => ({ value: u.id, label: u.name }))]}
                  className="text-xs py-1.5"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">Bisa juga diassign nanti dari halaman "Penugasan Project · Doccon".</p>
              </div>
              <div>
                <Select
                  label="Assign Site Operation Manager (opsional)"
                  value={assignSOMId}
                  onChange={(e) => setAssignSOMId(e.target.value)}
                  options={[{ value: '', label: '— Belum diassign —' }, ...somUsers.map((u) => ({ value: u.id, label: u.name }))]}
                  className="text-xs py-1.5"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">Bisa juga diassign nanti dari halaman "Penugasan Project · Doccon".</p>
              </div>
            </div>
          )}
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
            Project ini akan otomatis dibuat di <strong>Report Project</strong>, <strong>SLA Monitoring</strong>, dan <strong>Cost Monitoring</strong>.
            PIC Doccon akan terisi setelah Anda assign Doccon dari halaman ini.
          </div>
        )}
      </div>
    </Modal>
  )
}
