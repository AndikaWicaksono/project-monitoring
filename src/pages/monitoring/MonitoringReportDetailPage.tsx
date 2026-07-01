import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, Eye, Pencil, Trash2, Paperclip, CheckCircle2, ChevronLeft, ChevronRight, Calendar, AlertTriangle, Flag, User, ArrowRight, Clock } from 'lucide-react'
import { useMonitoringReportStore } from '../../store/useMonitoringReportStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames, formatDateShort } from '../../utils/helpers'
import { reportMonthLabel, prevReportMonth, nextReportMonth } from '../../types/monitoring'
import type { ReportDocument, ReportDocumentStatus, BillingDocumentStatus, DocPhase } from '../../types/monitoring'

type ActiveTab = 'customer' | 'vendor' | 'billing' | 'sla'

const DOC_STATUS_META: Record<ReportDocumentStatus, { label: string; cls: string }> = {
  DRAFT:             { label: 'Draft',            cls: 'bg-slate-100 text-slate-700' },
  SUBMITTED:         { label: 'Submitted',         cls: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW:      { label: 'Under Review',      cls: 'bg-amber-100 text-amber-700' },
  REVISION_REQUIRED: { label: 'Revisi Diminta',    cls: 'bg-red-100 text-red-700' },
  APPROVED:          { label: 'Disetujui',          cls: 'bg-emerald-100 text-emerald-700' },
  COMPILING:         { label: 'Kompilasi Doccon',   cls: 'bg-violet-100 text-violet-700' },
  PENDING_KADIV:     { label: 'Menunggu Kadiv',     cls: 'bg-blue-100 text-blue-700' },
  KADIV_APPROVED:    { label: 'Disetujui Kadiv',    cls: 'bg-teal-100 text-teal-700' },
}

const BILLING_STATUS_META: Record<BillingDocumentStatus, { label: string; cls: string }> = {
  BELUM_DIBUAT: { label: 'Belum Dibuat', cls: 'bg-slate-100 text-slate-600' },
  DRAFT:        { label: 'Draft',        cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:    { label: 'Submitted',    cls: 'bg-amber-100 text-amber-700' },
  APPROVED:     { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:     { label: 'Rejected',     cls: 'bg-red-100 text-red-700' },
  COMPLETED:    { label: 'Completed',    cls: 'bg-pertamina-red-50 text-pertamina-red font-semibold' },
}

const REVISION_CLS: Record<string, string> = {
  R0: 'bg-slate-100 text-slate-600',
  R1: 'bg-blue-100 text-blue-700',
  R2: 'bg-violet-100 text-violet-700',
  R3: 'bg-amber-100 text-amber-700',
  R4: 'bg-red-100 text-red-700',
}

// ── Phase stepper ──────────────────────────────────────────────────────────

const NEW_CUSTOMER_PHASES: { key: DocPhase; label: string }[] = [
  { key: 'engineer',      label: 'Engineer' },
  { key: 'doccon',        label: 'Doccon' },
  { key: 'kadiv',         label: 'Kadiv' },
  { key: 'customer_email', label: 'Customer' },
  { key: 'sales',         label: 'Sales' },
]

const NEW_VENDOR_PHASES: { key: DocPhase; label: string }[] = [
  { key: 'doccon',        label: 'Doccon' },
  { key: 'kadiv',         label: 'Kadiv' },
  { key: 'vendor_confirm', label: 'Vendor' },
  { key: 'completed',     label: 'Selesai' },
]

const LEGACY_PHASES: { key: DocPhase; label: string }[] = [
  { key: 'engineer', label: 'Engineer' },
  { key: 'customer', label: 'Customer' },
  { key: 'doccon',   label: 'Doccon' },
]

function PhaseStepperMini({ doc }: { doc: ReportDocument }) {
  const current = doc.currentPhase ?? 'engineer'

  const steps =
    doc.docType === 'vendor' ? NEW_VENDOR_PHASES :
    current === 'customer'   ? LEGACY_PHASES :
    NEW_CUSTOMER_PHASES

  const currentIdx = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {steps.map((step, idx) => {
        const done   = currentIdx >= 0 && idx < currentIdx
        const active = step.key === current
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            {active ? (
              <div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-pertamina-red/10 text-pertamina-red whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-pertamina-red/70 shrink-0" />
                {step.label}
              </div>
            ) : (
              <div
                className={classNames('w-2 h-2 rounded-full shrink-0', done ? 'bg-emerald-400' : 'bg-black/[0.12]')}
                title={step.label}
              />
            )}
            {idx < steps.length - 1 && (
              <div className={classNames('w-2 h-px shrink-0', idx < currentIdx ? 'bg-emerald-300' : 'bg-black/[0.08]')} />
            )}
          </div>
        )
      })}
      {doc.hasConflict && (
        <span className="ml-1 chip bg-orange-100 text-orange-700 text-[9px]">Conflict</span>
      )}
    </div>
  )
}

// ── Dependency badge ───────────────────────────────────────────────────────

function DependencyBadge({ doc }: { doc: ReportDocument }) {
  if (doc.currentPhase !== 'doccon') return null
  const sub = doc.docconSubStatus
  if (sub === 'delivered') return <span className="chip bg-emerald-100 text-emerald-700 text-[9px]">Delivered</span>
  if (sub === 'ready_to_sales') return <span className="chip bg-blue-100 text-blue-700 text-[9px]">Ready to Sales</span>
  if (sub === 'qc_review') return <span className="chip bg-purple-100 text-purple-700 text-[9px]">QC Review</span>
  return <span className="chip bg-amber-100 text-amber-700 text-[9px]">Compiling</span>
}

// ── Early warning badge ────────────────────────────────────────────────────

function DeadlineBadge({ doc }: { doc: ReportDocument }) {
  if (!doc.deadlineToSales) return null
  const today = new Date()
  const deadline = new Date(doc.deadlineToSales)
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return <span className="chip bg-red-100 text-red-700 text-[9px] font-semibold">Overdue</span>
  if (diffDays === 0) return <span className="chip bg-red-50 text-red-600 text-[9px] font-semibold">H-0</span>
  if (diffDays <= 1) return <span className="chip bg-red-50 text-red-600 text-[9px]">H-{diffDays}</span>
  if (diffDays <= 3) return <span className="chip bg-amber-100 text-amber-700 text-[9px]">H-{diffDays}</span>
  if (diffDays <= 5) return <span className="chip bg-yellow-100 text-yellow-700 text-[9px]">H-{diffDays}</span>
  return <span className="text-[10px] text-ink-tertiary">{formatDateShort(doc.deadlineToSales)}</span>
}

// ── SLA Compliance section ─────────────────────────────────────────────────

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return ms > 0 ? Math.round(ms / 86400000) : 0
}

