// ============================================================
// MONITORING MODULE — Type Definitions
// ============================================================

// ---------- Report Project Monitoring ----------

export type ReportDocumentType = 'customer' | 'vendor'
export type ReportDocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'          // Engineer submitted ke Doccon
  | 'UNDER_REVIEW'       // Keep backward compat
  | 'COMPILING'          // Doccon sedang susun customer report
  | 'QC_REVIEW'          // Doccon melakukan QC review sebelum ke Kadep
  | 'PENDING_SOM'        // Customer doc: menunggu approval Site Operation Manager sebelum ke Kadep
  | 'PENDING_KADEP_PARAF'// Menunggu paraf Kadep sebelum ke Kadiv
  | 'PENDING_KADIV'      // Menunggu approval Kadiv
  | 'REVISION_REQUIRED'
  | 'KADIV_APPROVED'     // Kadiv sudah approve — juga dipakai saat Kadiv dilewati (lihat requiresKadiv)
  | 'APPROVED'           // Fully done
export type ReportDocumentRevision = 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
export type ReportDocumentActionType =
  | 'CREATE' | 'SUBMIT' | 'START_REVIEW' | 'APPROVE' | 'REQUEST_REVISION' | 'RESUBMIT'  // keep existing
  | 'DOCCON_COMPILE'      // Doccon mulai kompilasi
  | 'DOCCON_QC_REVIEW'    // Doccon mulai QC review
  | 'DOCCON_SUBMIT_SOM'   // Doccon kirim dokumen customer ke Site Operation Manager
  | 'SOM_APPROVE'         // Site Operation Manager approve, teruskan ke Kadep
  | 'SOM_REJECT'          // Site Operation Manager minta revisi balik ke Doccon
  | 'DOCCON_SUBMIT_KADEP' // Doccon kirim ke Kadep untuk paraf
  | 'KADEP_PARAF'         // Kadep paraf dokumen
  | 'KADEP_REJECT'        // Kadep minta revisi balik ke Doccon
  | 'SUBMIT_KADIV'        // Doccon submit ke Kadiv
  | 'KADIV_APPROVE'       // Kadiv approve
  | 'KADIV_REJECT'        // Kadiv minta revisi
  | 'CUSTOMER_NOTIFIED'   // Doccon catat email ke customer dikirim
  | 'CUSTOMER_CONFIRMED'  // Doccon catat customer konfirmasi via email
  | 'CUSTOMER_REJECT'     // Doccon catat customer minta revisi via email
  | 'VENDOR_CONFIRMED'    // Doccon catat vendor konfirmasi via email
  | 'SUBMIT_SALES'        // Doccon kirim ke Sales
  | 'ESCALATE_ENGINEER'   // Doccon eskalasi dokumen ke Engineer untuk perbaikan
  | 'DOCCON_RESUBMIT_CUSTOMER' // Doccon perbaiki revisi Customer & kirim langsung balik ke Customer (skip SOM/Kadep/Kadiv)

// E2E phase tracking (feature: end-to-end document pipeline)
export type DocPhase =
  | 'engineer'        // Customer doc: Engineer drafting
  | 'doccon'          // Customer doc: Doccon assembling | Vendor doc: Doccon inputting
  | 'som'             // Customer doc only: menunggu approval Site Operation Manager (antara Doccon dan Kadep)
  | 'kadep'           // Both: menunggu paraf Kadep
  | 'kadiv'           // Both: Kadiv approval — dilewati kalau requiresKadiv === false
  | 'customer_email'  // Customer doc: menunggu konfirmasi customer (via email)
  | 'vendor_confirm'  // Vendor doc: menunggu konfirmasi vendor (via email)
  | 'sales'           // Customer doc: sudah dikirim ke Sales
  | 'completed'       // Vendor doc: selesai
  | 'customer'        // Keep backward compat
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

// Deliverable Plan — template deliverable berulang milik project (diisi Kadep saat Tambah/Edit Project).
// Begitu project di-assign ke Doccon, dokumen untuk tiap periode yang jatuh tempo otomatis di-generate.
export type DeliverablePlanTargetType = 'report_customer' | 'report_vendor' | 'billing_tracker'

