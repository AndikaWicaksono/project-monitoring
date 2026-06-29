// ============================================================
// MONITORING MODULE — Type Definitions
// ============================================================

// ---------- Report Project Monitoring ----------

export type ReportDocumentType = 'customer' | 'vendor'
export type ReportDocumentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'APPROVED'
export type ReportDocumentRevision = 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
export type ReportDocumentActionType = 'CREATE' | 'SUBMIT' | 'START_REVIEW' | 'APPROVE' | 'REQUEST_REVISION' | 'RESUBMIT'

// E2E phase tracking (feature: end-to-end document pipeline)
export type DocPhase = 'engineer' | 'customer' | 'doccon'
export type EngineerSubStatus = 'draft' | 'ready_for_review' | 'submitted'
export type CustomerSubStatus = 'under_review' | 'approved' | 'revisions_required'
export type DocconSubStatus = 'compiling' | 'qc_review' | 'ready_to_sales' | 'delivered'

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
  kontrakMulai: string       // period YYYY-MM, project mulai muncul di list
  kontrakAkhir: string | null  // period YYYY-MM, project berhenti muncul (null = masih aktif)
  excludedMonths: string[]     // YYYY-MM list, bulan yang dikecualikan satu per satu
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
  period: string  // format YYYY-MM, e.g. '2026-05'
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
  // E2E phase tracking (optional — backward compat with localStorage)
  currentPhase?: DocPhase
  engineerSubStatus?: EngineerSubStatus
  customerSubStatus?: CustomerSubStatus
  docconSubStatus?: DocconSubStatus
  // Phase timestamps
  engineerStartedAt?: string | null
  engineerSubmittedAt?: string | null
  customerReceivedAt?: string | null
  customerApprovedAt?: string | null
  docconReceivedAt?: string | null
  docconDeliveredAt?: string | null
  // Deadline & SLA
  deadlineToSales?: string | null
  // Accountability
  engineerPIC?: string
  customerPIC?: string
  docconPIC?: string
  // Conflict flag (revision after customer approved)
  hasConflict?: boolean
  // Sales feedback
  salesAcceptedAt?: string | null
  salesFlagIssue?: boolean
  salesIssueNote?: string
}

// ---------- Billing Tracker (embedded in Report Project) ----------

export type BillingDocumentType = string

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
  lockedAt: string | null
  lockedByName: string | null
  reconfirmRequested: boolean
  reconfirmNote: string
}

// ---------- Cost Monitoring ----------

export type MonitoringCostStatus = 'active' | 'closed' | 'cancelled' | 'future'
export type MonitoringCostRealizationStatus = 'PAID' | 'POPAY' | 'READY_TO_RELEASE'

// Cost Monitoring — Monthly Planning Breakdown
export interface CostBasedMonthlyItem {
  itemBiaya: string
  satuanKerja: string
  planned: number
}

export interface CostBasedMonthlyPlan {
  planned: number
  items: CostBasedMonthlyItem[]
}

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
  // Monthly cost based breakdown — key is YYYY-MM
  costBasedMonthly?: Record<string, CostBasedMonthlyPlan>
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
  period?: string | null          // YYYY-MM — bulan realisasi ini
  tanggalRealisasi?: string | null
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
  // Tampilkan hingga 4 angka di belakang koma, trailing zeros dihapus
  return parseFloat(n.toFixed(4)) + '%'
}

export function fmt2(n: number): string {
  // Tampilkan hingga 2 angka di belakang koma, trailing zeros dihapus
  return parseFloat(n.toFixed(2)) + '%'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

// Status dihitung otomatis dari tanggal; 'cancelled' adalah satu-satunya override manual.
export function getEffectiveCostStatus(
  startDate: string | null,
  endDate: string | null,
  isCancelled: boolean,
): MonitoringCostStatus {
  if (isCancelled) return 'cancelled'
  const today = new Date().toISOString().slice(0, 10)
  if (!startDate || today < startDate) return 'future'
  if (!endDate || today <= endDate) return 'active'
  return 'closed'
}

export const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function reportMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return `${BULAN_ID[Number(m) - 1] ?? ''} ${y}`
}

export function prevReportMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function nextReportMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function bapChecklistProgress(checklist: MonitoringBAPChecklist): number {
  const keys = Object.keys(checklist) as (keyof MonitoringBAPChecklist)[]
  const done = keys.filter((k) => checklist[k]).length
  return Math.round((done / keys.length) * 100)
}
