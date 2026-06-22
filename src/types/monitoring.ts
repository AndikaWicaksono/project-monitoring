// ============================================================
// MONITORING MODULE — Type Definitions
// ============================================================

// ---------- Report Project Monitoring ----------

export type ReportDocumentType = 'customer' | 'vendor'
export type ReportDocumentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'APPROVED'
export type ReportDocumentRevision = 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
export type ReportDocumentActionType = 'CREATE' | 'SUBMIT' | 'START_REVIEW' | 'APPROVE' | 'REQUEST_REVISION' | 'RESUBMIT'

export interface ReportDocumentActivity {
  id: string
  action: ReportDocumentActionType
  byUserId: string
  byName: string
  comment: string
  timestamp: string
}

export interface ReportDocumentAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  uploadedAt: string
  uploadedByName: string
}

export interface ReportProject {
  id: string
  kodeProject: string
  client: string
  namaKontrak: string
  department: string
  picDocon: string
  picLaporan: string
  salesCustomer: string
  emailTujuan: string
  catatan: string
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

export interface ReportDocument {
  id: string
  projectId: string
  docType: ReportDocumentType
  judul: string
  deskripsi: string
  tanggalSubmit: string | null
  tanggalFeedback: string | null
  revision: ReportDocumentRevision
  status: ReportDocumentStatus
  attachments: ReportDocumentAttachment[]
  activities: ReportDocumentActivity[]
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

// ---------- Billing Tracker (embedded in Report Project) ----------

export type BillingDocumentType = 'BAP' | 'BAPP' | 'BAST' | 'Invoice' | 'Supporting Document'

export type BillingDocumentStatus =
  | 'BELUM_DIBUAT'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'

export interface BillingDocument {
  id: string
  projectId: string
  docType: BillingDocumentType
  pic: string
  targetDate: string | null
  actualDate: string | null
  status: BillingDocumentStatus
  keterangan: string
  attachments: ReportDocumentAttachment[]
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

// ---------- SLA Monitoring ----------

export type SLAStatus = 'TERCAPAI' | 'TIDAK_TERCAPAI'

export interface SLAProject {
  id: string
  kodeProject: string
  namaProject: string
  department: string
  pic: string
  targetSLA: number
  catatan: string
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

export interface SLAComponent {
  id: string
  projectId: string
  componentName: string
  createdAt: string
  updatedAt: string
}

export interface SLAMonthlyRecord {
  id: string
  componentId: string
  projectId: string
  month: number
  year: number
  achievement: number
  remark: string
  createdAt: string
  updatedAt: string
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

export const SLA_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12] as const
export type SLAMonthNum = typeof SLA_MONTHS[number]

export function slaMonthLabel(month: number): string {
  return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][(month as number) - 1] ?? ''
}

export function computeProjectMonthAvg(
  components: SLAComponent[],
  records: SLAMonthlyRecord[],
  projectId: string,
  month: number,
  year: number
): number | null {
  const compIds = new Set(components.filter((c) => c.projectId === projectId).map((c) => c.id))
  const matching = records.filter((r) => compIds.has(r.componentId) && r.month === month && r.year === year)
  if (!matching.length) return null
  return matching.reduce((sum, r) => sum + r.achievement, 0) / matching.length
}

export function computeProjectGrandAvg(
  components: SLAComponent[],
  records: SLAMonthlyRecord[],
  projectId: string,
  year: number
): number | null {
  const compIds = new Set(components.filter((c) => c.projectId === projectId).map((c) => c.id))
  const matching = records.filter((r) => compIds.has(r.componentId) && r.year === year)
  if (!matching.length) return null
  return matching.reduce((sum, r) => sum + r.achievement, 0) / matching.length
}

export function computeComponentAvg(
  records: SLAMonthlyRecord[],
  componentId: string,
  year: number
): number | null {
  const matching = records.filter((r) => r.componentId === componentId && r.year === year)
  if (!matching.length) return null
  return matching.reduce((sum, r) => sum + r.achievement, 0) / matching.length
}

export function slaStatusCalc(avg: number | null, target: number): SLAStatus {
  if (avg === null || avg < target) return 'TIDAK_TERCAPAI'
  return 'TERCAPAI'
}

export function fmt1(n: number): string {
  return Math.round(n * 10) / 10 + '%'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function bapChecklistProgress(checklist: MonitoringBAPChecklist): number {
  const keys = Object.keys(checklist) as (keyof MonitoringBAPChecklist)[]
  const done = keys.filter((k) => checklist[k]).length
  return Math.round((done / keys.length) * 100)
}
