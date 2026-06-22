import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ReportProject, ReportDocument, ReportDocumentActivity,
  ReportDocumentStatus, ReportDocumentRevision, ReportDocumentAttachment,
  BillingDocument, BillingDocumentStatus,
} from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

// ── Seed data ─────────────────────────────────────────────────────────────────

const T0 = '2025-01-15T08:00:00.000Z'
const T1 = '2025-02-10T09:00:00.000Z'
const T2 = '2025-03-05T10:00:00.000Z'

const SEED_PROJECTS: ReportProject[] = [
  { id: 'rp001', kodeProject: 'PGN-IT-001', client: 'PT Perusahaan Gas Negara', namaKontrak: 'Kontrak Jasa Pemeliharaan Jaringan IT 2025', department: 'IT Infrastructure', picDocon: 'Sari Dewi', picLaporan: 'Budi Santoso', salesCustomer: 'Andi Wijaya', emailTujuan: 'docon@pgn.co.id', catatan: '', createdAt: T0, updatedAt: T0, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp002', kodeProject: 'PGN-SEC-002', client: 'PT Saka Energi Indonesia', namaKontrak: 'Kontrak Security System Management 2025', department: 'IT Security', picDocon: 'Rina Kartika', picLaporan: 'Ahmad Fauzi', salesCustomer: 'Dewi Rahayu', emailTujuan: 'sec@sakaindonesia.co.id', catatan: '', createdAt: T1, updatedAt: T1, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp003', kodeProject: 'PGN-DC-003', client: 'PT Gagas Energi Indonesia', namaKontrak: 'Kontrak Data Center Operations Q1 2025', department: 'IT Infrastructure', picDocon: 'Hendra Putra', picLaporan: 'Lisa Andriani', salesCustomer: 'Rudi Setiawan', emailTujuan: 'dc@gagas.co.id', catatan: '', createdAt: T2, updatedAt: T2, createdByUserId: 'system', createdByName: 'System' },
]

function act(id: string, action: ReportDocumentActivity['action'], byName: string, comment: string, ts: string): ReportDocumentActivity {
  return { id, action, byUserId: 'system', byName, comment, timestamp: ts }
}

