import React, { useMemo, useState } from 'react'
import { ChevronLeft, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useUIStore } from '../../store/useUIStore'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/helpers'
import {
  SLA_MONTHS, slaMonthLabel, computeComponentAvg, computeProjectMonthAvg,
  computeProjectGrandAvg, slaStatusCalc, type SLAStatus,
} from '../../types/monitoring'

const SLA_STATUS_CLS: Record<SLAStatus, string> = {
  TERCAPAI:       'bg-emerald-100 text-emerald-700',
  TIDAK_TERCAPAI: 'bg-red-100 text-red-700',
}

export function MonitoringSLADetailPage() {
  const { projects, components, monthlyRecords, deleteComponent, deleteMonthlyRecord } = useMonitoringSLAStore()
  const openModal = useUIStore((s) => s.openModal)
  const setView = useUIStore((s) => s.setView)
  const slaDetailProjectId = useUIStore((s) => s.slaDetailProjectId)
  const { canDeleteMonitoring } = useMonitoringRole()

  const project = projects.find((p) => p.id === slaDetailProjectId)
  const projectComponents = useMemo(() => components.filter((c) => c.projectId === slaDetailProjectId), [components, slaDetailProjectId])

  const [year, setYear] = useState(new Date().getFullYear())
  const [confirmDeleteCompId, setConfirmDeleteCompId] = useState<string | null>(null)
  const [confirmDeleteRecId, setConfirmDeleteRecId] = useState<string | null>(null)
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
              <span><span className="text-ink-tertiary">Grand Avg ({year}):</span> <strong className={grand !== null && grand >= project.targetSLA ? 'text-emerald-700' : 'text-pertamina-red'}>{grand !== null ? `${Math.round(grand * 100) / 100}%` : '—'}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base text-xs py-1.5 w-auto pr-7">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button size="sm" onClick={() => openModal({ type: 'monitoring-sla-component-add', projectId: project.id })} leftIcon={<Plus size={13} />}>
              Tambah Komponen
            </Button>
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
                        return (
                          <td
                            key={m}
                            className={classNames(
                              'px-2 py-3 text-xs text-center tabular-nums whitespace-nowrap cursor-pointer',
                              val === null ? 'text-ink-muted hover:bg-pertamina-red-50/50' : ok ? 'text-emerald-700' : 'text-red-600',
                            )}
                            title={rec ? `${slaMonthLabel(m)} ${year}: ${val}%${rec.remark ? ' — ' + rec.remark : ''}` : `Klik + untuk tambah data ${slaMonthLabel(m)}`}
                            onClick={() => {
                              if (rec) {
                                openModal({ type: 'monitoring-sla-monthly-edit', recordId: rec.id })
                              } else {
                                openModal({ type: 'monitoring-sla-monthly-add', componentId: comp.id, projectId: project.id })
                              }
                            }}
                          >
                            {val !== null ? `${Math.round(val * 10) / 10}%` : <span className="text-[10px] text-ink-muted/60">+</span>}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-xs text-center font-semibold text-ink-primary tabular-nums">
                        {compAvg !== null ? `${Math.round(compAvg * 10) / 10}%` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={classNames('chip text-[10px]', SLA_STATUS_CLS[compStatus])}>
                          {compStatus === 'TERCAPAI' ? 'Tercapai' : 'Tidak Tercapai'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                          {canDeleteMonitoring && (
                            <button
                              onClick={() => setConfirmDeleteCompId(comp.id)}
                              className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                              title="Hapus komponen"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded: show individual monthly records with edit/delete */}
                    {isExpanded && compRecords.map((rec) => (
                      <tr key={rec.id} className="bg-black/[0.015]">
                        <td className="pl-8 pr-4 py-2 text-[11px] text-ink-tertiary italic" colSpan={1}>
                          {slaMonthLabel(rec.month)} {rec.year}
                        </td>
                        <td colSpan={SLA_MONTHS.length + 1} className="py-2 text-[11px] text-ink-secondary">
                          {rec.achievement}% {rec.remark && <span className="text-ink-tertiary ml-2">— {rec.remark}</span>}
                        </td>
                        <td className="pr-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openModal({ type: 'monitoring-sla-monthly-edit', recordId: rec.id })} className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] transition"><Pencil size={11} /></button>
                            {canDeleteMonitoring && <button onClick={() => setConfirmDeleteRecId(rec.id)} className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"><Trash2 size={11} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {projectComponents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
            <p className="text-sm">Belum ada komponen SLA.</p>
            <Button size="sm" className="mt-3" onClick={() => openModal({ type: 'monitoring-sla-component-add', projectId: project.id })} leftIcon={<Plus size={13} />}>
              Tambah Komponen Pertama
            </Button>
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
                        {avg !== null ? `${Math.round(avg * 10) / 10}%` : '—'}
                      </td>
                    )
                  })}
                  <td className={classNames('px-4 py-3 text-xs text-center font-bold tabular-nums', grand !== null && grand >= project.targetSLA ? 'text-emerald-700' : 'text-pertamina-red')}>
                    {grand !== null ? `${Math.round(grand * 100) / 100}%` : '—'}
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
    </div>
  )
}
