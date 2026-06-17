import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MonitoringSLA } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

interface MonitoringSLAState {
  slaRecords: MonitoringSLA[]

  addSLA: (data: Omit<MonitoringSLA, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringSLA
  updateSLA: (id: string, patch: Partial<Omit<MonitoringSLA, 'id' | 'createdAt'>>) => void
  deleteSLA: (id: string) => void
  getById: (id: string) => MonitoringSLA | undefined
}

export const useMonitoringSLAStore = create<MonitoringSLAState>()(
  persist(
    (set, get) => ({
      slaRecords: [],

      addSLA: (data) => {
        const now = nowIso()
        const record: MonitoringSLA = { ...data, id: uid('sla'), createdAt: now, updatedAt: now }
        set((s) => ({ slaRecords: [record, ...s.slaRecords] }))
        useLogStore.getState().addLog({
          type: 'monitoring_sla_created',
          message: `SLA "${data.kontrak}" dibuat`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return record
      },

      updateSLA: (id, patch) => {
        set((s) => ({
          slaRecords: s.slaRecords.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r
          ),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_sla_edited',
          message: `SLA diperbarui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      deleteSLA: (id) => {
        set((s) => ({ slaRecords: s.slaRecords.filter((r) => r.id !== id) }))
        useLogStore.getState().addLog({
          type: 'monitoring_sla_deleted',
          message: `SLA dihapus`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      getById: (id) => get().slaRecords.find((r) => r.id === id),
    }),
    { name: 'flowdesk:monitoring-sla' },
  ),
)