const SEED_DOCUMENTS: ReportDocument[] = [
  // rp001 — Customer docs
  {
    id: 'rd001', projectId: 'rp001', docType: 'customer',
    judul: 'Laporan Progress Bulan Januari 2025',
    deskripsi: 'Laporan progress pekerjaan bulan Januari 2025 kepada customer PT PGN.',
    tanggalSubmit: '2025-01-20', tanggalFeedback: '2025-01-26',
    revision: 'R1', status: 'APPROVED',
    attachments: [
      { id: 'att001', name: 'Laporan_Progress_Jan2025_R1.pdf', size: 2048576, mimeType: 'application/pdf', uploadedAt: '2025-01-25T10:00:00.000Z', uploadedByName: 'Budi Santoso' },
    ],
    activities: [
      act('a001', 'CREATE', 'Budi Santoso', '', '2025-01-15T08:00:00.000Z'),
      act('a002', 'SUBMIT', 'Budi Santoso', 'Laporan siap untuk review', '2025-01-20T09:00:00.000Z'),
      act('a002b', 'START_REVIEW', 'Manager', '', '2025-01-21T09:00:00.000Z'),
      act('a003', 'REQUEST_REVISION', 'Manager', 'Perlu penambahan data realisasi biaya', '2025-01-22T14:00:00.000Z'),
      act('a004', 'RESUBMIT', 'Budi Santoso', 'Sudah ditambahkan data realisasi biaya', '2025-01-25T10:00:00.000Z'),
      act('a004b', 'START_REVIEW', 'Manager', '', '2025-01-25T15:00:00.000Z'),
      act('a005', 'APPROVE', 'Manager', 'Laporan disetujui', '2025-01-26T11:00:00.000Z'),
    ],
    createdAt: '2025-01-15T08:00:00.000Z', updatedAt: '2025-01-26T11:00:00.000Z', createdByUserId: 'system', createdByName: 'Budi Santoso',
  },
  {
    id: 'rd002', projectId: 'rp001', docType: 'customer',
    judul: 'Laporan Progress Bulan Februari 2025',
    deskripsi: 'Laporan progress pekerjaan bulan Februari 2025.',
    tanggalSubmit: '2025-02-20', tanggalFeedback: null,
    revision: 'R0', status: 'UNDER_REVIEW',
    attachments: [],
    activities: [
      act('a006', 'CREATE', 'Budi Santoso', '', '2025-02-15T08:00:00.000Z'),
      act('a007', 'SUBMIT', 'Budi Santoso', 'Submit untuk review bulan Februari', '2025-02-20T09:00:00.000Z'),
      act('a007b', 'START_REVIEW', 'Manager', '', '2025-02-21T09:00:00.000Z'),
    ],
    createdAt: '2025-02-15T08:00:00.000Z', updatedAt: '2025-02-21T09:00:00.000Z', createdByUserId: 'system', createdByName: 'Budi Santoso',
  },
  // rp001 — Vendor docs
  {
    id: 'rd003', projectId: 'rp001', docType: 'vendor',
    judul: 'Invoice Pembayaran Vendor IT Januari 2025',
    deskripsi: 'Tagihan vendor untuk jasa pemeliharaan jaringan bulan Januari.',
    tanggalSubmit: '2025-01-30', tanggalFeedback: '2025-01-31',
    revision: 'R0', status: 'APPROVED',
    attachments: [
      { id: 'att002', name: 'Invoice_Vendor_Jan2025.pdf', size: 512000, mimeType: 'application/pdf', uploadedAt: '2025-01-30T10:00:00.000Z', uploadedByName: 'Sari Dewi' },
    ],
    activities: [
      act('a008', 'CREATE', 'Sari Dewi', '', '2025-01-28T08:00:00.000Z'),
      act('a009', 'SUBMIT', 'Sari Dewi', 'Invoice siap diproses', '2025-01-30T09:00:00.000Z'),
      act('a009b', 'START_REVIEW', 'Manager', '', '2025-01-30T14:00:00.000Z'),
      act('a010', 'APPROVE', 'Manager', 'Approved untuk pembayaran', '2025-01-31T10:00:00.000Z'),
    ],
    createdAt: '2025-01-28T08:00:00.000Z', updatedAt: '2025-01-31T10:00:00.000Z', createdByUserId: 'system', createdByName: 'Sari Dewi',
  },
  {
    id: 'rd004', projectId: 'rp001', docType: 'vendor',
    judul: 'Invoice Pembayaran Vendor IT Februari 2025',
    deskripsi: 'Tagihan vendor untuk jasa pemeliharaan jaringan bulan Februari.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a011', 'CREATE', 'Sari Dewi', '', '2025-02-28T08:00:00.000Z'),
    ],
    createdAt: '2025-02-28T08:00:00.000Z', updatedAt: '2025-02-28T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Sari Dewi',
  },
  // rp002 — Customer docs
  {
    id: 'rd005', projectId: 'rp002', docType: 'customer',
    judul: 'Laporan Instalasi Security System Q1',
    deskripsi: 'Laporan instalasi dan konfigurasi sistem keamanan quarter pertama 2025.',
    tanggalSubmit: '2025-02-15', tanggalFeedback: null,
    revision: 'R0', status: 'REVISION_REQUIRED',
    attachments: [],
    activities: [
      act('a012', 'CREATE', 'Ahmad Fauzi', '', '2025-02-10T08:00:00.000Z'),
      act('a013', 'SUBMIT', 'Ahmad Fauzi', 'Laporan Q1 siap direview', '2025-02-15T09:00:00.000Z'),
      act('a013b', 'START_REVIEW', 'Manager', '', '2025-02-16T09:00:00.000Z'),
      act('a014', 'REQUEST_REVISION', 'Manager', 'Mohon sertakan foto dokumentasi instalasi', '2025-02-18T14:00:00.000Z'),
    ],
    createdAt: '2025-02-10T08:00:00.000Z', updatedAt: '2025-02-18T14:00:00.000Z', createdByUserId: 'system', createdByName: 'Ahmad Fauzi',
  },
  // rp002 — Vendor docs
  {
    id: 'rd006', projectId: 'rp002', docType: 'vendor',
    judul: 'PO Security Equipment Batch 1',
    deskripsi: 'Purchase order untuk pengadaan peralatan keamanan batch pertama.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a015', 'CREATE', 'Rina Kartika', '', '2025-02-12T08:00:00.000Z'),
    ],
    createdAt: '2025-02-12T08:00:00.000Z', updatedAt: '2025-02-12T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Rina Kartika',
  },
  // rp003 — Customer docs
  {
    id: 'rd007', projectId: 'rp003', docType: 'customer',
    judul: 'Laporan Operasional Data Center Maret 2025',
    deskripsi: 'Laporan operasional bulanan data center termasuk uptime dan incident report.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a016', 'CREATE', 'Lisa Andriani', '', '2025-03-05T08:00:00.000Z'),
    ],
    createdAt: '2025-03-05T08:00:00.000Z', updatedAt: '2025-03-05T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Lisa Andriani',
  },
]

