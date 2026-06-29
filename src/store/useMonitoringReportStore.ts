import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ReportProject, ReportDocument, ReportDocumentActivity,
  ReportDocumentStatus, ReportDocumentRevision, ReportDocumentAttachment,
  BillingDocument, BillingDocumentStatus,
  DocPhase, EngineerSubStatus, CustomerSubStatus, DocconSubStatus,
} from '../types/monitoring'
import { prevReportMonth } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

// ── Seed data ─────────────────────────────────────────────────────────────────

const T0 = '2025-01-15T08:00:00.000Z'
const T1 = '2025-02-10T09:00:00.000Z'
const T2 = '2025-03-05T10:00:00.000Z'
const T_TODAY = '2026-06-26T08:00:00.000Z'

const SEED_PROJECTS: ReportProject[] = [
  { id: 'rp001', kodeProject: 'PGN-IT-001', client: 'PT Perusahaan Gas Negara', namaKontrak: 'Kontrak Jasa Pemeliharaan Jaringan IT 2025', department: 'IT Infrastructure', picDocon: 'Sari Dewi', picLaporan: 'Budi Santoso', salesCustomer: 'Andi Wijaya', emailTujuan: 'docon@pgn.co.id', catatan: '', kontrakMulai: '2025-01', kontrakAkhir: null, excludedMonths: [], createdAt: T0, updatedAt: T0, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp002', kodeProject: 'PGN-SEC-002', client: 'PT Saka Energi Indonesia', namaKontrak: 'Kontrak Security System Management 2025', department: 'IT Security', picDocon: 'Rina Kartika', picLaporan: 'Ahmad Fauzi', salesCustomer: 'Dewi Rahayu', emailTujuan: 'sec@sakaindonesia.co.id', catatan: '', kontrakMulai: '2025-02', kontrakAkhir: null, excludedMonths: [], createdAt: T1, updatedAt: T1, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp003', kodeProject: 'PGN-DC-003', client: 'PT Gagas Energi Indonesia', namaKontrak: 'Kontrak Data Center Operations Q1 2025', department: 'IT Infrastructure', picDocon: 'Hendra Putra', picLaporan: 'Lisa Andriani', salesCustomer: 'Rudi Setiawan', emailTujuan: 'dc@gagas.co.id', catatan: '', kontrakMulai: '2025-03', kontrakAkhir: null, excludedMonths: [], createdAt: T2, updatedAt: T2, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp004', kodeProject: 'PS-024-00', client: 'PT PGN Tbk', namaKontrak: 'Pekerjaan Jasa Operasi dan Pemeliharaan Terintegrasi Gas Management System (PJOPTGMS)', department: 'ICS', picDocon: 'Anita', picLaporan: 'Nyaklia', salesCustomer: 'Bayu Pratama', emailTujuan: 'osm@pgn.co.id', catatan: 'Project PJOPTGMS — laporan bulanan 5 dokumen', kontrakMulai: '2025-12', kontrakAkhir: null, excludedMonths: [], createdAt: '2025-12-01T08:00:00.000Z', updatedAt: '2025-12-01T08:00:00.000Z', createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp005', kodeProject: 'PS-025-01', client: 'PT PGN Tbk', namaKontrak: 'Demonstrasi Alur Dokumen OSM — Pain Point Visibility 2026', department: 'OSM', picDocon: 'Andika Wicaksono', picLaporan: 'Andika Wicaksono', salesCustomer: 'Bayu Pratama', emailTujuan: 'osm@pgn.co.id', catatan: 'Project demo 7 skenario bottleneck dokumen OSM', kontrakMulai: '2026-06', kontrakAkhir: null, excludedMonths: [], createdAt: T_TODAY, updatedAt: T_TODAY, createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp-p025', kodeProject: 'PS-025-00', client: 'PT PGN Tbk', namaKontrak: 'Sistem Informasi Manajemen Aset (SIMA)', department: 'ICS', picDocon: 'Rini Astuti', picLaporan: 'Budi Santoso', salesCustomer: 'Bayu Pratama', emailTujuan: 'ics@pgn.co.id', catatan: 'Project SIMA — laporan bulanan', kontrakMulai: '2026-01', kontrakAkhir: null, excludedMonths: [], createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z', createdByUserId: 'system', createdByName: 'System' },
  { id: 'rp-p026', kodeProject: 'PS-026-00', client: 'PT PGN Tbk', namaKontrak: 'End User Support (EUS)', department: 'EUS', picDocon: 'Sari Wijaya', picLaporan: 'Dimas Pratama', salesCustomer: 'Bayu Pratama', emailTujuan: 'eus@pgn.co.id', catatan: 'Project EUS — laporan bulanan', kontrakMulai: '2026-01', kontrakAkhir: null, excludedMonths: [], createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z', createdByUserId: 'system', createdByName: 'System' },
]

function act(id: string, action: ReportDocumentActivity['action'], byName: string, comment: string, ts: string): ReportDocumentActivity {
  return { id, action, byUserId: 'system', byName, comment, timestamp: ts }
}

// Helper — derive default phase fields from existing status
function phaseDefaults(
  status: ReportDocumentStatus,
  overrides: Partial<Pick<ReportDocument,
    'currentPhase' | 'engineerSubStatus' | 'customerSubStatus' | 'docconSubStatus' |
    'engineerStartedAt' | 'engineerSubmittedAt' | 'customerReceivedAt' | 'customerApprovedAt' |
    'docconReceivedAt' | 'docconDeliveredAt' | 'deadlineToSales' |
    'engineerPIC' | 'customerPIC' | 'docconPIC' | 'hasConflict' |
    'salesAcceptedAt' | 'salesFlagIssue' | 'salesIssueNote'
  >> = {},
): Partial<ReportDocument> {
  const base: Partial<ReportDocument> = {
    engineerSubStatus: 'draft',
    customerSubStatus: 'under_review',
    docconSubStatus: 'compiling',
    engineerStartedAt: null, engineerSubmittedAt: null,
    customerReceivedAt: null, customerApprovedAt: null,
    docconReceivedAt: null, docconDeliveredAt: null,
    deadlineToSales: null, hasConflict: false,
    engineerPIC: '', customerPIC: '', docconPIC: '',
    salesAcceptedAt: null, salesFlagIssue: false, salesIssueNote: '',
  }
  switch (status) {
    case 'DRAFT':
      return { ...base, currentPhase: 'engineer', engineerSubStatus: 'draft', ...overrides }
    case 'SUBMITTED':
      return { ...base, currentPhase: 'engineer', engineerSubStatus: 'submitted', ...overrides }
    case 'UNDER_REVIEW':
      return { ...base, currentPhase: 'customer', engineerSubStatus: 'submitted', customerSubStatus: 'under_review', ...overrides }
    case 'REVISION_REQUIRED':
      return { ...base, currentPhase: 'engineer', engineerSubStatus: 'draft', customerSubStatus: 'revisions_required', ...overrides }
    case 'APPROVED':
      return { ...base, currentPhase: 'doccon', engineerSubStatus: 'submitted', customerSubStatus: 'approved', docconSubStatus: 'delivered', ...overrides }
  }
}

const SEED_DOCUMENTS: ReportDocument[] = [
  // rp001 — Customer docs
  {
    id: 'rd001', projectId: 'rp001', docType: 'customer', period: '2025-01',
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
    ...phaseDefaults('APPROVED', {
      engineerPIC: 'Budi Santoso', customerPIC: 'Manager PGN', docconPIC: 'Sari Dewi',
      engineerStartedAt: '2025-01-15T08:00:00.000Z', engineerSubmittedAt: '2025-01-20T09:00:00.000Z',
      customerReceivedAt: '2025-01-21T09:00:00.000Z', customerApprovedAt: '2025-01-26T11:00:00.000Z',
      docconReceivedAt: '2025-01-26T13:00:00.000Z', docconDeliveredAt: '2025-01-28T10:00:00.000Z',
      deadlineToSales: '2025-01-31', docconSubStatus: 'delivered',
      salesFlagIssue: false, salesAcceptedAt: '2025-01-29T09:00:00.000Z', salesIssueNote: '',
    }),
  },
  {
    id: 'rd002', projectId: 'rp001', docType: 'customer', period: '2025-02',
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
    ...phaseDefaults('UNDER_REVIEW', {
      engineerPIC: 'Budi Santoso', customerPIC: 'Manager PGN', docconPIC: 'Sari Dewi',
      engineerStartedAt: '2025-02-15T08:00:00.000Z', engineerSubmittedAt: '2025-02-20T09:00:00.000Z',
      customerReceivedAt: '2025-02-21T09:00:00.000Z',
      deadlineToSales: '2025-02-28',
    }),
  },
  // rp001 — Vendor docs
  {
    id: 'rd003', projectId: 'rp001', docType: 'vendor', period: '2025-01',
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
    ...phaseDefaults('APPROVED', {
      engineerPIC: 'Sari Dewi', customerPIC: 'Finance PGN', docconPIC: 'Sari Dewi',
      engineerStartedAt: '2025-01-28T08:00:00.000Z', engineerSubmittedAt: '2025-01-30T09:00:00.000Z',
      customerReceivedAt: '2025-01-30T14:00:00.000Z', customerApprovedAt: '2025-01-31T10:00:00.000Z',
      docconReceivedAt: '2025-01-31T11:00:00.000Z', docconDeliveredAt: '2025-02-01T09:00:00.000Z',
      deadlineToSales: '2025-02-05', docconSubStatus: 'delivered',
      salesFlagIssue: false, salesAcceptedAt: '2025-02-02T10:00:00.000Z',
    }),
  },
  {
    id: 'rd004', projectId: 'rp001', docType: 'vendor', period: '2025-02',
    judul: 'Invoice Pembayaran Vendor IT Februari 2025',
    deskripsi: 'Tagihan vendor untuk jasa pemeliharaan jaringan bulan Februari.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a011', 'CREATE', 'Sari Dewi', '', '2025-02-28T08:00:00.000Z'),
    ],
    createdAt: '2025-02-28T08:00:00.000Z', updatedAt: '2025-02-28T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Sari Dewi',
    ...phaseDefaults('DRAFT', {
      engineerPIC: 'Sari Dewi', customerPIC: 'Finance PGN', docconPIC: 'Sari Dewi',
      engineerStartedAt: '2025-02-28T08:00:00.000Z',
      deadlineToSales: '2025-03-15',
    }),
  },
  // rp002 — Customer docs
  {
    id: 'rd005', projectId: 'rp002', docType: 'customer', period: '2025-02',
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
    ...phaseDefaults('REVISION_REQUIRED', {
      engineerPIC: 'Ahmad Fauzi', customerPIC: 'Manager Saka', docconPIC: 'Rina Kartika',
      engineerStartedAt: '2025-02-10T08:00:00.000Z', engineerSubmittedAt: '2025-02-15T09:00:00.000Z',
      customerReceivedAt: '2025-02-16T09:00:00.000Z',
      deadlineToSales: '2025-03-01',
    }),
  },
  // rp002 — Vendor docs
  {
    id: 'rd006', projectId: 'rp002', docType: 'vendor', period: '2025-02',
    judul: 'PO Security Equipment Batch 1',
    deskripsi: 'Purchase order untuk pengadaan peralatan keamanan batch pertama.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a015', 'CREATE', 'Rina Kartika', '', '2025-02-12T08:00:00.000Z'),
    ],
    createdAt: '2025-02-12T08:00:00.000Z', updatedAt: '2025-02-12T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Rina Kartika',
    ...phaseDefaults('DRAFT', {
      engineerPIC: 'Rina Kartika', customerPIC: 'Procurement Saka', docconPIC: 'Rina Kartika',
      engineerStartedAt: '2025-02-12T08:00:00.000Z',
      deadlineToSales: '2025-03-01',
    }),
  },
  // rp003 — Customer docs
  {
    id: 'rd007', projectId: 'rp003', docType: 'customer', period: '2025-03',
    judul: 'Laporan Operasional Data Center Maret 2025',
    deskripsi: 'Laporan operasional bulanan data center termasuk uptime dan incident report.',
    tanggalSubmit: null, tanggalFeedback: null,
    revision: 'R0', status: 'DRAFT',
    attachments: [],
    activities: [
      act('a016', 'CREATE', 'Lisa Andriani', '', '2025-03-05T08:00:00.000Z'),
    ],
    createdAt: '2025-03-05T08:00:00.000Z', updatedAt: '2025-03-05T08:00:00.000Z', createdByUserId: 'system', createdByName: 'Lisa Andriani',
    ...phaseDefaults('DRAFT', {
      engineerPIC: 'Lisa Andriani', customerPIC: 'Manager Gagas', docconPIC: 'Hendra Putra',
      engineerStartedAt: '2025-03-05T08:00:00.000Z',
      deadlineToSales: '2025-04-01',
    }),
  },
]

