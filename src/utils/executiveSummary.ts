import { useMemo } from 'react'
import { useMonitoringReportStore } from '../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../store/useMonitoringSLAStore'
import { useMonitoringCostStore } from '../store/useMonitoringCostStore'
import { computeBottleneck } from './reportBottleneck'
import { slaStatusCalc, computeProjectGrandAvg, formatCurrency, isDocCompleted } from '../types/monitoring'

export interface DeadlineItem {
  kodeProject: string
  judul: string
  diffDays: number
}

export interface ExecutiveSummaryData {
  report: {
    totalProjects: number
    totalDocuments: number
    bottleneck: ReturnType<typeof computeBottleneck>
    pendingKadepCount: number
    pendingKadivCount: number
  }
  billing: {
    total: number
    completed: number
    pendingKadepCount: number
    pendingKadivCount: number
  }
  sla: {
    avgAchievement: number | null
    avgTarget: number | null
    tercapaiCount: number
    tidakTercapaiCount: number
    totalProjects: number
  }
  cost: {
    totalContractValue: number
    totalActualCost: number
    totalCostBased: number
    margin: number
    overBudgetCount: number
    totalProjects: number
  }
  deadlines: {
    overdueCount: number
    todayCount: number
    soonCount: number
    items: DeadlineItem[]
  }
}

// Data company-wide (bukan per-role/per-periode) — dipakai khusus buat halaman Executive Summary.
// Ngambil langsung dari raw store state (bukan versi `filtered`/period-scoped tiap halaman), dan
// reuse logic yang udah ada (computeBottleneck, isDocCompleted, slaStatusCalc, dst) biar gak dobel.
export function useExecutiveSummaryData(): ExecutiveSummaryData {
  const reportProjects   = useMonitoringReportStore((s) => s.projects)
  const documents        = useMonitoringReportStore((s) => s.documents)
  const billingDocuments = useMonitoringReportStore((s) => s.billingDocuments)
  const slaProjects      = useMonitoringSLAStore((s) => s.projects)
  const slaComponents    = useMonitoringSLAStore((s) => s.components)
  const monthlyRecords   = useMonitoringSLAStore((s) => s.monthlyRecords)
  const costs            = useMonitoringCostStore((s) => s.costs)
  const realizations     = useMonitoringCostStore((s) => s.realizations)

  return useMemo(() => {
    // ── Report ──────────────────────────────────────────────────────────────
    const bottleneck = computeBottleneck(documents, reportProjects)
    const pendingKadepDocCount = documents.filter((d) => d.status === 'PENDING_KADEP_PARAF' && d.currentPhase === 'kadep').length
    const pendingKadivDocCount = documents.filter((d) => d.status === 'PENDING_KADIV' && d.currentPhase === 'kadiv').length

    // ── Event-Based Report (billing) ───────────────────────────────────────
    const billingCompleted = billingDocuments.filter((b) => b.status === 'COMPLETED').length
    const pendingKadepBilling = billingDocuments.filter((b) => b.status === 'PENDING_KADEP_PARAF' && b.currentPhase === 'kadep').length
    const pendingKadivBilling = billingDocuments.filter((b) => b.status === 'PENDING_KADIV' && b.currentPhase === 'kadiv').length

    // ── SLA ─────────────────────────────────────────────────────────────────
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthRecs = monthlyRecords.filter((r) => r.month === month && r.year === year)
    const avgAchievement = monthRecs.length
      ? monthRecs.reduce((sum, r) => sum + r.achievement, 0) / monthRecs.length
      : null
    const avgTarget = slaProjects.length
      ? slaProjects.reduce((sum, p) => sum + p.targetSLA, 0) / slaProjects.length
      : null
    let tercapaiCount = 0, tidakTercapaiCount = 0
    for (const p of slaProjects) {
      const avg = computeProjectGrandAvg(slaComponents, monthlyRecords, p.id, year)
      if (slaStatusCalc(avg, p.targetSLA) === 'TERCAPAI') tercapaiCount++
      else tidakTercapaiCount++
    }

    // ── Cost ────────────────────────────────────────────────────────────────
    let totalContractValue = 0, totalActualCost = 0, totalCostBased = 0, overBudgetCount = 0
    for (const c of costs) {
      const actual = realizations.filter((r) => r.projectId === c.id).reduce((s, r) => s + r.realisasiBiaya, 0)
      totalContractValue += c.projectValue
      totalActualCost += actual
      totalCostBased += c.costBased
      if (actual > c.costBased && c.costBased > 0) overBudgetCount++
    }

    // ── Deadlines ───────────────────────────────────────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineItems = documents
      .filter((d) => d.deadlineToSales && !isDocCompleted(d))
      .map((d) => {
        const deadline = new Date(d.deadlineToSales!)
        deadline.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
        const proj = reportProjects.find((p) => p.id === d.projectId)
        return proj ? { kodeProject: proj.kodeProject, judul: d.judul, diffDays } : null
      })
      .filter((item): item is DeadlineItem => item !== null && item.diffDays <= 5)
      .sort((a, b) => a.diffDays - b.diffDays)

    return {
      report: {
        totalProjects: reportProjects.length,
        totalDocuments: documents.length,
        bottleneck,
        pendingKadepCount: pendingKadepDocCount,
        pendingKadivCount: pendingKadivDocCount,
      },
      billing: {
        total: billingDocuments.length,
        completed: billingCompleted,
        pendingKadepCount: pendingKadepBilling,
        pendingKadivCount: pendingKadivBilling,
      },
      sla: {
        avgAchievement,
        avgTarget,
        tercapaiCount,
        tidakTercapaiCount,
        totalProjects: slaProjects.length,
      },
      cost: {
        totalContractValue,
        totalActualCost,
        totalCostBased,
        margin: totalContractValue - totalActualCost,
        overBudgetCount,
        totalProjects: costs.length,
      },
      deadlines: {
        overdueCount: deadlineItems.filter((i) => i.diffDays < 0).length,
        todayCount: deadlineItems.filter((i) => i.diffDays === 0).length,
        soonCount: deadlineItems.filter((i) => i.diffDays > 0).length,
        items: deadlineItems,
      },
    }
  }, [reportProjects, documents, billingDocuments, slaProjects, slaComponents, monthlyRecords, costs, realizations])
}