function mkBilling(
  id: string, projectId: string, docType: BillingDocument['docType'],
  pic: string, targetDate: string | null, actualDate: string | null,
  status: BillingDocumentStatus, keterangan: string, ts: string,
): BillingDocument {
  return { id, projectId, docType, pic, targetDate, actualDate, status, keterangan, attachments: [], createdAt: ts, updatedAt: ts, createdByUserId: 'system', createdByName: 'System' }
}

const SEED_BILLING: BillingDocument[] = [
  // rp001 — 5 billing docs (2 completed)
  mkBilling('bd001', 'rp001', 'BAP',                 'Sari Dewi',   '2025-01-31', '2025-01-30', 'COMPLETED',    'BAP selesai ditandatangani kedua pihak', T0),
  mkBilling('bd002', 'rp001', 'BAPP',                'Sari Dewi',   '2025-02-15', '2025-02-14', 'COMPLETED',    'BAPP diterima dan diarsipkan', T0),
  mkBilling('bd003', 'rp001', 'BAST',                'Sari Dewi',   '2025-02-28', null,         'SUBMITTED',    'BAST sudah dikirim, menunggu tanda tangan customer', T0),
  mkBilling('bd004', 'rp001', 'Invoice',             'Sari Dewi',   '2025-03-15', null,         'DRAFT',        'Invoice sedang disiapkan finance', T0),
  mkBilling('bd005', 'rp001', 'Supporting Document', 'Sari Dewi',   '2025-03-15', null,         'BELUM_DIBUAT', 'Dokumen pendukung penagihan', T0),
  // rp002 — 5 billing docs (0 completed)
  mkBilling('bd006', 'rp002', 'BAP',                 'Rina Kartika', '2025-03-31', null,         'SUBMITTED',    'BAP sudah disubmit ke customer', T1),
  mkBilling('bd007', 'rp002', 'BAPP',                'Rina Kartika', '2025-04-15', null,         'BELUM_DIBUAT', '', T1),
  mkBilling('bd008', 'rp002', 'BAST',                'Rina Kartika', '2025-04-30', null,         'BELUM_DIBUAT', '', T1),
  mkBilling('bd009', 'rp002', 'Invoice',             'Rina Kartika', '2025-05-15', null,         'BELUM_DIBUAT', '', T1),
  mkBilling('bd010', 'rp002', 'Supporting Document', 'Rina Kartika', '2025-05-15', null,         'BELUM_DIBUAT', '', T1),
  // rp003 — 5 billing docs (all BELUM_DIBUAT)
  mkBilling('bd011', 'rp003', 'BAP',                 'Hendra Putra', '2025-04-30', null,         'BELUM_DIBUAT', '', T2),
  mkBilling('bd012', 'rp003', 'BAPP',                'Hendra Putra', '2025-05-15', null,         'BELUM_DIBUAT', '', T2),
  mkBilling('bd013', 'rp003', 'BAST',                'Hendra Putra', '2025-05-31', null,         'BELUM_DIBUAT', '', T2),
  mkBilling('bd014', 'rp003', 'Invoice',             'Hendra Putra', '2025-06-15', null,         'BELUM_DIBUAT', '', T2),
  mkBilling('bd015', 'rp003', 'Supporting Document', 'Hendra Putra', '2025-06-15', null,         'BELUM_DIBUAT', '', T2),
]

// ── Store interface ────────────────────────────────────────────────────────────

interface MonitoringReportState {
  projects: ReportProject[]
  documents: ReportDocument[]
  billingDocuments: BillingDocument[]

  // Project CRUD
  addProject: (data: Omit<ReportProject, 'id' | 'createdAt' | 'updatedAt'>) => ReportProject
  updateProject: (id: string, patch: Partial<Omit<ReportProject, 'id' | 'createdAt'>>) => void
  deleteProject: (id: string) => void
  getProjectById: (id: string) => ReportProject | undefined

  // Report document CRUD
  addDocument: (data: Omit<ReportDocument, 'id' | 'status' | 'revision' | 'activities' | 'createdAt' | 'updatedAt' | 'tanggalSubmit' | 'tanggalFeedback'>) => ReportDocument
  updateDocument: (id: string, patch: Partial<Omit<ReportDocument, 'id' | 'activities' | 'createdAt'>>) => void
  deleteDocument: (id: string) => void
  getDocumentById: (id: string) => ReportDocument | undefined
  getProjectDocuments: (projectId: string, docType?: 'customer' | 'vendor') => ReportDocument[]

