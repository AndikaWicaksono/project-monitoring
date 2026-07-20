import { useEffect } from 'react'
import { useMonitoringReportStore } from '../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../store/useMonitoringSLAStore'
import { useMonitoringCostStore } from '../store/useMonitoringCostStore'
import { useMonitoringRole } from './useMonitoringRole'
import type { MonitoringCost, MonitoringCostRealization } from '../types/monitoring'

interface UnifiedProject {
  kodeProject: string
  namaProject: string
  client: string
}

// Skor "kelengkapan data" — dipakai buat milih record mana yang dipertahankan waktu ada
// duplikat cost project (misal dari race condition StrictMode). Yang datanya lebih lengkap menang.
function costRichness(c: MonitoringCost, realizations: MonitoringCostRealization[]): number {
  let score = realizations.filter((r) => r.projectId === c.id).length * 10
  if (c.projectValue > 0) score++
  if (c.costBased > 0) score++
  if (c.tkdn > 0) score++
  if (c.amandemen) score++
  if (c.description) score++
  if (c.costBasedMonthly && Object.keys(c.costBasedMonthly).length > 0) score++
  if (c.projectId && c.projectId !== c.projectCode) score++
  return score
}

// Sinkronisasi & self-heal Cost Monitoring — pastikan SEMUA project di Master Data (Report/SLA)
// selalu punya record Cost Monitoring (satu, gak dobel), dan identitas/kontraknya tetap sinkron
// dengan Report Project (satu sumber kebenaran).
//
// Dipanggil sekali secara global (App.tsx) — bukan cuma di halaman Master Data — karena role
// seperti Admin OSM gak pernah membuka halaman Master Data itu (di-redirect App.tsx), jadi kalau
// logic ini cuma nempel di sana, self-heal-nya gak akan pernah kena buat mereka.
export function useCostMasterDataSync() {
  const reportProjects = useMonitoringReportStore((s) => s.projects)
  const slaProjects       = useMonitoringSLAStore((s) => s.projects)
  const addCost           = useMonitoringCostStore((s) => s.addCost)
  const updateCost        = useMonitoringCostStore((s) => s.updateCost)
  const deleteCost        = useMonitoringCostStore((s) => s.deleteCost)
  const updateRealization = useMonitoringCostStore((s) => s.updateRealization)
  const costs              = useMonitoringCostStore((s) => s.costs)
  const { currentUserId, currentUserName } = useMonitoringRole()

  useEffect(() => {
    const map = new Map<string, UnifiedProject>()
    for (const p of reportProjects) {
      if (!map.has(p.kodeProject)) map.set(p.kodeProject, { kodeProject: p.kodeProject, namaProject: p.namaKontrak, client: p.client })
    }
    for (const p of slaProjects) {
      if (!map.has(p.kodeProject)) map.set(p.kodeProject, { kodeProject: p.kodeProject, namaProject: p.namaProject, client: '' })
    }
    const allProjects = [...map.values()]

    // Penting: baca state ter-update langsung dari store (getState()), bukan dari closure `costs`
    // di atas. React StrictMode menjalankan efek ini dua kali berturut-turut tanpa render di
    // antaranya, jadi kalau baca dari closure yang beku, kedua invocation sama-sama mikir record
    // belum ada dan sama-sama addCost() — hasilnya record dobel untuk project yang sama.
    const liveCosts = useMonitoringCostStore.getState().costs
    const liveRealizations = useMonitoringCostStore.getState().realizations

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

      const matches = liveCosts.filter((c) => c.projectCode === p.kodeProject)

      if (matches.length === 0) {
        addCost({
          projectId: p.kodeProject, projectCode: p.kodeProject, year: new Date().getFullYear(),
          ...syncFields,
          projectValue: 0, costBased: 0, actualCost: 0, amandemen: '', tkdn: 0, description: '',
          createdByUserId: currentUserId ?? 'system', createdByName: currentUserName ?? 'System',
        })
        continue
      }

      // Duplikat (misal dari race condition di atas, sebelum diperbaiki) — gabungkan jadi satu.
      // Sisain record yang datanya paling lengkap, pindahin realisasi dari duplikat sebelum dihapus
      // supaya gak ada data yang hilang.
      let keeper = matches[0]
      if (matches.length > 1) {
        keeper = [...matches].sort((a, b) =>
          costRichness(b, liveRealizations) - costRichness(a, liveRealizations) || a.createdAt.localeCompare(b.createdAt),
        )[0]
        for (const dup of matches) {
          if (dup.id === keeper.id) continue
          for (const r of liveRealizations.filter((r) => r.projectId === dup.id)) {
            updateRealization(r.id, { projectId: keeper.id })
          }
          deleteCost(dup.id)
        }
      }

      const isDrifted =
        keeper.projectClient    !== syncFields.projectClient ||
        keeper.projectName      !== syncFields.projectName ||
        keeper.contractNumber   !== syncFields.contractNumber ||
        keeper.categoryContract !== syncFields.categoryContract ||
        keeper.dateOfContract   !== syncFields.dateOfContract ||
        keeper.startDate        !== syncFields.startDate ||
        keeper.endDate          !== syncFields.endDate ||
        keeper.status           !== syncFields.status
      if (isDrifted) updateCost(keeper.id, syncFields)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportProjects, slaProjects, costs])
}