// ── Scenario docs for rp005 (period 2026-06) ─────────────────────────────────

// Skenario 1 — Overdue Engineer (DRAFT, deadline sudah lewat)
const RD_S1: ReportDocument = {
  id: 'rds1', projectId: 'rp005', docType: 'customer', period: '2026-06',
  judul: 'Executive Summary Juni 2026',
  deskripsi: 'OVERDUE: Laporan belum disubmit, sudah lewat deadline.',
  tanggalSubmit: null, tanggalFeedback: null, revision: 'R0', status: 'DRAFT',
  attachments: [], activities: [act('rds1a', 'CREATE', 'Engineer A', '', '2026-06-01T08:00:00.000Z')],
  createdAt: '2026-06-01T08:00:00.000Z', updatedAt: '2026-06-01T08:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Engineer A',
  ...phaseDefaults('DRAFT', {
    engineerPIC: 'Ahmad Fauzi', customerPIC: 'Manager PGN', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-01T08:00:00.000Z',
    deadlineToSales: '2026-06-20',
  }),
}

// Skenario 2 — Stuck Customer (UNDER_REVIEW 16 hari, deadline H-1)
const RD_S2: ReportDocument = {
  id: 'rds2', projectId: 'rp005', docType: 'customer', period: '2026-06',
  judul: 'Laporan SOR III Juni 2026',
  deskripsi: 'STUCK CUSTOMER: Sudah 16 hari di Under Review, deadline esok hari.',
  tanggalSubmit: '2026-06-08', tanggalFeedback: null, revision: 'R0', status: 'UNDER_REVIEW',
  attachments: [], activities: [
    act('rds2a', 'CREATE', 'Engineer B', '', '2026-06-05T08:00:00.000Z'),
    act('rds2b', 'SUBMIT', 'Engineer B', 'Submit laporan', '2026-06-08T09:00:00.000Z'),
    act('rds2c', 'START_REVIEW', 'Manager PGN', '', '2026-06-10T10:00:00.000Z'),
  ],
  createdAt: '2026-06-05T08:00:00.000Z', updatedAt: '2026-06-10T10:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Engineer B',
  ...phaseDefaults('UNDER_REVIEW', {
    engineerPIC: 'Budi Santoso', customerPIC: 'Manager PGN', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-05T08:00:00.000Z', engineerSubmittedAt: '2026-06-08T09:00:00.000Z',
    customerReceivedAt: '2026-06-10T10:00:00.000Z',
    deadlineToSales: '2026-06-27',
  }),
}

// Skenario 3 — Conflict (revisi setelah customer approval)
const RD_S3: ReportDocument = {
  id: 'rds3', projectId: 'rp005', docType: 'customer', period: '2026-06',
  judul: 'Laporan SOR II Juni 2026',
  deskripsi: 'CONFLICT: Sudah approved customer, lalu ada revisi data lapangan dari engineer.',
  tanggalSubmit: '2026-06-07', tanggalFeedback: '2026-06-12', revision: 'R1', status: 'REVISION_REQUIRED',
  attachments: [], activities: [
    act('rds3a', 'CREATE', 'Engineer C', '', '2026-06-03T08:00:00.000Z'),
    act('rds3b', 'SUBMIT', 'Engineer C', '', '2026-06-07T09:00:00.000Z'),
    act('rds3c', 'START_REVIEW', 'Manager PGN', '', '2026-06-09T10:00:00.000Z'),
    act('rds3d', 'APPROVE', 'Manager PGN', 'Disetujui', '2026-06-12T11:00:00.000Z'),
    act('rds3e', 'REQUEST_REVISION', 'Andika Wicaksono', 'Data lapangan tidak konsisten dengan laporan', '2026-06-15T09:00:00.000Z'),
  ],
  createdAt: '2026-06-03T08:00:00.000Z', updatedAt: '2026-06-15T09:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Engineer C',
  ...phaseDefaults('REVISION_REQUIRED', {
    engineerPIC: 'Ahmad Fauzi', customerPIC: 'Manager PGN', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-03T08:00:00.000Z', engineerSubmittedAt: '2026-06-07T09:00:00.000Z',
    customerReceivedAt: '2026-06-09T10:00:00.000Z', customerApprovedAt: '2026-06-12T11:00:00.000Z',
    deadlineToSales: '2026-06-30', hasConflict: true,
  }),
}

// Skenario 4 — Doccon Ready to Sales (H-4 dari deadline)
const RD_S4: ReportDocument = {
  id: 'rds4', projectId: 'rp005', docType: 'customer', period: '2026-06',
  judul: 'Laporan SOR I Juni 2026',
  deskripsi: 'READY TO SALES: Di tangan Doccon, siap dikirim ke Sales.',
  tanggalSubmit: '2026-06-04', tanggalFeedback: '2026-06-10', revision: 'R0', status: 'APPROVED',
  attachments: [], activities: [
    act('rds4a', 'CREATE', 'Engineer D', '', '2026-06-01T08:00:00.000Z'),
    act('rds4b', 'SUBMIT', 'Engineer D', '', '2026-06-04T09:00:00.000Z'),
    act('rds4c', 'START_REVIEW', 'Manager PGN', '', '2026-06-06T10:00:00.000Z'),
    act('rds4d', 'APPROVE', 'Manager PGN', 'OK', '2026-06-10T11:00:00.000Z'),
  ],
  createdAt: '2026-06-01T08:00:00.000Z', updatedAt: '2026-06-10T11:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Engineer D',
  ...phaseDefaults('APPROVED', {
    engineerPIC: 'Lisa Andriani', customerPIC: 'Manager PGN', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-01T08:00:00.000Z', engineerSubmittedAt: '2026-06-04T09:00:00.000Z',
    customerReceivedAt: '2026-06-06T10:00:00.000Z', customerApprovedAt: '2026-06-10T11:00:00.000Z',
    docconReceivedAt: '2026-06-10T13:00:00.000Z',
    currentPhase: 'doccon', docconSubStatus: 'ready_to_sales',
    deadlineToSales: '2026-06-30',
  }),
}