  // Report document workflow
  submitDocument: (id: string, byUserId: string, byName: string, comment?: string) => void
  startReview: (id: string, byUserId: string, byName: string) => void
  approveDocument: (id: string, byUserId: string, byName: string, comment?: string) => void
  requestDocumentRevision: (id: string, byUserId: string, byName: string, comment: string) => void
  resubmitDocument: (id: string, byUserId: string, byName: string, comment?: string) => void

  // Report document attachments (mock)
  addAttachment: (docId: string, att: Omit<ReportDocumentAttachment, 'id' | 'uploadedAt'> & { uploadedByName: string }) => void
  removeAttachment: (docId: string, attId: string) => void

  // Billing document CRUD
  addBillingDocument: (data: Omit<BillingDocument, 'id' | 'createdAt' | 'updatedAt'>) => BillingDocument
  updateBillingDocument: (id: string, patch: Partial<Omit<BillingDocument, 'id' | 'createdAt'>>) => void
  deleteBillingDocument: (id: string) => void
  getBillingDocumentById: (id: string) => BillingDocument | undefined
  getProjectBillingDocuments: (projectId: string) => BillingDocument[]

  // Billing document attachments (mock)
  addBillingAttachment: (billingId: string, att: Omit<ReportDocumentAttachment, 'id' | 'uploadedAt'> & { uploadedByName: string }) => void
  removeBillingAttachment: (billingId: string, attId: string) => void
}

function makeActivity(action: ReportDocumentActivity['action'], byUserId: string, byName: string, comment: string): ReportDocumentActivity {
  return { id: uid('rda'), action, byUserId, byName, comment, timestamp: nowIso() }
}

