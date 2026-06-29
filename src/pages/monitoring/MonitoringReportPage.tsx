import { useMemo, useState } from 'react'
import {
  Plus, Search, Download, Eye, Pencil, Trash2, Filter,
  FileText, ChevronLeft, ChevronRight, Archive, CalendarX,
  AlertTriangle, Clock, CheckCircle2, AlertCircle,
  LayoutGrid, List,
} from 'lucide-react'
import { MonthPicker } from '../../components/ui/MonthPicker'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
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
  const eng  = docs.filter(d => (d.currentPhase ?? 'engineer') === 'engineer').length
  const cust = docs.filter(d => d.currentPhase === 'customer').length
  const doc  = docs.filter(d => d.currentPhase === 'doccon' && d.docconSubStatus !== 'delivered').length
  const done = docs.filter(d => d.docconSubStatus === 'delivered').length
  const total = docs.length
  if (!total) return <span className="text-xs text-ink-muted">—</span>

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`
  const tooltip = [
    eng  > 0 && `Eng: ${eng}`,
    cust > 0 && `Customer: ${cust}`,
    doc  > 0 && `Doccon: ${doc}`,
    done > 0 && `Done: ${done}`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-2" title={tooltip}>
      <div className="flex h-1.5 w-14 rounded-full overflow-hidden gap-px bg-black/[0.06] flex-shrink-0">
        {eng  > 0 && <div className="bg-blue-400 flex-shrink-0"    style={{ width: pct(eng) }} />}
        {cust > 0 && <div className="bg-violet-400 flex-shrink-0"  style={{ width: pct(cust) }} />}
        {doc  > 0 && <div className="bg-amber-400 flex-shrink-0"   style={{ width: pct(doc) }} />}
        {done > 0 && <div className="bg-emerald-400 flex-shrink-0" style={{ width: pct(done) }} />}
      </div>
      <span className="text-[10px] tabular-nums whitespace-nowrap">
        <span className={classNames('font-medium', done === total ? 'text-emerald-600' : 'text-ink-primary')}>{done}</span>
        <span className="text-ink-muted">/{total}</span>
      </span>
    </div>
  )
}

// ── Early warning badge ──────────────────────────────────────────────────────

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
  if (hasOverdue)  return <span className="chip bg-red-100 text-red-700 text-[9px] font-semibold">OVERDUE</span>
  if (hasFlagged)  return <span className="chip bg-orange-100 text-orange-700 text-[9px] font-semibold">Flagged</span>
  if (hasH1)       return <span className="chip bg-red-50 text-red-600 text-[9px] font-semibold">H-1</span>
  if (hasH3)       return <span className="chip bg-amber-100 text-amber-700 text-[9px] font-semibold">H-3</span>
  return null
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
  const isOK    = ratio !== null && !isOver && !isWarn
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
  const { canDeleteMonitoring, canManageProjectPeriod } = useMonitoringRole()

  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy]       = useState<'kode-asc' | 'kode-desc' | 'nama-asc' | 'nama-desc'>('kode-asc')
  const [viewMode, setViewMode]   = useState<'table' | 'card'>('table')
  const [confirmDeleteId, setConfirmDeleteId]         = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId]               = useState<string | null>(null)
  const [confirmExcludeMonthId, setConfirmExcludeMonthId] = useState<string | null>(null)

  const departments = useMemo(
    () => [...new Set(projects.map((p) => p.department).filter(Boolean))].sort(),
    [projects],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = projects.filter((p) => {
      if (selectedMonth < p.kontrakMulai) return false
      if (p.kontrakAkhir !== null && selectedMonth > p.kontrakAkhir) return false
      if ((p.excludedMonths ?? []).includes(selectedMonth)) return false
      if (deptFilter && p.department !== deptFilter) return false
      if (q && !p.kodeProject.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q) && !p.namaKontrak.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'kode-asc')  return a.kodeProject.localeCompare(b.kodeProject)
      if (sortBy === 'kode-desc') return b.kodeProject.localeCompare(a.kodeProject)
      if (sortBy === 'nama-asc')  return a.namaKontrak.localeCompare(b.namaKontrak)
      if (sortBy === 'nama-desc') return b.namaKontrak.localeCompare(a.namaKontrak)
      return 0
    })
  }, [projects, search, deptFilter, selectedMonth, sortBy])

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
        'PIC Laporan': p.picLaporan,
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

      {/* ── Bottleneck analytics ── */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>

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
          <Filter size={12} className="text-ink-tertiary" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input-base text-xs w-auto py-1.5 pr-7"
          >
            <option value="">Semua Dept</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="input-base text-xs w-auto py-1.5 pr-7">
            <option value="kode-asc">Kode A→Z</option>
            <option value="kode-desc">Kode Z→A</option>
            <option value="nama-asc">Nama A→Z</option>
            <option value="nama-desc">Nama Z→A</option>
          </select>
          <span className="text-[11px] text-ink-tertiary ml-auto">{filtered.length} project</span>
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
          <Button size="sm" onClick={() => openModal({ type: 'monitoring-report-project-create' })} leftIcon={<Plus size={13} />}>
            Tambah Project
          </Button>
        </div>

        {/* ── Table view ── */}
        {viewMode === 'table' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {[
                      { label: 'Project',       cls: 'min-w-[220px]' },
                      { label: 'Client · Dept', cls: 'min-w-[140px]' },
                      { label: 'PIC',           cls: 'min-w-[100px]' },
                      { label: 'Dokumen',       cls: 'text-center'   },
                      { label: 'Billing',       cls: 'min-w-[100px]' },
                      { label: 'Status',        cls: 'min-w-[160px]' },
                      { label: 'Aksi',          cls: ''              },
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
                  {filtered.map((p) => {
                    const custDocs  = docCount(p.id, 'customer')
                    const vendDocs  = docCount(p.id, 'vendor')
                    const billingDocs = billingDocuments.filter((b) => b.projectId === p.id)
                    const billingDone = billingDocs.filter((b) => b.status === 'COMPLETED').length
                    const billingPct  = billingDocs.length > 0 ? Math.round((billingDone / billingDocs.length) * 100) : 0
                    const projDocs  = getProjectDocs(p.id)
                    const totalDocs = custDocs + vendDocs

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-black/[0.02] transition-colors cursor-pointer group"
                        onClick={() => openDetail(p.id)}
                      >
                        {/* ① Project — kode chip + nama */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono font-semibold text-pertamina-red tracking-wide">
                              {p.kodeProject}
                            </span>
                            <span
                              className="text-xs font-medium text-ink-primary max-w-[240px] truncate leading-tight"
                              title={p.namaKontrak}
                            >
                              {p.namaKontrak}
                            </span>
                          </div>
                        </td>

                        {/* ② Client · Dept */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-ink-primary whitespace-nowrap">{p.client}</span>
                            {p.department && (
                              <span className="chip bg-slate-100 text-slate-600 text-[9px] font-medium w-fit">
                                {p.department}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ③ PIC */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-secondary whitespace-nowrap">{p.picLaporan || '—'}</span>
                        </td>

                        {/* ④ Dokumen — customer + vendor */}
                        <td className="px-4 py-3">
                          {totalDocs > 0 ? (
                            <div className="flex items-center gap-2">
                              {custDocs > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-xs font-semibold text-ink-primary tabular-nums">{custDocs}</span>
                                  <span className="text-[9px] text-ink-muted uppercase tracking-wide">C</span>
                                </div>
                              )}
                              {custDocs > 0 && vendDocs > 0 && (
                                <span className="text-ink-muted/30 text-xs">·</span>
                              )}
                              {vendDocs > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-xs font-semibold text-ink-primary tabular-nums">{vendDocs}</span>
                                  <span className="text-[9px] text-ink-muted uppercase tracking-wide">V</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>

                        {/* ⑤ Billing */}
                        <td className="px-4 py-3">
                          {billingDocs.length > 0 ? (
                            <div className="flex items-center gap-2 min-w-[72px]">
                              <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                                <div
                                  className={classNames(
                                    'h-full rounded-full transition-all',
                                    billingPct === 100 ? 'bg-emerald-400' : billingPct >= 50 ? 'bg-pertamina-red' : 'bg-red-400',
                                  )}
                                  style={{ width: `${billingPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-ink-tertiary whitespace-nowrap tabular-nums">
                                {billingDone}/{billingDocs.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>

                        {/* ⑥ Status — pipeline bar + warning badge */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PipelineBar docs={projDocs} />
                            <WarningBadge docs={projDocs} />
                          </div>
                        </td>

                        {/* ⑦ Aksi */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDetail(p.id)}
                              className="rounded p-1.5 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                              title="Detail"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: p.id })}
                              className="rounded p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
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

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
                <FileText size={32} className="mb-2 opacity-30" />
                <p className="text-sm">
                  {projects.length === 0
                    ? 'Belum ada project. Klik "Tambah Project" untuk membuat.'
                    : 'Tidak ada data yang cocok dengan filter.'}
                </p>
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
                    ? 'Belum ada project. Klik "Tambah Project" untuk membuat.'
                    : 'Tidak ada data yang cocok dengan filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((p) => {
                  const custDocs    = docCount(p.id, 'customer')
                  const vendDocs    = docCount(p.id, 'vendor')
                  const totalDocs   = custDocs + vendDocs
                  const billingDocs = billingDocuments.filter((b) => b.projectId === p.id)
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
                          {p.picLaporan && (
                            <span className="chip bg-blue-50 text-blue-600 text-[9px] font-medium">{p.picLaporan}</span>
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
                        <button
                          onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: p.id })}
                          className="rounded p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition bg-white/80 shadow-sm"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
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
