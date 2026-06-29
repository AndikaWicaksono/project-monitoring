import { useMemo, useState } from 'react'
import {
  CheckCircle2, Flag, Eye, Inbox, AlertTriangle, Clock,
  ChevronDown, ChevronUp, FileText,
} from 'lucide-react'
import { useMonitoringReportStore } from '../store/useMonitoringReportStore'
import { useUIStore } from '../store/useUIStore'
import { Button } from '../components/ui/Button'
import { classNames, formatDateShort } from '../utils/helpers'
import type { ReportDocument, ReportProject } from '../types/monitoring'

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  '2026-01': 'Jan 2026', '2026-02': 'Feb 2026', '2026-03': 'Mar 2026',
  '2026-04': 'Apr 2026', '2026-05': 'Mei 2026', '2026-06': 'Jun 2026',
  '2025-12': 'Des 2025', '2025-11': 'Nov 2025',
}

function deadlineMeta(deadline: string | null | undefined) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diff < 0)  return { label: 'Overdue', cls: 'bg-red-100 text-red-700' }
  if (diff <= 1) return { label: 'H-1',     cls: 'bg-red-50 text-red-600' }
  if (diff <= 3) return { label: `H-${diff}`, cls: 'bg-amber-100 text-amber-700' }
  return { label: `H-${diff}`, cls: 'bg-slate-100 text-slate-500' }
}

type DocStatus = 'pending' | 'flagged' | 'accepted'

function docStatus(doc: ReportDocument): DocStatus {
  if (doc.salesFlagIssue) return 'flagged'
  if (doc.salesAcceptedAt) return 'accepted'
  return 'pending'
}

type FilterTab = 'pending' | 'flagged' | 'accepted' | 'all'

interface ProjectGroup {
  project: ReportProject
  docs: ReportDocument[]
  pendingCount: number
  flaggedCount: number
  acceptedCount: number
}