export interface DeliverablePlanItem {
  id: string                          // stable — dedup key generate, bertahan walau label/cadence diedit
  label: string                       // "Executive Summary", "Laporan Bulanan", "BAPP", dst
  targetType: DeliverablePlanTargetType
  cadenceMonths: number                // tiap N bulan, dihitung dari kontrakMulai (1 = tiap bulan)
  startPhase?: 'engineer' | 'doccon'   // hanya dipakai kalau targetType === 'report_customer'
  requiresKadiv?: boolean              // default (undefined) = true. false = dokumen yang di-generate skip approval Kadiv, cukup Kadep. Hanya report_customer/report_vendor.
  active: boolean                      // false = berhenti generate periode baru, histori tetap ada
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
  kontrakMulai: string       // period YYYY-MM, project mulai muncul di list — auto-diturunkan dari startDate
  kontrakAkhir: string | null  // period YYYY-MM, project berhenti muncul (null = masih aktif) — auto-diturunkan dari endDate
  excludedMonths: string[]     // YYYY-MM list, bulan yang dikecualikan satu per satu
  // Kontrak — satu sumber kebenaran, disinkronkan ke Cost Monitoring (lihat MonitoringReportProjectModal & DocconAssignmentSection)
  contractNumber: string
  categoryContract: string
  dateOfContract: string | null  // tanggal tanda tangan kontrak
  startDate: string | null       // tanggal mulai kerja (harian)
  endDate: string | null         // tanggal akhir kerja (harian)
  isCancelled: boolean
  deliverablePlan?: DeliverablePlanItem[]
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
}

export interface RevisionHistoryEntry {
  revision: ReportDocumentRevision
  status: ReportDocumentStatus
  changedAt: string
  changedByName: string
  note: string
  type?: 'revision' | 'escalation'  // 'escalation' = Doccon eskalasi ke Engineer
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
  // Pipeline type: 'engineer' = Engineer → Doccon → SOM → TTD Kadep → Kadiv → Customer → Sales
  //                'doccon'   = Doccon langsung → SOM → TTD Kadep → Kadiv → Customer → Sales
  startPhase?: 'engineer' | 'doccon'
  // Per-document Doccon assignment (Kadep assigns)
  assignedDocconUserId?: string | null
  assignedDocconName?: string | null
  // Revision audit log
  revisionHistory?: RevisionHistoryEntry[]
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
  // New workflow timestamps
  somApprovedAt?: string | null
  somApprovedByName?: string | null
  kadepParafAt?: string | null
  kadepParafByName?: string | null
  kadivApprovedAt?: string | null
  kadivApprovedByName?: string | null
  customerConfirmedAt?: string | null
  vendorConfirmedAt?: string | null
  salesSubmittedAt?: string | null
  // Skip approval Kadiv untuk dokumen ini — default (undefined) = true (perlu Kadiv), diturunkan dari
  // DeliverablePlanItem.requiresKadiv saat generate, bisa di-override manual per dokumen.
  requiresKadiv?: boolean
  // true = dokumen lagi dikembalikan gara-gara Customer minta revisi (bukan SOM/Kadep/Kadiv) — dipakai
  // buat nampilin opsi "kirim langsung balik ke Customer" (skip SOM/Kadep/Kadiv) di panel Doccon.
  // Di-clear begitu Doccon resubmit lewat jalur manapun.
  pendingCustomerRevision?: boolean
  // Deliverable Plan — diisi kalau dokumen ini di-generate otomatis dari rencana deliverable project
  deliverablePlanItemId?: string | null
  autoGenerated?: boolean
}

// ---------- Billing Tracker / Document Tracker (embedded in Report Project) ----------
// Dokumen event-based/milestone (BAP, BAPP, BAST, Invoice, dst — bukan laporan bulanan).
// Alur: Doccon susun checklist lampiran (diambil dari Report Customer) -> Kadep paraf/revisi -> Kadiv approve.

export type BillingDocumentType = string

