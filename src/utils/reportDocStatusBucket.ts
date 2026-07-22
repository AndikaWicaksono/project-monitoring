import type { ReportDocumentStatus } from '../types/monitoring'

// ReportDocumentStatus punya banyak nilai (satu per-tahap approval: SUBMITTED, COMPILING,
// QC_REVIEW, PENDING_SOM, PENDING_KADEP_PARAF, PENDING_KADIV, dst). Buat chart ringkasan
// dashboard, dikelompokkan jadi 4 bucket biar gampang dibaca — dipakai bareng oleh
// ProjectMonitoringTrendChart & ReportStatusDistributionChart biar konsisten & gak dobel logic.
export type ReportDocStatusBucket = 'DRAFT' | 'PENDING' | 'REVISION' | 'APPROVED'

export const REPORT_DOC_STATUS_BUCKET_META: Record<ReportDocStatusBucket, { label: string; color: string }> = {
  DRAFT:    { label: 'Draft',    color: '#64748b' },
  PENDING:  { label: 'Menunggu', color: '#d97706' },
  REVISION: { label: 'Revisi',   color: '#E31E24' },
  APPROVED: { label: 'Disetujui', color: '#059669' },
}

export function bucketReportDocStatus(status: ReportDocumentStatus): ReportDocStatusBucket {
  if (status === 'DRAFT') return 'DRAFT'
  if (status === 'REVISION_REQUIRED') return 'REVISION'
  if (status === 'KADIV_APPROVED' || status === 'APPROVED') return 'APPROVED'
  // SUBMITTED, COMPILING, QC_REVIEW, PENDING_SOM, PENDING_KADEP_PARAF, PENDING_KADIV, UNDER_REVIEW
  return 'PENDING'
}
