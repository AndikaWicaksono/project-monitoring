import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid, nowIso } from '../utils/helpers'
import { useMonitoringReportStore } from './useMonitoringReportStore'

// Satu record per kodeProject, diisi Nurlaela — sekarang menaungi dua tanggung jawab independen:
// assignedDoccon* (siapa yang kerjakan laporan) dan assignedAdminOsm* (siapa yang input realisasi biaya).
export interface DocconAssignment {
  id: string
  kodeProject: string
  assignedDocconId: string | null
  assignedAt: string | null
  assignedByUserId: string | null
  assignedByName: string | null
  assignedAdminOsmId?: string | null
  assignedAdminOsmName?: string | null
  assignedAdminOsmAt?: string | null
}

interface MonitoringAssignmentState {
  assignments: DocconAssignment[]
  assign: (
    kodeProject: string,
    docconId: string | null,
    byUserId: string | null,
    byName: string | null,
  ) => void
  assignAdminOsm: (
    kodeProject: string,
    adminOsmId: string | null,
    adminOsmName: string | null,
    byUserId: string | null,
    byName: string | null,
  ) => void
  removeByKode: (kodeProject: string) => void
  getByKode: (kodeProject: string) => DocconAssignment | undefined
}

// ── Seed assignments ─────────────────────────────────────────────────────────
// Distribution:
//   Resyah  (usr_doccon_osm)    → 4 projects
//   Annita  (usr_doccon_annita) → 3 projects
//   Addini  (usr_doccon_addini) → 2 projects
//   Unassigned                  → 2 projects (PGN-DC-003, PS-025-01)

const TS = '2026-06-01T08:00:00.000Z'
const BY_ID = 'usr_kadep'
const BY_NAME = 'Nurlaela Ginting'

// Admin OSM (Cost Monitoring realisasi):
//   Mekar Fauziah   (usr_admin_osm)         → PS-024-00
//   Masyita Mustika (usr_admin_osm_masyita) → PS-025-00
//   PS-026-00 & PGN-IT-001                  → belum diassign (demo state)

const SEED_ASSIGNMENTS: DocconAssignment[] = [
  // Resyah
  { id: 'asgn-ps024',   kodeProject: 'PS-024-00',   assignedDocconId: 'usr_doccon_osm',    assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME,
    assignedAdminOsmId: 'usr_admin_osm', assignedAdminOsmName: 'Mekar Fauziah', assignedAdminOsmAt: TS },
  { id: 'asgn-pgn001',  kodeProject: 'PGN-IT-001',  assignedDocconId: 'usr_doccon_osm',    assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  { id: 'asgn-ms003',   kodeProject: 'MS-0003',      assignedDocconId: 'usr_doccon_osm',    assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  { id: 'asgn-ms030',   kodeProject: 'MS-0030',      assignedDocconId: 'usr_doccon_osm',    assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  // Annita
  { id: 'asgn-pgn002',  kodeProject: 'PGN-SEC-002',  assignedDocconId: 'usr_doccon_annita', assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  { id: 'asgn-ps025',   kodeProject: 'PS-025-00',    assignedDocconId: 'usr_doccon_annita', assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME,
    assignedAdminOsmId: 'usr_admin_osm_masyita', assignedAdminOsmName: 'Masyita Mustika', assignedAdminOsmAt: TS },
  { id: 'asgn-ms026',   kodeProject: 'MS-0026',      assignedDocconId: 'usr_doccon_annita', assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  // Addini
  { id: 'asgn-ps026',   kodeProject: 'PS-026-00',    assignedDocconId: 'usr_doccon_addini', assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  { id: 'asgn-ms004',   kodeProject: 'MS-0004',      assignedDocconId: 'usr_doccon_addini', assignedAt: TS, assignedByUserId: BY_ID, assignedByName: BY_NAME },
  // Unassigned — demo purposes
  { id: 'asgn-pgn003',  kodeProject: 'PGN-DC-003',   assignedDocconId: null,                assignedAt: null, assignedByUserId: null, assignedByName: null },
  { id: 'asgn-ps025-1', kodeProject: 'PS-025-01',    assignedDocconId: null,                assignedAt: null, assignedByUserId: null, assignedByName: null },
]

export const useMonitoringAssignmentStore = create<MonitoringAssignmentState>()(
  persist(
    (set, get) => ({
      assignments: SEED_ASSIGNMENTS,

      assign: (kodeProject, docconId, byUserId, byName) => {
        set((state) => {
          const idx = state.assignments.findIndex((a) => a.kodeProject === kodeProject)
          if (idx >= 0) {
            const updated = [...state.assignments]
            updated[idx] = {
              ...updated[idx],
              assignedDocconId: docconId,
              assignedAt: docconId ? nowIso() : null,
              assignedByUserId: docconId ? byUserId : null,
              assignedByName: docconId ? byName : null,
            }
            return { assignments: updated }
          }
          // New record for a project not in seed
          return {
            assignments: [
              ...state.assignments,
              {
                id: uid(),
                kodeProject,
                assignedDocconId: docconId,
                assignedAt: docconId ? nowIso() : null,
                assignedByUserId: docconId ? byUserId : null,
                assignedByName: docconId ? byName : null,
              },
            ],
          }
        })
        // Project baru saja diassign ke Doccon — generate dokumen deliverable yang jatuh tempo (no-op kalau belum ada Deliverable Plan)
        if (docconId) {
          useMonitoringReportStore.getState().generateDeliverablesForKodeProject(kodeProject, docconId)
        }
      },

      assignAdminOsm: (kodeProject, adminOsmId, adminOsmName, byUserId, byName) => {
        set((state) => {
          const idx = state.assignments.findIndex((a) => a.kodeProject === kodeProject)
          const patch = {
            assignedAdminOsmId: adminOsmId,
            assignedAdminOsmName: adminOsmId ? adminOsmName : null,
            assignedAdminOsmAt: adminOsmId ? nowIso() : null,
          }
          if (idx >= 0) {
            const updated = [...state.assignments]
            updated[idx] = { ...updated[idx], ...patch }
            return { assignments: updated }
          }
          // New record for a project not in seed
          return {
            assignments: [
              ...state.assignments,
              { id: uid(), kodeProject, assignedDocconId: null, assignedAt: null, assignedByUserId: byUserId, assignedByName: byName, ...patch },
            ],
          }
        })
      },

      removeByKode: (kodeProject) => {
        set((state) => ({
          assignments: state.assignments.filter((a) => a.kodeProject !== kodeProject),
        }))
      },

      getByKode: (kodeProject) => get().assignments.find((a) => a.kodeProject === kodeProject),
    }),
    { name: 'monitoring-assignment-v1' },
  ),
)
