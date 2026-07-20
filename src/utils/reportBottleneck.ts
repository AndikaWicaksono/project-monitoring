import type { ReportDocument, ReportProject } from '../types/monitoring'

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return ms > 0 ? Math.round(ms / 86400000) : 0
}

export interface StuckItem {
  kodeProject: string
  judul: string
  days: number
}

export function computeBottleneck(docs: ReportDocument[], projects: ReportProject[]) {
  const todayMs = new Date().getTime()
  const kodeOf = (projectId: string) => projects.find((p) => p.id === projectId)?.kodeProject ?? '—'

  const engineerDays: number[] = []
  const stuckEngineerItems: StuckItem[] = []
  const customerDays: number[] = []
  const stuckCustomerItems: StuckItem[] = []
  const docconDays: number[] = []
  const stuckDocconItems: StuckItem[] = []

  for (const d of docs) {
    const eDays = daysBetween(d.engineerStartedAt, d.engineerSubmittedAt ?? (d.engineerStartedAt ? new Date().toISOString() : null))
    if (eDays != null) engineerDays.push(eDays)
    if ((d.currentPhase ?? 'engineer') === 'engineer' && (d.status === 'DRAFT' || d.status === 'SUBMITTED' || d.status === 'REVISION_REQUIRED')) {
      const start = d.engineerStartedAt ? new Date(d.engineerStartedAt).getTime() : null
      const daysStuck = start ? (todayMs - start) / 86400000 : 0
      if (start && daysStuck > 5) stuckEngineerItems.push({ kodeProject: kodeOf(d.projectId), judul: d.judul, days: Math.floor(daysStuck) })
    }
    const cDays = daysBetween(d.customerReceivedAt, d.customerApprovedAt ?? (d.customerReceivedAt && d.status === 'UNDER_REVIEW' ? new Date().toISOString() : null))
    if (cDays != null) customerDays.push(cDays)
    if (d.status === 'UNDER_REVIEW') {
      const start = d.customerReceivedAt ? new Date(d.customerReceivedAt).getTime() : null
      const daysStuck = start ? (todayMs - start) / 86400000 : 0
      if (start && daysStuck > 3) stuckCustomerItems.push({ kodeProject: kodeOf(d.projectId), judul: d.judul, days: Math.floor(daysStuck) })
    }
    const dDays = daysBetween(d.docconReceivedAt, d.docconDeliveredAt ?? (d.docconReceivedAt && d.currentPhase === 'doccon' && d.docconSubStatus !== 'delivered' ? new Date().toISOString() : null))
    if (dDays != null) docconDays.push(dDays)
    if (d.currentPhase === 'doccon' && d.docconSubStatus && d.docconSubStatus !== 'delivered') {
      const start = d.docconReceivedAt ? new Date(d.docconReceivedAt).getTime() : null
      const daysStuck = start ? (todayMs - start) / 86400000 : 0
      if (start && daysStuck > 2) stuckDocconItems.push({ kodeProject: kodeOf(d.projectId), judul: d.judul, days: Math.floor(daysStuck) })
    }
  }

  const avgNum = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const avgStr = (n: number | null) => n !== null ? n.toFixed(1) : '—'

  return {
    engineerAvg: avgStr(avgNum(engineerDays)), engineerAvgNum: avgNum(engineerDays), stuckEngineerItems,
    customerAvg: avgStr(avgNum(customerDays)), customerAvgNum: avgNum(customerDays), stuckCustomerItems,
    docconAvg:   avgStr(avgNum(docconDays)),   docconAvgNum:   avgNum(docconDays),   stuckDocconItems,
  }
}
