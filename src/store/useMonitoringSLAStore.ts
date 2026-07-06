import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SLAProject, SLAComponent, SLAMonthlyRecord } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

// ── Mock seed data ────────────────────────────────────────────────────────────

const T = '2025-01-01T00:00:00.000Z'
const T26 = '2026-01-01T00:00:00.000Z'

function mrec(id: string, compId: string, projId: string, month: number, year: number, ach: number, remark = ''): SLAMonthlyRecord {
  return { id, componentId: compId, projectId: projId, month, year, achievement: ach, remark, createdAt: T, updatedAt: T, lockedAt: T, lockedByName: 'System', reconfirmRequested: false, reconfirmNote: '', engineerReconfirmNote: '', engineerConfirmedAt: null }
}

// 2026 records — Jan-May locked (past), Jun current (unlocked)
function mrec26(id: string, compId: string, projId: string, month: number, ach: number, lockedByName?: string, remark = ''): SLAMonthlyRecord {
  const isLocked = month <= 5
  const mm = String(month).padStart(2, '0')
  const lastDays = [31, 28, 31, 30, 31, 30]
  const lockTs = isLocked ? `2026-${mm}-${lastDays[month - 1]}T23:59:00.000Z` : null
  return {
    id, componentId: compId, projectId: projId, month, year: 2026, achievement: ach, remark,
    createdAt: `2026-${mm}-01T08:00:00.000Z`,
    updatedAt: isLocked ? lockTs! : `2026-${mm}-01T08:00:00.000Z`,
    lockedAt: lockTs,
    lockedByName: isLocked ? (lockedByName ?? null) : null,
    reconfirmRequested: false,
    reconfirmNote: '',
    engineerReconfirmNote: '',
    engineerConfirmedAt: null,
  }
}