export interface NarrativeLine {
  tone: 'positive' | 'warning' | 'critical'
  text: string
}

// Kalimat narasi otomatis dari angka yang sama — bukan AI, murni template kondisional.
export function generateNarrative(data: ExecutiveSummaryData): NarrativeLine[] {
  const lines: NarrativeLine[] = []
  const { report, billing, sla, cost, deadlines } = data

  // Report progress
  const doneDocs = report.totalDocuments - report.pendingKadepCount - report.pendingKadivCount
  lines.push({
    tone: 'positive',
    text: `Terdapat ${report.totalProjects} project laporan aktif dengan total ${report.totalDocuments} dokumen tercatat. `
      + `${doneDocs} dokumen sudah melewati tahap paraf/approval, sementara ${report.pendingKadepCount} menunggu paraf Kadep dan ${report.pendingKadivCount} menunggu approval Kadiv.`,
  })

  // Bottleneck
  const stuckTotal = report.bottleneck.stuckEngineerItems.length + report.bottleneck.stuckCustomerItems.length + report.bottleneck.stuckDocconItems.length
  if (stuckTotal > 0) {
    const worst = [
      { label: 'Engineer', avg: report.bottleneck.engineerAvgNum, sla: 5, stuck: report.bottleneck.stuckEngineerItems.length },
      { label: 'Customer', avg: report.bottleneck.customerAvgNum, sla: 3, stuck: report.bottleneck.stuckCustomerItems.length },
      { label: 'Doccon',   avg: report.bottleneck.docconAvgNum,   sla: 2, stuck: report.bottleneck.stuckDocconItems.length },
    ].sort((a, b) => b.stuck - a.stuck)[0]
    lines.push({
      tone: 'critical',
      text: `Fase ${worst.label} menjadi bottleneck utama dengan rata-rata ${worst.avg?.toFixed(1) ?? '—'} hari pengerjaan (SLA ${worst.sla} hari) — `
        + `total ${stuckTotal} dokumen tercatat stuck melewati SLA di seluruh fase.`,
    })
  } else {
    lines.push({ tone: 'positive', text: 'Semua fase pengerjaan dokumen (Engineer, Customer, Doccon) saat ini masih dalam batas SLA, tidak ada dokumen yang stuck.' })
  }

  // Event-Based Report
  const billingPendingTotal = billing.pendingKadepCount + billing.pendingKadivCount
  lines.push({
    tone: billingPendingTotal > 0 ? 'warning' : 'positive',
    text: `Event-Based Report: ${billing.completed} dari ${billing.total} item sudah selesai. `
      + (billingPendingTotal > 0
        ? `${billing.pendingKadepCount} menunggu paraf Kadep dan ${billing.pendingKadivCount} menunggu approval Kadiv.`
        : `Tidak ada item yang tertunda paraf/approval saat ini.`),
  })

  // SLA
  if (sla.avgAchievement !== null && sla.avgTarget !== null) {
    const belowTarget = sla.avgAchievement < sla.avgTarget
    lines.push({
      tone: belowTarget ? 'warning' : 'positive',
      text: `Pencapaian SLA rata-rata bulan ini ${sla.avgAchievement.toFixed(1)}%, `
        + `${belowTarget ? 'di bawah' : 'memenuhi'} target rata-rata ${sla.avgTarget.toFixed(1)}%. `
        + `${sla.tercapaiCount} dari ${sla.totalProjects} project SLA mencapai target tahun ini, ${sla.tidakTercapaiCount} belum tercapai.`,
    })
  }

  // Cost
  if (cost.totalProjects > 0) {
    lines.push({
      tone: cost.overBudgetCount > 0 ? 'warning' : 'positive',
      text: `Total nilai kontrak ${cost.totalProjects} project Cost Monitoring adalah ${formatCurrency(cost.totalContractValue)}, `
        + `dengan realisasi biaya aktual ${formatCurrency(cost.totalActualCost)} (margin ${formatCurrency(cost.margin)}). `
        + (cost.overBudgetCount > 0
          ? `${cost.overBudgetCount} project tercatat melebihi cost based yang direncanakan.`
          : `Tidak ada project yang melebihi cost based saat ini.`),
    })
  }

  // Deadlines
  const deadlineTotal = deadlines.overdueCount + deadlines.todayCount + deadlines.soonCount
  if (deadlineTotal > 0) {
    lines.push({
      tone: deadlines.overdueCount > 0 ? 'critical' : 'warning',
      text: `${deadlineTotal} dokumen mendekati atau melewati deadline ke Sales`
        + (deadlines.overdueCount > 0 ? ` (${deadlines.overdueCount} sudah overdue)` : '')
        + ` — perlu perhatian segera.`,
    })
  } else {
    lines.push({ tone: 'positive', text: 'Tidak ada dokumen yang mendekati atau melewati deadline ke Sales saat ini.' })
  }

  return lines
}
