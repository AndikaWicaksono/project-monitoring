import React, { useMemo, useState } from 'react'
import { ChevronLeft, Plus, Pencil, Trash2, ArrowLeft, Lock, Unlock, RotateCcw, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/helpers'
import {
  SLA_MONTHS, slaMonthLabel, computeComponentAvg, computeProjectMonthAvg,
  computeProjectGrandAvg, slaStatusCalc, fmt1, fmt2, type SLAStatus,
} from '../../types/monitoring'

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  TERCAPAI:       'bg-emerald-100 text-emerald-700',
  TIDAK_TERCAPAI: 'bg-red-100 text-red-700',
}

export function MonitoringSLADetailPage() {
  const { projects, components, monthlyRecords, deleteComponent, deleteMonthlyRecord, unlockRecord, requestReconfirm, clearReconfirm } = useMonitoringSLAStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const slaDetailProjectId = useUIStore((s) => s.slaDetailProjectId)
  const { canDeleteMonitoring, canUnlockRecord, isEngineerOS, isDoccon, canEditMonitoring } = useMonitoringRole()

  const project = projects.find((p) => p.id === slaDetailProjectId)
  const projectComponents = useMemo(() => components.filter((c) => c.projectId === slaDetailProjectId), [components, slaDetailProjectId])

  const [year, setYear] = useState(new Date().getFullYear())
  const [confirmDeleteCompId, setConfirmDeleteCompId] = useState<string | null>(null)
  const [confirmDeleteRecId, setConfirmDeleteRecId] = useState<string | null>(null)
  const [reconfirmRecId, setReconfirmRecId] = useState<string | null>(null)
  const [reconfirmNote, setReconfirmNote] = useState('')
  const [confirmingRecId, setConfirmingRecId] = useState<string | null>(null)
  const [engineerComment, setEngineerComment] = useState('')
  const [expandedComp] = useState<string | null>(null)

  const yearOptions = [2023, 2024, 2025, 2026]

  const grand = project ? computeProjectGrandAvg(components, monthlyRecords, project.id, year) : null
  const grandStatus = project ? slaStatusCalc(grand, project.targetSLA) : null

  if (!project) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ink-tertiary p-5">
        <p className="text-sm">Project tidak ditemukan.</p>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={() => setView('monitoring-sla')}>Kembali</Button>
      </div>
    )
  }

  function handleUnlockRecord(recordId: string) {
    unlockRecord(recordId)
    toast.success('Data berhasil dibuka untuk diedit')
  }

  function handleRequestReconfirm() {
    if (!reconfirmRecId) return
    requestReconfirm(reconfirmRecId, reconfirmNote.trim())
    toast.success('Permintaan reconfirm telah dikirim ke Engineer On Site')
    setReconfirmRecId(null)
    setReconfirmNote('')
  }

  function handleClearReconfirm(recordId: string, comment: string) {
    clearReconfirm(recordId, comment)
    setConfirmingRecId(null)
    setEngineerComment('')
    toast.success('Konfirmasi terkirim ke Doccon')
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('monitoring-sla')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
        >
          <ArrowLeft size={13} />
          SLA Monitoring
        </button>
        <span className="text-ink-tertiary text-xs">/</span>
        <span className="text-xs text-ink-primary font-medium">{project.kodeProject}</span>
        {isEngineerOS && (
          <span className="ml-auto chip bg-amber-50 text-amber-700 text-[10px]">Mode Baca Saja</span>
        )}
      </div>

      {/* Header card */}
      <div className="surface rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-pertamina-red uppercase tracking-widest">{project.kodeProject}</span>
              {grandStatus && (
                <span className={classNames('chip text-[10px]', SLA_STATUS_CLS[grandStatus])}>
                  {grandStatus === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-ink-primary">{project.namaProject}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              <span><span className="text-ink-tertiary">Dept:</span> {project.department}</span>
              <span><span className="text-ink-tertiary">PIC:</span> {project.pic || '—'}</span>
              <span><span className="text-ink-tertiary">Target:</span> <strong className="text-ink-primary">{project.targetSLA}%</strong></span>
              <span><span className="text-ink-tertiary">Grand Avg ({year}):</span> <strong className={grand !== null && grand >= project.targetSLA ? 'text-emerald-700' : 'text-pertamina-red'}>{grand !== null ? fmt2(grand) : '—'}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base text-xs py-1.5 w-auto pr-7">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {canEditMonitoring && (
              <Button size="sm" onClick={() => openModal({ type: 'monitoring-sla-component-add', projectId: project.id })} leftIcon={<Plus size={13} />}>
                Tambah Komponen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Components table */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap min-w-[160px]">Komponen SLA</th>
                {SLA_MONTHS.map((m) => (
                  <th key={m} className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                    {slaMonthLabel(m)}
                  </th>
                ))}
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Avg</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {projectComponents.map((comp) => {
                const compRecords = monthlyRecords.filter((r) => r.componentId === comp.id && r.year === year)
                const compAvg = computeComponentAvg(monthlyRecords, comp.id, year)
                const compStatus = slaStatusCalc(compAvg, project.targetSLA)
                const isExpanded = expandedComp === comp.id

                return (
                  <React.Fragment key={comp.id}>
                    <tr className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary whitespace-nowrap">{comp.componentName}</td>
                      {SLA_MONTHS.map((m) => {
                        const rec = compRecords.find((r) => r.month === m)
                        const val = rec?.achievement ?? null
                        const ok = val !== null && val >= project.targetSLA
                        const locked = rec?.lockedAt != null
                        const needsReconfirm = rec?.reconfirmRequested

                        return (
                          <td
                            key={m}
                            className={classNames(
                              'px-2 py-3 text-xs text-center tabular-nums whitespace-nowrap cursor-pointer relative group',
                              val === null ? 'text-ink-muted hover:bg-pertamina-red-50/50' : ok ? 'text-emerald-700' : 'text-red-600',
                            )}
                            title={
                              rec
                                ? `${slaMonthLabel(m)} ${year}: ${val}%${rec.remark ? ' — ' + rec.remark : ''}${locked ? ' [TERKUNCI]' : ''}${needsReconfirm ? ' [MENUNGGU RECONFIRM]' : ''}`
                                : `Klik + untuk tambah data ${slaMonthLabel(m)}`
                            }
                            onClick={() => {
                              if (!canEditMonitoring) return
                              if (rec) {
                                openModal({ type: 'monitoring-sla-monthly-edit', recordId: rec.id })
                              } else {
                                openModal({ type: 'monitoring-sla-monthly-add', componentId: comp.id, projectId: project.id })
                              }
                            }}
                          >
                            {val !== null ? (
                              <span className="inline-flex items-center gap-0.5">
                                {fmt1(val)}
                                {locked && <Lock size={9} className="text-ink-muted/60 shrink-0" />}
                                {needsReconfirm && <RotateCcw size={9} className="text-amber-500 shrink-0" />}
                              </span>
                            ) : (
                              canEditMonitoring ? <span className="text-[10px] text-ink-muted/60">+</span> : <span className="text-ink-muted/40">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-xs text-center font-semibold text-ink-primary tabular-nums">
                        {compAvg !== null ? fmt2(compAvg) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip text-[10px]', SLA_STATUS_CLS[compStatus])}>
                          {compStatus === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canEditMonitoring && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModal({ type: 'monitoring-sla-monthly-add', componentId: comp.id, projectId: project.id })}
                              className="rounded p-1 text-ink-tertiary hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Tambah data bulanan"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              onClick={() => openModal({ type: 'monitoring-sla-component-edit', componentId: comp.id })}
                              className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition"
                              title="Edit komponen"
                            >
                              <Pencil size={13} />
                            </button>
                            {canEditMonitoring && (
                              <button
                                onClick={() => setConfirmDeleteCompId(comp.id)}
                                className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                                title="Hapus komponen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded: individual monthly records */}
                    {isExpanded && compRecords.map((rec) => {
                      const locked = rec.lockedAt != null
                      const ok = rec.achievement >= project.targetSLA
                      return (
                        <tr key={rec.id} className="bg-black/[0.015]">
                          <td className="pl-8 pr-4 py-2 text-[11px] text-ink-tertiary italic" colSpan={1}>
                            {slaMonthLabel(rec.month)} {rec.year}
                          </td>
                          <td colSpan={SLA_MONTHS.length + 1} className="py-2 text-[11px] text-ink-secondary">
                            <span className={ok ? 'text-emerald-700' : 'text-red-600'}>{rec.achievement}%</span>
                            {rec.remark && <span className="text-ink-tertiary ml-2">— {rec.remark}</span>}
                            {locked && <span className="ml-2 inline-flex items-center gap-0.5 text-ink-muted"><Lock size={9} /> terkunci</span>}
                            {rec.reconfirmRequested && <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600"><RotateCcw size={9} /> menunggu reconfirm</span>}
                          </td>
                          <td className="pr-4 py-2">
                            <div className="flex items-center gap-1">
                              {canUnlockRecord && locked && (
                                <button onClick={() => handleUnlockRecord(rec.id)} className="rounded p-1 text-ink-tertiary hover:text-amber-600 hover:bg-amber-50 transition" title="Buka kunci">
                                  <Unlock size={11} />
                                </button>
                              )}
                              {canEditMonitoring && !locked && (
                                <button onClick={() => openModal({ type: 'monitoring-sla-monthly-edit', recordId: rec.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition"><Pencil size={11} /></button>
                              )}
                              {canEditMonitoring && (
                                <button onClick={() => setConfirmDeleteRecId(rec.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"><Trash2 size={11} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {projectComponents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
            <p className="text-sm">Belum ada komponen SLA.</p>
            {canEditMonitoring && (
              <Button size="sm" className="mt-3" onClick={() => openModal({ type: 'monitoring-sla-component-add', projectId: project.id })} leftIcon={<Plus size={13} />}>
                Tambah Komponen Pertama
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Project monthly average row */}
      {projectComponents.length > 0 && (
        <div className="surface rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-black/[0.02]">
                  <td className="px-4 py-3 text-xs font-semibold text-ink-secondary whitespace-nowrap min-w-[160px]">Rata-rata Project</td>
                  {SLA_MONTHS.map((m) => {
                    const avg = computeProjectMonthAvg(components, monthlyRecords, project.id, m, year)
                    const ok = avg !== null && avg >= project.targetSLA
                    return (
                      <td key={m} className={classNames('px-2 py-3 text-xs text-center font-semibold tabular-nums whitespace-nowrap', avg === null ? 'text-ink-muted' : ok ? 'text-emerald-700' : 'text-red-600')}>
                        {avg !== null ? fmt2(avg) : '—'}
                      </td>
                    )
                  })}
                  <td className={classNames('px-4 py-3 text-xs text-center font-bold tabular-nums', grand !== null && grand >= project.targetSLA ? 'text-emerald-700' : 'text-pertamina-red')}>
                    {grand !== null ? fmt2(grand) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {grandStatus && <span className={classNames('chip text-[10px]', SLA_STATUS_CLS[grandStatus])}>{grandStatus === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}</span>}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature d — Reconfirm Panel (Doccon & Engineer OS) */}
      {(() => {
        const reconfirmRecords = projectComponents.flatMap((comp) =>
          monthlyRecords.filter((r) => r.componentId === comp.id && r.year === year && (r.reconfirmRequested || (r.achievement < project.targetSLA && r.lockedAt != null)))
        )

        const pendingReconfirm = reconfirmRecords.filter((r) => r.reconfirmRequested)

        if (!isDoccon && !isEngineerOS && pendingReconfirm.length === 0) return null

        const failedRecords = reconfirmRecords.filter((r) => !r.reconfirmRequested && r.achievement < project.targetSLA)

        return (
          <div className="surface rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-ink-primary flex items-center gap-2">
              <RotateCcw size={13} className="text-amber-500" />
              Reconfirm / Recheck SLA
            </h3>

            {/* Records needing reconfirm (Doccon can request) */}
            {isDoccon && failedRecords.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-ink-tertiary">Data SLA tidak tercapai berikut dapat dimintakan reconfirm:</p>
                {failedRecords.map((rec) => {
                  const comp = components.find((c) => c.id === rec.componentId)
                  return (
                    <div key={rec.id} className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <span className="font-medium text-ink-primary">{comp?.componentName}</span>
                          <span className="text-ink-tertiary ml-2">{slaMonthLabel(rec.month)} {rec.year}</span>
                          <span className="text-pertamina-red ml-2 font-semibold">{rec.achievement}%</span>
                          <span className="text-ink-muted ml-1">(target {project.targetSLA}%)</span>
                        </div>
                        <button
                          onClick={() => { setReconfirmRecId(rec.id); setReconfirmNote('') }}
                          className="ml-3 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition whitespace-nowrap shrink-0"
                        >
                          Minta Reconfirm
                        </button>
                      </div>
                      {rec.engineerReconfirmNote && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                          <span className="font-semibold">Balasan Engineer:</span> {rec.engineerReconfirmNote}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pending reconfirm records (visible to both Doccon and Engineer OS) */}
            {pendingReconfirm.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-ink-tertiary">
                  {isEngineerOS ? 'Item berikut memerlukan verifikasi Anda:' : 'Permintaan reconfirm yang sedang berjalan:'}
                </p>
                {pendingReconfirm.map((rec) => {
                  const comp = components.find((c) => c.id === rec.componentId)
                  const isConfirming = confirmingRecId === rec.id
                  return (
                    <div key={rec.id} className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <RotateCcw size={11} className="text-amber-500 shrink-0" />
                            <span className="font-medium text-ink-primary">{comp?.componentName}</span>
                            <span className="text-ink-tertiary">{slaMonthLabel(rec.month)} {rec.year}</span>
                            <span className="text-pertamina-red font-semibold">{rec.achievement}%</span>
                          </div>
                          {rec.reconfirmNote && (
                            <p className="mt-1 text-ink-secondary italic ml-4 text-[11px]">
                              <span className="font-medium not-italic text-ink-tertiary">Catatan Doccon:</span> {rec.reconfirmNote}
                            </p>
                          )}
                        </div>
                        {(isDoccon || canUnlockRecord) && !isEngineerOS && (
                          <button
                            onClick={() => handleClearReconfirm(rec.id, '')}
                            className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1"
                          >
                            <CheckCircle2 size={11} /> Selesai
                          </button>
                        )}
                        {isEngineerOS && !isConfirming && (
                          <button
                            onClick={() => { setConfirmingRecId(rec.id); setEngineerComment('') }}
                            className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1"
                          >
                            <CheckCircle2 size={11} /> Konfirmasi
                          </button>
                        )}
                      </div>

                      {/* Inline comment form for engineer */}
                      {isEngineerOS && isConfirming && (
                        <div className="border-t border-amber-200 pt-2 space-y-2">
                          <p className="text-[11px] text-ink-secondary font-medium">Tambahkan komentar verifikasi Anda:</p>
                          <textarea
                            value={engineerComment}
                            onChange={(e) => setEngineerComment(e.target.value)}
                            rows={2}
                            placeholder="Contoh: Data sudah dicek, angka 87% sudah sesuai kondisi lapangan bulan Juni..."
                            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-ink-primary placeholder-ink-muted resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setConfirmingRecId(null); setEngineerComment('') }}
                              className="rounded-md border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-black/[0.04] transition"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleClearReconfirm(rec.id, engineerComment.trim())}
                              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <CheckCircle2 size={11} /> Kirim Konfirmasi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {isDoccon && failedRecords.length === 0 && pendingReconfirm.length === 0 && (
              <p className="text-[11px] text-ink-muted">Tidak ada data SLA yang memerlukan reconfirm.</p>
            )}
            {isEngineerOS && pendingReconfirm.length === 0 && (
              <p className="text-[11px] text-ink-muted">Tidak ada item reconfirm yang perlu diverifikasi.</p>
            )}
          </div>
        )
      })()}

      {/* Confirm delete component */}
      {confirmDeleteCompId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Komponen?</h3>
            <p className="text-sm text-ink-secondary mb-6">Semua data bulanan komponen ini akan ikut terhapus.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteCompId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteComponent(confirmDeleteCompId); setConfirmDeleteCompId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete record */}
      {confirmDeleteRecId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-2">Hapus Data Bulanan?</h3>
            <p className="text-sm text-ink-secondary mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteRecId(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteMonthlyRecord(confirmDeleteRecId); setConfirmDeleteRecId(null) }}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {/* Feature d — Reconfirm note dialog */}
      {reconfirmRecId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-modal p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-ink-primary mb-1">Minta Reconfirm SLA</h3>
            <p className="text-sm text-ink-secondary mb-4">Tambahkan catatan untuk Engineer On Site (opsional).</p>
            <textarea
              value={reconfirmNote}
              onChange={(e) => setReconfirmNote(e.target.value)}
              placeholder="Contoh: Terjadi downtime tidak terduga. Mohon verifikasi data lapangan."
              className="input-base w-full text-xs resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setReconfirmRecId(null)}>Batal</Button>
              <Button size="sm" onClick={handleRequestReconfirm}>Kirim Permintaan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