// Skenario 5 — Delivered Normal (salesFlagIssue = false)
const RD_S5: ReportDocument = {
  id: 'rds5', projectId: 'rp005', docType: 'vendor', period: '2026-06',
  judul: 'Invoice Vendor Juni 2026',
  deskripsi: 'DELIVERED: Sudah diterima Sales, tidak ada issue.',
  tanggalSubmit: '2026-06-05', tanggalFeedback: '2026-06-09', revision: 'R0', status: 'APPROVED',
  attachments: [], activities: [
    act('rds5a', 'CREATE', 'Sari Dewi', '', '2026-06-02T08:00:00.000Z'),
    act('rds5b', 'SUBMIT', 'Sari Dewi', '', '2026-06-05T09:00:00.000Z'),
    act('rds5c', 'START_REVIEW', 'Finance PGN', '', '2026-06-07T10:00:00.000Z'),
    act('rds5d', 'APPROVE', 'Finance PGN', 'OK', '2026-06-09T11:00:00.000Z'),
  ],
  createdAt: '2026-06-02T08:00:00.000Z', updatedAt: '2026-06-09T11:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Sari Dewi',
  ...phaseDefaults('APPROVED', {
    engineerPIC: 'Sari Dewi', customerPIC: 'Finance PGN', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-02T08:00:00.000Z', engineerSubmittedAt: '2026-06-05T09:00:00.000Z',
    customerReceivedAt: '2026-06-07T10:00:00.000Z', customerApprovedAt: '2026-06-09T11:00:00.000Z',
    docconReceivedAt: '2026-06-09T13:00:00.000Z', docconDeliveredAt: '2026-06-11T10:00:00.000Z',
    currentPhase: 'doccon', docconSubStatus: 'delivered',
    deadlineToSales: '2026-06-20',
    salesFlagIssue: false, salesAcceptedAt: '2026-06-12T10:00:00.000Z', salesIssueNote: '',
  }),
}

// Skenario 6 — Delivered Flagged by Sales
const RD_S6: ReportDocument = {
  id: 'rds6', projectId: 'rp005', docType: 'vendor', period: '2026-06',
  judul: 'BAP Pekerjaan OSM Juni 2026',
  deskripsi: 'FLAGGED BY SALES: Diterima Sales tapi ada issue dokumen.',
  tanggalSubmit: '2026-06-03', tanggalFeedback: '2026-06-06', revision: 'R0', status: 'APPROVED',
  attachments: [], activities: [
    act('rds6a', 'CREATE', 'Rina Kartika', '', '2026-06-01T08:00:00.000Z'),
    act('rds6b', 'SUBMIT', 'Rina Kartika', '', '2026-06-03T09:00:00.000Z'),
    act('rds6c', 'START_REVIEW', 'Manager Saka', '', '2026-06-05T10:00:00.000Z'),
    act('rds6d', 'APPROVE', 'Manager Saka', '', '2026-06-06T11:00:00.000Z'),
  ],
  createdAt: '2026-06-01T08:00:00.000Z', updatedAt: '2026-06-06T11:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Rina Kartika',
  ...phaseDefaults('APPROVED', {
    engineerPIC: 'Rina Kartika', customerPIC: 'Manager Saka', docconPIC: 'Andika Wicaksono',
    engineerStartedAt: '2026-06-01T08:00:00.000Z', engineerSubmittedAt: '2026-06-03T09:00:00.000Z',
    customerReceivedAt: '2026-06-05T10:00:00.000Z', customerApprovedAt: '2026-06-06T11:00:00.000Z',
    docconReceivedAt: '2026-06-06T13:00:00.000Z', docconDeliveredAt: '2026-06-08T10:00:00.000Z',
    currentPhase: 'doccon', docconSubStatus: 'delivered',
    deadlineToSales: '2026-06-15',
    salesFlagIssue: true, salesAcceptedAt: '2026-06-09T10:00:00.000Z',
    salesIssueNote: 'Nomor kontrak tidak sesuai dengan PO. Minta koreksi dari Doccon.',
  }),
}

// Skenario 7 — Doccon Compiling (menunggu input Engineer + Customer)
const RD_S7: ReportDocument = {
  id: 'rds7', projectId: 'rp005', docType: 'customer', period: '2026-06',
  judul: 'GLSM Operasional Juni 2026',
  deskripsi: 'COMPILING: Doccon menunggu engineer submit dan customer approve.',
  tanggalSubmit: null, tanggalFeedback: null, revision: 'R0', status: 'DRAFT',
  attachments: [], activities: [
    act('rds7a', 'CREATE', 'Engineer E', '', '2026-06-10T08:00:00.000Z'),
  ],
  createdAt: '2026-06-10T08:00:00.000Z', updatedAt: '2026-06-10T08:00:00.000Z',
  createdByUserId: 'system', createdByName: 'Engineer E',
  currentPhase: 'doccon' as DocPhase,
  engineerSubStatus: 'draft' as EngineerSubStatus,
  customerSubStatus: 'under_review' as CustomerSubStatus,
  docconSubStatus: 'compiling' as DocconSubStatus,
  engineerStartedAt: '2026-06-10T08:00:00.000Z',
  engineerSubmittedAt: null,
  customerReceivedAt: null,
  customerApprovedAt: null,
  docconReceivedAt: '2026-06-10T09:00:00.000Z',
  docconDeliveredAt: null,
  deadlineToSales: '2026-07-05',
  engineerPIC: 'Ahmad Fauzi', customerPIC: 'Manager PGN', docconPIC: 'Andika Wicaksono',
  hasConflict: false, salesFlagIssue: false, salesAcceptedAt: null, salesIssueNote: '',
}

const SEED_SCENARIOS: ReportDocument[] = [RD_S1, RD_S2, RD_S3, RD_S4, RD_S5, RD_S6, RD_S7]

// ── PS-024-00 seed documents (rp004) ─────────────────────────────────────────

const TITLES_PS024 = [
  'Executive Summary',
  'PJOPTGMS GLSM',
  'PJOPTGMS SOR III',
  'PJOPTGMS SOR II',
  'PJOPTGMS SOR I',
]

type ActDef = [string, ReportDocumentActivity['action'], string, string]

function ps024Doc(
  id: string,
  titleIdx: number,
  period: string,
  status: ReportDocumentStatus,
  revision: ReportDocumentRevision,
  tanggalSubmit: string | null,
  tanggalFeedback: string | null,
  actDefs: ActDef[],
): ReportDocument {
  return {
    ...phaseDefaults(status, {
      engineerPIC: 'Nyaklia', customerPIC: 'Manager PGN', docconPIC: 'Anita',
      engineerStartedAt: actDefs[0][3],
      engineerSubmittedAt: tanggalSubmit ? `${tanggalSubmit}T09:00:00.000Z` : null,
      customerReceivedAt: status === 'UNDER_REVIEW' || status === 'REVISION_REQUIRED' || status === 'APPROVED'
        ? actDefs.find(([, a]) => a === 'START_REVIEW')?.[3] ?? null : null,
      customerApprovedAt: status === 'APPROVED' ? tanggalFeedback ? `${tanggalFeedback}T11:00:00.000Z` : null : null,
      docconReceivedAt: status === 'APPROVED' ? tanggalFeedback ? `${tanggalFeedback}T13:00:00.000Z` : null : null,
      docconDeliveredAt: null,
      deadlineToSales: null,
    }),
    id,
    projectId: 'rp004',
    docType: 'customer',
    judul: TITLES_PS024[titleIdx],
    deskripsi: '',
    period,
    status, revision,
    tanggalSubmit,
    tanggalFeedback,
    attachments: [],
    activities: actDefs.map(([aid, action, byName, ts]) =>
      ({ id: aid, action, byUserId: 'system', byName, comment: '', timestamp: ts })
    ),
    createdAt: actDefs[0][3],
    updatedAt: actDefs[actDefs.length - 1][3],
    createdByUserId: 'system',
    createdByName: 'System',
  }
}

function makeDoc(
  id: string,
  projectId: string,
  docType: 'customer' | 'vendor',
  judul: string,
  period: string,
  status: ReportDocumentStatus,
  revision: ReportDocumentRevision,
  tanggalSubmit: string | null,
  tanggalFeedback: string | null,
  engineerPIC: string,
  docconPIC: string,
  actDefs: ActDef[],
): ReportDocument {
  return {
    ...phaseDefaults(status, {
      engineerPIC, customerPIC: 'Manager PGN', docconPIC,
      engineerStartedAt: actDefs[0][3],
      engineerSubmittedAt: tanggalSubmit ? `${tanggalSubmit}T09:00:00.000Z` : null,
      customerReceivedAt: (status === 'UNDER_REVIEW' || status === 'REVISION_REQUIRED' || status === 'APPROVED')
        ? actDefs.find(([, a]) => a === 'START_REVIEW')?.[3] ?? null : null,
      customerApprovedAt: status === 'APPROVED' && tanggalFeedback ? `${tanggalFeedback}T11:00:00.000Z` : null,
      docconReceivedAt: status === 'APPROVED' && tanggalFeedback ? `${tanggalFeedback}T13:00:00.000Z` : null,
      docconDeliveredAt: null, deadlineToSales: null,
    }),
    id, projectId, docType, judul, deskripsi: '', period, status, revision,
    tanggalSubmit, tanggalFeedback, attachments: [],
    activities: actDefs.map(([aid, action, byName, ts]) =>
      ({ id: aid, action, byUserId: 'system', byName, comment: '', timestamp: ts })
    ),
    createdAt: actDefs[0][3], updatedAt: actDefs[actDefs.length - 1][3],
    createdByUserId: 'system', createdByName: 'System',
  }
}