export type BillingDocumentStatus =
  | 'DRAFT'                // Doccon menyusun checklist lampiran
  | 'PENDING_KADEP_PARAF'  // menunggu paraf Kadep
  | 'REVISION_REQUIRED'    // Kadep minta revisi, dikembalikan ke Doccon
  | 'PENDING_KADIV'        // menunggu approval/tanda tangan Kadiv
  | 'COMPLETED'            // Kadiv sudah approve — selesai

export type BillingDocPhase = 'doccon' | 'kadep' | 'kadiv' | 'completed'

export type BillingDocumentActionType =
  | 'CREATE'
  | 'DOCCON_SUBMIT_KADEP'  // Doccon kirim ke Kadep untuk paraf
  | 'KADEP_PARAF'          // Kadep paraf dokumen
  | 'KADEP_REJECT'         // Kadep minta revisi balik ke Doccon
  | 'DOCCON_RESUBMIT'      // Doccon kirim ulang ke Kadep setelah revisi
  | 'KADIV_APPROVE'        // Kadiv approve / tanda tangan
  | 'KADIV_REJECT'         // Kadiv minta revisi, dikembalikan ke Doccon

export interface BillingDocumentActivity {
  id: string
  action: BillingDocumentActionType
  byUserId: string
  byName: string
  comment: string
  timestamp: string
}

export interface BillingRevisionHistoryEntry {
  status: BillingDocumentStatus
  changedAt: string
  changedByName: string
  note: string
}

// Referensi live ke attachment milik ReportDocument (Report Customer) — bukan copy file.
export interface BillingLinkedAttachment {
  reportDocumentId: string
  attachmentId: string
  linkedAt: string
  linkedByName: string
}

export interface BillingDocument {
  id: string
  projectId: string
  docType: BillingDocumentType
  pic: string
  targetDate: string | null
  actualDate: string | null
  status: BillingDocumentStatus
  currentPhase: BillingDocPhase
  keterangan: string
  attachments: ReportDocumentAttachment[]        // upload manual langsung ke dokumen tracker ini
  linkedAttachments: BillingLinkedAttachment[]    // checklist lampiran yang diambil dari Report Customer
  activities: BillingDocumentActivity[]
  revisionHistory: BillingRevisionHistoryEntry[]
  createdAt: string
  updatedAt: string
  createdByUserId: string
  createdByName: string
  // Periode (YYYY-MM) — dipakai untuk dokumen event-based yang di-generate dari Deliverable Plan
  period?: string | null
  assignedDocconUserId?: string | null
  assignedDocconName?: string | null
  deliverablePlanItemId?: string | null
  autoGenerated?: boolean
}

// ---------- SLA Monitoring ----------

export type SLAStatus = 'TERCAPAI' | 'TIDAK_TERCAPAI'

export interface SLATargetHistoryEntry {
  target: number
  changedAt: string
  changedBy: string
}

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
  targetSLAHistory?: SLATargetHistoryEntry[]
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
  reconfirmNote: string        // catatan dari Doccon saat minta reconfirm
  engineerReconfirmNote: string // balasan Engineer setelah konfirmasi
  engineerConfirmedAt: string | null // timestamp saat Engineer mengkonfirmasi
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

// Dokumen dianggap "selesai" buat keperluan deadline-warning — dipakai DeadlineWarningPanel &
// Executive Summary aggregator, satu sumber biar gak drift.
export function isDocCompleted(doc: ReportDocument): boolean {
  if (doc.currentPhase === 'completed') return true
  if (doc.currentPhase === 'sales' && doc.salesSubmittedAt) return true
  if (doc.docconSubStatus === 'delivered' && doc.salesAcceptedAt && !doc.salesFlagIssue) return true
  return false
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

export function addReportMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export function listReportMonthsInRange(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = nextReportMonth(cur)
  }
  return out
}

export function currentReportMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function endOfReportMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${ym}-${String(lastDay).padStart(2, '0')}`
}

export function bapChecklistProgress(checklist: MonitoringBAPChecklist): number {
  const keys = Object.keys(checklist) as (keyof MonitoringBAPChecklist)[]
  const done = keys.filter((k) => checklist[k]).length
  return Math.round((done / keys.length) * 100)
}
