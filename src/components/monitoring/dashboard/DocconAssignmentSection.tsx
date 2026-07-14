import { useMemo, useState, useEffect } from 'react'
import { Search, ClipboardList, Users, CheckCircle2, UserCheck, Plus, Trash2, AlertTriangle, Pencil, X } from 'lucide-react'
import { useMonitoringAssignmentStore } from '../../../store/useMonitoringAssignmentStore'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'
import { useAuthStore } from '../../../store/useAuthStore'
import { useUIStore } from '../../../store/useUIStore'
import { usePermissions } from '../../../hooks/usePermissions'
import { Button } from '../../ui/Button'
import { classNames } from '../../../utils/helpers'

interface UnifiedProject {
  kodeProject: string
  namaProject: string
  client: string
  modules: ('Report' | 'SLA')[]
}

interface Props {
  canAssign: boolean
}

export function DocconAssignmentSection({ canAssign }: Props) {
  const { assignments, assign, assignAdminOsm, removeByKode } = useMonitoringAssignmentStore()
  const reportProjects  = useMonitoringReportStore((s) => s.projects)
  const slaProjects     = useMonitoringSLAStore((s) => s.projects)
  const costs           = useMonitoringCostStore((s) => s.costs)
  const addCost         = useMonitoringCostStore((s) => s.addCost)
  const updateCost      = useMonitoringCostStore((s) => s.updateCost)
  const deleteReport    = useMonitoringReportStore((s) => s.deleteProject)
  const deleteSLA       = useMonitoringSLAStore((s) => s.deleteProject)
  const users           = useAuthStore((s) => s.users)
  const openModal       = useUIStore((s) => s.openModal)
  const { user }        = usePermissions()

  const [search,         setSearch]         = useState('')
  const [filterDocconId, setFilterDocconId]  = useState('')
  const [filterClient,   setFilterClient]    = useState('')
  const [currentPage,    setCurrentPage]     = useState(1)
  const [assignModal,     setAssignModal]     = useState<{ kodeProject: string; namaProject: string; hasCost: boolean } | null>(null)
  const [selectedDoccon,  setSelectedDoccon]  = useState('')
  const [selectedAdminOsm, setSelectedAdminOsm] = useState('')
  const [deleteConfirm,   setDeleteConfirm]   = useState<{ kodeProject: string; namaProject: string } | null>(null)

  const docconUsers = useMemo(
    () => users.filter((u) => u.role === 'doccon_osm' && u.active),
    [users],
  )
  const adminOsmUsers = useMemo(
    () => users.filter((u) => u.role === 'admin_osm' && u.active),
    [users],
  )
  const costsByKode = useMemo(() => new Set(costs.map((c) => c.projectCode)), [costs])

  // Union of all projects from both modules
  const allProjects = useMemo<UnifiedProject[]>(() => {
    const map = new Map<string, UnifiedProject>()
    for (const p of reportProjects) {
      if (!map.has(p.kodeProject)) map.set(p.kodeProject, { kodeProject: p.kodeProject, namaProject: p.namaKontrak, client: p.client, modules: [] })
      map.get(p.kodeProject)!.modules.push('Report')
    }
    for (const p of slaProjects) {
      if (!map.has(p.kodeProject)) map.set(p.kodeProject, { kodeProject: p.kodeProject, namaProject: p.namaProject, client: '', modules: [] })
      map.get(p.kodeProject)!.modules.push('SLA')
    }
    return [...map.values()].sort((a, b) => a.kodeProject.localeCompare(b.kodeProject))
  }, [reportProjects, slaProjects])

  // Sinkronisasi otomatis — pastikan SEMUA project di Master Data (Report/SLA) selalu punya record
  // Cost Monitoring, termasuk project yang dibuat manual (bukan cuma yang ada di seed data). Selain
  // bikin record yang belum ada, efek ini juga menjaga identitas & kontrak Cost tetap sinkron dengan
  // Report Project (satu sumber kebenaran) — jadi Nurlaela cukup edit sekali di Master Data.
  useEffect(() => {
    for (const p of allProjects) {
      const rp = reportProjects.find((r) => r.kodeProject === p.kodeProject)
      const syncFields = {
        projectClient:    p.client,
        projectName:      p.namaProject,
        contractNumber:   rp?.contractNumber ?? '',
        categoryContract: rp?.categoryContract ?? '',
        dateOfContract:   rp?.dateOfContract ?? null,
        startDate:        rp?.startDate ?? null,
        endDate:          rp?.endDate ?? null,
        status:           rp?.isCancelled ? ('cancelled' as const) : ('active' as const),
      }
      const existingCost = costs.find((c) => c.projectCode === p.kodeProject)
      if (!existingCost) {
        addCost({
          projectId: p.kodeProject, projectCode: p.kodeProject, year: new Date().getFullYear(),
          ...syncFields,
          projectValue: 0, costBased: 0, actualCost: 0, amandemen: '', tkdn: 0, description: '',
          createdByUserId: user?.id ?? 'system', createdByName: user?.name ?? 'System',
        })
        continue
      }
      const isDrifted =
        existingCost.projectClient    !== syncFields.projectClient ||
        existingCost.projectName      !== syncFields.projectName ||
        existingCost.contractNumber   !== syncFields.contractNumber ||
        existingCost.categoryContract !== syncFields.categoryContract ||
        existingCost.dateOfContract   !== syncFields.dateOfContract ||
        existingCost.startDate        !== syncFields.startDate ||
        existingCost.endDate          !== syncFields.endDate ||
        existingCost.status           !== syncFields.status
      if (isDrifted) updateCost(existingCost.id, syncFields)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects, reportProjects, costs])

  // Count assigned projects per doccon
  const workload = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assignments) {
      if (a.assignedDocconId) map[a.assignedDocconId] = (map[a.assignedDocconId] ?? 0) + 1
    }
    return map
  }, [assignments])

  const maxWorkload = useMemo(() => Math.max(...Object.values(workload), 1), [workload])

  // Count assigned projects per Admin OSM
  const adminOsmWorkload = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assignments) {
      if (a.assignedAdminOsmId) map[a.assignedAdminOsmId] = (map[a.assignedAdminOsmId] ?? 0) + 1
    }
    return map
  }, [assignments])

  const maxAdminOsmWorkload = useMemo(() => Math.max(...Object.values(adminOsmWorkload), 1), [adminOsmWorkload])

  const unassignedCount = useMemo(
    () => allProjects.filter((p) => !assignments.find((a) => a.kodeProject === p.kodeProject)?.assignedDocconId).length,
    [allProjects, assignments],
  )

  // Admin OSM cuma relevan buat project yang punya data Cost Monitoring
  const adminOsmUnassignedCount = useMemo(
    () => allProjects.filter((p) => costsByKode.has(p.kodeProject) && !assignments.find((a) => a.kodeProject === p.kodeProject)?.assignedAdminOsmId).length,
    [allProjects, costsByKode, assignments],
  )

  const uniqueClients = useMemo(
    () => [...new Set(allProjects.map((p) => p.client).filter(Boolean))].sort(),
    [allProjects],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allProjects.filter((p) => {
      if (filterDocconId === '__unassigned__') {
        if (assignments.find((a) => a.kodeProject === p.kodeProject)?.assignedDocconId) return false
      } else if (filterDocconId) {
        if (assignments.find((a) => a.kodeProject === p.kodeProject)?.assignedDocconId !== filterDocconId) return false
      }
      if (filterClient && p.client !== filterClient) return false
      if (q && !p.kodeProject.toLowerCase().includes(q) && !p.namaProject.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false
      return true
    })
  }, [allProjects, assignments, search, filterDocconId, filterClient])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => { setCurrentPage(1) }, [search, filterDocconId, filterClient])

  const paginatedProjects = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  )

  function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end   = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
  }

  function openAssign(p: UnifiedProject) {
    const asgn = assignments.find((a) => a.kodeProject === p.kodeProject)
    setAssignModal({ kodeProject: p.kodeProject, namaProject: p.namaProject, hasCost: costsByKode.has(p.kodeProject) })
    setSelectedDoccon(asgn?.assignedDocconId ?? '')
    setSelectedAdminOsm(asgn?.assignedAdminOsmId ?? '')
  }

  function handleSaveAssign() {
    if (!assignModal) return
    assign(assignModal.kodeProject, selectedDoccon || null, user?.id ?? null, user?.name ?? null)
    if (assignModal.hasCost) {
      const adminOsm = adminOsmUsers.find((u) => u.id === selectedAdminOsm)
      assignAdminOsm(assignModal.kodeProject, adminOsm?.id ?? null, adminOsm?.name ?? null, user?.id ?? null, user?.name ?? null)
    }
    setAssignModal(null)
  }

  function handleDeleteProject() {
    if (!deleteConfirm) return
    const kode = deleteConfirm.kodeProject
    // Delete from Report store (by project ID, matching kodeProject)
    for (const p of reportProjects) {
      if (p.kodeProject === kode) deleteReport(p.id)
    }
    // Delete from SLA store (by project ID, matching kodeProject)
    for (const p of slaProjects) {
      if (p.kodeProject === kode) deleteSLA(p.id)
    }
    // Remove assignment record
    removeByKode(kode)
    setDeleteConfirm(null)
  }

  return (
    <div className="surface rounded-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pertamina-red/10 text-pertamina-red">
          <ClipboardList size={16} />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-ink-primary">Penugasan Project · Doccon</h2>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            {canAssign
              ? 'Tambah project, assign Doccon penanggung jawab, dan kelola seluruh project monitoring'
              : 'Beban kerja Doccon per project'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unassignedCount > 0 && (
            <span className="chip bg-amber-100 text-amber-700 text-[11px] font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {unassignedCount} belum diassign
            </span>
          )}
          {canAssign && (
            <Button
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={() => openModal({ type: 'monitoring-report-project-create' })}
            >
              Tambah Project
            </Button>
          )}
        </div>
      </div>

      {/* ── Workload cards ─────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-border-subtle bg-black/[0.015] flex flex-col lg:flex-row gap-3.5">
        {/* Doccon */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="grid h-4 w-4 place-items-center rounded bg-pertamina-red/10 text-pertamina-red shrink-0">
              <UserCheck size={10} />
            </span>
            <span className="text-[11px] font-semibold text-ink-secondary">Doccon</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {docconUsers.map((u) => {
              const count = workload[u.id] ?? 0
              const active = filterDocconId === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => setFilterDocconId((prev) => (prev === u.id ? '' : u.id))}
                  className={classNames(
                    'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition text-xs',
                    active
                      ? 'bg-pertamina-red-50 border-pertamina-red/30 shadow-sm'
                      : 'bg-white border-border hover:border-pertamina-red/20 hover:bg-pertamina-red-50/40',
                  )}
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.name[0]}
                  </div>
                  <div className="text-left">
                    <div className={classNames('font-semibold leading-tight', active ? 'text-pertamina-red' : 'text-ink-primary')}>
                      {u.name}
                    </div>
                    <div className="text-[10px] text-ink-tertiary leading-tight">{count} project</div>
                  </div>
                  <div className="h-1 w-10 rounded-full bg-black/[0.06] overflow-hidden ml-1">
                    <div
                      className={classNames('h-full rounded-full transition-all', active ? 'bg-pertamina-red' : 'bg-pertamina-red/50')}
                      style={{ width: `${(count / maxWorkload) * 100}%` }}
                    />
                  </div>
                </button>
              )
            })}

            <button
              onClick={() => setFilterDocconId((prev) => (prev === '__unassigned__' ? '' : '__unassigned__'))}
              className={classNames(
                'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition text-xs',
                filterDocconId === '__unassigned__'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-border text-ink-tertiary hover:border-amber-200 hover:bg-amber-50/60',
              )}
            >
              <Users size={13} className="shrink-0" />
              <span className="font-medium">Belum diassign</span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
                {unassignedCount}
              </span>
            </button>
          </div>
        </div>

        <div className="hidden lg:block w-px bg-border-subtle shrink-0" />

        {/* Admin OSM */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="grid h-4 w-4 place-items-center rounded bg-emerald-100 text-emerald-700 shrink-0">
              <UserCheck size={10} />
            </span>
            <span className="text-[11px] font-semibold text-ink-secondary">Admin OSM</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminOsmUsers.map((u) => {
              const count = adminOsmWorkload[u.id] ?? 0
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs"
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.name[0]}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold leading-tight text-ink-primary">{u.name}</div>
                    <div className="text-[10px] text-ink-tertiary leading-tight">{count} project</div>
                  </div>
                  <div className="h-1 w-10 rounded-full bg-black/[0.06] overflow-hidden ml-1">
                    <div
                      className="h-full rounded-full bg-emerald-500/60 transition-all"
                      style={{ width: `${(count / maxAdminOsmWorkload) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-ink-tertiary">
              <Users size={13} className="shrink-0" />
              <span className="font-medium">Belum diassign</span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
                {adminOsmUnassignedCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border-subtle">
        <div className="relative max-w-xs flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, atau client…"
            className="input-base pl-8 text-xs py-1.5"
          />
        </div>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="input-base text-xs w-auto py-1.5 pr-7"
        >
          <option value="">Semua Client</option>
          {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterClient && (
          <button
            onClick={() => setFilterClient('')}
            className="flex items-center gap-1 rounded-full border border-pertamina-red/40 bg-pertamina-red-50 px-2.5 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-100 transition"
          >
            <X size={10} /> Reset
          </button>
        )}
        <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} project</span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-black/[0.02]">
              <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Kode</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Nama Project</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Client</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Modul</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Doccon</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Admin OSM</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Status</th>
              {canAssign && <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paginatedProjects.map((p) => {
              const asgn     = assignments.find((a) => a.kodeProject === p.kodeProject)
              const doccon   = asgn?.assignedDocconId ? users.find((u) => u.id === asgn.assignedDocconId) : null
              const adminOsm = asgn?.assignedAdminOsmId ? users.find((u) => u.id === asgn.assignedAdminOsmId) : null
              const isAssigned = !!doccon
              const hasCost = costsByKode.has(p.kodeProject)
              return (
                <tr key={p.kodeProject} className="hover:bg-black/[0.02] transition-colors group">
                  <td className="px-5 py-3 text-xs font-mono font-semibold text-ink-primary whitespace-nowrap">{p.kodeProject}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary max-w-[200px] truncate" title={p.namaProject}>{p.namaProject}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary max-w-[120px] truncate" title={p.client}>
                    {p.client ? (
                      <button
                        onClick={() => setFilterClient(p.client === filterClient ? '' : p.client)}
                        className={classNames(
                          'text-left truncate max-w-full transition hover:underline',
                          p.client === filterClient ? 'text-pertamina-red font-medium' : 'text-ink-secondary',
                        )}
                      >
                        {p.client}
                      </button>
                    ) : (
                      <span className="text-ink-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {p.modules.includes('Report') && <span className="chip bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5">Report</span>}
                      {p.modules.includes('SLA')    && <span className="chip bg-violet-100 text-violet-700 text-[9px] px-1.5 py-0.5">SLA</span>}
                      {hasCost && <span className="chip bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5">Cost</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {doccon ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: doccon.avatarColor }}
                        >
                          {doccon.name[0]}
                        </div>
                        <span className="text-xs font-medium text-ink-primary">{doccon.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted italic">Belum diassign</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!hasCost ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : adminOsm ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: adminOsm.avatarColor }}
                        >
                          {adminOsm.name[0]}
                        </div>
                        <span className="text-xs font-medium text-ink-primary">{adminOsm.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted italic">Belum diassign</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {isAssigned ? (
                      <span className="chip bg-emerald-100 text-emerald-700 text-[10px] font-medium inline-flex items-center gap-0.5">
                        <CheckCircle2 size={9} /> Assigned
                      </span>
                    ) : (
                      <span className="chip bg-amber-100 text-amber-700 text-[10px] font-medium">Belum</span>
                    )}
                  </td>
                  {canAssign && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openAssign(p)}
                          className={classNames(
                            'text-[11px] font-semibold rounded-lg px-2.5 py-1 transition',
                            isAssigned
                              ? 'text-ink-secondary hover:text-pertamina-red hover:bg-pertamina-red-50'
                              : 'text-pertamina-red bg-pertamina-red-50 hover:bg-pertamina-red/10',
                          )}
                        >
                          {isAssigned ? 'Ubah' : 'Assign'}
                        </button>
                        {p.modules.includes('Report') && (() => {
                          const rp = reportProjects.find((r) => r.kodeProject === p.kodeProject)
                          return rp ? (
                            <button
                              onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: rp.id })}
                              className="rounded-lg p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition opacity-0 group-hover:opacity-100"
                              title="Edit Project"
                            >
                              <Pencil size={13} />
                            </button>
                          ) : null
                        })()}
                        <button
                          onClick={() => setDeleteConfirm({ kodeProject: p.kodeProject, namaProject: p.namaProject })}
                          className="rounded-lg p-1.5 text-ink-tertiary hover:text-danger hover:bg-danger-50 transition opacity-0 group-hover:opacity-100"
                          title="Hapus Project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
          <UserCheck size={28} className="opacity-25 mb-2" />
          <p className="text-sm">{allProjects.length === 0 ? 'Belum ada project. Klik "Tambah Project" untuk memulai.' : 'Tidak ada data yang cocok.'}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-black/[0.015]">
          <span className="text-[11px] text-ink-tertiary">
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} project
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            {getPageNumbers(currentPage, totalPages).map((pg, i) =>
              pg === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-ink-tertiary">…</span>
              ) : (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg as number)}
                  className={classNames(
                    'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition min-w-[28px]',
                    currentPage === pg
                      ? 'bg-pertamina-red text-white border-pertamina-red shadow-sm'
                      : 'border-border text-ink-secondary hover:bg-black/[0.04]',
                  )}
                >
                  {pg}
                </button>
              ),
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Assign Modal ───────────────────────────────────────────────────── */}
      {assignModal && canAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-pertamina-red" />
              <h3 className="text-base font-semibold text-ink-primary">Assign Project</h3>
            </div>
            <p className="text-[11px] text-ink-tertiary mb-1">Project</p>
            <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-black/[0.03] border border-border-subtle">
              <span className="font-mono text-xs font-semibold text-ink-primary">{assignModal.kodeProject}</span>
              <span className="text-ink-tertiary">·</span>
              <span className="text-xs text-ink-secondary truncate">{assignModal.namaProject}</span>
            </div>

            <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Pilih Doccon</p>
            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              <label
                className={classNames(
                  'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition',
                  selectedDoccon === '' ? 'bg-slate-50 border-slate-300' : 'border-border hover:border-border-bold',
                )}
              >
                <input type="radio" name="doccon-pick" value="" checked={selectedDoccon === ''} onChange={() => setSelectedDoccon('')} className="accent-pertamina-red" />
                <div className="text-xs text-ink-tertiary italic">Lepas assignment</div>
              </label>

              {docconUsers.map((u) => {
                const count = workload[u.id] ?? 0
                const active = selectedDoccon === u.id
                return (
                  <label
                    key={u.id}
                    className={classNames(
                      'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition',
                      active ? 'bg-pertamina-red-50 border-pertamina-red/30 shadow-sm' : 'border-border hover:border-pertamina-red/20 hover:bg-pertamina-red-50/40',
                    )}
                  >
                    <input type="radio" name="doccon-pick" value={u.id} checked={active} onChange={() => setSelectedDoccon(u.id)} className="accent-pertamina-red" />
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm" style={{ backgroundColor: u.avatarColor }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-primary">{u.name}</div>
                      <div className="text-[10px] text-ink-tertiary">{count} project aktif</div>
                    </div>
                    {active && <CheckCircle2 size={15} className="text-pertamina-red shrink-0" />}
                  </label>
                )
              })}
            </div>

            <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Pilih Admin OSM</p>
            {assignModal.hasCost ? (
              <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
                <label
                  className={classNames(
                    'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition',
                    selectedAdminOsm === '' ? 'bg-slate-50 border-slate-300' : 'border-border hover:border-border-bold',
                  )}
                >
                  <input type="radio" name="admin-osm-pick" value="" checked={selectedAdminOsm === ''} onChange={() => setSelectedAdminOsm('')} className="accent-pertamina-red" />
                  <div className="text-xs text-ink-tertiary italic">Lepas assignment</div>
                </label>

                {adminOsmUsers.map((u) => {
                  const count = adminOsmWorkload[u.id] ?? 0
                  const active = selectedAdminOsm === u.id
                  return (
                    <label
                      key={u.id}
                      className={classNames(
                        'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition',
                        active ? 'bg-pertamina-red-50 border-pertamina-red/30 shadow-sm' : 'border-border hover:border-pertamina-red/20 hover:bg-pertamina-red-50/40',
                      )}
                    >
                      <input type="radio" name="admin-osm-pick" value={u.id} checked={active} onChange={() => setSelectedAdminOsm(u.id)} className="accent-pertamina-red" />
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm" style={{ backgroundColor: u.avatarColor }}>
                        {u.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-ink-primary">{u.name}</div>
                        <div className="text-[10px] text-ink-tertiary">{count} project aktif</div>
                      </div>
                      {active && <CheckCircle2 size={15} className="text-pertamina-red shrink-0" />}
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] text-ink-tertiary italic mb-5">Project ini belum punya data Cost Monitoring — Admin OSM belum bisa diassign.</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAssignModal(null)}>Batal</Button>
              <Button size="sm" onClick={handleSaveAssign}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      {deleteConfirm && canAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 text-pertamina-red mt-0.5">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink-primary">Hapus Project?</h3>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  Kode project <span className="font-mono font-semibold text-ink-primary">{deleteConfirm.kodeProject}</span> akan dihapus dari seluruh modul.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 mb-5 space-y-1">
              <p className="text-[11px] text-pertamina-red font-semibold">Data yang akan terhapus permanen:</p>
              <ul className="text-[11px] text-red-700 space-y-0.5 list-disc list-inside">
                <li>Seluruh dokumen & laporan di Report Project</li>
                <li>Seluruh komponen & data bulanan SLA</li>
                <li>Penugasan Doccon untuk project ini</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteProject}>Hapus Permanen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
