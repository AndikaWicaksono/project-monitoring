// ============================================================
// MONITORING MODULE — Type Definitions
// ============================================================

// ---------- Report Project Monitoring ----------

export type MonitoringReportStatus = 'CREATE' | 'UNDER_APPROVAL' | 'UNDER_REVISION' | 'APPROVED'

export type MonitoringReportActionType =
  | 'CREATE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REQUEST_REVISION'
  | 'RESUBMIT'

export interface MonitoringReportActivity {
  id: string
  action: MonitoringReportActionType
  byUserId: string
  byName: string
  comment: string
  timestamp: string
}

export interface MonitoringProjectReport {
  id: string
  kodeProject: string
  client: string
  namaKontrak: string
  keterangan: string
  department: string
  targetLaporan: string
  picDocon: string
  picLaporan: string
  salesCustomer: string
  emailTujuan: string
  revisionCount: number
  status: MonitoringReportStatus
  submitDate: string | null
  feedbackDate: string | null
  comment: string
  submit: string
  feedback: string
  submitToSales: string
  linkSharepoint: string
  activities: MonitoringReportActivity[]
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

// ---------- SLA Monitoring ----------

export type SLAStatus = 'GREEN' | 'YELLOW' | 'RED'

export interface MonitoringSLA {
  id: string
  kontrak: string
  pekerjaan: string
  som: string
  departemen: string
  picDocon: string
  batas: number
  jan: number | null
  feb: number | null
  mar: number | null
  apr: number | null
  may: number | null
  jun: number | null
  jul: number | null
  aug: number | null
  sep: number | null
  oct: number | null
  nov: number | null
  dec: number | null
  catatan: string
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

// ---------- Cost Monitoring ----------

export type MonitoringCostStatus = 'active' | 'closed' | 'cancelled'
export type MonitoringCostRealizationStatus = 'PAID' | 'POPAY' | 'READY_TO_RELEASE'

export interface MonitoringCost {
  id: string
  projectId: string
  projectCode: string
  year: number
  status: MonitoringCostStatus
  projectClient: string
  projectName: string
  contractNumber: string
  categoryContract: string
  dateOfContract: string | null
  startDate: string | null
  endDate: string | null
  projectValue: number
  costBased: number
  actualCost: number
  amandemen: string
  tkdn: number
  description: string
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

export interface MonitoringCostRealization {
  id: string
  kodeProject: string
  projectId: string
  itemBiaya: string
  satuanKerja: string
  pic: string
  realisasiBiaya: number
  status: MonitoringCostRealizationStatus
  vendor: string
  createdAt: string
  updatedAt: string
}

// ---------- BAP / BAPP / BAST Monitoring ----------

export type MonitoringBAPDocumentType = 'BAP' | 'BAPP' | 'BAST'

export type MonitoringBAPStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'APPROVED'
  | 'COMPLETED'

export interface MonitoringBAPChecklist {
  documentCreated: boolean
  internalReview: boolean
  customerReview: boolean
  approved: boolean
  signed: boolean
  readyBilling: boolean
  completed: boolean
}

export interface MonitoringBAP {
  id: string
  projectId: string
  projectCode: string
  client: string
  documentType: MonitoringBAPDocumentType
  status: MonitoringBAPStatus
  pic: string
  targetDate: string | null
  actualDate: string | null
  remark: string
  linkDocument: string
  checklist: MonitoringBAPChecklist
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

// ---------- Helpers ----------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
export type SLAMonthKey = typeof MONTHS[number]

export function slaMonthKeys(): SLAMonthKey[] {
  return [...MONTHS]
}

export function slaMonthLabel(key: SLAMonthKey): string {
  const map: Record<SLAMonthKey, string> = {
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    may: 'Mei', jun: 'Jun', jul: 'Jul', aug: 'Agu',
    sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des',
  }
  return map[key]
}

export function slaAverageAchievement(sla: MonitoringSLA): number | null {
  const values = MONTHS.map((m) => sla[m]).filter((v): v is number => v !== null)
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function slaMonthStatus(value: number | null, batas: number): SLAStatus {
  if (value === null) return 'RED'
  if (value >= batas) return 'GREEN'
  if (value >= batas * 0.8) return 'YELLOW'
  return 'RED'
}

export function slaOverallStatus(sla: MonitoringSLA): SLAStatus {
  const avg = slaAverageAchievement(sla)
  return slaMonthStatus(avg, sla.batas)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function bapChecklistProgress(checklist: MonitoringBAPChecklist): number {
  const keys = Object.keys(checklist) as (keyof MonitoringBAPChecklist)[]
  const done = keys.filter((k) => checklist[k]).length
  return Math.round((done / keys.length) * 100)
}