const SEED_PROJECTS: SLAProject[] = [
  // ── Existing projects (2025) ──────────────────────────────────────────────
  { id: 'ms0003', kodeProject: 'MS-0003', namaProject: 'Network Infrastructure Region', department: 'IT Infrastructure', pic: 'Budi Santoso', targetSLA: 98, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0026', kodeProject: 'MS-0026', namaProject: 'Equipment Procurement 2025', department: 'IT Support', pic: 'Dewi Rahayu', targetSLA: 99, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0030', kodeProject: 'MS-0030', namaProject: 'Data Center Maintenance', department: 'IT Infrastructure', pic: 'Ahmad Fauzi', targetSLA: 95, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0004', kodeProject: 'MS-0004', namaProject: 'Security System Management', department: 'IT Security', pic: 'Rina Kartika', targetSLA: 99.5, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  // ── New projects 2026 — PS-024/025/026 ───────────────────────────────────
  { id: 'sla-ps024', kodeProject: 'PS-024-00', namaProject: 'Pekerjaan Jasa Operasi dan Pemeliharaan Terintegrasi Gas Management System (PJOPTGMS)', department: 'ICS', pic: 'Nyaklia', targetSLA: 99, catatan: '', createdAt: T26, updatedAt: T26, createdByUserId: 'system', createdByName: 'System' },
  { id: 'sla-ps025', kodeProject: 'PS-025-00', namaProject: 'Jasa Teknikal Asistensi dan Konsultansi Sistem Informasi Manajemen Aset (SIMA)', department: 'ICS', pic: 'Budi Santoso', targetSLA: 98, catatan: '', createdAt: T26, updatedAt: T26, createdByUserId: 'system', createdByName: 'System' },
  { id: 'sla-ps026', kodeProject: 'PS-026-00', namaProject: 'Pekerjaan Penyediaan Layanan Managed Service End User Support (EUS)', department: 'EUS', pic: 'Dimas Pratama', targetSLA: 99.5, catatan: '', createdAt: T26, updatedAt: T26, createdByUserId: 'system', createdByName: 'System' },
]

const SEED_COMPONENTS: SLAComponent[] = [
  // ── Existing components ───────────────────────────────────────────────────
  { id: 'c-r1',     projectId: 'ms0003', componentName: 'Region I',            createdAt: T, updatedAt: T },
  { id: 'c-r2',     projectId: 'ms0003', componentName: 'Region II',           createdAt: T, updatedAt: T },
  { id: 'c-r3',     projectId: 'ms0003', componentName: 'Region III',          createdAt: T, updatedAt: T },
  { id: 'c-rt',     projectId: 'ms0003', componentName: 'Regional Transmisi',  createdAt: T, updatedAt: T },
  { id: 'c-iogm',   projectId: 'ms0003', componentName: 'IOGM',               createdAt: T, updatedAt: T },
  { id: 'c-pca3',   projectId: 'ms0026', componentName: 'Printer Colour A3',   createdAt: T, updatedAt: T },
  { id: 'c-lcd1',   projectId: 'ms0026', componentName: 'LCD Projector',       createdAt: T, updatedAt: T },
  { id: 'c-lcd2',   projectId: 'ms0026', componentName: 'LCD Projector Type 2', createdAt: T, updatedAt: T },
  { id: 'c-aio',    projectId: 'ms0026', componentName: 'Printer AIO',         createdAt: T, updatedAt: T },
  { id: 'c-scan',   projectId: 'ms0026', componentName: 'Scanner',             createdAt: T, updatedAt: T },
  { id: 'c-ups',    projectId: 'ms0026', componentName: 'UPS',                 createdAt: T, updatedAt: T },
  { id: 'c-dc1',    projectId: 'ms0030', componentName: 'DC Primary',          createdAt: T, updatedAt: T },
  { id: 'c-dc2',    projectId: 'ms0030', componentName: 'DC Secondary',        createdAt: T, updatedAt: T },
  { id: 'c-cctv',   projectId: 'ms0004', componentName: 'CCTV System',         createdAt: T, updatedAt: T },
  { id: 'c-access', projectId: 'ms0004', componentName: 'Access Control',      createdAt: T, updatedAt: T },
  // ── PS-024-00 components ──────────────────────────────────────────────────
  { id: 'c-p24-r1',   projectId: 'sla-ps024', componentName: 'Region I',              createdAt: T26, updatedAt: T26 },
  { id: 'c-p24-r2',   projectId: 'sla-ps024', componentName: 'Region II',             createdAt: T26, updatedAt: T26 },
  { id: 'c-p24-r3',   projectId: 'sla-ps024', componentName: 'Region III',            createdAt: T26, updatedAt: T26 },
  { id: 'c-p24-rt',   projectId: 'sla-ps024', componentName: 'Regional Transmission', createdAt: T26, updatedAt: T26 },
  { id: 'c-p24-ig',   projectId: 'sla-ps024', componentName: 'IOGM',                  createdAt: T26, updatedAt: T26 },
  // ── PS-025-00 components ──────────────────────────────────────────────────
  { id: 'c-p25-in',   projectId: 'sla-ps025', componentName: 'Modul Inventory',       createdAt: T26, updatedAt: T26 },
  { id: 'c-p25-mn',   projectId: 'sla-ps025', componentName: 'Modul Maintenance',     createdAt: T26, updatedAt: T26 },
  { id: 'c-p25-rp',   projectId: 'sla-ps025', componentName: 'Modul Reporting',       createdAt: T26, updatedAt: T26 },
  { id: 'c-p25-it',   projectId: 'sla-ps025', componentName: 'Modul Integration',     createdAt: T26, updatedAt: T26 },
  // ── PS-026-00 components ──────────────────────────────────────────────────
  { id: 'c-p26-a3',   projectId: 'sla-ps026', componentName: 'Printer A3',            createdAt: T26, updatedAt: T26 },
  { id: 'c-p26-a4',   projectId: 'sla-ps026', componentName: 'Printer A4',            createdAt: T26, updatedAt: T26 },
  { id: 'c-p26-lc',   projectId: 'sla-ps026', componentName: 'LCD Projector',         createdAt: T26, updatedAt: T26 },
  { id: 'c-p26-up',   projectId: 'sla-ps026', componentName: 'UPS',                   createdAt: T26, updatedAt: T26 },
  { id: 'c-p26-sc',   projectId: 'sla-ps026', componentName: 'Scanner',               createdAt: T26, updatedAt: T26 },
  { id: 'c-p26-mo',   projectId: 'sla-ps026', componentName: 'Monitor',               createdAt: T26, updatedAt: T26 },
]

const SEED_RECORDS: SLAMonthlyRecord[] = [
  // ── Existing 2025 records ─────────────────────────────────────────────────
  // MS-0003 Region I
  mrec('mr001','c-r1','ms0003',1,2025,99.91), mrec('mr002','c-r1','ms0003',2,2025,100),
  mrec('mr003','c-r1','ms0003',3,2025,99.95), mrec('mr004','c-r1','ms0003',4,2025,99.88),
  mrec('mr005','c-r1','ms0003',5,2025,100),   mrec('mr006','c-r1','ms0003',6,2025,99.92),
  // MS-0003 Region II
  mrec('mr007','c-r2','ms0003',1,2025,99.99), mrec('mr008','c-r2','ms0003',2,2025,99.52),
  mrec('mr009','c-r2','ms0003',3,2025,99.99), mrec('mr010','c-r2','ms0003',4,2025,100),
  mrec('mr011','c-r2','ms0003',5,2025,99.85), mrec('mr012','c-r2','ms0003',6,2025,99.71),
  // MS-0003 Region III
  mrec('mr013','c-r3','ms0003',1,2025,100),   mrec('mr014','c-r3','ms0003',2,2025,99.91),
  mrec('mr015','c-r3','ms0003',3,2025,100),   mrec('mr016','c-r3','ms0003',4,2025,99.95),
  mrec('mr017','c-r3','ms0003',5,2025,99.99), mrec('mr018','c-r3','ms0003',6,2025,100),
  // MS-0003 Regional Transmisi
  mrec('mr019','c-rt','ms0003',1,2025,98.92), mrec('mr020','c-rt','ms0003',2,2025,98.73),
  mrec('mr021','c-rt','ms0003',3,2025,99.11), mrec('mr022','c-rt','ms0003',4,2025,98.55),
  mrec('mr023','c-rt','ms0003',5,2025,99.02), mrec('mr024','c-rt','ms0003',6,2025,98.88),
  // MS-0003 IOGM
  mrec('mr025','c-iogm','ms0003',1,2025,99.45), mrec('mr026','c-iogm','ms0003',2,2025,99.77),
  mrec('mr027','c-iogm','ms0003',3,2025,99.33), mrec('mr028','c-iogm','ms0003',4,2025,99.61),
  mrec('mr029','c-iogm','ms0003',5,2025,99.89), mrec('mr030','c-iogm','ms0003',6,2025,99.50),
  // MS-0026
  mrec('mr031','c-pca3','ms0026',1,2025,100),  mrec('mr032','c-pca3','ms0026',2,2025,100),  mrec('mr033','c-pca3','ms0026',3,2025,99.5),
  mrec('mr034','c-lcd1','ms0026',1,2025,99.8), mrec('mr035','c-lcd1','ms0026',2,2025,100),  mrec('mr036','c-lcd1','ms0026',3,2025,100),
  mrec('mr037','c-lcd2','ms0026',1,2025,100),  mrec('mr038','c-lcd2','ms0026',2,2025,99.9), mrec('mr039','c-lcd2','ms0026',3,2025,100),
  mrec('mr040','c-aio', 'ms0026',1,2025,99.5), mrec('mr041','c-aio', 'ms0026',2,2025,99.8), mrec('mr042','c-aio', 'ms0026',3,2025,99.9),
  mrec('mr043','c-scan','ms0026',1,2025,100),  mrec('mr044','c-scan','ms0026',2,2025,100),  mrec('mr045','c-scan','ms0026',3,2025,99.8),
  mrec('mr046','c-ups', 'ms0026',1,2025,98.5), mrec('mr047','c-ups', 'ms0026',2,2025,99.1), mrec('mr048','c-ups', 'ms0026',3,2025,99.8),
  // MS-0030
  mrec('mr049','c-dc1','ms0030',1,2025,99.99), mrec('mr050','c-dc1','ms0030',2,2025,100),
  mrec('mr051','c-dc1','ms0030',3,2025,99.95), mrec('mr052','c-dc1','ms0030',4,2025,100),
  mrec('mr053','c-dc2','ms0030',1,2025,98.11), mrec('mr054','c-dc2','ms0030',2,2025,97.88),
  mrec('mr055','c-dc2','ms0030',3,2025,98.55), mrec('mr056','c-dc2','ms0030',4,2025,97.99),
  // MS-0004
  mrec('mr057','c-cctv',  'ms0004',1,2025,100),   mrec('mr058','c-cctv',  'ms0004',2,2025,99.9), mrec('mr059','c-cctv',  'ms0004',3,2025,100),
  mrec('mr060','c-access','ms0004',1,2025,99.85), mrec('mr061','c-access','ms0004',2,2025,100),  mrec('mr062','c-access','ms0004',3,2025,99.95),

  // ── PS-024-00 2026 (target 99) — Jan-Mei ─────────────────────────────────
  // Region I: Jan✓ Feb✗ Mar✓ Apr✓ May✓
  mrec26('xr001','c-p24-r1','sla-ps024',1, 99.92,'Nyaklia'),
  mrec26('xr002','c-p24-r1','sla-ps024',2, 98.45,'Nyaklia','Incident jaringan R1-Feb'),
  mrec26('xr003','c-p24-r1','sla-ps024',3, 99.88,'Nyaklia'),
  mrec26('xr004','c-p24-r1','sla-ps024',4,100.00,'Nyaklia'),
  mrec26('xr005','c-p24-r1','sla-ps024',5, 99.75),
  // Region II: Jan✓ Feb✓ Mar✓ Apr✓ May✓
  mrec26('xr006','c-p24-r2','sla-ps024',1,100.00,'Nyaklia'),
  mrec26('xr007','c-p24-r2','sla-ps024',2, 99.55,'Nyaklia'),
  mrec26('xr008','c-p24-r2','sla-ps024',3, 99.99,'Nyaklia'),
  mrec26('xr009','c-p24-r2','sla-ps024',4, 99.88,'Nyaklia'),
  mrec26('xr010','c-p24-r2','sla-ps024',5,100.00),
  // Region III: semua ✗ (konsisten di bawah target 99)
  mrec26('xr011','c-p24-r3','sla-ps024',1, 98.12,'Nyaklia','Gangguan infrastruktur R3'),
  mrec26('xr012','c-p24-r3','sla-ps024',2, 97.88,'Nyaklia','Maintenance terjadwal R3'),
  mrec26('xr013','c-p24-r3','sla-ps024',3, 98.45,'Nyaklia','Link backup bermasalah'),
  mrec26('xr014','c-p24-r3','sla-ps024',4, 97.55,'Nyaklia','Gangguan power supply R3'),
  mrec26('xr015','c-p24-r3','sla-ps024',5, 98.10),
  // Regional Transmission: Jan✓ Feb✓ Mar✗ Apr✓ May✓
  mrec26('xr016','c-p24-rt','sla-ps024',1, 99.45,'Nyaklia'),
  mrec26('xr017','c-p24-rt','sla-ps024',2, 99.12,'Nyaklia'),
  mrec26('xr018','c-p24-rt','sla-ps024',3, 98.76,'Nyaklia','Planned maintenance transmisi'),
  mrec26('xr019','c-p24-rt','sla-ps024',4, 99.88,'Nyaklia'),
  mrec26('xr020','c-p24-rt','sla-ps024',5, 99.55),
  // IOGM: Jan✓ Feb✓ Mar✓ Apr✗ May✓
  mrec26('xr021','c-p24-ig','sla-ps024',1, 99.88,'Nyaklia'),
  mrec26('xr022','c-p24-ig','sla-ps024',2, 99.45,'Nyaklia'),
  mrec26('xr023','c-p24-ig','sla-ps024',3, 99.99,'Nyaklia'),
  mrec26('xr024','c-p24-ig','sla-ps024',4, 98.55,'Nyaklia','Gangguan SCADA IOGM Apr'),
  mrec26('xr025','c-p24-ig','sla-ps024',5, 99.77),

  // ── PS-025-00 2026 (target 98) — Jan-Mei ─────────────────────────────────
  // Modul Inventory: Jan✓ Feb✓ Mar✓ Apr✓ May✓
  mrec26('xr026','c-p25-in','sla-ps025',1, 99.12,'Budi Santoso'),
  mrec26('xr027','c-p25-in','sla-ps025',2, 98.88,'Budi Santoso'),
  mrec26('xr028','c-p25-in','sla-ps025',3, 99.45,'Budi Santoso'),
  mrec26('xr029','c-p25-in','sla-ps025',4, 98.55,'Budi Santoso'),
  mrec26('xr030','c-p25-in','sla-ps025',5, 99.22),
  // Modul Maintenance: semua ✗ (konsisten di bawah target 98)
  mrec26('xr031','c-p25-mn','sla-ps025',1, 96.88,'Budi Santoso','Backlog tiket maintenance tinggi'),
  mrec26('xr032','c-p25-mn','sla-ps025',2, 97.22,'Budi Santoso','Keterlambatan spare part'),
  mrec26('xr033','c-p25-mn','sla-ps025',3, 96.55,'Budi Santoso','Resource maintenance kurang'),
  mrec26('xr034','c-p25-mn','sla-ps025',4, 97.11,'Budi Santoso','Eskalasi tiket kritis'),
  mrec26('xr035','c-p25-mn','sla-ps025',5, 96.99),
  // Modul Reporting: Jan✓ Feb✓ Mar✓ Apr✗ May✓
  mrec26('xr036','c-p25-rp','sla-ps025',1, 99.55,'Budi Santoso'),
  mrec26('xr037','c-p25-rp','sla-ps025',2, 98.12,'Budi Santoso'),
  mrec26('xr038','c-p25-rp','sla-ps025',3, 99.11,'Budi Santoso'),
  mrec26('xr039','c-p25-rp','sla-ps025',4, 97.88,'Budi Santoso','Report engine error Apr'),
  mrec26('xr040','c-p25-rp','sla-ps025',5, 99.44),
  // Modul Integration: Jan✓ Feb✓ Mar✗ Apr✓ May✓
  mrec26('xr041','c-p25-it','sla-ps025',1, 98.55,'Budi Santoso'),
  mrec26('xr042','c-p25-it','sla-ps025',2, 99.22,'Budi Santoso'),
  mrec26('xr043','c-p25-it','sla-ps025',3, 97.11,'Budi Santoso','API integration timeout Mar'),
  mrec26('xr044','c-p25-it','sla-ps025',4, 98.88,'Budi Santoso'),
  mrec26('xr045','c-p25-it','sla-ps025',5, 99.55),

  // ── PS-026-00 2026 (target 99.5) — Jan-Mei ───────────────────────────────
  // Printer A3: Jan✓ Feb✓ Mar✓ Apr✓ May✓
  mrec26('xr046','c-p26-a3','sla-ps026',1, 99.88,'Dimas Pratama'),
  mrec26('xr047','c-p26-a3','sla-ps026',2,100.00,'Dimas Pratama'),
  mrec26('xr048','c-p26-a3','sla-ps026',3, 99.77,'Dimas Pratama'),
  mrec26('xr049','c-p26-a3','sla-ps026',4, 99.88,'Dimas Pratama'),
  mrec26('xr050','c-p26-a3','sla-ps026',5,100.00),
  // Printer A4: Jan✓ Feb✓ Mar✓ Apr✓ May✓
  mrec26('xr051','c-p26-a4','sla-ps026',1,100.00,'Dimas Pratama'),
  mrec26('xr052','c-p26-a4','sla-ps026',2, 99.55,'Dimas Pratama'),
  mrec26('xr053','c-p26-a4','sla-ps026',3, 99.88,'Dimas Pratama'),
  mrec26('xr054','c-p26-a4','sla-ps026',4,100.00,'Dimas Pratama'),
  mrec26('xr055','c-p26-a4','sla-ps026',5, 99.77),
  // LCD Projector: Jan✓ Feb✗ Mar✓ Apr✓ May✗
  mrec26('xr056','c-p26-lc','sla-ps026',1, 99.66,'Dimas Pratama'),
  mrec26('xr057','c-p26-lc','sla-ps026',2, 99.11,'Dimas Pratama','Lampu projector rusak Feb'),
  mrec26('xr058','c-p26-lc','sla-ps026',3, 99.99,'Dimas Pratama'),
  mrec26('xr059','c-p26-lc','sla-ps026',4, 99.77,'Dimas Pratama'),
  mrec26('xr060','c-p26-lc','sla-ps026',5, 99.33),
  // UPS: semua ✗ (konsisten di bawah target 99.5)
  mrec26('xr061','c-p26-up','sla-ps026',1, 98.45,'Dimas Pratama','Baterai UPS degradasi'),
  mrec26('xr062','c-p26-up','sla-ps026',2, 97.88,'Dimas Pratama','Penggantian baterai terjadwal'),
  mrec26('xr063','c-p26-up','sla-ps026',3, 98.55,'Dimas Pratama','Gangguan switching UPS'),
  mrec26('xr064','c-p26-up','sla-ps026',4, 97.22,'Dimas Pratama','UPS overload beban tinggi'),
  mrec26('xr065','c-p26-up','sla-ps026',5, 98.11),
  // Scanner: Jan✓ Feb✓ Mar✓ Apr✓ May✓
  mrec26('xr066','c-p26-sc','sla-ps026',1, 99.88,'Dimas Pratama'),
  mrec26('xr067','c-p26-sc','sla-ps026',2,100.00,'Dimas Pratama'),
  mrec26('xr068','c-p26-sc','sla-ps026',3, 99.77,'Dimas Pratama'),
  mrec26('xr069','c-p26-sc','sla-ps026',4,100.00,'Dimas Pratama'),
  mrec26('xr070','c-p26-sc','sla-ps026',5, 99.99),
  // Monitor: Jan✓ Feb✓ Mar✗ Apr✗ May✓
  mrec26('xr071','c-p26-mo','sla-ps026',1, 99.55,'Dimas Pratama'),
  mrec26('xr072','c-p26-mo','sla-ps026',2, 99.88,'Dimas Pratama'),
  mrec26('xr073','c-p26-mo','sla-ps026',3, 98.44,'Dimas Pratama','Panel monitor bermasalah Mar'),
  mrec26('xr074','c-p26-mo','sla-ps026',4, 99.11,'Dimas Pratama','Backlight failure beberapa unit'),
  mrec26('xr075','c-p26-mo','sla-ps026',5, 99.88,'Dimas Pratama'),

  // ── PS-024-00 Juni (target 99) ────────────────────────────────────────────
  mrec26('xr076','c-p24-r1','sla-ps024',6, 99.67),
  mrec26('xr077','c-p24-r2','sla-ps024',6, 99.88),
  mrec26('xr078','c-p24-r3','sla-ps024',6, 98.22,undefined,'Perbaikan infrastruktur R3 ongoing'),
  mrec26('xr079','c-p24-rt','sla-ps024',6, 99.33),
  mrec26('xr080','c-p24-ig','sla-ps024',6, 99.71),

  // ── PS-025-00 Juni (target 98) ────────────────────────────────────────────
  mrec26('xr081','c-p25-in','sla-ps025',6, 98.66),
  mrec26('xr082','c-p25-mn','sla-ps025',6, 97.33,undefined,'Backlog tiket maintenance belum selesai'),
  mrec26('xr083','c-p25-rp','sla-ps025',6, 99.22),
  mrec26('xr084','c-p25-it','sla-ps025',6, 98.77),

  // ── PS-026-00 Juni (target 99.5) ─────────────────────────────────────────
  mrec26('xr085','c-p26-a3','sla-ps026',6, 99.88),
  mrec26('xr086','c-p26-a4','sla-ps026',6,100.00),
  mrec26('xr087','c-p26-lc','sla-ps026',6, 99.55),
  mrec26('xr088','c-p26-up','sla-ps026',6, 98.23,undefined,'Penggantian baterai UPS Juni'),
  mrec26('xr089','c-p26-sc','sla-ps026',6, 99.99),
  mrec26('xr090','c-p26-mo','sla-ps026',6, 99.44),

  // ── MS-0003 Network Infrastructure Region 2026 (target 98) ───────────────
  // Region I
  mrec26('m3r001','c-r1','ms0003',1, 99.91,'Budi Santoso'), mrec26('m3r002','c-r1','ms0003',2, 99.85,'Budi Santoso'),
  mrec26('m3r003','c-r1','ms0003',3, 99.98,'Budi Santoso'), mrec26('m3r004','c-r1','ms0003',4,100.00,'Budi Santoso'),
  mrec26('m3r005','c-r1','ms0003',5, 99.92,'Budi Santoso'), mrec26('m3r006','c-r1','ms0003',6, 99.88),
  // Region II
  mrec26('m3r007','c-r2','ms0003',1, 99.44,'Budi Santoso'), mrec26('m3r008','c-r2','ms0003',2, 99.77,'Budi Santoso'),
  mrec26('m3r009','c-r2','ms0003',3, 99.55,'Budi Santoso'), mrec26('m3r010','c-r2','ms0003',4, 99.88,'Budi Santoso'),
  mrec26('m3r011','c-r2','ms0003',5, 99.66,'Budi Santoso'), mrec26('m3r012','c-r2','ms0003',6, 99.72),
  // Region III
  mrec26('m3r013','c-r3','ms0003',1, 99.88,'Budi Santoso'), mrec26('m3r014','c-r3','ms0003',2,100.00,'Budi Santoso'),
  mrec26('m3r015','c-r3','ms0003',3, 99.95,'Budi Santoso'), mrec26('m3r016','c-r3','ms0003',4, 99.97,'Budi Santoso'),
  mrec26('m3r017','c-r3','ms0003',5,100.00,'Budi Santoso'), mrec26('m3r018','c-r3','ms0003',6, 99.91),
  // Regional Transmisi
  mrec26('m3r019','c-rt','ms0003',1, 98.55,'Budi Santoso'), mrec26('m3r020','c-rt','ms0003',2, 98.77,'Budi Santoso'),
  mrec26('m3r021','c-rt','ms0003',3, 98.44,'Budi Santoso'), mrec26('m3r022','c-rt','ms0003',4, 98.88,'Budi Santoso'),
  mrec26('m3r023','c-rt','ms0003',5, 98.65,'Budi Santoso'), mrec26('m3r024','c-rt','ms0003',6, 98.78),
  // IOGM
  mrec26('m3r025','c-iogm','ms0003',1, 99.33,'Budi Santoso'), mrec26('m3r026','c-iogm','ms0003',2, 99.22,'Budi Santoso'),
  mrec26('m3r027','c-iogm','ms0003',3, 99.55,'Budi Santoso'), mrec26('m3r028','c-iogm','ms0003',4, 99.44,'Budi Santoso'),
  mrec26('m3r029','c-iogm','ms0003',5, 99.66,'Budi Santoso'), mrec26('m3r030','c-iogm','ms0003',6, 99.38),

  // ── MS-0026 Equipment Procurement 2026 (target 99) ───────────────────────
  // Printer Colour A3
  mrec26('m26r001','c-pca3','ms0026',1,100.00,'Dewi Rahayu'), mrec26('m26r002','c-pca3','ms0026',2, 99.80,'Dewi Rahayu'),
  mrec26('m26r003','c-pca3','ms0026',3,100.00,'Dewi Rahayu'), mrec26('m26r004','c-pca3','ms0026',4, 99.90,'Dewi Rahayu'),
  mrec26('m26r005','c-pca3','ms0026',5,100.00,'Dewi Rahayu'), mrec26('m26r006','c-pca3','ms0026',6, 99.75),
  // LCD Projector
  mrec26('m26r007','c-lcd1','ms0026',1, 99.80,'Dewi Rahayu'), mrec26('m26r008','c-lcd1','ms0026',2,100.00,'Dewi Rahayu'),
  mrec26('m26r009','c-lcd1','ms0026',3, 99.50,'Dewi Rahayu'), mrec26('m26r010','c-lcd1','ms0026',4, 99.90,'Dewi Rahayu'),
  mrec26('m26r011','c-lcd1','ms0026',5,100.00,'Dewi Rahayu'), mrec26('m26r012','c-lcd1','ms0026',6, 99.80),
  // LCD Projector Type 2
  mrec26('m26r013','c-lcd2','ms0026',1,100.00,'Dewi Rahayu'), mrec26('m26r014','c-lcd2','ms0026',2, 99.90,'Dewi Rahayu'),
  mrec26('m26r015','c-lcd2','ms0026',3,100.00,'Dewi Rahayu'), mrec26('m26r016','c-lcd2','ms0026',4, 99.80,'Dewi Rahayu'),
  mrec26('m26r017','c-lcd2','ms0026',5, 99.90,'Dewi Rahayu'), mrec26('m26r018','c-lcd2','ms0026',6,100.00),
  // Printer AIO
  mrec26('m26r019','c-aio','ms0026',1, 99.50,'Dewi Rahayu'), mrec26('m26r020','c-aio','ms0026',2, 99.20,'Dewi Rahayu'),
  mrec26('m26r021','c-aio','ms0026',3, 99.80,'Dewi Rahayu'), mrec26('m26r022','c-aio','ms0026',4, 99.50,'Dewi Rahayu'),
  mrec26('m26r023','c-aio','ms0026',5, 99.70,'Dewi Rahayu'), mrec26('m26r024','c-aio','ms0026',6, 99.33),
  // Scanner
  mrec26('m26r025','c-scan','ms0026',1,100.00,'Dewi Rahayu'), mrec26('m26r026','c-scan','ms0026',2, 99.90,'Dewi Rahayu'),
  mrec26('m26r027','c-scan','ms0026',3,100.00,'Dewi Rahayu'), mrec26('m26r028','c-scan','ms0026',4,100.00,'Dewi Rahayu'),
  mrec26('m26r029','c-scan','ms0026',5, 99.90,'Dewi Rahayu'), mrec26('m26r030','c-scan','ms0026',6,100.00),
  // UPS (target 99 — sering di bawah target)
  mrec26('m26r031','c-ups','ms0026',1, 98.50,'Dewi Rahayu','Baterai UPS degradasi Jan'), mrec26('m26r032','c-ups','ms0026',2, 98.80,'Dewi Rahayu'),
  mrec26('m26r033','c-ups','ms0026',3, 99.10,'Dewi Rahayu'), mrec26('m26r034','c-ups','ms0026',4, 98.70,'Dewi Rahayu','Gangguan switching UPS Apr'),
  mrec26('m26r035','c-ups','ms0026',5, 99.20,'Dewi Rahayu'), mrec26('m26r036','c-ups','ms0026',6, 98.90),

  // ── MS-0030 Data Center Maintenance 2026 (target 95) ─────────────────────
  // DC Primary
  mrec26('m30r001','c-dc1','ms0030',1, 99.99,'Ahmad Fauzi'), mrec26('m30r002','c-dc1','ms0030',2,100.00,'Ahmad Fauzi'),
  mrec26('m30r003','c-dc1','ms0030',3, 99.95,'Ahmad Fauzi'), mrec26('m30r004','c-dc1','ms0030',4,100.00,'Ahmad Fauzi'),
  mrec26('m30r005','c-dc1','ms0030',5, 99.99,'Ahmad Fauzi'), mrec26('m30r006','c-dc1','ms0030',6, 99.97),
  // DC Secondary
  mrec26('m30r007','c-dc2','ms0030',1, 98.11,'Ahmad Fauzi'), mrec26('m30r008','c-dc2','ms0030',2, 97.88,'Ahmad Fauzi'),
  mrec26('m30r009','c-dc2','ms0030',3, 98.55,'Ahmad Fauzi'), mrec26('m30r010','c-dc2','ms0030',4, 97.99,'Ahmad Fauzi'),
  mrec26('m30r011','c-dc2','ms0030',5, 98.33,'Ahmad Fauzi'), mrec26('m30r012','c-dc2','ms0030',6, 98.11),

  // ── MS-0004 Security System Management 2026 (target 99.5) ────────────────
  // CCTV System
  mrec26('m4r001','c-cctv','ms0004',1,100.00,'Rina Kartika'), mrec26('m4r002','c-cctv','ms0004',2, 99.90,'Rina Kartika'),
  mrec26('m4r003','c-cctv','ms0004',3,100.00,'Rina Kartika'), mrec26('m4r004','c-cctv','ms0004',4, 99.80,'Rina Kartika'),
  mrec26('m4r005','c-cctv','ms0004',5,100.00,'Rina Kartika'), mrec26('m4r006','c-cctv','ms0004',6, 99.90),
  // Access Control
  mrec26('m4r007','c-access','ms0004',1, 99.85,'Rina Kartika'), mrec26('m4r008','c-access','ms0004',2,100.00,'Rina Kartika'),
  mrec26('m4r009','c-access','ms0004',3, 99.95,'Rina Kartika'), mrec26('m4r010','c-access','ms0004',4, 99.80,'Rina Kartika'),
  mrec26('m4r011','c-access','ms0004',5, 99.90,'Rina Kartika'), mrec26('m4r012','c-access','ms0004',6,100.00),
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface MonitoringSLAState {
  projects: SLAProject[]
  components: SLAComponent[]
  monthlyRecords: SLAMonthlyRecord[]
  dismissedConfirmations: string[]

  addProject: (data: Omit<SLAProject, 'id' | 'createdAt' | 'updatedAt'>) => SLAProject
  updateProject: (id: string, patch: Partial<Omit<SLAProject, 'id' | 'createdAt'>>, changedByName?: string) => void
  deleteProject: (id: string) => void
  getProjectById: (id: string) => SLAProject | undefined

  addComponent: (data: Omit<SLAComponent, 'id' | 'createdAt' | 'updatedAt'>) => SLAComponent
  updateComponent: (id: string, patch: Partial<Omit<SLAComponent, 'id' | 'createdAt'>>) => void
  deleteComponent: (id: string) => void
  getComponentById: (id: string) => SLAComponent | undefined
  getProjectComponents: (projectId: string) => SLAComponent[]

  addMonthlyRecord: (data: Omit<SLAMonthlyRecord, 'id' | 'createdAt' | 'updatedAt' | 'lockedAt' | 'lockedByName' | 'reconfirmRequested' | 'reconfirmNote' | 'engineerConfirmedAt'>, submittedByName?: string) => SLAMonthlyRecord
  updateMonthlyRecord: (id: string, patch: Partial<Omit<SLAMonthlyRecord, 'id' | 'createdAt'>>) => void
  deleteMonthlyRecord: (id: string) => void
  getComponentRecords: (componentId: string) => SLAMonthlyRecord[]
  getProjectRecords: (projectId: string, year: number) => SLAMonthlyRecord[]

  lockRecord: (id: string, byName: string) => void
  unlockRecord: (id: string) => void
  requestReconfirm: (id: string, note: string) => void
  clearReconfirm: (id: string, engineerNote: string) => void
  dismissConfirmation: (recordId: string) => void
}

export const useMonitoringSLAStore = create<MonitoringSLAState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      components: SEED_COMPONENTS,
      monthlyRecords: SEED_RECORDS,
      dismissedConfirmations: [],

      addProject: (data) => {
        const now = nowIso()
        const record: SLAProject = { ...data, id: uid('sla-proj'), createdAt: now, updatedAt: now }
        set((s) => ({ projects: [record, ...s.projects] }))
        useLogStore.getState().addLog({ type: 'monitoring_sla_created', message: `SLA Project "${data.kodeProject}" dibuat`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return record
      },
      updateProject: (id, patch, changedByName) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p
            const targetChanged = patch.targetSLA !== undefined && patch.targetSLA !== p.targetSLA
            const newHistory: import('../types/monitoring').SLATargetHistoryEntry[] = targetChanged
              ? [...(p.targetSLAHistory ?? []), { target: p.targetSLA, changedAt: nowIso(), changedBy: changedByName ?? 'System' }]
              : (p.targetSLAHistory ?? [])
            return { ...p, ...patch, targetSLAHistory: newHistory, updatedAt: nowIso() }
          }),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_sla_edited', message: `SLA Project diperbarui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      deleteProject: (id) => {
        const compIds = new Set(get().components.filter((c) => c.projectId === id).map((c) => c.id))
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          components: s.components.filter((c) => c.projectId !== id),
          monthlyRecords: s.monthlyRecords.filter((r) => !compIds.has(r.componentId)),
        }))
        useLogStore.getState().addLog({ type: 'monitoring_sla_deleted', message: `SLA Project dihapus`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },
      getProjectById: (id) => get().projects.find((p) => p.id === id),

      addComponent: (data) => {
        const now = nowIso()
        const record: SLAComponent = { ...data, id: uid('sla-comp'), createdAt: now, updatedAt: now }
        set((s) => ({ components: [...s.components, record] }))
        return record
      },
      updateComponent: (id, patch) => {
        set((s) => ({ components: s.components.map((c) => c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c) }))
      },
      deleteComponent: (id) => {
        set((s) => ({
          components: s.components.filter((c) => c.id !== id),
          monthlyRecords: s.monthlyRecords.filter((r) => r.componentId !== id),
        }))
      },
      getComponentById: (id) => get().components.find((c) => c.id === id),
      getProjectComponents: (projectId) => get().components.filter((c) => c.projectId === projectId),

      addMonthlyRecord: (data, submittedByName) => {
        const now = nowIso()
        const record: SLAMonthlyRecord = { ...data, id: uid('sla-rec'), createdAt: now, updatedAt: now, lockedAt: now, lockedByName: submittedByName ?? null, reconfirmRequested: false, reconfirmNote: '', engineerReconfirmNote: '', engineerConfirmedAt: null }
        set((s) => ({ monthlyRecords: [...s.monthlyRecords, record] }))
        return record
      },
      updateMonthlyRecord: (id, patch) => {
        set((s) => ({ monthlyRecords: s.monthlyRecords.map((r) => r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r) }))
      },
      deleteMonthlyRecord: (id) => {
        set((s) => ({ monthlyRecords: s.monthlyRecords.filter((r) => r.id !== id) }))
      },
      getComponentRecords: (componentId) => get().monthlyRecords.filter((r) => r.componentId === componentId),
      getProjectRecords: (projectId, year) => get().monthlyRecords.filter((r) => r.projectId === projectId && r.year === year),

      lockRecord: (id, byName) => {
        const now = nowIso()
        set((s) => ({ monthlyRecords: s.monthlyRecords.map((r) => r.id === id ? { ...r, lockedAt: now, lockedByName: byName, updatedAt: now } : r) }))
      },
      unlockRecord: (id) => {
        set((s) => ({ monthlyRecords: s.monthlyRecords.map((r) => r.id === id ? { ...r, lockedAt: null, lockedByName: null, updatedAt: nowIso() } : r) }))
      },
      requestReconfirm: (id, note) => {
        set((s) => ({ monthlyRecords: s.monthlyRecords.map((r) => r.id === id ? { ...r, reconfirmRequested: true, reconfirmNote: note, updatedAt: nowIso() } : r) }))
      },
      clearReconfirm: (id, engineerNote) => {
        const now = nowIso()
        set((s) => ({ monthlyRecords: s.monthlyRecords.map((r) => r.id === id ? { ...r, reconfirmRequested: false, reconfirmNote: '', engineerReconfirmNote: engineerNote, engineerConfirmedAt: now, updatedAt: now } : r) }))
      },
      dismissConfirmation: (recordId) => {
        set((s) => ({ dismissedConfirmations: [...s.dismissedConfirmations, recordId] }))
      },
    }),
    {
      name: 'flowdesk:monitoring-sla',
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<MonitoringSLAState>
        if (!p.projects?.length) return current
        // Use persisted data as-is — deleted projects stay deleted
        return {
          ...current,
          ...p,
          projects:               p.projects               ?? current.projects,
          components:             p.components             ?? current.components,
          monthlyRecords:         p.monthlyRecords         ?? current.monthlyRecords,
          dismissedConfirmations: p.dismissedConfirmations ?? current.dismissedConfirmations,
        }
      },
    },
  ),
)