function SLAComplianceTab({ docs }: { docs: ReportDocument[] }) {
  // Deteksi apakah doc menggunakan flow baru (ada kadivApprovedAt atau phase baru)
  const isNewFlow = (d: ReportDocument) =>
    d.kadivApprovedAt != null ||
    ['kadiv', 'customer_email', 'vendor_confirm', 'sales', 'completed'].includes(d.currentPhase ?? '')

  // ── Phase 1: Engineer (SLA ≤5 hari)
  // Hanya customer doc; vendor doc diinput langsung oleh Doccon, bukan Engineer
  // Ukur: engineerStartedAt → engineerSubmittedAt
  const ENG_SLA = 5
  const engDocs = docs.filter((d) => d.docType === 'customer')
  const engDone = engDocs.filter((d) => d.engineerStartedAt && d.engineerSubmittedAt)
  const engOnTime = engDone.filter((d) => (daysBetween(d.engineerStartedAt, d.engineerSubmittedAt) ?? 999) <= ENG_SLA)
  const engPct = engDone.length ? Math.round((engOnTime.length / engDone.length) * 100) : null

  // ── Phase 2: Doccon → Kadiv (SLA ≤3 hari)
  // New flow: docconReceivedAt → kadivApprovedAt
  // Legacy:   docconReceivedAt → docconDeliveredAt
  const DK_SLA = 3
  const dkDone = docs.filter((d) => {
    if (isNewFlow(d)) return !!(d.docconReceivedAt && d.kadivApprovedAt)
    return !!(d.docconReceivedAt && d.docconDeliveredAt)
  })
  const dkOnTime = dkDone.filter((d) => {
    const end = isNewFlow(d) ? d.kadivApprovedAt : d.docconDeliveredAt
    return (daysBetween(d.docconReceivedAt, end) ?? 999) <= DK_SLA
  })
  const dkPct = dkDone.length ? Math.round((dkOnTime.length / dkDone.length) * 100) : null

  // ── Phase 3: Konfirmasi (SLA ≤2 hari)
  // New flow customer: kadivApprovedAt → customerConfirmedAt
  // New flow vendor:   kadivApprovedAt → vendorConfirmedAt
  // Legacy:            customerReceivedAt → customerApprovedAt
  const CONF_SLA = 2
  const confDone = docs.filter((d) => {
    if (isNewFlow(d)) {
      if (!d.kadivApprovedAt) return false
      return !!(d.customerConfirmedAt ?? d.vendorConfirmedAt)
    }
    return !!(d.customerReceivedAt && d.customerApprovedAt)
  })
  const confOnTime = confDone.filter((d) => {
    if (isNewFlow(d)) {
      const end = d.customerConfirmedAt ?? d.vendorConfirmedAt
      return (daysBetween(d.kadivApprovedAt, end) ?? 999) <= CONF_SLA
    }
    return (daysBetween(d.customerReceivedAt, d.customerApprovedAt) ?? 999) <= CONF_SLA
  })
  const confPct = confDone.length ? Math.round((confOnTime.length / confDone.length) * 100) : null

  const slaRows = [
    { label: 'Engineer',       sublabel: 'Submit ke Doccon',          sla: ENG_SLA,  pct: engPct,  done: engDone.length,  onTime: engOnTime.length },
    { label: 'Doccon → Kadiv', sublabel: 'Terima s/d Kadiv Approve', sla: DK_SLA,   pct: dkPct,   done: dkDone.length,   onTime: dkOnTime.length },
    { label: 'Konfirmasi',     sublabel: 'Kadiv Approve s/d Confirm', sla: CONF_SLA, pct: confPct, done: confDone.length, onTime: confOnTime.length },
  ]

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {slaRows.map(({ label, sublabel, sla, pct, done, onTime }) => (
          <div key={label} className="surface rounded-xl p-4 space-y-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">{label} Phase</div>
              <div className="text-[10px] text-ink-muted mt-0.5">{sublabel}</div>
            </div>
            <div className="text-2xl font-bold text-ink-primary">
              {pct !== null ? `${pct}%` : <span className="text-ink-muted text-base">N/A</span>}
            </div>
            <div className="text-[10px] text-ink-tertiary">On-time (SLA ≤{sla} hari)</div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div
                className={classNames(
                  'h-full rounded-full transition-all',
                  pct === null ? 'bg-transparent' :
                  pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: pct !== null ? `${pct}%` : '0%' }}
              />
            </div>
            {done > 0 && <div className="text-[10px] text-ink-secondary">{onTime}/{done} dokumen tepat waktu</div>}
          </div>
        ))}
      </div>

      {/* Per-doc breakdown */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <span className="text-xs font-semibold text-ink-primary">Detail Per Dokumen</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {[
                  'Dokumen',
                  `Engineer (≤${ENG_SLA}h)`,
                  `Doccon→Kadiv (≤${DK_SLA}h)`,
                  `Konfirmasi (≤${CONF_SLA}h)`,
                  'Deadline Sales',
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {docs.map((doc) => {
                const newFlow = isNewFlow(doc)
                const isVendor = doc.docType === 'vendor'

                // Engineer: hanya customer doc
                const eDays = !isVendor ? daysBetween(doc.engineerStartedAt, doc.engineerSubmittedAt) : null

                // Doccon→Kadiv
                const dkEnd = newFlow ? doc.kadivApprovedAt : doc.docconDeliveredAt
                const dkDays = daysBetween(doc.docconReceivedAt, dkEnd)

                // Konfirmasi
                let confDays: number | null = null
                if (newFlow) {
                  const confEnd = doc.customerConfirmedAt ?? doc.vendorConfirmedAt
                  confDays = daysBetween(doc.kadivApprovedAt, confEnd)
                } else {
                  confDays = daysBetween(doc.customerReceivedAt, doc.customerApprovedAt)
                }

                const cell = (days: number | null, sla: number) => {
                  if (days === null) return <span className="text-ink-muted">—</span>
                  const ok = days <= sla
                  return (
                    <span className={classNames('chip text-[10px]', ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                      {days}h {ok ? '✓' : '!'}
                    </span>
                  )
                }

                return (
                  <tr key={doc.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-2.5 text-xs max-w-[180px] truncate" title={doc.judul}>
                      <div className="text-ink-primary truncate">{doc.judul}</div>
                      <div className="text-[10px] text-ink-tertiary">{isVendor ? 'Vendor' : 'Customer'}</div>
                    </td>
                    <td className="px-4 py-2.5">{isVendor ? <span className="text-[10px] text-ink-muted">N/A</span> : cell(eDays, ENG_SLA)}</td>
                    <td className="px-4 py-2.5">{cell(dkDays, DK_SLA)}</td>
                    <td className="px-4 py-2.5">{cell(confDays, CONF_SLA)}</td>
                    <td className="px-4 py-2.5"><DeadlineBadge doc={doc} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {docs.length === 0 && (
          <div className="py-10 text-center text-xs text-ink-tertiary">Belum ada dokumen pada periode ini.</div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function MonitoringReportDetailPage() {
  const { projects, documents, billingDocuments, deleteDocument, deleteBillingDocument } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const reportDetailProjectId = useUIStore((s) => s.reportDetailProjectId)
  const selectedMonth = useUIStore((s) => s.selectedReportMonth)
  const setSelectedMonth = useUIStore((s) => s.setSelectedReportMonth)
  const { canDeleteMonitoring, canEditMonitoring } = useMonitoringRole()

  const project = projects.find((p) => p.id === reportDetailProjectId)
  const [activeTab, setActiveTab] = useState<ActiveTab>('customer')
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null)
  const [confirmDeleteBillingId, setConfirmDeleteBillingId] = useState<string | null>(null)

  const custDocs = documents.filter((d) => d.projectId === reportDetailProjectId && d.docType === 'customer' && d.period === selectedMonth)
  const vendDocs = documents.filter((d) => d.projectId === reportDetailProjectId && d.docType === 'vendor' && d.period === selectedMonth)
  const billingDocs = billingDocuments.filter((b) => b.projectId === reportDetailProjectId)
  const billingCompleted = billingDocs.filter((b) => b.status === 'COMPLETED').length
  const billingProgress = billingDocs.length > 0 ? Math.round((billingCompleted / billingDocs.length) * 100) : 0

  const allPeriodDocs = useMemo(() => [...custDocs, ...vendDocs], [custDocs, vendDocs])
  const tabDocs = activeTab === 'customer' ? custDocs : activeTab === 'vendor' ? vendDocs : []

  if (!project) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ink-tertiary p-5">
        <p className="text-sm">Project tidak ditemukan.</p>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setView('monitoring-report')}>Kembali</Button>
      </div>
    )
  }

  const tabs: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'customer', label: 'Report Customer', count: custDocs.length },
    { key: 'vendor',   label: 'Report Vendor',   count: vendDocs.length },
    { key: 'billing',  label: 'Billing Tracker', count: billingDocs.length },
    { key: 'sla',      label: 'SLA Compliance',  count: allPeriodDocs.length },
  ]

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('monitoring-report')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
        >
          <ArrowLeft size={13} />
          Report Project
        </button>
        <span className="text-ink-tertiary text-xs">/</span>
        <span className="text-xs text-ink-primary font-medium">{project.kodeProject}</span>
      </div>

      {/* Header card */}
      <div className="surface rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-pertamina-red uppercase tracking-widest mb-1">{project.kodeProject}</div>
            <h2 className="text-base font-semibold text-ink-primary">{project.namaKontrak}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              <span><span className="text-ink-tertiary">Client:</span> {project.client}</span>
              <span><span className="text-ink-tertiary">Dept:</span> {project.department}</span>
              <span><span className="text-ink-tertiary">PIC Laporan:</span> {project.picLaporan || '—'}</span>
              <span><span className="text-ink-tertiary">PIC Docon:</span> {project.picDocon || '—'}</span>
              <span><span className="text-ink-tertiary">Sales:</span> {project.salesCustomer || '—'}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openModal({ type: 'monitoring-report-project-edit', projectId: project.id })}
            leftIcon={<Pencil size={13} />}
          >
            Edit Project
          </Button>
        </div>
      </div>

      {/* Period navigator */}
      <div className="surface rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pertamina-red-50">
          <Calendar size={15} className="text-pertamina-red" />
        </div>
        <span className="text-xs text-ink-secondary">Periode</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedMonth(prevReportMonth(selectedMonth))}
            className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-ink-primary min-w-[120px] text-center">
            {reportMonthLabel(selectedMonth)}
          </span>
          <button
            onClick={() => setSelectedMonth(nextReportMonth(selectedMonth))}
            className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <span className="text-[11px] text-ink-tertiary ml-auto">
          {custDocs.length + vendDocs.length} dokumen pada periode ini
        </span>
      </div>

      {/* Billing Progress Card */}
      <div className="surface rounded-xl p-4 flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pertamina-red-50">
          <CheckCircle2 size={22} className="text-pertamina-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink-primary">Billing Progress</span>
            <span className="text-xs font-semibold text-pertamina-red">{billingCompleted}/{billingDocs.length} Dokumen Selesai</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-pertamina-red transition-all duration-500"
              style={{ width: `${billingProgress}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-ink-tertiary">{billingProgress}% completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border-subtle overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={classNames(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-pertamina-red text-pertamina-red'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary',
              )}
            >
              {tab.label}
              <span className={classNames(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                activeTab === tab.key ? 'bg-pertamina-red/10 text-pertamina-red' : 'bg-black/[0.05] text-ink-tertiary',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center px-4">
            {activeTab === 'customer' || activeTab === 'vendor' ? (
              <Button
                size="sm"
                onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab as 'customer' | 'vendor' })}
                leftIcon={<Plus size={13} />}
              >
                Tambah Dokumen
              </Button>
            ) : activeTab === 'billing' ? (
              <Button
                size="sm"
                onClick={() => openModal({ type: 'monitoring-billing-create', projectId: project.id })}
                leftIcon={<Plus size={13} />}
              >
                Tambah Billing
              </Button>
            ) : null}
          </div>
        </div>

        {/* Report Customer / Report Vendor table */}
        {(activeTab === 'customer' || activeTab === 'vendor') && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {['Judul Dokumen', 'PIC', 'Deadline Sales', 'Tgl Submit', 'Tgl Feedback', 'Revisi', 'Status', 'Attach', 'Aksi'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {tabDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-black/[0.02] transition-colors align-top">
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary max-w-[220px]">
                        <div className="truncate" title={doc.judul}>{doc.judul}</div>
                        {doc.deskripsi && <div className="text-[11px] text-ink-tertiary truncate mt-0.5">{doc.deskripsi}</div>}
                        {/* Phase stepper */}
                        <PhaseStepperMini doc={doc} />
                        {/* Dependency / doccon badge */}
                        <div className="mt-1 flex gap-1 flex-wrap">
                          <DependencyBadge doc={doc} />
                          {doc.salesFlagIssue && (
                            <span className="chip bg-orange-100 text-orange-700 text-[9px] flex items-center gap-0.5" title={doc.salesIssueNote}>
                              <Flag size={8} />Dikembalikan Sales
                            </span>
                          )}
                          {doc.docconSubStatus === 'delivered' && doc.salesAcceptedAt && !doc.salesFlagIssue && (
                            <span className="chip bg-emerald-100 text-emerald-700 text-[9px] flex items-center gap-0.5">
                              <CheckCircle2 size={8} />Diterima Sales
                            </span>
                          )}
                          {doc.docconSubStatus === 'delivered' && !doc.salesAcceptedAt && !doc.salesFlagIssue && (
                            <span className="chip bg-blue-50 text-blue-600 text-[9px] flex items-center gap-0.5">
                              <Clock size={8} />Menunggu Sales
                            </span>
                          )}
                          {doc.hasConflict && doc.currentPhase === 'engineer' && (
                            <span className="chip bg-red-100 text-red-700 text-[9px] flex items-center gap-0.5">
                              <AlertTriangle size={8} />Conflict
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ink-secondary whitespace-nowrap">
                        {(doc.engineerPIC || doc.customerPIC || doc.docconPIC) ? (
                          <div className="space-y-0.5">
                            {doc.engineerPIC && <div className="flex items-center gap-1"><User size={9} className="text-blue-400" />{doc.engineerPIC}</div>}
                            {doc.customerPIC && <div className="flex items-center gap-1"><User size={9} className="text-purple-400" />{doc.customerPIC}</div>}
                            {doc.docconPIC && <div className="flex items-center gap-1"><User size={9} className="text-amber-500" />{doc.docconPIC}</div>}
                          </div>
                        ) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DeadlineBadge doc={doc} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.tanggalSubmit ? formatDateShort(doc.tanggalSubmit) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.tanggalFeedback ? formatDateShort(doc.tanggalFeedback) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip text-[10px]', REVISION_CLS[doc.revision] ?? 'bg-slate-100 text-slate-600')}>{doc.revision}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip', DOC_STATUS_META[doc.status].cls)}>{DOC_STATUS_META[doc.status].label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {doc.attachments.length > 0
                          ? <span className="flex items-center gap-1"><Paperclip size={11} /> {doc.attachments.length}</span>
                          : <span className="text-ink-muted">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal({ type: 'monitoring-report-document-detail', documentId: doc.id })} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Detail"><Eye size={13} /></button>
                          <button onClick={() => openModal({ type: 'monitoring-report-document-edit', documentId: doc.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                          {canEditMonitoring && <button onClick={() => setConfirmDeleteDocId(doc.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus Dokumen"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tabDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
                <p className="text-sm">Belum ada dokumen {activeTab === 'customer' ? 'customer' : 'vendor'} untuk periode <strong>{reportMonthLabel(selectedMonth)}</strong>.</p>
                <Button
                  size="sm" className="mt-3"
                  onClick={() => openModal({ type: 'monitoring-report-document-create', projectId: project.id, docType: activeTab as 'customer' | 'vendor' })}
                  leftIcon={<Plus size={13} />}
                >
                  Tambah Dokumen Pertama
                </Button>
              </div>
            )}
          </>
        )}

        {/* Billing Tracker table */}
        {activeTab === 'billing' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-black/[0.02]">
                    {['Jenis Dokumen', 'PIC', 'Target Date', 'Actual Date', 'Status', 'Keterangan', 'Attachment', 'Aksi'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {billingDocs.map((b) => (
                    <tr key={b.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-ink-primary whitespace-nowrap">{b.docType}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">{b.pic || '—'}</td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.targetDate ? formatDateShort(b.targetDate) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.actualDate ? formatDateShort(b.actualDate) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip', BILLING_STATUS_META[b.status].cls)}>{BILLING_STATUS_META[b.status].label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary max-w-[180px]">
                        <div className="truncate" title={b.keterangan}>{b.keterangan || <span className="text-ink-muted">—</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {b.attachments.length > 0
                          ? <span className="flex items-center gap-1"><Paperclip size={11} /> {b.attachments.length}</span>
                          : <span className="text-ink-muted">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal({ type: 'monitoring-billing-edit', billingId: b.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition" title="Edit"><Pencil size={13} /></button>
                          {canDeleteMonitoring && <button onClick={() => setConfirmDeleteBillingId(b.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition" title="Hapus"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {billingDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
                <p className="text-sm">Belum ada billing document untuk project ini.</p>
                <Button
                  size="sm" className="mt-3"
                  onClick={() => openModal({ type: 'monitoring-billing-create', projectId: project.id })}
                  leftIcon={<Plus size={13} />}
                >
                  Tambah Billing Pertama
                </Button>
              </div>
            )}
          </>
        )}

        {/* SLA Compliance tab */}
        {activeTab === 'sla' && <SLAComplianceTab docs={allPeriodDocs} />}
      </div>

      {/* Confirm delete report doc */}
      {confirmDeleteDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Dokumen?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteDocId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteDocument(confirmDeleteDocId); setConfirmDeleteDocId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete billing doc */}
      {confirmDeleteBillingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Billing Document?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteBillingId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteBillingDocument(confirmDeleteBillingId); setConfirmDeleteBillingId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