// Status migration for localStorage backward compat
const LEGACY_STATUS_MAP: Record<string, ReportDocumentStatus> = {
  CREATE: 'DRAFT', UNDER_APPROVAL: 'UNDER_REVIEW', UNDER_REVISION: 'REVISION_REQUIRED',
  DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED', UNDER_REVIEW: 'UNDER_REVIEW',
  REVISION_REQUIRED: 'REVISION_REQUIRED', APPROVED: 'APPROVED',
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMonitoringReportStore = create<MonitoringReportState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      documents: SEED_DOCUMENTS,
      billingDocuments: SEED_BILLING,

      // ── Projects ──
      addProject: (data) => {
        const now = nowIso()
        const record: ReportProject = { ...data, id: uid('rp'), createdAt: now, updatedAt: now }
        set((s) => ({ projects: [record, ...s.projects] }))
        useLogStore.getState().addLog({ type: 'monitoring_report_created', message: `Project laporan "${data.kodeProject}" dibuat`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return record
      },
      updateProject: (id, patch) => {
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p) }))
        useLogStore.getState().addLog({ type: 'monitoring_report_edited', message: `Project laporan diperbarui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          documents: s.documents.filter((d) => d.projectId !== id),
          billingDocuments: s.billingDocuments.filter((b) => b.projectId !== id),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_deleted', message: `Project laporan dihapus`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      getProjectById: (id) => get().projects.find((p) => p.id === id),

      // ── Report Documents ──
      addDocument: (data) => {
        const now = nowIso()
        const doc: ReportDocument = {
          ...data,
          id: uid('rd'),
          status: 'DRAFT',
          revision: 'R0',
          tanggalSubmit: null,
          tanggalFeedback: null,
          activities: [makeActivity('CREATE', data.createdByUserId, data.createdByName, '')],
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ documents: [doc, ...s.documents] }))
        return doc
      },
      updateDocument: (id, patch) => {
        set((s) => ({ documents: s.documents.map((d) => d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d) }))
      },
      deleteDocument: (id) => {
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }))
      },
      getDocumentById: (id) => get().documents.find((d) => d.id === id),
      getProjectDocuments: (projectId, docType) =>
        get().documents.filter((d) => d.projectId === projectId && (docType ? d.docType === docType : true)),

      // ── Report Document Workflow ──
      submitDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('SUBMIT', byUserId, byName, comment)
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'SUBMITTED' as ReportDocumentStatus,
            tanggalSubmit: now,
            activities: [...d.activities, activity], updatedAt: now,
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_submitted', message: `Dokumen disubmit`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      startReview: (id, byUserId, byName) => {
        const activity = makeActivity('START_REVIEW', byUserId, byName, '')
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'UNDER_REVIEW' as ReportDocumentStatus,
            activities: [...d.activities, activity], updatedAt: nowIso(),
          }),
        }))
      },
      approveDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('APPROVE', byUserId, byName, comment)
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'APPROVED' as ReportDocumentStatus,
            tanggalFeedback: now,
            activities: [...d.activities, activity], updatedAt: now,
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_approved', message: `Dokumen disetujui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      requestDocumentRevision: (id, byUserId, byName, comment) => {
        const activity = makeActivity('REQUEST_REVISION', byUserId, byName, comment)
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'REVISION_REQUIRED' as ReportDocumentStatus,
            tanggalFeedback: now,
            activities: [...d.activities, activity], updatedAt: now,
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_revision', message: `Revisi diminta`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      resubmitDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('RESUBMIT', byUserId, byName, comment)
        const REVISIONS: ReportDocumentRevision[] = ['R0', 'R1', 'R2', 'R3', 'R4']
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => {
            if (d.id !== id) return d
            const nextRevIdx = Math.min(REVISIONS.indexOf(d.revision) + 1, 4)
            return {
              ...d,
              status: 'SUBMITTED' as ReportDocumentStatus,
              revision: REVISIONS[nextRevIdx],
              tanggalSubmit: now,
              activities: [...d.activities, activity],
              updatedAt: now,
            }
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_resubmitted', message: `Dokumen diresubmit`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      // ── Report Document Attachments ──
      addAttachment: (docId, att) => {
        const newAtt: ReportDocumentAttachment = { ...att, id: uid('att'), uploadedAt: nowIso() }
        set((s) => ({
          documents: s.documents.map((d) => d.id === docId ? { ...d, attachments: [...d.attachments, newAtt], updatedAt: nowIso() } : d),
        }))
      },
      removeAttachment: (docId, attId) => {
        set((s) => ({
          documents: s.documents.map((d) => d.id === docId ? { ...d, attachments: d.attachments.filter((a) => a.id !== attId), updatedAt: nowIso() } : d),
        }))
      },

      // ── Billing Documents ──
      addBillingDocument: (data) => {
        const now = nowIso()
        const doc: BillingDocument = { ...data, id: uid('bd'), createdAt: now, updatedAt: now }
        set((s) => ({ billingDocuments: [...s.billingDocuments, doc] }))
        useLogStore.getState().addLog({ type: 'monitoring_report_created', message: `Billing document "${data.docType}" ditambahkan`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return doc
      },
      updateBillingDocument: (id, patch) => {
        set((s) => ({ billingDocuments: s.billingDocuments.map((b) => b.id === id ? { ...b, ...patch, updatedAt: nowIso() } : b) }))
      },
      deleteBillingDocument: (id) => {
        set((s) => ({ billingDocuments: s.billingDocuments.filter((b) => b.id !== id) }))
      },
      getBillingDocumentById: (id) => get().billingDocuments.find((b) => b.id === id),
      getProjectBillingDocuments: (projectId) => get().billingDocuments.filter((b) => b.projectId === projectId),

      // ── Billing Attachments ──
      addBillingAttachment: (billingId, att) => {
        const newAtt: ReportDocumentAttachment = { ...att, id: uid('att'), uploadedAt: nowIso() }
        set((s) => ({
          billingDocuments: s.billingDocuments.map((b) => b.id === billingId ? { ...b, attachments: [...b.attachments, newAtt], updatedAt: nowIso() } : b),
        }))
      },
      removeBillingAttachment: (billingId, attId) => {
        set((s) => ({
          billingDocuments: s.billingDocuments.map((b) => b.id === billingId ? { ...b, attachments: b.attachments.filter((a) => a.id !== attId), updatedAt: nowIso() } : b),
        }))
      },
    }),
    {
      name: 'flowdesk:monitoring-report',
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<MonitoringReportState>
        if (!p.projects?.length) return current

        // Migrate old status values from localStorage
        const migratedDocs = (p.documents ?? []).map((d) => ({
          ...d,
          status: LEGACY_STATUS_MAP[(d.status as string)] ?? 'DRAFT',
          tanggalSubmit: ((d as unknown) as Record<string, unknown>).tanggalSubmit as string | null ?? null,
          tanggalFeedback: ((d as unknown) as Record<string, unknown>).tanggalFeedback as string | null ?? null,
        }))

        // Inject seed billing docs for any project not yet in localStorage
        const persistedBilling = p.billingDocuments ?? []
        const existingBillingProjectIds = new Set(persistedBilling.map((b) => b.projectId))
        const missingBilling = current.billingDocuments.filter((b) => !existingBillingProjectIds.has(b.projectId))

        return {
          ...current,
          ...p,
          documents: migratedDocs,
          billingDocuments: [...persistedBilling, ...missingBilling],
        }
      },
    },
  ),
)
