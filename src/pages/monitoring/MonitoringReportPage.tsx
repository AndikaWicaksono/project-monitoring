import { useMemo, useState, useEffect } from 'react'
import {
  Plus, Search, Download, Eye, Pencil, Trash2, Filter, X,
  FileText, ChevronLeft, ChevronRight, Archive, CalendarX,
  AlertTriangle, Clock, CheckCircle2, AlertCircle,
  LayoutGrid, List, Stamp,
} from 'lucide-react'
import { MonthPicker } from '../../components/ui/MonthPicker'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useMonitoringAssignmentStore } from '../../store/useMonitoringAssignmentStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { classNames, downloadCsv, formatDateShort } from '../../utils/helpers'
import { reportMonthLabel, prevReportMonth, nextReportMonth, type ReportDocument } from '../../types/monitoring'

// ── Bottleneck helpers ───────────────────────────────────────────────────────

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return ms > 0 ? Math.round(ms / 86400000) : 0
}

function computeBottleneck(docs: ReportDocument[]) {
  const todayMs = new Date().getTime()

  const engineerDays: number[] = []
  let stuckEngineer = 0
  const customerDays: number[] = []
  let stuckCustomer = 0
  const docconDays: number[] = []
  let stuckDoccon = 0

  for (const d of docs) {
    const eDays = daysBetween(d.engineerStartedAt, d.engineerSubmittedAt ?? (d.engineerStartedAt ? new Date().toISOString() : null))
    if (eDays != null) engineerDays.push(eDays)
    if ((d.currentPhase ?? 'engineer') === 'engineer' && (d.status === 'DRAFT' || d.status === 'SUBMITTED' || d.status === 'REVISION_REQUIRED')) {
      const start = d.engineerStartedAt ? new Date(d.engineerStartedAt).getTime() : null
      if (start && (todayMs - start) / 86400000 > 5) stuckEngineer++
    }
    const cDays = daysBetween(d.customerReceivedAt, d.customerApprovedAt ?? (d.customerReceivedAt && d.status === 'UNDER_REVIEW' ? new Date().toISOString() : null))
    if (cDays != null) customerDays.push(cDays)
    if (d.status === 'UNDER_REVIEW') {
      const start = d.customerReceivedAt ? new Date(d.customerReceivedAt).getTime() : null
      if (start && (todayMs - start) / 86400000 > 3) stuckCustomer++
    }
    const dDays = daysBetween(d.docconReceivedAt, d.docconDeliveredAt ?? (d.docconReceivedAt && d.currentPhase === 'doccon' && d.docconSubStatus !== 'delivered' ? new Date().toISOString() : null))
    if (dDays != null) docconDays.push(dDays)
    if (d.currentPhase === 'doccon' && d.docconSubStatus && d.docconSubStatus !== 'delivered') {
      const start = d.docconReceivedAt ? new Date(d.docconReceivedAt).getTime() : null
      if (start && (todayMs - start) / 86400000 > 2) stuckDoccon++
    }
  }

  const avgNum = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const avgStr = (n: number | null) => n !== null ? n.toFixed(1) : '—'

  return {
    engineerAvg: avgStr(avgNum(engineerDays)), engineerAvgNum: avgNum(engineerDays), stuckEngineer,
    customerAvg: avgStr(avgNum(customerDays)), customerAvgNum: avgNum(customerDays), stuckCustomer,
    docconAvg:   avgStr(avgNum(docconDays)),   docconAvgNum:   avgNum(docconDays),   stuckDoccon,
  }
}

// ── Phase pipeline bar ───────────────────────────────────────────────────────