// ── DocumentRow ────────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onAccept,
  onFlag,
  onView,
}: {
  doc: ReportDocument
  onAccept: () => void
  onFlag: () => void
  onView: () => void
}) {
  const status = docStatus(doc)
  const dl     = deadlineMeta(doc.deadlineToSales)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle/60 last:border-0 hover:bg-black/[0.015] transition-colors group">
      {/* Doc icon + type */}
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink-tertiary">
        <FileText size={14} />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-medium text-ink-primary truncate max-w-[280px]" title={doc.judul}>
            {doc.judul}
          </span>
          <span className="chip bg-slate-100 text-slate-500 text-[9px]">
            {doc.docType === 'customer' ? 'Customer' : 'Vendor'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-ink-tertiary">{MONTH_NAMES[doc.period] ?? doc.period}</span>
          {doc.docconDeliveredAt && (
            <span className="text-[10px] text-ink-muted">Diserahkan {formatDateShort(doc.docconDeliveredAt)}</span>
          )}
          {status === 'flagged' && doc.salesIssueNote && (
            <span className="text-[10px] text-red-600 italic truncate max-w-[200px]" title={doc.salesIssueNote}>
              "{doc.salesIssueNote}"
            </span>
          )}
          {status === 'accepted' && doc.salesAcceptedAt && (
            <span className="text-[10px] text-emerald-600">Diterima {formatDateShort(doc.salesAcceptedAt)}</span>
          )}
        </div>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-[90px]">
        {doc.deadlineToSales ? (
          <>
            <span className="text-[11px] text-ink-secondary">{formatDateShort(doc.deadlineToSales)}</span>
            {dl && <span className={classNames('chip text-[9px] font-semibold', dl.cls)}>{dl.label}</span>}
          </>
        ) : (
          <span className="text-[11px] text-ink-muted">—</span>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0 w-[120px]">
        {status === 'flagged' ? (
          <span className="chip bg-red-100 text-red-700 text-[10px] font-semibold flex items-center gap-1 w-fit">
            <Flag size={9} /> Perlu Revisi
          </span>
        ) : status === 'accepted' ? (
          <span className="chip bg-emerald-100 text-emerald-700 text-[10px] font-semibold flex items-center gap-1 w-fit">
            <CheckCircle2 size={9} /> Diterima
          </span>
        ) : (
          <span className="chip bg-amber-50 text-amber-700 text-[10px] flex items-center gap-1 w-fit">
            <Clock size={9} /> Menunggu
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onView}
          className="rounded p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
          title="Lihat dokumen"
        >
          <Eye size={13} />
        </button>
        {status === 'pending' && (
          <>
            <button
              onClick={onAccept}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <CheckCircle2 size={11} /> Terima
            </button>
            <button
              onClick={onFlag}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
            >
              <Flag size={11} /> Flag
            </button>
          </>
        )}
        {status === 'flagged' && (
          <button
            onClick={onAccept}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            <CheckCircle2 size={11} /> Terima
          </button>
        )}
      </div>
    </div>
  )
}

// ── ProjectCard ────────────────────────────────────────────────────────────────

function ProjectCard({
  group,
  defaultOpen,
  onAccept,
  onFlag,
  onView,
}: {
  group: ProjectGroup
  defaultOpen: boolean
  onAccept: (docId: string) => void
  onFlag: (docId: string) => void
  onView: (docId: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const { project, docs, pendingCount, flaggedCount, acceptedCount } = group
  const totalCount = docs.length

  const headerStatus = flaggedCount > 0 ? 'flagged'
    : pendingCount > 0 ? 'pending'
    : 'accepted'

  const headerBorder = headerStatus === 'flagged' ? 'border-red-200'
    : headerStatus === 'pending' ? 'border-amber-200'
    : 'border-emerald-200'

  const accentBar = headerStatus === 'flagged' ? 'bg-red-400'
    : headerStatus === 'pending' ? 'bg-amber-400'
    : 'bg-emerald-400'

  return (
    <div className={classNames('surface rounded-xl overflow-hidden border', headerBorder)}>
      {/* Accent bar */}
      <div className={classNames('h-1 w-full', accentBar)} />

      {/* Project header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-black/[0.02] transition-colors text-left"
      >
        {/* Code + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-mono font-bold text-pertamina-red">{project.kodeProject}</span>
            <span className="text-[11px] text-ink-tertiary">·</span>
            <span className="text-[12px] text-ink-secondary truncate">{project.client}</span>
          </div>
          <div className="text-[11px] text-ink-tertiary mt-0.5 truncate">{project.namaKontrak}</div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {flaggedCount > 0 && (
            <span className="chip bg-red-100 text-red-700 text-[10px] font-semibold flex items-center gap-1">
              <Flag size={9} /> {flaggedCount} revisi
            </span>
          )}
          {pendingCount > 0 && (
            <span className="chip bg-amber-100 text-amber-700 text-[10px] font-semibold flex items-center gap-1">
              <Clock size={9} /> {pendingCount} menunggu
            </span>
          )}
          {acceptedCount > 0 && (
            <span className="chip bg-emerald-100 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
              <CheckCircle2 size={9} /> {acceptedCount} diterima
            </span>
          )}
          <span className="text-[10px] text-ink-muted ml-1">{totalCount} dok</span>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-ink-tertiary">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Document list */}
      {open && (
        <div className="border-t border-border-subtle">
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onAccept={() => onAccept(doc.id)}
              onFlag={() => onFlag(doc.id)}
              onView={() => onView(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SalesInboxPage() {
  const { documents, projects, recordSalesFeedback } = useMonitoringReportStore()
  const openModal = useUIStore((s) => s.openModal)

  const [tab, setTab]               = useState<FilterTab>('pending')
  const [flagDocId, setFlagDocId]   = useState<string | null>(null)
  const [flagNote, setFlagNote]     = useState('')
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null)

  // Only delivered docs matter for Sales
  const deliveredDocs = useMemo(
    () => documents.filter((d) => d.docconSubStatus === 'delivered'),
    [documents],
  )

  // Global counts
  const pendingTotal  = deliveredDocs.filter((d) => docStatus(d) === 'pending').length
  const flaggedTotal  = deliveredDocs.filter((d) => docStatus(d) === 'flagged').length
  const acceptedTotal = deliveredDocs.filter((d) => docStatus(d) === 'accepted').length

  // Filter docs by tab
  const filteredDocs = useMemo(() => {
    if (tab === 'all') return deliveredDocs
    return deliveredDocs.filter((d) => docStatus(d) === tab)
  }, [deliveredDocs, tab])

  // Group by project
  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string, ReportDocument[]>()
    for (const doc of filteredDocs) {
      if (!map.has(doc.projectId)) map.set(doc.projectId, [])
      map.get(doc.projectId)!.push(doc)
    }
    return [...map.entries()]
      .map(([projectId, docs]) => {
        const project = projects.find((p) => p.id === projectId)
        if (!project) return null
        return {
          project,
          docs,
          pendingCount:  docs.filter((d) => docStatus(d) === 'pending').length,
          flaggedCount:  docs.filter((d) => docStatus(d) === 'flagged').length,
          acceptedCount: docs.filter((d) => docStatus(d) === 'accepted').length,
        }
      })
      .filter(Boolean) as ProjectGroup[]
  }, [filteredDocs, projects])

  const tabs = [
    { key: 'pending'  as FilterTab, label: 'Menunggu Konfirmasi', count: pendingTotal,  icon: <Clock size={11} />,        cls: 'text-amber-700'   },
    { key: 'flagged'  as FilterTab, label: 'Perlu Revisi',        count: flaggedTotal,  icon: <Flag size={11} />,         cls: 'text-red-700'     },
    { key: 'accepted' as FilterTab, label: 'Diterima',            count: acceptedTotal, icon: <CheckCircle2 size={11} />, cls: 'text-emerald-700' },
    { key: 'all'      as FilterTab, label: 'Semua',               count: deliveredDocs.length, icon: null,               cls: 'text-ink-secondary' },
  ]

  function handleAccept(docId: string) {
    recordSalesFeedback(docId, false, '')
    setConfirmAcceptId(null)
  }

  function handleFlag() {
    if (!flagDocId) return
    recordSalesFeedback(flagDocId, true, flagNote.trim())
    setFlagDocId(null)
    setFlagNote('')
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Inbox size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-primary">Sales Inbox</h1>
          <p className="text-[11px] text-ink-tertiary">
            Dokumen laporan dari Doccon yang perlu dikonfirmasi
          </p>
        </div>
        {pendingTotal > 0 && (
          <span className="ml-auto chip bg-amber-100 text-amber-700 font-semibold text-[11px] flex items-center gap-1">
            <Clock size={10} /> {pendingTotal} menunggu konfirmasi
          </span>
        )}
        {flaggedTotal > 0 && (
          <span className={pendingTotal > 0 ? 'chip bg-red-100 text-red-700 font-semibold text-[11px] flex items-center gap-1' : 'ml-auto chip bg-red-100 text-red-700 font-semibold text-[11px] flex items-center gap-1'}>
            <Flag size={10} /> {flaggedTotal} perlu revisi
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="flex border-b border-border-subtle">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={classNames(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition border-b-2 -mb-px',
                tab === t.key
                  ? 'border-pertamina-red text-pertamina-red'
                  : 'border-transparent text-ink-tertiary hover:text-ink-primary',
              )}
            >
              {t.icon && <span className={tab === t.key ? 'text-pertamina-red' : t.cls}>{t.icon}</span>}
              {t.label}
              <span className={classNames(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                tab === t.key ? 'bg-pertamina-red/10 text-pertamina-red' : 'bg-black/[0.05] text-ink-tertiary',
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-black/[0.01] border-b border-border-subtle text-[11px] text-ink-tertiary">
          <span>{projectGroups.length} project</span>
          <span className="text-border-subtle">·</span>
          <span>{filteredDocs.length} dokumen</span>
          {tab === 'all' && (
            <>
              <span className="text-border-subtle">·</span>
              <span className="text-amber-600 font-medium">{pendingTotal} menunggu</span>
              {flaggedTotal > 0 && <><span className="text-border-subtle">·</span><span className="text-red-600 font-medium">{flaggedTotal} revisi</span></>}
              {acceptedTotal > 0 && <><span className="text-border-subtle">·</span><span className="text-emerald-600 font-medium">{acceptedTotal} diterima</span></>}
            </>
          )}
        </div>
      </div>

      {/* Project groups */}
      {projectGroups.length === 0 ? (
        <div className="surface rounded-xl flex flex-col items-center justify-center py-20 text-ink-tertiary">
          <CheckCircle2 size={32} className="mb-2 opacity-30" />
          <p className="text-sm">
            {tab === 'pending' ? 'Tidak ada dokumen yang menunggu konfirmasi'
              : tab === 'flagged' ? 'Tidak ada dokumen yang perlu direvisi'
              : tab === 'accepted' ? 'Belum ada dokumen yang diterima'
              : 'Belum ada dokumen'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectGroups.map((group) => (
            <ProjectCard
              key={group.project.id}
              group={group}
              defaultOpen={group.flaggedCount > 0 || group.pendingCount > 0}
              onAccept={(docId) => setConfirmAcceptId(docId)}
              onFlag={(docId) => { setFlagDocId(docId); setFlagNote('') }}
              onView={(docId) => openModal({ type: 'monitoring-report-document-detail', documentId: docId })}
            />
          ))}
        </div>
      )}

      {/* Confirm Accept dialog */}
      {confirmAcceptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink-primary">Terima Dokumen?</h3>
            </div>
            <p className="text-sm text-ink-secondary mb-6">
              Dokumen akan ditandai sebagai <strong>Diterima</strong> dan tidak perlu tindakan lebih lanjut.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmAcceptId(null)}>Batal</Button>
              <Button size="sm" onClick={() => handleAccept(confirmAcceptId)}>Konfirmasi Terima</Button>
            </div>
          </div>
        </div>
      )}

      {/* Flag dialog */}
      {flagDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink-primary">Tandai Perlu Revisi</h3>
            </div>
            <p className="text-sm text-ink-secondary mb-3">
              Jelaskan masalah yang ditemukan agar Doccon bisa memperbaikinya:
            </p>
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Contoh: Nomor kontrak tidak sesuai PO, format halaman salah, lampiran kurang, dll."
              rows={3}
              className="input-base text-xs w-full resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setFlagDocId(null)}>Batal</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleFlag}
                disabled={!flagNote.trim()}
              >
                <Flag size={12} /> Tandai Revisi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
