import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SLAProject, SLAComponent, SLAMonthlyRecord } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

// ── Mock seed data ────────────────────────────────────────────────────────────

const T = '2025-01-01T00:00:00.000Z'
function mrec(id: string, compId: string, projId: string, month: number, year: number, ach: number, remark = ''): SLAMonthlyRecord {
  return { id, componentId: compId, projectId: projId, month, year, achievement: ach, remark, createdAt: T, updatedAt: T }
}

const SEED_PROJECTS: SLAProject[] = [
  { id: 'ms0003', kodeProject: 'MS-0003', namaProject: 'Network Infrastructure Region', department: 'IT Infrastructure', pic: 'Budi Santoso', targetSLA: 98, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0026', kodeProject: 'MS-0026', namaProject: 'Equipment Procurement 2025', department: 'IT Support', pic: 'Dewi Rahayu', targetSLA: 99, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0030', kodeProject: 'MS-0030', namaProject: 'Data Center Maintenance', department: 'IT Infrastructure', pic: 'Ahmad Fauzi', targetSLA: 95, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
  { id: 'ms0004', kodeProject: 'MS-0004', namaProject: 'Security System Management', department: 'IT Security', pic: 'Rina Kartika', targetSLA: 99.5, catatan: '', createdAt: T, updatedAt: T, createdByUserId: 'system', createdByName: 'System' },
]

const SEED_COMPONENTS: SLAComponent[] = [
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
]

const SEED_RECORDS: SLAMonthlyRecord[] = [
  // MS-0003 Region I — Jan–Jun 2025
  mrec('mr001', 'c-r1', 'ms0003', 1, 2025, 99.91), mrec('mr002', 'c-r1', 'ms0003', 2, 2025, 100),
  mrec('mr003', 'c-r1', 'ms0003', 3, 2025, 99.95), mrec('mr004', 'c-r1', 'ms0003', 4, 2025, 99.88),
  mrec('mr005', 'c-r1', 'ms0003', 5, 2025, 100),   mrec('mr006', 'c-r1', 'ms0003', 6, 2025, 99.92),
  // MS-0003 Region II
  mrec('mr007', 'c-r2', 'ms0003', 1, 2025, 99.99), mrec('mr008', 'c-r2', 'ms0003', 2, 2025, 99.52),
  mrec('mr009', 'c-r2', 'ms0003', 3, 2025, 99.99), mrec('mr010', 'c-r2', 'ms0003', 4, 2025, 100),
  mrec('mr011', 'c-r2', 'ms0003', 5, 2025, 99.85), mrec('mr012', 'c-r2', 'ms0003', 6, 2025, 99.71),
  // MS-0003 Region III
  mrec('mr013', 'c-r3', 'ms0003', 1, 2025, 100),   mrec('mr014', 'c-r3', 'ms0003', 2, 2025, 99.91),
  mrec('mr015', 'c-r3', 'ms0003', 3, 2025, 100),   mrec('mr016', 'c-r3', 'ms0003', 4, 2025, 99.95),
  mrec('mr017', 'c-r3', 'ms0003', 5, 2025, 99.99), mrec('mr018', 'c-r3', 'ms0003', 6, 2025, 100),
  // MS-0003 Regional Transmisi
  mrec('mr019', 'c-rt', 'ms0003', 1, 2025, 98.92), mrec('mr020', 'c-rt', 'ms0003', 2, 2025, 98.73),
  mrec('mr021', 'c-rt', 'ms0003', 3, 2025, 99.11), mrec('mr022', 'c-rt', 'ms0003', 4, 2025, 98.55),
  mrec('mr023', 'c-rt', 'ms0003', 5, 2025, 99.02), mrec('mr024', 'c-rt', 'ms0003', 6, 2025, 98.88),
  // MS-0003 IOGM
  mrec('mr025', 'c-iogm', 'ms0003', 1, 2025, 99.45), mrec('mr026', 'c-iogm', 'ms0003', 2, 2025, 99.77),
  mrec('mr027', 'c-iogm', 'ms0003', 3, 2025, 99.33), mrec('mr028', 'c-iogm', 'ms0003', 4, 2025, 99.61),
  mrec('mr029', 'c-iogm', 'ms0003', 5, 2025, 99.89), mrec('mr030', 'c-iogm', 'ms0003', 6, 2025, 99.50),
  // MS-0026 components — Jan–Mar 2025
  mrec('mr031', 'c-pca3', 'ms0026', 1, 2025, 100),  mrec('mr032', 'c-pca3', 'ms0026', 2, 2025, 100),  mrec('mr033', 'c-pca3', 'ms0026', 3, 2025, 99.5),
  mrec('mr034', 'c-lcd1', 'ms0026', 1, 2025, 99.8), mrec('mr035', 'c-lcd1', 'ms0026', 2, 2025, 100),  mrec('mr036', 'c-lcd1', 'ms0026', 3, 2025, 100),
  mrec('mr037', 'c-lcd2', 'ms0026', 1, 2025, 100),  mrec('mr038', 'c-lcd2', 'ms0026', 2, 2025, 99.9), mrec('mr039', 'c-lcd2', 'ms0026', 3, 2025, 100),
  mrec('mr040', 'c-aio',  'ms0026', 1, 2025, 99.5), mrec('mr041', 'c-aio',  'ms0026', 2, 2025, 99.8), mrec('mr042', 'c-aio',  'ms0026', 3, 2025, 99.9),
  mrec('mr043', 'c-scan', 'ms0026', 1, 2025, 100),  mrec('mr044', 'c-scan', 'ms0026', 2, 2025, 100),  mrec('mr045', 'c-scan', 'ms0026', 3, 2025, 99.8),
  mrec('mr046', 'c-ups',  'ms0026', 1, 2025, 98.5), mrec('mr047', 'c-ups',  'ms0026', 2, 2025, 99.1), mrec('mr048', 'c-ups',  'ms0026', 3, 2025, 99.8),
  // MS-0030 — Jan–Apr 2025
  mrec('mr049', 'c-dc1', 'ms0030', 1, 2025, 99.99), mrec('mr050', 'c-dc1', 'ms0030', 2, 2025, 100),
  mrec('mr051', 'c-dc1', 'ms0030', 3, 2025, 99.95), mrec('mr052', 'c-dc1', 'ms0030', 4, 2025, 100),
  mrec('mr053', 'c-dc2', 'ms0030', 1, 2025, 98.11), mrec('mr054', 'c-dc2', 'ms0030', 2, 2025, 97.88),
  mrec('mr055', 'c-dc2', 'ms0030', 3, 2025, 98.55), mrec('mr056', 'c-dc2', 'ms0030', 4, 2025, 97.99),
  // MS-0004 — Jan–Mar 2025
  mrec('mr057', 'c-cctv',   'ms0004', 1, 2025, 100),   mrec('mr058', 'c-cctv',   'ms0004', 2, 2025, 99.9), mrec('mr059', 'c-cctv',   'ms0004', 3, 2025, 100),
  mrec('mr060', 'c-access', 'ms0004', 1, 2025, 99.85), mrec('mr061', 'c-access', 'ms0004', 2, 2025, 100),  mrec('mr062', 'c-access', 'ms0004', 3, 2025, 99.95),
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface MonitoringSLAState {
  projects: SLAProject[]
  components: SLAComponent[]
  monthlyRecords: SLAMonthlyRecord[]

  // Project CRUD
  addProject: (data: Omit<SLAProject, 'id' | 'createdAt' | 'updatedAt'>) => SLAProject
  updateProject: (id: string, patch: Partial<Omit<SLAProject, 'id' | 'createdAt'>>) => void
  deleteProject: (id: string) => void
  getProjectById: (id: string) => SLAProject | undefined

  // Component CRUD
  addComponent: (data: Omit<SLAComponent, 'id' | 'createdAt' | 'updatedAt'>) => SLAComponent
  updateComponent: (id: string, patch: Partial<Omit<SLAComponent, 'id' | 'createdAt'>>) => void
  deleteComponent: (id: string) => void
  getComponentById: (id: string) => SLAComponent | undefined
  getProjectComponents: (projectId: string) => SLAComponent[]

  // Monthly CRUD
  addMonthlyRecord: (data: Omit<SLAMonthlyRecord, 'id' | 'createdAt' | 'updatedAt'>) => SLAMonthlyRecord
  updateMonthlyRecord: (id: string, patch: Partial<Omit<SLAMonthlyRecord, 'id' | 'createdAt'>>) => void
  deleteMonthlyRecord: (id: string) => void
  getComponentRecords: (componentId: string) => SLAMonthlyRecord[]
  getProjectRecords: (projectId: string, year: number) => SLAMonthlyRecord[]
}

export const useMonitoringSLAStore = create<MonitoringSLAState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      components: SEED_COMPONENTS,
      monthlyRecords: SEED_RECORDS,

      // ── Project ──
      addProject: (data) => {
        const now = nowIso()
        const record: SLAProject = { ...data, id: uid('sla-proj'), createdAt: now, updatedAt: now }
        set((s) => ({ projects: [record, ...s.projects] }))
        useLogStore.getState().addLog({ type: 'monitoring_sla_created', message: `SLA Project "${data.kodeProject}" dibuat`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return record
      },
      updateProject: (id, patch) => {
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p) }))
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

      // ── Component ──
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

      // ── Monthly Records ──
      addMonthlyRecord: (data) => {
        const now = nowIso()
        const record: SLAMonthlyRecord = { ...data, id: uid('sla-rec'), createdAt: now, updatedAt: now }
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
    }),
    {
      name: 'flowdesk:monitoring-sla',
      // Seed data only loads on fresh install (no existing localStorage key)
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<MonitoringSLAState>
        if (!p.projects?.length) return current
        return { ...current, ...p }
      },
    },
  ),
)