const SEED_DOCS_PS024: ReportDocument[] = [
  // ── Januari 2026 — semua APPROVED ──────────────────────────────────────────
  ...TITLES_PS024.map((_, i) => ps024Doc(
    `rd04j${i + 1}`, i, '2026-01', 'APPROVED', 'R0',
    '2026-01-20', '2026-01-26',
    [
      [`rda04j${i + 1}a`, 'CREATE',       'System',  '2026-01-05T08:00:00.000Z'],
      [`rda04j${i + 1}b`, 'SUBMIT',       'System',  '2026-01-20T09:00:00.000Z'],
      [`rda04j${i + 1}c`, 'START_REVIEW', 'Manager', '2026-01-21T10:00:00.000Z'],
      [`rda04j${i + 1}d`, 'APPROVE',      'Manager', '2026-01-26T11:00:00.000Z'],
    ],
  )),

  // ── Februari 2026 — campuran ────────────────────────────────────────────────
  ps024Doc(
    'rd04f1', 0, '2026-02', 'APPROVED', 'R1',
    '2026-02-18', '2026-02-22',
    [
      ['rda04f1a', 'CREATE',           'System',  '2026-02-05T08:00:00.000Z'],
      ['rda04f1b', 'SUBMIT',           'System',  '2026-02-18T09:00:00.000Z'],
      ['rda04f1c', 'START_REVIEW',     'Manager', '2026-02-19T10:00:00.000Z'],
      ['rda04f1d', 'REQUEST_REVISION', 'Manager', '2026-02-20T14:00:00.000Z'],
      ['rda04f1e', 'RESUBMIT',         'System',  '2026-02-21T09:00:00.000Z'],
      ['rda04f1f', 'START_REVIEW',     'Manager', '2026-02-21T14:00:00.000Z'],
      ['rda04f1g', 'APPROVE',          'Manager', '2026-02-22T11:00:00.000Z'],
    ],
  ),
  ps024Doc(
    'rd04f2', 1, '2026-02', 'UNDER_REVIEW', 'R0',
    '2026-02-20', null,
    [
      ['rda04f2a', 'CREATE',       'System',  '2026-02-05T08:00:00.000Z'],
      ['rda04f2b', 'SUBMIT',       'System',  '2026-02-20T09:00:00.000Z'],
      ['rda04f2c', 'START_REVIEW', 'Manager', '2026-02-21T10:00:00.000Z'],
    ],
  ),
  ps024Doc(
    'rd04f3', 2, '2026-02', 'REVISION_REQUIRED', 'R0',
    '2026-02-15', '2026-02-17',
    [
      ['rda04f3a', 'CREATE',           'System',  '2026-02-05T08:00:00.000Z'],
      ['rda04f3b', 'SUBMIT',           'System',  '2026-02-15T09:00:00.000Z'],
      ['rda04f3c', 'START_REVIEW',     'Manager', '2026-02-16T10:00:00.000Z'],
      ['rda04f3d', 'REQUEST_REVISION', 'Manager', '2026-02-17T14:00:00.000Z'],
    ],
  ),
  ps024Doc(
    'rd04f4', 3, '2026-02', 'SUBMITTED', 'R0',
    '2026-02-22', null,
    [
      ['rda04f4a', 'CREATE', 'System', '2026-02-05T08:00:00.000Z'],
      ['rda04f4b', 'SUBMIT', 'System', '2026-02-22T09:00:00.000Z'],
    ],
  ),
  ps024Doc(
    'rd04f5', 4, '2026-02', 'DRAFT', 'R0',
    null, null,
    [
      ['rda04f5a', 'CREATE', 'System', '2026-02-05T08:00:00.000Z'],
    ],
  ),

  // ── Maret 2026 — varied ────────────────────────────────────────────────────
  ps024Doc('rd04031', 0, '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-10', null, [
    ['rda04031a', 'CREATE', 'Nyaklia', '2026-03-05T08:00:00.000Z'],
    ['rda04031b', 'SUBMIT', 'Nyaklia', '2026-03-10T09:00:00.000Z'],
    ['rda04031c', 'START_REVIEW', 'Manager PGN', '2026-03-12T10:00:00.000Z'],
  ]),
  ps024Doc('rd04032', 1, '2026-03', 'REVISION_REQUIRED', 'R0', '2026-03-08', '2026-03-15', [
    ['rda04032a', 'CREATE', 'Nyaklia', '2026-03-05T08:00:00.000Z'],
    ['rda04032b', 'SUBMIT', 'Nyaklia', '2026-03-08T09:00:00.000Z'],
    ['rda04032c', 'START_REVIEW', 'Manager PGN', '2026-03-10T10:00:00.000Z'],
    ['rda04032d', 'REQUEST_REVISION', 'Manager PGN', '2026-03-15T14:00:00.000Z'],
  ]),
  ps024Doc('rd04033', 2, '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-12', null, [
    ['rda04033a', 'CREATE', 'Nyaklia', '2026-03-05T08:00:00.000Z'],
    ['rda04033b', 'SUBMIT', 'Nyaklia', '2026-03-12T09:00:00.000Z'],
    ['rda04033c', 'START_REVIEW', 'Manager PGN', '2026-03-14T10:00:00.000Z'],
  ]),
  ps024Doc('rd04034', 3, '2026-03', 'REVISION_REQUIRED', 'R0', '2026-03-07', '2026-03-16', [
    ['rda04034a', 'CREATE', 'Nyaklia', '2026-03-05T08:00:00.000Z'],
    ['rda04034b', 'SUBMIT', 'Nyaklia', '2026-03-07T09:00:00.000Z'],
    ['rda04034c', 'START_REVIEW', 'Manager PGN', '2026-03-10T10:00:00.000Z'],
    ['rda04034d', 'REQUEST_REVISION', 'Manager PGN', '2026-03-16T14:00:00.000Z'],
  ]),
  ps024Doc('rd04035', 4, '2026-03', 'DRAFT', 'R0', null, null, [
    ['rda04035a', 'CREATE', 'Nyaklia', '2026-03-05T08:00:00.000Z'],
  ]),

  // ── April 2026 ────────────────────────────────────────────────────────────
  ps024Doc('rd04041', 0, '2026-04', 'UNDER_REVIEW', 'R0', '2026-04-12', null, [
    ['rda04041a', 'CREATE', 'Nyaklia', '2026-04-05T08:00:00.000Z'],
    ['rda04041b', 'SUBMIT', 'Nyaklia', '2026-04-12T09:00:00.000Z'],
    ['rda04041c', 'START_REVIEW', 'Manager PGN', '2026-04-14T10:00:00.000Z'],
  ]),
  ps024Doc('rd04042', 1, '2026-04', 'DRAFT', 'R0', null, null, [
    ['rda04042a', 'CREATE', 'Nyaklia', '2026-04-05T08:00:00.000Z'],
  ]),
  ps024Doc('rd04043', 2, '2026-04', 'UNDER_REVIEW', 'R0', '2026-04-10', null, [
    ['rda04043a', 'CREATE', 'Nyaklia', '2026-04-05T08:00:00.000Z'],
    ['rda04043b', 'SUBMIT', 'Nyaklia', '2026-04-10T09:00:00.000Z'],
    ['rda04043c', 'START_REVIEW', 'Manager PGN', '2026-04-12T10:00:00.000Z'],
  ]),
  ps024Doc('rd04044', 3, '2026-04', 'DRAFT', 'R0', null, null, [
    ['rda04044a', 'CREATE', 'Nyaklia', '2026-04-05T08:00:00.000Z'],
  ]),
  ps024Doc('rd04045', 4, '2026-04', 'DRAFT', 'R0', null, null, [
    ['rda04045a', 'CREATE', 'Nyaklia', '2026-04-05T08:00:00.000Z'],
  ]),

  // ── Mei 2026 ──────────────────────────────────────────────────────────────
  ps024Doc('rd04051', 0, '2026-05', 'SUBMITTED', 'R0', '2026-05-20', null, [
    ['rda04051a', 'CREATE', 'Nyaklia', '2026-05-05T08:00:00.000Z'],
    ['rda04051b', 'SUBMIT', 'Nyaklia', '2026-05-20T09:00:00.000Z'],
  ]),
  ps024Doc('rd04052', 1, '2026-05', 'DRAFT', 'R0', null, null, [
    ['rda04052a', 'CREATE', 'Nyaklia', '2026-05-05T08:00:00.000Z'],
  ]),
  ps024Doc('rd04053', 2, '2026-05', 'DRAFT', 'R0', null, null, [
    ['rda04053a', 'CREATE', 'Nyaklia', '2026-05-05T08:00:00.000Z'],
  ]),
  ps024Doc('rd04054', 3, '2026-05', 'DRAFT', 'R0', null, null, [
    ['rda04054a', 'CREATE', 'Nyaklia', '2026-05-05T08:00:00.000Z'],
  ]),
  ps024Doc('rd04055', 4, '2026-05', 'DRAFT', 'R0', null, null, [
    ['rda04055a', 'CREATE', 'Nyaklia', '2026-05-05T08:00:00.000Z'],
  ]),

  // ── Juni 2026 — DRAFT ─────────────────────────────────────────────────────
  ...TITLES_PS024.map((_, i) => ps024Doc(
    `rd04061${i + 1}`, i, '2026-06', 'DRAFT', 'R0', null, null,
    [[`rda04061${i + 1}`, 'CREATE', 'Nyaklia', '2026-06-05T08:00:00.000Z']],
  )),
]

