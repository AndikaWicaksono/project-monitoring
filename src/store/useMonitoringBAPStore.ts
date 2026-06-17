import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MonitoringBAP, MonitoringBAPChecklist } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

interface MonitoringBAPState {
  bapRecords: MonitoringBAP[]

  addBAP: (data: Omit<MonitoringBAP, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringBAP
  updateBAP: (id: string, patch: Partial<Omit<MonitoringBAP, 'id' | 'createdAt'>>) => void
  updateChecklist: (id: string, checklist: Partial<MonitoringBAPChecklist>) => void
  deleteBAP: (id: string) => void
  getById: (id: string) => MonitoringBAP | undefined
}

const DEFAULT_CHECKLIST: MonitoringBAPChecklist = {
  documentCreated: false,
  internalReview: false,
  customerReview: false,
  approved: false,
  signed: false,
  readyBilling: false,
  completed: false,
}

export const useMonitoringBAPStore = create<MonitoringBAPState>()(
  persist(
    (set, get) => ({
      bapRecords: [],

      addBAP: (data) => {
        const now = nowIso()
        const record: MonitoringBAP = {
          ...data,
          id: uid('bap'),
          checklist: data.checklist ?? DEFAULT_CHECKLIST,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ bapRecords: [record, ...s.bapRecords] }))
        useLogStore.getState().addLog({
          type: 'monitoring_bap_created',
          message: `Dokumen ${data.documentType} untuk "${data.client}" dibuat`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return record
      },

      updateBAP: (id, patch) => {
        set((s) => ({
          bapRecords: s.bapRecords.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r
          ),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_bap_edited',
          message: `Dokumen BAP diperbarui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      updateChecklist: (id, checklist) => {
        set((s) => ({
          bapRecords: s.bapRecords.map((r) =>
            r.id === id
              ? { ...r, checklist: { ...r.checklist, ...checklist }, updatedAt: nowIso() }
              : r
          ),
        }))
      },

      deleteBAP: (id) => {
        set((s) => ({ bapRecords: s.bapRecords.filter((r) => r.id !== id) }))
        useLogStore.getState().addLog({
          type: 'monitoring_bap_deleted',
          message: `Dokumen BAP dihapus`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      getById: (id) => get().bapRecords.find((r) => r.id === id),
    }),
    { name: 'flowdesk:monitoring-bap' },
  ),
)