function PipelineBar({ docs }: { docs: ReportDocument[] }) {
  const eng = docs.filter(d => (d.currentPhase ?? 'engineer') === 'engineer').length
  const cust = docs.filter(d => d.currentPhase === 'customer').length  // legacy only
  const inProgress = docs.filter(d => {
    const phase = d.currentPhase
    if (phase === 'doccon' && d.docconSubStatus !== 'delivered') return true
    if (phase === 'kadiv' || phase === 'customer_email' || phase === 'vendor_confirm') return true
    return false
  }).length
  const done = docs.filter(d =>
    d.docconSubStatus === 'delivered' ||   // legacy pipeline
    d.currentPhase === 'sales' ||           // customer new flow
    d.currentPhase === 'completed'          // vendor new flow
  ).length
  const total = docs.length
  if (!total) return <span className="text-xs text-ink-muted">—</span>

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`
  const tooltip = [
    eng        > 0 && `Engineer: ${eng}`,
    cust       > 0 && `Customer: ${cust}`,
    inProgress > 0 && `Proses: ${inProgress}`,
    done       > 0 && `Selesai: ${done}`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-2" title={tooltip}>
      <div className="flex h-1.5 w-14 rounded-full overflow-hidden gap-px bg-black/[0.06] flex-shrink-0">
        {eng        > 0 && <div className="bg-blue-400 flex-shrink-0"    style={{ width: pct(eng) }} />}
        {cust       > 0 && <div className="bg-violet-400 flex-shrink-0"  style={{ width: pct(cust) }} />}
        {inProgress > 0 && <div className="bg-amber-400 flex-shrink-0"   style={{ width: pct(inProgress) }} />}
        {done       > 0 && <div className="bg-emerald-400 flex-shrink-0" style={{ width: pct(done) }} />}
      </div>
      <span className="text-[10px] tabular-nums whitespace-nowrap">
        <span className={classNames('font-medium', done === total ? 'text-emerald-600' : 'text-ink-primary')}>{done}</span>
        <span className="text-ink-muted">/{total}</span>
      </span>
    </div>
  )
}

// ── Early warning badge ──────────────────────────────────────────────────────

// Daftar dokumen yang deadline-nya sudah lewat, dipakai sebagai isi tooltip badge OVERDUE.
function overdueReason(docs: ReportDocument[]): string {
  const today = new Date()
  return docs
    .filter((d) => d.deadlineToSales)
    .map((d) => ({ judul: d.judul, diff: Math.ceil((new Date(d.deadlineToSales!).getTime() - today.getTime()) / 86400000) }))
    .filter((x) => x.diff < 0)
    .sort((a, b) => a.diff - b.diff)
    .map((x) => `${x.judul} — ${Math.abs(x.diff)} hari lewat deadline`)
    .join('\n')
}

function WarningBadge({ docs }: { docs: ReportDocument[] }) {
  const today = new Date()
  let hasOverdue = false, hasH1 = false, hasH3 = false, hasFlagged = false
  for (const d of docs) {
    if (d.salesFlagIssue) hasFlagged = true
    if (!d.deadlineToSales) continue
    const diffDays = Math.ceil((new Date(d.deadlineToSales).getTime() - today.getTime()) / 86400000)
    if (diffDays < 0) hasOverdue = true
    else if (diffDays <= 1) hasH1 = true
    else if (diffDays <= 3) hasH3 = true
  }
  if (hasOverdue) {
    return (
      <Tooltip content={overdueReason(docs)} side="bottom">
        <span className="chip bg-red-100 text-red-700 text-[9px] font-semibold cursor-help">OVERDUE</span>
      </Tooltip>
    )
  }
  if (hasFlagged)  return <span className="chip bg-orange-100 text-orange-700 text-[9px] font-semibold">Flagged</span>
  if (hasH1)       return <span className="chip bg-red-50 text-red-600 text-[9px] font-semibold">H-1</span>
  if (hasH3)       return <span className="chip bg-amber-100 text-amber-700 text-[9px] font-semibold">H-3</span>
  return null
}

// ── Project status badge ─────────────────────────────────────────────────────

function getProjectStatus(docs: ReportDocument[]): { label: string; cls: string; reason?: string } {
  const today = new Date()
  let hasOverdue = false, hasWarning = false, hasFlagged = false
  let done = 0, inProgress = 0

  for (const d of docs) {
    if (d.salesFlagIssue) hasFlagged = true
    if (d.deadlineToSales) {
      const diff = Math.ceil((new Date(d.deadlineToSales).getTime() - today.getTime()) / 86400000)
      if (diff < 0) hasOverdue = true
      else if (diff <= 3) hasWarning = true
    }
    const isDone =
      d.currentPhase === 'sales' || d.currentPhase === 'completed' || d.docconSubStatus === 'delivered'
    if (isDone) done++
    else if (d.status !== 'DRAFT') inProgress++
  }

  if (hasOverdue)               return { label: 'OVERDUE',     cls: 'bg-red-100 text-red-700', reason: overdueReason(docs) }
  if (hasFlagged)               return { label: 'FLAGGED',     cls: 'bg-orange-100 text-orange-700' }
  if (hasWarning)               return { label: 'WARNING',     cls: 'bg-amber-100 text-amber-700' }
  if (docs.length === 0)        return { label: 'NOT STARTED', cls: 'bg-slate-100 text-slate-500' }
  if (done === docs.length)     return { label: 'ON TRACK',    cls: 'bg-emerald-100 text-emerald-700' }
  if (inProgress > 0 || done > 0) return { label: 'IN PROGRESS', cls: 'bg-blue-100 text-blue-700' }
  return                               { label: 'NOT STARTED', cls: 'bg-slate-100 text-slate-500' }
}

// ── Bottleneck analytics card ────────────────────────────────────────────────

function BottleneckCard({
  label, icon, avg, avgNum, stuck, sla, slaNum, color,
}: {
  label: string
  icon: React.ReactNode
  avg: string
  avgNum: number | null
  stuck: number
  sla: string
  slaNum: number
  color: 'blue' | 'purple' | 'amber'
}) {
  const ratio = avgNum !== null ? avgNum / slaNum : null
  const isOver  = ratio !== null && ratio > 1
  const isWarn  = ratio !== null && ratio >= 0.8 && !isOver
  const gaugeW  = ratio !== null ? `${Math.min(100, ratio * 100)}%` : '0%'

  const accentCls = {
    blue:   'bg-blue-500',
    purple: 'bg-violet-500',
    amber:  'bg-amber-500',
  }[color]

  const gaugeCls = isOver ? 'bg-red-400' : isWarn ? 'bg-amber-400' : 'bg-emerald-400'
  const avgCls   = isOver ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-ink-primary'

  return (
    <div className="surface rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${accentCls}`} />
      <div className="pl-3 flex items-center justify-between gap-2">
        <div className={classNames('flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary')}>
          {icon} {label}
        </div>
        {stuck > 0 ? (
          <span className="chip bg-red-100 text-red-700 text-[10px] flex items-center gap-0.5 font-semibold">
            <AlertTriangle size={9} /> {stuck} stuck
          </span>
        ) : avgNum !== null ? (
          <span className="chip bg-emerald-100 text-emerald-700 text-[10px] font-medium">On Track</span>
        ) : null}
      </div>
      <div className="pl-3">
        <div className="flex items-baseline gap-1.5">
          <span className={classNames('text-2xl font-bold tabular-nums', avgCls)}>{avg}</span>
          <span className="text-xs text-ink-tertiary">hari avg</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-black/[0.06] overflow-hidden">
            <div className={classNames('h-full rounded-full transition-all', gaugeCls)} style={{ width: gaugeW }} />
          </div>
          <span className="text-[10px] text-ink-tertiary whitespace-nowrap">SLA {sla}</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MonitoringReportPage() {
  const { projects, documents, billingDocuments, deleteProject, endProjectAt, excludeProjectMonth } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const setReportDetailProjectId = useUIStore((s) => s.setReportDetailProjectId)
  const selectedMonth = useUIStore((s) => s.selectedReportMonth)
  const setSelectedMonth = useUIStore((s) => s.setSelectedReportMonth)
  const { canDeleteMonitoring, canManageProjectPeriod, isDoccon, isEngineerOS, isKadiv, currentUserId } = useMonitoringRole()
  const assignments = useMonitoringAssignmentStore((s) => s.assignments)
  const users       = useAuthStore((s) => s.users)

  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [picFilter, setPicFilter]     = useState('')
  const [sortBy, setSortBy]           = useState<'kode-asc' | 'kode-desc' | 'nama-asc' | 'nama-desc'>('kode-asc')
  const [viewMode, setViewMode]       = useState<'table' | 'card'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId]         = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId]               = useState<string | null>(null)
  const [confirmExcludeMonthId, setConfirmExcludeMonthId] = useState<string | null>(null)

  const departments = useMemo(
    () => [...new Set(projects.map((p) => p.department).filter(Boolean))].sort(),
    [projects],
  )

  // Helper untuk resolve PIC (inline agar bisa dipakai di useMemo sebelum deklarasi fungsi)
  function resolvePICInline(kodeProject: string, picLaporan: string) {
    if (picLaporan) return picLaporan
    const asgn = assignments.find((a) => a.kodeProject === kodeProject)
    if (!asgn?.assignedDocconId) return ''
    return users.find((u) => u.id === asgn.assignedDocconId)?.name ?? ''
  }

  // Opsi dropdown — computed dari project yang visible di periode ini (sebelum filter client/PIC)
  const periodVisibleProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedMonth < p.kontrakMulai) return false
      if (p.kontrakAkhir !== null && selectedMonth > p.kontrakAkhir) return false
      if ((p.excludedMonths ?? []).includes(selectedMonth)) return false
      if (isDoccon && currentUserId) {
        const asgn = assignments.find((a) => a.kodeProject === p.kodeProject)
        if (!asgn || asgn.assignedDocconId !== currentUserId) return false
      }
      return true
    })
  }, [projects, selectedMonth, assignments, isDoccon, currentUserId])

  const uniqueClients = useMemo(
    () => [...new Set(periodVisibleProjects.map((p) => p.client).filter(Boolean))].sort(),
    [periodVisibleProjects],
  )

  const uniquePICs = useMemo(
    () => [...new Set(periodVisibleProjects.map((p) => resolvePICInline(p.kodeProject, p.picLaporan)).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodVisibleProjects, assignments, users],
  )

  const hasActiveFilter = !!(search || deptFilter || clientFilter || picFilter)

  function resetFilters() {
    setSearch('')
    setDeptFilter('')
    setClientFilter('')
    setPicFilter('')
  }

  // Project IDs yang punya dokumen PENDING_KADIV di periode aktif (untuk Kadiv priority sort)
  const pendingKadivProjectIds = useMemo(() => {
    if (!isKadiv) return new Set<string>()
    return new Set(
      documents
        .filter((d) => d.status === 'PENDING_KADIV' && d.currentPhase === 'kadiv' && d.period === selectedMonth)
        .map((d) => d.projectId)
    )
  }, [documents, selectedMonth, isKadiv])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = projects.filter((p) => {
      if (selectedMonth < p.kontrakMulai) return false
      if (p.kontrakAkhir !== null && selectedMonth > p.kontrakAkhir) return false
      if ((p.excludedMonths ?? []).includes(selectedMonth)) return false
      if (deptFilter && p.department !== deptFilter) return false
      // Doccon hanya melihat project yang di-assign kepadanya oleh Kadep
      if (isDoccon && currentUserId) {
        const asgn = assignments.find((a) => a.kodeProject === p.kodeProject)
        if (!asgn || asgn.assignedDocconId !== currentUserId) return false
      }
      if (clientFilter && p.client !== clientFilter) return false
      if (picFilter) {
        const asgn = assignments.find((a) => a.kodeProject === p.kodeProject)
        const resolvedPIC = p.picLaporan || (asgn?.assignedDocconId ? users.find((u) => u.id === asgn.assignedDocconId)?.name ?? '' : '')
        if (resolvedPIC !== picFilter) return false
      }
      if (q && !p.kodeProject.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q) && !p.namaKontrak.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      // Kadiv: projects with pending approval float to top
      if (isKadiv) {
        const aPending = pendingKadivProjectIds.has(a.id) ? 0 : 1
        const bPending = pendingKadivProjectIds.has(b.id) ? 0 : 1
        if (aPending !== bPending) return aPending - bPending
      }
      if (sortBy === 'kode-asc')  return a.kodeProject.localeCompare(b.kodeProject)
      if (sortBy === 'kode-desc') return b.kodeProject.localeCompare(a.kodeProject)
      if (sortBy === 'nama-asc')  return a.namaKontrak.localeCompare(b.namaKontrak)
      if (sortBy === 'nama-desc') return b.namaKontrak.localeCompare(a.namaKontrak)
      return 0
    })
  }, [projects, search, deptFilter, clientFilter, picFilter, selectedMonth, sortBy, assignments, isDoccon, isKadiv, pendingKadivProjectIds, currentUserId, users])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setCurrentPage(1) }, [search, deptFilter, clientFilter, picFilter, sortBy, selectedMonth])
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

  const periodDocs = useMemo(
    () => documents.filter((d) => d.period === selectedMonth && filtered.some((p) => p.id === d.projectId)),
    [documents, selectedMonth, filtered],
  )

  const bottleneck = useMemo(() => computeBottleneck(periodDocs), [periodDocs])

  function getProjectDocs(projectId: string) {
    return documents.filter((d) => d.projectId === projectId && d.period === selectedMonth)
  }

  function docCount(projectId: string, type: 'customer' | 'vendor') {
    return documents.filter((d) => d.projectId === projectId && d.docType === type && d.period === selectedMonth).length
  }

  function resolvePIC(kodeProject: string, picLaporan: string) {
    return resolvePICInline(kodeProject, picLaporan)
  }

  function openDetail(projectId: string) {
    setReportDetailProjectId(projectId)
    setView('monitoring-report-detail')
  }

  function handleExport() {
    downloadCsv(
      filtered.map((p) => ({
        'Kode Project': p.kodeProject,
        Client: p.client,
        'Nama Kontrak': p.namaKontrak,
        Department: p.department,
        'PIC Laporan': resolvePIC(p.kodeProject, p.picLaporan),
        Periode: reportMonthLabel(selectedMonth),
        'Dok. Customer': docCount(p.id, 'customer'),
        'Dok. Vendor': docCount(p.id, 'vendor'),
        'Created': formatDateShort(p.createdAt),
      })),
      'monitoring-report-projects.csv',
    )
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">

      {/* ── Bottleneck analytics (hanya untuk non-engineer) ── */}
      {!isEngineerOS && <div className="grid grid-cols-3 gap-3">
        <BottleneckCard
          label="Engineer Phase" icon={<Clock size={13} />}
          avg={bottleneck.engineerAvg} avgNum={bottleneck.engineerAvgNum}
          stuck={bottleneck.stuckEngineer} sla="5 hari" slaNum={5} color="blue"
        />
        <BottleneckCard
          label="Customer Phase" icon={<AlertCircle size={13} />}
          avg={bottleneck.customerAvg} avgNum={bottleneck.customerAvgNum}
          stuck={bottleneck.stuckCustomer} sla="3 hari" slaNum={3} color="purple"
        />
        <BottleneckCard
          label="Doccon Phase" icon={<CheckCircle2 size={13} />}
          avg={bottleneck.docconAvg} avgNum={bottleneck.docconAvgNum}
          stuck={bottleneck.stuckDoccon} sla="2 hari" slaNum={2} color="amber"
        />
      </div>}

      <div className="surface rounded-xl overflow-hidden">

        {/* ── Month navigator ── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border-subtle bg-black/[0.01]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Periode</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSelectedMonth(prevReportMonth(selectedMonth))}
              className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
            >
              <ChevronLeft size={14} />
            </button>
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            <button
              onClick={() => setSelectedMonth(nextReportMonth(selectedMonth))}
              className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Menampilkan dokumen laporan periode <strong>{reportMonthLabel(selectedMonth)}</strong>
          </span>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, client, kontrak…"
              className="input-base pl-9 text-xs"
            />
          </div>
          <Filter size={12} className="text-ink-tertiary shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua Dept</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua Client</option>
            {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={picFilter}
            onChange={(e) => setPicFilter(e.target.value)}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua PIC</option>
            {uniquePICs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-full border border-pertamina-red/40 bg-pertamina-red-50 px-2.5 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-100 transition shrink-0"
            >
              <X size={10} />
              Reset
            </button>
          )}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="input-base text-xs w-auto py-1.5 pr-7 ml-auto">
            <option value="kode-asc">Kode A→Z</option>
            <option value="kode-desc">Kode Z→A</option>
            <option value="nama-asc">Nama A→Z</option>
            <option value="nama-desc">Nama Z→A</option>
          </select>
          <span className="text-[11px] text-ink-tertiary">{filtered.length} project</span>
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border-subtle overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={classNames(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition',
                viewMode === 'table'
                  ? 'bg-pertamina-red text-white'
                  : 'text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04]',
              )}
              title="Tampilan Tabel"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={classNames(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition',
                viewMode === 'card'
                  ? 'bg-pertamina-red text-white'
                  : 'text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04]',
              )}
              title="Tampilan Card"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={13} />}>Export</Button>
        </div>

        {/* ── Table view ── */}
        {viewMode === 'table' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {[
                      { label: 'Project',       cls: 'min-w-[240px]' },
                      { label: 'Client · Dept', cls: 'min-w-[130px]' },
                      { label: 'PIC',           cls: 'min-w-[90px]'  },
                      { label: 'Dokumen',       cls: 'min-w-[110px]' },
                      ...(!isEngineerOS ? [{ label: 'Billing', cls: 'min-w-[110px]' }] : []),
                      { label: 'Progress',      cls: 'min-w-[120px]' },
                      { label: 'Status',        cls: 'min-w-[120px]' },
                      { label: 'Aksi',          cls: 'w-[90px]'      },
                    ].map(({ label, cls }) => (
                      <th
                        key={label}
                        className={classNames(
                          'text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap',
                          cls,
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {paginatedProjects.map((p) => {
                    const custDocs    = docCount(p.id, 'customer')
                    const vendDocs    = docCount(p.id, 'vendor')
                    const billingDocs = billingDocuments.filter((b) => b.projectId === p.id && (b.period == null || b.period === selectedMonth))
                    const billingDone = billingDocs.filter((b) => b.status === 'COMPLETED').length
                    const billingPct  = billingDocs.length > 0 ? Math.round((billingDone / billingDocs.length) * 100) : 0
                    const projDocs    = getProjectDocs(p.id)
                    const totalDocs   = custDocs + vendDocs

                    // Progress: done docs vs total
                    const doneDocs = projDocs.filter((d) =>
                      d.currentPhase === 'sales' || d.currentPhase === 'completed' || d.docconSubStatus === 'delivered'
                    ).length
                    const progressPct = totalDocs > 0 ? Math.round((doneDocs / totalDocs) * 100) : 0

                    const status = getProjectStatus(projDocs)

                    // "Update terakhir" from latest doc updatedAt or project updatedAt
                    const lastUpdated = [
                      p.updatedAt,
                      ...projDocs.map((d) => d.updatedAt),
                    ].filter(Boolean).sort().reverse()[0]
                    const lastUpdatedLabel = lastUpdated
                      ? new Date(lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : null

                    const pendingKadivCount = isKadiv
                      ? documents.filter((d) => d.projectId === p.id && d.status === 'PENDING_KADIV' && d.currentPhase === 'kadiv' && d.period === selectedMonth).length
                      : 0

                    return (
                      <tr
                        key={p.id}
                        className={classNames(
                          'hover:bg-black/[0.02] transition-colors cursor-pointer group',
                          pendingKadivCount > 0 ? 'bg-blue-50/50' : '',
                        )}
                        onClick={() => openDetail(p.id)}
                      >
                        {/* ① Project */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-pertamina-red tracking-wide">
                                {p.kodeProject}
                              </span>
                              {pendingKadivCount > 0 && (
                                <span className="flex items-center gap-0.5 chip bg-red-100 text-red-700 text-[9px] font-semibold">
                                  <Stamp size={8} /> {pendingKadivCount} Perlu Approval
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-ink-primary max-w-[260px] truncate leading-tight" title={p.namaKontrak}>
                              {p.namaKontrak}
                            </span>
                            {lastUpdatedLabel && (
                              <span className="text-[10px] text-ink-tertiary flex items-center gap-1 mt-0.5">
                                <Clock size={9} className="shrink-0" /> Update terakhir: {lastUpdatedLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ② Client · Dept */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-ink-primary whitespace-nowrap">{p.client}</span>
                            {p.department && (
                              <span className="chip bg-slate-100 text-slate-600 text-[9px] font-semibold w-fit">
                                {p.department}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ③ PIC */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-secondary">{resolvePIC(p.kodeProject, p.picLaporan) || '—'}</span>
                        </td>

                        {/* ④ Dokumen */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {custDocs > 0 ? (
                              <div className="flex items-center gap-1">
                                <FileText size={10} className="text-blue-400 shrink-0" />
                                <span className="text-[11px] text-ink-secondary">
                                  <span className="font-semibold text-ink-primary">{custDocs}</span> Customer
                                </span>
                              </div>
                            ) : null}
                            {vendDocs > 0 ? (
                              <div className="flex items-center gap-1">
                                <FileText size={10} className="text-violet-400 shrink-0" />
                                <span className="text-[11px] text-ink-secondary">
                                  <span className="font-semibold text-ink-primary">{vendDocs}</span> Vendor
                                </span>
                              </div>
                            ) : null}
                            {totalDocs === 0 && <span className="text-xs text-ink-muted">—</span>}
                          </div>
                        </td>

                        {/* ⑤ Billing */}
                        {!isEngineerOS && <td className="px-4 py-3">
                          {billingDocs.length > 0 ? (
                            <div className="space-y-1 min-w-[90px]">
                              <div className="flex items-center justify-between gap-1">
                                <span className={classNames(
                                  'text-xs font-semibold tabular-nums',
                                  billingPct === 100 ? 'text-emerald-600' : 'text-ink-primary'
                                )}>{billingPct}%</span>
                                <span className="text-[10px] text-ink-tertiary tabular-nums">{billingDone}/{billingDocs.length}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                                <div
                                  className={classNames(
                                    'h-full rounded-full transition-all',
                                    billingPct === 100 ? 'bg-emerald-400' : billingPct >= 50 ? 'bg-pertamina-red/70' : 'bg-red-400',
                                  )}
                                  style={{ width: `${billingPct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>}

                        {/* ⑥ Progress (pipeline) */}
                        <td className="px-4 py-3">
                          {totalDocs > 0 ? (
                            <div className="space-y-1 min-w-[90px]">
                              <div className="flex items-center justify-between gap-1">
                                <span className={classNames(
                                  'text-xs font-semibold tabular-nums',
                                  progressPct === 100 ? 'text-emerald-600' : 'text-ink-primary'
                                )}>{progressPct}%</span>
                                <span className="text-[10px] text-ink-tertiary tabular-nums">{doneDocs}/{totalDocs}</span>
                              </div>
                              <PipelineBar docs={projDocs} />
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>

                        {/* ⑦ Status */}
                        <td className="px-4 py-3">
                          {status.reason ? (
                            <Tooltip content={status.reason} side="bottom">
                              <span className={classNames('chip text-[10px] font-semibold cursor-help', status.cls)}>
                                {status.label}
                              </span>
                            </Tooltip>
                          ) : (
                            <span className={classNames('chip text-[10px] font-semibold', status.cls)}>
                              {status.label}
                            </span>
                          )}
                        </td>

                        {/* ⑧ Aksi */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDetail(p.id)}
                              className="rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                              title="Detail"
                            >
                              <Eye size={13} />
                            </button>
                            {!isDoccon && (
                              <button
                                onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: p.id })}
                                className="rounded p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canManageProjectPeriod && (
                              <>
                                <button
                                  onClick={() => setConfirmExcludeMonthId(p.id)}
                                  className="rounded p-1.5 text-ink-tertiary hover:text-blue-600 hover:bg-blue-50 transition"
                                  title={`Hapus dari bulan ${selectedMonth} saja`}
                                >
                                  <CalendarX size={13} />
                                </button>
                                <button
                                  onClick={() => setConfirmEndId(p.id)}
                                  className="rounded p-1.5 text-ink-tertiary hover:text-amber-600 hover:bg-amber-50 transition"
                                  title="Hapus dari bulan ini & seterusnya"
                                >
                                  <Archive size={13} />
                                </button>
                              </>
                            )}
                            {canDeleteMonitoring && (
                              <button
                                onClick={() => setConfirmDeleteId(p.id)}
                                className="rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                                title="Hapus Permanen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
                <FileText size={32} className="mb-2 opacity-30" />
                <p className="text-sm">
                  {projects.length === 0
                    ? 'Belum ada project yang di-assign ke Anda.'
                    : 'Tidak ada data yang cocok dengan filter.'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-black/[0.015]">
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
          </>
        )}

        {/* ── Card view ── */}
        {viewMode === 'card' && (
          <div className="p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
                <FileText size={32} className="mb-2 opacity-30" />
                <p className="text-sm">
                  {projects.length === 0
                    ? 'Belum ada project yang di-assign ke Anda.'
                    : 'Tidak ada data yang cocok dengan filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((p) => {
                  const custDocs    = docCount(p.id, 'customer')
                  const vendDocs    = docCount(p.id, 'vendor')
                  const totalDocs   = custDocs + vendDocs
                  const billingDocs = billingDocuments.filter((b) => b.projectId === p.id && (b.period == null || b.period === selectedMonth))
                  const billingDone = billingDocs.filter((b) => b.status === 'COMPLETED').length
                  const billingPct  = billingDocs.length > 0 ? Math.round((billingDone / billingDocs.length) * 100) : 0
                  const projDocs    = getProjectDocs(p.id)

                  return (
                    <div
                      key={p.id}
                      onClick={() => openDetail(p.id)}
                      className="group relative rounded-xl border border-border-subtle bg-white hover:border-pertamina-red/30 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
                    >
                      {/* Top accent bar */}
                      <div className="h-1 bg-pertamina-red w-full" />

                      <div className="p-4 flex flex-col gap-3 flex-1">
                        {/* Kode + badge warning */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-mono font-bold text-pertamina-red tracking-wide leading-none">
                            {p.kodeProject}
                          </span>
                          <WarningBadge docs={projDocs} />
                        </div>

                        {/* Client */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-ink-tertiary uppercase tracking-widest font-semibold">Client</span>
                          <span className="text-xs text-ink-primary font-medium leading-snug line-clamp-1">{p.client}</span>
                        </div>

                        {/* Nama Project */}
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-[10px] text-ink-tertiary uppercase tracking-widest font-semibold">Nama Project</span>
                          <span className="text-xs text-ink-secondary leading-snug line-clamp-2" title={p.namaKontrak}>
                            {p.namaKontrak}
                          </span>
                        </div>

                        {/* PIC + Dept chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.department && (
                            <span className="chip bg-slate-100 text-slate-600 text-[9px] font-medium">{p.department}</span>
                          )}
                          {resolvePIC(p.kodeProject, p.picLaporan) && (
                            <span className="chip bg-blue-50 text-blue-600 text-[9px] font-medium">{resolvePIC(p.kodeProject, p.picLaporan)}</span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border-subtle" />

                        {/* Metrics row */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Dokumen */}
                          <div className="flex items-center gap-1">
                            <FileText size={11} className="text-ink-tertiary" />
                            {totalDocs > 0 ? (
                              <span className="text-[11px] text-ink-secondary tabular-nums">
                                {custDocs > 0 && <><span className="font-semibold text-ink-primary">{custDocs}</span><span className="text-ink-muted">C</span></>}
                                {custDocs > 0 && vendDocs > 0 && <span className="text-ink-muted/40 mx-0.5">·</span>}
                                {vendDocs > 0 && <><span className="font-semibold text-ink-primary">{vendDocs}</span><span className="text-ink-muted">V</span></>}
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-muted">—</span>
                            )}
                          </div>

                          {/* Billing progress */}
                          {billingDocs.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1 rounded-full bg-black/[0.06] overflow-hidden">
                                <div
                                  className={classNames(
                                    'h-full rounded-full',
                                    billingPct === 100 ? 'bg-emerald-400' : billingPct >= 50 ? 'bg-pertamina-red' : 'bg-red-400',
                                  )}
                                  style={{ width: `${billingPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-ink-tertiary tabular-nums">{billingDone}/{billingDocs.length}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-ink-muted">No billing</span>
                          )}
                        </div>

                        {/* Pipeline bar */}
                        <PipelineBar docs={projDocs} />
                      </div>

                      {/* Action buttons — visible on hover */}
                      <div
                        className="absolute bottom-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openDetail(p.id)}
                          className="rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition bg-white/80 shadow-sm"
                          title="Detail"
                        >
                          <Eye size={12} />
                        </button>
                        {!isDoccon && (
                          <button
                            onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: p.id })}
                            className="rounded p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition bg-white/80 shadow-sm"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {canManageProjectPeriod && (
                          <>
                            <button
                              onClick={() => setConfirmExcludeMonthId(p.id)}
                              className="rounded p-1.5 text-ink-tertiary hover:text-blue-600 hover:bg-blue-50 transition bg-white/80 shadow-sm"
                              title={`Hapus dari bulan ${selectedMonth} saja`}
                            >
                              <CalendarX size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmEndId(p.id)}
                              className="rounded p-1.5 text-ink-tertiary hover:text-amber-600 hover:bg-amber-50 transition bg-white/80 shadow-sm"
                              title="Hapus dari bulan ini & seterusnya"
                            >
                              <Archive size={12} />
                            </button>
                          </>
                        )}
                        {canDeleteMonitoring && (
                          <button
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition bg-white/80 shadow-sm"
                            title="Hapus Permanen"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm: hapus bulan ini saja ── */}
      {confirmExcludeMonthId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus dari bulan ini saja?</h3>
            <p className="text-sm text-ink-secondary mb-1">
              Project tidak akan muncul di <strong>{reportMonthLabel(selectedMonth)}</strong>, tetapi tetap muncul di bulan lainnya.
            </p>
            <p className="text-sm text-ink-secondary mb-6">Data dokumen bulan ini tidak terhapus.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmExcludeMonthId(null)}>Batal</Button>
              <Button size="sm" onClick={() => { excludeProjectMonth(confirmExcludeMonthId, selectedMonth); setConfirmExcludeMonthId(null) }}>
                Hapus Bulan Ini
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm: keluarkan dari periode ── */}
      {confirmEndId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus dari bulan ini & seterusnya?</h3>
            <p className="text-sm text-ink-secondary mb-1">
              Project tidak akan muncul di <strong>{reportMonthLabel(selectedMonth)}</strong> dan bulan berikutnya.
            </p>
            <p className="text-sm text-ink-secondary mb-6">Data bulan sebelumnya tetap tersimpan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmEndId(null)}>Batal</Button>
              <Button size="sm" onClick={() => { endProjectAt(confirmEndId, selectedMonth); setConfirmEndId(null) }}>
                Hapus & Seterusnya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm: hapus permanen ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Permanen?</h3>
            <p className="text-sm text-ink-secondary mb-1">
              Semua dokumen laporan project ini akan ikut terhapus dari semua periode.
            </p>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteProject(confirmDeleteId); setConfirmDeleteId(null) }}>
                Hapus Permanen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