// ── PS-024-00 vendor docs ──────────────────────────────────────────────────────
const SEED_VENDOR_PS024: ReportDocument[] = [
  makeDoc('rv04j1', 'rp004', 'vendor', 'Vendor Report CSM Corporatama — Januari 2026', '2026-01', 'APPROVED', 'R0', '2026-01-28', '2026-01-31', 'Nyaklia', 'Anita', [
    ['rva04j1a', 'CREATE', 'Nyaklia', '2026-01-25T08:00:00.000Z'],
    ['rva04j1b', 'SUBMIT', 'Nyaklia', '2026-01-28T09:00:00.000Z'],
    ['rva04j1c', 'START_REVIEW', 'Anita', '2026-01-29T10:00:00.000Z'],
    ['rva04j1d', 'APPROVE', 'Anita', '2026-01-31T11:00:00.000Z'],
  ]),
  makeDoc('rv04f1', 'rp004', 'vendor', 'Vendor Report CSM Corporatama — Februari 2026', '2026-02', 'APPROVED', 'R0', '2026-02-25', '2026-02-28', 'Nyaklia', 'Anita', [
    ['rva04f1a', 'CREATE', 'Nyaklia', '2026-02-22T08:00:00.000Z'],
    ['rva04f1b', 'SUBMIT', 'Nyaklia', '2026-02-25T09:00:00.000Z'],
    ['rva04f1c', 'START_REVIEW', 'Anita', '2026-02-26T10:00:00.000Z'],
    ['rva04f1d', 'APPROVE', 'Anita', '2026-02-28T11:00:00.000Z'],
  ]),
  makeDoc('rv04m1', 'rp004', 'vendor', 'Vendor Report CSM Corporatama — Maret 2026', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-25', null, 'Nyaklia', 'Anita', [
    ['rva04m1a', 'CREATE', 'Nyaklia', '2026-03-22T08:00:00.000Z'],
    ['rva04m1b', 'SUBMIT', 'Nyaklia', '2026-03-25T09:00:00.000Z'],
    ['rva04m1c', 'START_REVIEW', 'Anita', '2026-03-27T10:00:00.000Z'],
  ]),
  makeDoc('rv04a1', 'rp004', 'vendor', 'Vendor Report CSM Corporatama — April 2026', '2026-04', 'SUBMITTED', 'R0', '2026-04-25', null, 'Nyaklia', 'Anita', [
    ['rva04a1a', 'CREATE', 'Nyaklia', '2026-04-22T08:00:00.000Z'],
    ['rva04a1b', 'SUBMIT', 'Nyaklia', '2026-04-25T09:00:00.000Z'],
  ]),
  makeDoc('rv04may1', 'rp004', 'vendor', 'Vendor Report CSM Corporatama — Mei 2026', '2026-05', 'DRAFT', 'R0', null, null, 'Nyaklia', 'Anita', [
    ['rva04may1a', 'CREATE', 'Nyaklia', '2026-05-22T08:00:00.000Z'],
  ]),
]

// ── PS-025-00 documents ───────────────────────────────────────────────────────
const SEED_DOCS_PS025: ReportDocument[] = [
  // Jan — all APPROVED
  makeDoc('rp25cj1', 'rp-p025', 'customer', 'SIMA Monthly Report', '2026-01', 'APPROVED', 'R0', '2026-01-20', '2026-01-26', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cj1a', 'CREATE', 'Budi Santoso', '2026-01-05T08:00:00.000Z'],
    ['rp25cj1b', 'SUBMIT', 'Budi Santoso', '2026-01-20T09:00:00.000Z'],
    ['rp25cj1c', 'START_REVIEW', 'Manager PGN', '2026-01-21T10:00:00.000Z'],
    ['rp25cj1d', 'APPROVE', 'Manager PGN', '2026-01-26T11:00:00.000Z'],
  ]),
  makeDoc('rp25cj2', 'rp-p025', 'customer', 'SIMA Performance Report', '2026-01', 'APPROVED', 'R0', '2026-01-20', '2026-01-26', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cj2a', 'CREATE', 'Budi Santoso', '2026-01-05T08:00:00.000Z'],
    ['rp25cj2b', 'SUBMIT', 'Budi Santoso', '2026-01-20T09:00:00.000Z'],
    ['rp25cj2c', 'START_REVIEW', 'Manager PGN', '2026-01-21T10:00:00.000Z'],
    ['rp25cj2d', 'APPROVE', 'Manager PGN', '2026-01-26T11:00:00.000Z'],
  ]),
  makeDoc('rp25cj3', 'rp-p025', 'customer', 'SIMA Issue Tracker', '2026-01', 'APPROVED', 'R0', '2026-01-22', '2026-01-28', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cj3a', 'CREATE', 'Budi Santoso', '2026-01-05T08:00:00.000Z'],
    ['rp25cj3b', 'SUBMIT', 'Budi Santoso', '2026-01-22T09:00:00.000Z'],
    ['rp25cj3c', 'START_REVIEW', 'Manager PGN', '2026-01-23T10:00:00.000Z'],
    ['rp25cj3d', 'APPROVE', 'Manager PGN', '2026-01-28T11:00:00.000Z'],
  ]),
  // Feb — APPROVED, APPROVED, REVISION_REQUIRED
  makeDoc('rp25cf1', 'rp-p025', 'customer', 'SIMA Monthly Report', '2026-02', 'APPROVED', 'R0', '2026-02-18', '2026-02-24', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cf1a', 'CREATE', 'Budi Santoso', '2026-02-05T08:00:00.000Z'],
    ['rp25cf1b', 'SUBMIT', 'Budi Santoso', '2026-02-18T09:00:00.000Z'],
    ['rp25cf1c', 'START_REVIEW', 'Manager PGN', '2026-02-20T10:00:00.000Z'],
    ['rp25cf1d', 'APPROVE', 'Manager PGN', '2026-02-24T11:00:00.000Z'],
  ]),
  makeDoc('rp25cf2', 'rp-p025', 'customer', 'SIMA Performance Report', '2026-02', 'APPROVED', 'R0', '2026-02-20', '2026-02-25', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cf2a', 'CREATE', 'Budi Santoso', '2026-02-05T08:00:00.000Z'],
    ['rp25cf2b', 'SUBMIT', 'Budi Santoso', '2026-02-20T09:00:00.000Z'],
    ['rp25cf2c', 'START_REVIEW', 'Manager PGN', '2026-02-21T10:00:00.000Z'],
    ['rp25cf2d', 'APPROVE', 'Manager PGN', '2026-02-25T11:00:00.000Z'],
  ]),
  makeDoc('rp25cf3', 'rp-p025', 'customer', 'SIMA Issue Tracker', '2026-02', 'REVISION_REQUIRED', 'R0', '2026-02-18', '2026-02-22', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cf3a', 'CREATE', 'Budi Santoso', '2026-02-05T08:00:00.000Z'],
    ['rp25cf3b', 'SUBMIT', 'Budi Santoso', '2026-02-18T09:00:00.000Z'],
    ['rp25cf3c', 'START_REVIEW', 'Manager PGN', '2026-02-19T10:00:00.000Z'],
    ['rp25cf3d', 'REQUEST_REVISION', 'Manager PGN', '2026-02-22T14:00:00.000Z'],
  ]),
  // Mar — UNDER_REVIEW, REVISION_REQUIRED, UNDER_REVIEW
  makeDoc('rp25cm1', 'rp-p025', 'customer', 'SIMA Monthly Report', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-12', null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25cm1a', 'CREATE', 'Budi Santoso', '2026-03-05T08:00:00.000Z'],
    ['rp25cm1b', 'SUBMIT', 'Budi Santoso', '2026-03-12T09:00:00.000Z'],
    ['rp25cm1c', 'START_REVIEW', 'Manager PGN', '2026-03-14T10:00:00.000Z'],
  ]),
  makeDoc('rp25cm2', 'rp-p025', 'customer', 'SIMA Performance Report', '2026-03', 'REVISION_REQUIRED', 'R0', '2026-03-10', '2026-03-16', 'Budi Santoso', 'Rini Astuti', [
    ['rp25cm2a', 'CREATE', 'Budi Santoso', '2026-03-05T08:00:00.000Z'],
    ['rp25cm2b', 'SUBMIT', 'Budi Santoso', '2026-03-10T09:00:00.000Z'],
    ['rp25cm2c', 'START_REVIEW', 'Manager PGN', '2026-03-12T10:00:00.000Z'],
    ['rp25cm2d', 'REQUEST_REVISION', 'Manager PGN', '2026-03-16T14:00:00.000Z'],
  ]),
  makeDoc('rp25cm3', 'rp-p025', 'customer', 'SIMA Issue Tracker', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-14', null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25cm3a', 'CREATE', 'Budi Santoso', '2026-03-05T08:00:00.000Z'],
    ['rp25cm3b', 'SUBMIT', 'Budi Santoso', '2026-03-14T09:00:00.000Z'],
    ['rp25cm3c', 'START_REVIEW', 'Manager PGN', '2026-03-16T10:00:00.000Z'],
  ]),
  // Apr — UNDER_REVIEW, DRAFT, DRAFT
  makeDoc('rp25ca1', 'rp-p025', 'customer', 'SIMA Monthly Report', '2026-04', 'UNDER_REVIEW', 'R0', '2026-04-12', null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25ca1a', 'CREATE', 'Budi Santoso', '2026-04-05T08:00:00.000Z'],
    ['rp25ca1b', 'SUBMIT', 'Budi Santoso', '2026-04-12T09:00:00.000Z'],
    ['rp25ca1c', 'START_REVIEW', 'Manager PGN', '2026-04-14T10:00:00.000Z'],
  ]),
  makeDoc('rp25ca2', 'rp-p025', 'customer', 'SIMA Performance Report', '2026-04', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25ca2a', 'CREATE', 'Budi Santoso', '2026-04-05T08:00:00.000Z'],
  ]),
  makeDoc('rp25ca3', 'rp-p025', 'customer', 'SIMA Issue Tracker', '2026-04', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25ca3a', 'CREATE', 'Budi Santoso', '2026-04-05T08:00:00.000Z'],
  ]),
  // May — SUBMITTED, DRAFT, DRAFT
  makeDoc('rp25cmay1', 'rp-p025', 'customer', 'SIMA Monthly Report', '2026-05', 'SUBMITTED', 'R0', '2026-05-20', null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25cmay1a', 'CREATE', 'Budi Santoso', '2026-05-05T08:00:00.000Z'],
    ['rp25cmay1b', 'SUBMIT', 'Budi Santoso', '2026-05-20T09:00:00.000Z'],
  ]),
  makeDoc('rp25cmay2', 'rp-p025', 'customer', 'SIMA Performance Report', '2026-05', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25cmay2a', 'CREATE', 'Budi Santoso', '2026-05-05T08:00:00.000Z'],
  ]),
  makeDoc('rp25cmay3', 'rp-p025', 'customer', 'SIMA Issue Tracker', '2026-05', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25cmay3a', 'CREATE', 'Budi Santoso', '2026-05-05T08:00:00.000Z'],
  ]),
  // Vendor docs
  makeDoc('rp25vj1', 'rp-p025', 'vendor', 'Laporan Vendor CSM Corporatama (SIMA) — Januari', '2026-01', 'APPROVED', 'R0', '2026-01-28', '2026-01-31', 'Budi Santoso', 'Rini Astuti', [
    ['rp25vj1a', 'CREATE', 'Budi Santoso', '2026-01-25T08:00:00.000Z'],
    ['rp25vj1b', 'SUBMIT', 'Budi Santoso', '2026-01-28T09:00:00.000Z'],
    ['rp25vj1c', 'START_REVIEW', 'Rini Astuti', '2026-01-29T10:00:00.000Z'],
    ['rp25vj1d', 'APPROVE', 'Rini Astuti', '2026-01-31T11:00:00.000Z'],
  ]),
  makeDoc('rp25vf1', 'rp-p025', 'vendor', 'Laporan Vendor CSM Corporatama (SIMA) — Februari', '2026-02', 'APPROVED', 'R0', '2026-02-25', '2026-02-28', 'Budi Santoso', 'Rini Astuti', [
    ['rp25vf1a', 'CREATE', 'Budi Santoso', '2026-02-22T08:00:00.000Z'],
    ['rp25vf1b', 'SUBMIT', 'Budi Santoso', '2026-02-25T09:00:00.000Z'],
    ['rp25vf1c', 'START_REVIEW', 'Rini Astuti', '2026-02-26T10:00:00.000Z'],
    ['rp25vf1d', 'APPROVE', 'Rini Astuti', '2026-02-28T11:00:00.000Z'],
  ]),
  makeDoc('rp25vm1', 'rp-p025', 'vendor', 'Laporan Vendor CSM Corporatama (SIMA) — Maret', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-25', null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25vm1a', 'CREATE', 'Budi Santoso', '2026-03-22T08:00:00.000Z'],
    ['rp25vm1b', 'SUBMIT', 'Budi Santoso', '2026-03-25T09:00:00.000Z'],
    ['rp25vm1c', 'START_REVIEW', 'Rini Astuti', '2026-03-27T10:00:00.000Z'],
  ]),
  makeDoc('rp25va1', 'rp-p025', 'vendor', 'Laporan Vendor CSM Corporatama (SIMA) — April', '2026-04', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25va1a', 'CREATE', 'Budi Santoso', '2026-04-22T08:00:00.000Z'],
  ]),
  makeDoc('rp25vmay1', 'rp-p025', 'vendor', 'Laporan Vendor CSM Corporatama (SIMA) — Mei', '2026-05', 'DRAFT', 'R0', null, null, 'Budi Santoso', 'Rini Astuti', [
    ['rp25vmay1a', 'CREATE', 'Budi Santoso', '2026-05-22T08:00:00.000Z'],
  ]),
]

