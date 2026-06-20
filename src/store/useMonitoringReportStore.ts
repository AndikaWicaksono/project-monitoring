import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReportProject, ReportDocument, ReportDocumentActivity, ReportDocumentStatus, ReportDocumentRevision, ReportDocumentAttachment } from '../types/monitoring'
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
    id: 'rd001', projectId: 'rp001', docType: 'customer', judul: 'Laporan Progress Bulan Januari 2025',
    deskripsi: 'Laporan progress pekerjaan bulan Januari 2025 kepada customer PT PGN.',
    revision: 'R1', status: 'APPROVED', attachments: [
      { id: 'att001', name: 'Laporan_Progress_Jan2025_R1.pdf', size: 2048576, mimeType: 'application/pdf', uploadedAt: '2025-01-25T10:00:00.000Z', uploadedByName: 'Budi Santoso' },
    ],
    activities: [
      act('a001', 'CREATE', 'Budi Santoso', '', '2025-01-15T08:00:00.000Z'),
      act('a002', 'SUBMIT', 'Budi Santoso', 'Laporan siap untuk review', '2025-01-20T09:00:00.000Z'),
      act('a003', 'REQUEST_REVISION', 'Manager', 'Perlu penambahan data realisasi biaya', '2025-01-22T14:00:00.000Z'),
      act('a004', 'RESUBMIT', 'Budi Santoso', 'Sudah ditambahkan data realisasi biaya', '2025-01-25T10:00:00.000Z'),
      act('a005', 'APPROVE', 'Manager', 'Laporan disetujui', '2025-01-26T11:00:00.000Z'),
    ],
    createdAt: '2025-01-15T08:00:00.000Z', updatedAt: '2025-01-26T11:00:00.000Z', createdByUserId: 'system', createdByName: 'Budi Santoso',
  },
  {
    id: 'rd002', projectId: 'rp001', docType: 'customer', judul: 'Laporan Progress Bulan Februari 2025',
    deskripsi: 'Laporan progress pekerjaan bulan Februari 2025.',
    revision: 'R0', status: 'UNDER_APPROVAL', attachments: [],
    activities: [
      act('a006', 'CREATE', 'Budi Santoso', '', '2025-02-15T08:00:00.000Z'),
      act('a007', 'SUBMIT', 'Budi Santoso', 'Submit untuk review bulan Februari', '2025-02-20T09:00:00.000Z'),
    ],
    createdAt: '2025-02-15T08:00:00.000Z', updatedAt: '2025-02-20T09:00:00.000Z', createdByUserId: 'system', createdByName: 'Budi Santoso',
  },
  // rp001 — Vendor docs
  {
    id: 'rd003', projectId: 'rp001', docType: 'vendor', judul: 'Invoice Pembayaran Vendor IT Januari 2025',
    deskripsi: 'Tagihan vendor untuk jasa pemeliharaan jaringan bulan Januari.',
    revision: 'R0', status: 'APPROVED', attachments: [
      { id: 'att002', name: 'Invoice_Vendor_Jan2025.pdf', size: 512000, mimeType: 'application/pdf', uploadedAt: '2025-01-30T10:00:00.000Z', uploadedByName: 'Sari Dewi' },
    ],
    activities: [
      act('a008', 'CREATE', 'Sari Dewi', '', '2025-01-28T08:00:00.000Z'),
      act('a009', 'SUBMIT', 'Sari Dewi', 'Invoice siap diproses', '2025-01-30T09:00:00.000Z'),
      act('a010', 'APPROVE', 'Manager', 'Approved untuk pembayaran', '2025-01-31T10:00:00.000Z'),
    ],
    createdAt: '2025-01-28T08:00:00.000Z', updatedAt: '2025-01-31T10:00:00.000Z', createdByUserId: 'system', createdByName: 'Sari Dewi',
  },
  {
    id: 'rd004', projectId: 'rp001', docType: 'vendor', judul: 'Invoice Pembayaran Vendor IT Februari 2025',
    deskripsi: 'Tagihan vendor untuk jasa pemeliharaan jaringan bulan Februari.',
    revision: 'R0', status: 'CREATE', attachments: [],
    activities: [
      act('a011', 'CREATE', 'Sari Dewi', '', '2025-02-28T08:00:00.000Z'),
    ],
    createdAt: '2025-02-28T08:00:00.000Z', updatedAt: '2025-02-28T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Sari Dewi',
  },
  // rp002 — Customer docs
  {
    id: 'rd005', projectId: 'rp002', docType: 'customer', judul: 'Laporan Instalasi Security System Q1',
    deskripsi: 'Laporan instalasi dan konfigurasi sistem keamanan quarter pertama 2025.',
    revision: 'R0', status: 'UNDER_REVISION', attachments: [],
    activities: [
      act('a012', 'CREATE', 'Ahmad Fauzi', '', '2025-02-10T08:00:00.000Z'),
      act('a013', 'SUBMIT', 'Ahmad Fauzi', 'Laporan Q1 siap direview', '2025-02-15T09:00:00.000Z'),
      act('a014', 'REQUEST_REVISION', 'Manager', 'Mohon sertakan foto dokumentasi instalasi', '2025-02-18T14:00:00.000Z'),
    ],
    createdAt: '2025-02-10T08:00:00.000Z', updatedAt: '2025-02-18T14:00:00.000Z', createdByUserId: 'system', createdByName: 'Ahmad Fauzi',
  },
  // rp002 — Vendor docs
  {
    id: 'rd006', projectId: 'rp002', docType: 'vendor', judul: 'PO Security Equipment Batch 1',
    deskripsi: 'Purchase order untuk pengadaan peralatan keamanan batch pertama.',
    revision: 'R0', status: 'CREATE', attachments: [],
    activities: [
      act('a015', 'CREATE', 'Rina Kartika', '', '2025-02-12T08:00:00.000Z'),
    ],
    createdAt: '2025-02-12T08:00:00.000Z', updatedAt: '2025-02-12T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Rina Kartika',
  },
  // rp003 — Customer docs
  {
    id: 'rd007', projectId: 'rp003', docType: 'customer', judul: 'Laporan Operasional Data Center Maret 2025',
    deskripsi: 'Laporan operasional bulanan data center termasuk uptime dan incident report.',
    revision: 'R0', status: 'CREATE', attachments: [],
    activities: [
      act('a016', 'CREATE', 'Lisa Andriani', '', '2025-03-05T08:00:00.000Z'),
    ],
    createdAt: '2025-03-05T08:00:00.000Z', updatedAt: '2025-03-05T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Lisa Andriani',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface MonitoringReportState {
  projects: ReportProject[]
  documents: ReportDocument[]

  // Project CRUD
  addProject: (data: Omit<ReportProject, 'id' | 'createdAt' | 'updatedAt'>) => ReportProject
  updateProject: (id: string, patch: Partial<Omit<ReportProject, 'id' | 'createdAt'>>) => void
  deleteProject: (id: string) => void
  getProjectById: (id: string) => ReportProject | undefined

  // Document CRUD
  addDocument: (data: Omit<ReportDocument, 'id' | 'status' | 'revision' | 'activities' | 'createdAt' | 'updatedAt'>) => ReportDocument
  updateDocument: (id: string, patch: Partial<Omit<ReportDocument, 'id' | 'activities' | 'createdAt'>>) => void
  deleteDocument: (id: string) => void
  getDocumentById: (id: string) => ReportDocument | undefined
  getProjectDocuments: (projectId: string, docType?: 'customer' | 'vendor') => ReportDocument[]

  // Document workflow
  submitDocument: (id: string, byUserId: string, byName: string, comment?: string) => void
  approveDocument: (id: string, byUserId: string, byName: string, comment?: string) => void
  requestDocumentRevision: (id: string, byUserId: string, byName: string, comment: string) => void
  resubmitDocument: (id: string, byUserId: string, byName: string, comment?: string) => void

  // Attachment (mock - no file binary stored)
  addAttachment: (docId: string, att: Omit<ReportDocumentAttachment, 'id' | 'uploadedAt'> & { uploadedByName: string }) => void
  removeAttachment: (docId: string, attId: string) => void
}

function makeActivity(action: ReportDocumentActivity['action'], byUserId: string, byName: string, comment: string): ReportDocumentActivity {
  return { id: uid('rda'), action, byUserId, byName, comment, timestamp: nowIso() }
}

export const useMonitoringReportStore = create<MonitoringReportState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      documents: SEED_DOCUMENTS,

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
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_deleted', message: `Project laporan dihapus`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      getProjectById: (id) => get().projects.find((p) => p.id === id),

      // ── Documents ──
      addDocument: (data) => {
        const now = nowIso()
        const doc: ReportDocument = {
          ...data,
          id: uid('rd'),
          status: 'CREATE',
          revision: 'R0',
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

      // ── Workflow ──
      submitDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('SUBMIT', byUserId, byName, comment)
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'UNDER_APPROVAL' as ReportDocumentStatus,
            activities: [...d.activities, activity], updatedAt: nowIso(),
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_submitted', message: `Dokumen disubmit untuk approval`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      approveDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('APPROVE', byUserId, byName, comment)
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'APPROVED' as ReportDocumentStatus,
            activities: [...d.activities, activity], updatedAt: nowIso(),
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_approved', message: `Dokumen disetujui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      requestDocumentRevision: (id, byUserId, byName, comment) => {
        const activity = makeActivity('REQUEST_REVISION', byUserId, byName, comment)
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'UNDER_REVISION' as ReportDocumentStatus,
            activities: [...d.activities, activity], updatedAt: nowIso(),
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_revision', message: `Revisi diminta untuk dokumen`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      resubmitDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('RESUBMIT', byUserId, byName, comment)
        const REVISIONS: ReportDocumentRevision[] = ['R0', 'R1', 'R2', 'R3', 'R4']
        set((s) => ({
          documents: s.documents.map((d) => {
            if (d.id !== id) return d
            const nextRevIdx = Math.min(REVISIONS.indexOf(d.revision) + 1, 4)
            return {
              ...d,
              status: 'UNDER_APPROVAL' as ReportDocumentStatus,
              revision: REVISIONS[nextRevIdx],
              activities: [...d.activities, activity],
              updatedAt: nowIso(),
            }
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_resubmitted', message: `Dokumen diresubmit setelah revisi`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      // ── Attachments ──
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
    }),
    {
      name: 'flowdesk:monitoring-report',
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<MonitoringReportState>
        if (!p.projects?.length) return current
        return { ...current, ...p }
      },
    },
  ),
)