// ── PS-026-00 documents ───────────────────────────────────────────────────────
const SEED_DOCS_PS026: ReportDocument[] = [
  // Jan — all APPROVED
  makeDoc('rp26cj1', 'rp-p026', 'customer', 'EUS Service Report', '2026-01', 'APPROVED', 'R0', '2026-01-20', '2026-01-26', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cj1a', 'CREATE', 'Dimas Pratama', '2026-01-05T08:00:00.000Z'],
    ['rp26cj1b', 'SUBMIT', 'Dimas Pratama', '2026-01-20T09:00:00.000Z'],
    ['rp26cj1c', 'START_REVIEW', 'Manager PGN', '2026-01-21T10:00:00.000Z'],
    ['rp26cj1d', 'APPROVE', 'Manager PGN', '2026-01-26T11:00:00.000Z'],
  ]),
  makeDoc('rp26cj2', 'rp-p026', 'customer', 'EUS Ticket Summary', '2026-01', 'APPROVED', 'R0', '2026-01-20', '2026-01-26', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cj2a', 'CREATE', 'Dimas Pratama', '2026-01-05T08:00:00.000Z'],
    ['rp26cj2b', 'SUBMIT', 'Dimas Pratama', '2026-01-20T09:00:00.000Z'],
    ['rp26cj2c', 'START_REVIEW', 'Manager PGN', '2026-01-21T10:00:00.000Z'],
    ['rp26cj2d', 'APPROVE', 'Manager PGN', '2026-01-26T11:00:00.000Z'],
  ]),
  makeDoc('rp26cj3', 'rp-p026', 'customer', 'EUS Asset Inventory', '2026-01', 'APPROVED', 'R0', '2026-01-22', '2026-01-28', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cj3a', 'CREATE', 'Dimas Pratama', '2026-01-05T08:00:00.000Z'],
    ['rp26cj3b', 'SUBMIT', 'Dimas Pratama', '2026-01-22T09:00:00.000Z'],
    ['rp26cj3c', 'START_REVIEW', 'Manager PGN', '2026-01-23T10:00:00.000Z'],
    ['rp26cj3d', 'APPROVE', 'Manager PGN', '2026-01-28T11:00:00.000Z'],
  ]),
  makeDoc('rp26cj4', 'rp-p026', 'customer', 'EUS SLA Achievement', '2026-01', 'APPROVED', 'R0', '2026-01-22', '2026-01-28', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cj4a', 'CREATE', 'Dimas Pratama', '2026-01-05T08:00:00.000Z'],
    ['rp26cj4b', 'SUBMIT', 'Dimas Pratama', '2026-01-22T09:00:00.000Z'],
    ['rp26cj4c', 'START_REVIEW', 'Manager PGN', '2026-01-23T10:00:00.000Z'],
    ['rp26cj4d', 'APPROVE', 'Manager PGN', '2026-01-28T11:00:00.000Z'],
  ]),
  // Feb — APPROVED, APPROVED, UNDER_REVIEW, REVISION_REQUIRED
  makeDoc('rp26cf1', 'rp-p026', 'customer', 'EUS Service Report', '2026-02', 'APPROVED', 'R0', '2026-02-18', '2026-02-24', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cf1a', 'CREATE', 'Dimas Pratama', '2026-02-05T08:00:00.000Z'],
    ['rp26cf1b', 'SUBMIT', 'Dimas Pratama', '2026-02-18T09:00:00.000Z'],
    ['rp26cf1c', 'START_REVIEW', 'Manager PGN', '2026-02-20T10:00:00.000Z'],
    ['rp26cf1d', 'APPROVE', 'Manager PGN', '2026-02-24T11:00:00.000Z'],
  ]),
  makeDoc('rp26cf2', 'rp-p026', 'customer', 'EUS Ticket Summary', '2026-02', 'APPROVED', 'R0', '2026-02-20', '2026-02-25', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cf2a', 'CREATE', 'Dimas Pratama', '2026-02-05T08:00:00.000Z'],
    ['rp26cf2b', 'SUBMIT', 'Dimas Pratama', '2026-02-20T09:00:00.000Z'],
    ['rp26cf2c', 'START_REVIEW', 'Manager PGN', '2026-02-21T10:00:00.000Z'],
    ['rp26cf2d', 'APPROVE', 'Manager PGN', '2026-02-25T11:00:00.000Z'],
  ]),
  makeDoc('rp26cf3', 'rp-p026', 'customer', 'EUS Asset Inventory', '2026-02', 'UNDER_REVIEW', 'R0', '2026-02-18', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cf3a', 'CREATE', 'Dimas Pratama', '2026-02-05T08:00:00.000Z'],
    ['rp26cf3b', 'SUBMIT', 'Dimas Pratama', '2026-02-18T09:00:00.000Z'],
    ['rp26cf3c', 'START_REVIEW', 'Manager PGN', '2026-02-21T10:00:00.000Z'],
  ]),
  makeDoc('rp26cf4', 'rp-p026', 'customer', 'EUS SLA Achievement', '2026-02', 'REVISION_REQUIRED', 'R0', '2026-02-16', '2026-02-21', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cf4a', 'CREATE', 'Dimas Pratama', '2026-02-05T08:00:00.000Z'],
    ['rp26cf4b', 'SUBMIT', 'Dimas Pratama', '2026-02-16T09:00:00.000Z'],
    ['rp26cf4c', 'START_REVIEW', 'Manager PGN', '2026-02-18T10:00:00.000Z'],
    ['rp26cf4d', 'REQUEST_REVISION', 'Manager PGN', '2026-02-21T14:00:00.000Z'],
  ]),
  // Mar — UNDER_REVIEW, UNDER_REVIEW, REVISION_REQUIRED, DRAFT
  makeDoc('rp26cm1', 'rp-p026', 'customer', 'EUS Service Report', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-12', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cm1a', 'CREATE', 'Dimas Pratama', '2026-03-05T08:00:00.000Z'],
    ['rp26cm1b', 'SUBMIT', 'Dimas Pratama', '2026-03-12T09:00:00.000Z'],
    ['rp26cm1c', 'START_REVIEW', 'Manager PGN', '2026-03-14T10:00:00.000Z'],
  ]),
  makeDoc('rp26cm2', 'rp-p026', 'customer', 'EUS Ticket Summary', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-14', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cm2a', 'CREATE', 'Dimas Pratama', '2026-03-05T08:00:00.000Z'],
    ['rp26cm2b', 'SUBMIT', 'Dimas Pratama', '2026-03-14T09:00:00.000Z'],
    ['rp26cm2c', 'START_REVIEW', 'Manager PGN', '2026-03-16T10:00:00.000Z'],
  ]),
  makeDoc('rp26cm3', 'rp-p026', 'customer', 'EUS Asset Inventory', '2026-03', 'REVISION_REQUIRED', 'R0', '2026-03-10', '2026-03-18', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cm3a', 'CREATE', 'Dimas Pratama', '2026-03-05T08:00:00.000Z'],
    ['rp26cm3b', 'SUBMIT', 'Dimas Pratama', '2026-03-10T09:00:00.000Z'],
    ['rp26cm3c', 'START_REVIEW', 'Manager PGN', '2026-03-12T10:00:00.000Z'],
    ['rp26cm3d', 'REQUEST_REVISION', 'Manager PGN', '2026-03-18T14:00:00.000Z'],
  ]),
  makeDoc('rp26cm4', 'rp-p026', 'customer', 'EUS SLA Achievement', '2026-03', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cm4a', 'CREATE', 'Dimas Pratama', '2026-03-05T08:00:00.000Z'],
  ]),
  // Apr — UNDER_REVIEW, DRAFT, DRAFT, DRAFT
  makeDoc('rp26ca1', 'rp-p026', 'customer', 'EUS Service Report', '2026-04', 'UNDER_REVIEW', 'R0', '2026-04-12', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26ca1a', 'CREATE', 'Dimas Pratama', '2026-04-05T08:00:00.000Z'],
    ['rp26ca1b', 'SUBMIT', 'Dimas Pratama', '2026-04-12T09:00:00.000Z'],
    ['rp26ca1c', 'START_REVIEW', 'Manager PGN', '2026-04-14T10:00:00.000Z'],
  ]),
  makeDoc('rp26ca2', 'rp-p026', 'customer', 'EUS Ticket Summary', '2026-04', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26ca2a', 'CREATE', 'Dimas Pratama', '2026-04-05T08:00:00.000Z'],
  ]),
  makeDoc('rp26ca3', 'rp-p026', 'customer', 'EUS Asset Inventory', '2026-04', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26ca3a', 'CREATE', 'Dimas Pratama', '2026-04-05T08:00:00.000Z'],
  ]),
  makeDoc('rp26ca4', 'rp-p026', 'customer', 'EUS SLA Achievement', '2026-04', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26ca4a', 'CREATE', 'Dimas Pratama', '2026-04-05T08:00:00.000Z'],
  ]),
  // May — SUBMITTED, DRAFT, DRAFT, DRAFT
  makeDoc('rp26cmay1', 'rp-p026', 'customer', 'EUS Service Report', '2026-05', 'SUBMITTED', 'R0', '2026-05-20', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cmay1a', 'CREATE', 'Dimas Pratama', '2026-05-05T08:00:00.000Z'],
    ['rp26cmay1b', 'SUBMIT', 'Dimas Pratama', '2026-05-20T09:00:00.000Z'],
  ]),
  makeDoc('rp26cmay2', 'rp-p026', 'customer', 'EUS Ticket Summary', '2026-05', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cmay2a', 'CREATE', 'Dimas Pratama', '2026-05-05T08:00:00.000Z'],
  ]),
  makeDoc('rp26cmay3', 'rp-p026', 'customer', 'EUS Asset Inventory', '2026-05', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cmay3a', 'CREATE', 'Dimas Pratama', '2026-05-05T08:00:00.000Z'],
  ]),
  makeDoc('rp26cmay4', 'rp-p026', 'customer', 'EUS SLA Achievement', '2026-05', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26cmay4a', 'CREATE', 'Dimas Pratama', '2026-05-05T08:00:00.000Z'],
  ]),
  // Vendor docs — PT Indo Service Pratama
  makeDoc('rp26vj1', 'rp-p026', 'vendor', 'Laporan Vendor PT Indo Service Pratama — Januari', '2026-01', 'APPROVED', 'R0', '2026-01-28', '2026-01-31', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vj1a', 'CREATE', 'Dimas Pratama', '2026-01-25T08:00:00.000Z'],
    ['rp26vj1b', 'SUBMIT', 'Dimas Pratama', '2026-01-28T09:00:00.000Z'],
    ['rp26vj1c', 'START_REVIEW', 'Sari Wijaya', '2026-01-29T10:00:00.000Z'],
    ['rp26vj1d', 'APPROVE', 'Sari Wijaya', '2026-01-31T11:00:00.000Z'],
  ]),
  makeDoc('rp26vf1', 'rp-p026', 'vendor', 'Laporan Vendor PT Indo Service Pratama — Februari', '2026-02', 'APPROVED', 'R0', '2026-02-25', '2026-02-28', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vf1a', 'CREATE', 'Dimas Pratama', '2026-02-22T08:00:00.000Z'],
    ['rp26vf1b', 'SUBMIT', 'Dimas Pratama', '2026-02-25T09:00:00.000Z'],
    ['rp26vf1c', 'START_REVIEW', 'Sari Wijaya', '2026-02-26T10:00:00.000Z'],
    ['rp26vf1d', 'APPROVE', 'Sari Wijaya', '2026-02-28T11:00:00.000Z'],
  ]),
  makeDoc('rp26vm1', 'rp-p026', 'vendor', 'Laporan Vendor PT Indo Service Pratama — Maret', '2026-03', 'UNDER_REVIEW', 'R0', '2026-03-25', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vm1a', 'CREATE', 'Dimas Pratama', '2026-03-22T08:00:00.000Z'],
    ['rp26vm1b', 'SUBMIT', 'Dimas Pratama', '2026-03-25T09:00:00.000Z'],
    ['rp26vm1c', 'START_REVIEW', 'Sari Wijaya', '2026-03-27T10:00:00.000Z'],
  ]),
  makeDoc('rp26va1', 'rp-p026', 'vendor', 'Laporan Vendor PT Indo Service Pratama — April', '2026-04', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26va1a', 'CREATE', 'Dimas Pratama', '2026-04-22T08:00:00.000Z'],
  ]),
  makeDoc('rp26vmay1', 'rp-p026', 'vendor', 'Laporan Vendor PT Indo Service Pratama — Mei', '2026-05', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vmay1a', 'CREATE', 'Dimas Pratama', '2026-05-22T08:00:00.000Z'],
  ]),
  // Vendor docs — PT Mitra IT Nusantara
  makeDoc('rp26vj2', 'rp-p026', 'vendor', 'Laporan Vendor PT Mitra IT Nusantara — Januari', '2026-01', 'APPROVED', 'R0', '2026-01-28', '2026-01-31', 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vj2a', 'CREATE', 'Dimas Pratama', '2026-01-25T08:00:00.000Z'],
    ['rp26vj2b', 'SUBMIT', 'Dimas Pratama', '2026-01-28T09:00:00.000Z'],
    ['rp26vj2c', 'START_REVIEW', 'Sari Wijaya', '2026-01-29T10:00:00.000Z'],
    ['rp26vj2d', 'APPROVE', 'Sari Wijaya', '2026-01-31T11:00:00.000Z'],
  ]),
  makeDoc('rp26vf2', 'rp-p026', 'vendor', 'Laporan Vendor PT Mitra IT Nusantara — Februari', '2026-02', 'UNDER_REVIEW', 'R0', '2026-02-25', null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vf2a', 'CREATE', 'Dimas Pratama', '2026-02-22T08:00:00.000Z'],
    ['rp26vf2b', 'SUBMIT', 'Dimas Pratama', '2026-02-25T09:00:00.000Z'],
    ['rp26vf2c', 'START_REVIEW', 'Sari Wijaya', '2026-02-27T10:00:00.000Z'],
  ]),
  makeDoc('rp26vm2', 'rp-p026', 'vendor', 'Laporan Vendor PT Mitra IT Nusantara — Maret', '2026-03', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vm2a', 'CREATE', 'Dimas Pratama', '2026-03-22T08:00:00.000Z'],
  ]),
  makeDoc('rp26va2', 'rp-p026', 'vendor', 'Laporan Vendor PT Mitra IT Nusantara — April', '2026-04', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26va2a', 'CREATE', 'Dimas Pratama', '2026-04-22T08:00:00.000Z'],
  ]),
  makeDoc('rp26vmay2', 'rp-p026', 'vendor', 'Laporan Vendor PT Mitra IT Nusantara — Mei', '2026-05', 'DRAFT', 'R0', null, null, 'Dimas Pratama', 'Sari Wijaya', [
    ['rp26vmay2a', 'CREATE', 'Dimas Pratama', '2026-05-22T08:00:00.000Z'],
  ]),
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
  // rp004 (PS-024-00) — billing docs
  mkBilling('bd021', 'rp004', 'BAP',     'Nyaklia', '2026-01-31', '2026-01-30', 'COMPLETED',    'BAP Jan 2026 ditandatangani', '2025-12-01T08:00:00.000Z'),
  mkBilling('bd022', 'rp004', 'Invoice', 'Anita',   '2026-02-15', null,          'SUBMITTED',    'Invoice Jan sudah dikirim ke customer', '2025-12-01T08:00:00.000Z'),
  mkBilling('bd023', 'rp004', 'BAST',    'Anita',   '2026-06-30', null,          'BELUM_DIBUAT', '', '2025-12-01T08:00:00.000Z'),
  mkBilling('bd024', 'rp004', 'BAPP',    'Anita',   '2026-01-31', '2026-01-30', 'COMPLETED',    'BAPP Jan 2026 sudah diarsipkan', '2025-12-01T08:00:00.000Z'),
  mkBilling('bd025', 'rp004', 'BAST',    'Anita',   '2026-01-31', '2026-01-30', 'COMPLETED',    'BAST Jan 2026 sudah ditandatangani', '2025-12-01T08:00:00.000Z'),
  mkBilling('bd026', 'rp004', 'BAP',     'Nyaklia', '2026-02-28', null,          'SUBMITTED',    'BAP Feb 2026 menunggu tanda tangan', '2026-02-01T08:00:00.000Z'),
  // rp-p025 (PS-025-00)
  mkBilling('bd031', 'rp-p025', 'BAP',   'Budi Santoso', '2026-01-31', '2026-01-30', 'COMPLETED', 'BAP Jan 2026 selesai', '2026-01-01T08:00:00.000Z'),
  mkBilling('bd032', 'rp-p025', 'BAPP',  'Rini Astuti',  '2026-02-15', null,          'SUBMITTED', 'BAPP Jan 2026 menunggu approval', '2026-01-01T08:00:00.000Z'),
  // rp-p026 (PS-026-00)
  mkBilling('bd041', 'rp-p026', 'BAP',   'Dimas Pratama', '2026-01-31', null, 'DRAFT', 'BAP Jan 2026 dalam proses', '2026-01-01T08:00:00.000Z'),
  mkBilling('bd042', 'rp-p026', 'BAPP',  'Sari Wijaya',   '2026-02-15', null, 'DRAFT', 'BAPP Jan 2026 belum dibuat', '2026-01-01T08:00:00.000Z'),
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
  endProjectAt: (id: string, selectedPeriod: string) => void
  excludeProjectMonth: (id: string, month: string) => void
  getProjectById: (id: string) => ReportProject | undefined

  // Report document CRUD
  addDocument: (data: Omit<ReportDocument, 'id' | 'status' | 'revision' | 'activities' | 'createdAt' | 'updatedAt' | 'tanggalSubmit' | 'tanggalFeedback'>) => ReportDocument
  updateDocument: (id: string, patch: Partial<Omit<ReportDocument, 'id' | 'activities' | 'createdAt'>>) => void
  deleteDocument: (id: string) => void
  getDocumentById: (id: string) => ReportDocument | undefined
  getProjectDocuments: (projectId: string, docType?: 'customer' | 'vendor', period?: string) => ReportDocument[]

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

  // Phase management (E2E pipeline)
  advanceDocconPhase: (id: string, subStatus: DocconSubStatus) => void
  recordSalesFeedback: (id: string, flagIssue: boolean, note: string) => void
  docconResubmitToSales: (id: string) => void
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
      documents: [...SEED_DOCUMENTS, ...SEED_DOCS_PS024, ...SEED_VENDOR_PS024, ...SEED_DOCS_PS025, ...SEED_DOCS_PS026, ...SEED_SCENARIOS],
      billingDocuments: SEED_BILLING,

      // ── Projects ──
      addProject: (data) => {
        const now = nowIso()
        const record: ReportProject = { excludedMonths: [], ...data, id: uid('rp'), createdAt: now, updatedAt: now }
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
        useLogStore.getState().addLog({ type: 'monitoring_report_deleted', message: `Project laporan dihapus permanen`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      endProjectAt: (id, selectedPeriod) => {
        const kontrakAkhir = prevReportMonth(selectedPeriod)
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, kontrakAkhir, updatedAt: nowIso() } : p) }))
        useLogStore.getState().addLog({ type: 'monitoring_report_edited', message: `Project laporan dikeluarkan dari periode ${selectedPeriod} ke atas (kontrak berakhir ${kontrakAkhir})`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      excludeProjectMonth: (id, month) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, excludedMonths: [...(p.excludedMonths ?? []).filter((m) => m !== month), month], updatedAt: nowIso() }
              : p
          ),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_edited', message: `Project laporan dikecualikan dari periode ${month}`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      getProjectById: (id) => get().projects.find((p) => p.id === id),

      // ── Report Documents ──
      addDocument: (data) => {
        const now = nowIso()
        const doc: ReportDocument = {
          ...phaseDefaults('DRAFT', { engineerStartedAt: now }),
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
      getProjectDocuments: (projectId, docType, period) =>
        get().documents.filter((d) =>
          d.projectId === projectId &&
          (docType ? d.docType === docType : true) &&
          (period ? d.period === period : true)
        ),

      // ── Report Document Workflow ──
      submitDocument: (id, byUserId, byName, comment = '') => {
        const activity = makeActivity('SUBMIT', byUserId, byName, comment)
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'SUBMITTED' as ReportDocumentStatus,
            tanggalSubmit: now,
            currentPhase: 'engineer' as DocPhase,
            engineerSubStatus: 'submitted' as EngineerSubStatus,
            engineerSubmittedAt: now,
            activities: [...d.activities, activity], updatedAt: now,
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_submitted', message: `Dokumen disubmit`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      startReview: (id, byUserId, byName) => {
        const activity = makeActivity('START_REVIEW', byUserId, byName, '')
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d, status: 'UNDER_REVIEW' as ReportDocumentStatus,
            currentPhase: 'customer' as DocPhase,
            customerSubStatus: 'under_review' as CustomerSubStatus,
            customerReceivedAt: d.customerReceivedAt ?? now,
            activities: [...d.activities, activity], updatedAt: now,
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
            currentPhase: 'doccon' as DocPhase,
            customerSubStatus: 'approved' as CustomerSubStatus,
            customerApprovedAt: now,
            docconSubStatus: 'compiling' as DocconSubStatus,
            docconReceivedAt: now,
            activities: [...d.activities, activity], updatedAt: now,
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_report_approved', message: `Dokumen disetujui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      requestDocumentRevision: (id, byUserId, byName, comment) => {
        const activity = makeActivity('REQUEST_REVISION', byUserId, byName, comment)
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => {
            if (d.id !== id) return d
            const wasApproved = d.status === 'APPROVED' || d.customerApprovedAt != null
            return {
              ...d, status: 'REVISION_REQUIRED' as ReportDocumentStatus,
              tanggalFeedback: now,
              currentPhase: 'engineer' as DocPhase,
              engineerSubStatus: 'draft' as EngineerSubStatus,
              customerSubStatus: 'revisions_required' as CustomerSubStatus,
              hasConflict: wasApproved ? true : (d.hasConflict ?? false),
              activities: [...d.activities, activity], updatedAt: now,
            }
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

      // ── Phase management ──
      advanceDocconPhase: (id, subStatus) => {
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => {
            if (d.id !== id) return d
            return {
              ...d,
              currentPhase: 'doccon' as DocPhase,
              docconSubStatus: subStatus,
              docconDeliveredAt: subStatus === 'delivered' ? (d.docconDeliveredAt ?? now) : d.docconDeliveredAt,
              updatedAt: now,
            }
          }),
        }))
      },
      recordSalesFeedback: (id, flagIssue, note) => {
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d,
            salesFlagIssue: flagIssue,
            salesIssueNote: note,
            salesAcceptedAt: d.salesAcceptedAt ?? now,
            updatedAt: now,
          }),
        }))
      },

      docconResubmitToSales: (id) => {
        const now = nowIso()
        set((s) => ({
          documents: s.documents.map((d) => d.id !== id ? d : {
            ...d,
            salesFlagIssue: false,
            salesIssueNote: '',
            salesAcceptedAt: null,
            docconDeliveredAt: now,
            updatedAt: now,
          }),
        }))
      },

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

        // Migrate old docs: fix status values + add missing period field
        const migratedDocs = (p.documents ?? []).map((d) => ({
          ...d,
          status: LEGACY_STATUS_MAP[(d.status as string)] ?? 'DRAFT',
          tanggalSubmit: ((d as unknown) as Record<string, unknown>).tanggalSubmit as string | null ?? null,
          tanggalFeedback: ((d as unknown) as Record<string, unknown>).tanggalFeedback as string | null ?? null,
          period: ((d as unknown) as Record<string, unknown>).period as string ?? '2025-01',
        }))

        // Inject seed billing docs not yet in localStorage (by ID)
        const persistedBilling = p.billingDocuments ?? []
        const persistedBillingIds = new Set(persistedBilling.map((b) => b.id))
        const missingBilling = current.billingDocuments.filter((b) => !persistedBillingIds.has(b.id))

        // Inject seed projects/docs not yet in localStorage
        const persistedProjectIds = new Set((p.projects ?? []).map((pr) => pr.id))
        const missingProjects = current.projects.filter((pr) => !persistedProjectIds.has(pr.id))
        const missingProjectDocIds = new Set(missingProjects.map((pr) => pr.id))
        // Also inject any seed docs for existing projects that aren't in localStorage yet
        const persistedDocIds = new Set(migratedDocs.map((d) => d.id))
        const missingDocs = current.documents.filter((d) =>
          missingProjectDocIds.has(d.projectId) || !persistedDocIds.has(d.id)
        )

        // Migrate old projects: add missing kontrakMulai/kontrakAkhir
        const migratedProjects = (p.projects ?? []).map((pr) => ({
          ...pr,
          kontrakMulai: pr.kontrakMulai ?? pr.createdAt?.slice(0, 7) ?? '2025-01',
          kontrakAkhir: pr.kontrakAkhir ?? null,
        }))

        return {
          ...current,
          ...p,
          projects: [...migratedProjects, ...missingProjects],
          documents: [...migratedDocs, ...missingDocs],
          billingDocuments: [...persistedBilling, ...missingBilling],
        }
      },
    },
  ),
)
