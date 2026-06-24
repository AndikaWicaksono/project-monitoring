import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MonitoringCost, MonitoringCostRealization } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

interface MonitoringCostState {
  costs: MonitoringCost[]
  realizations: MonitoringCostRealization[]

  addCost: (data: Omit<MonitoringCost, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringCost
  updateCost: (id: string, patch: Partial<Omit<MonitoringCost, 'id' | 'createdAt'>>) => void
  deleteCost: (id: string) => void
  getCostById: (id: string) => MonitoringCost | undefined

  addRealization: (data: Omit<MonitoringCostRealization, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringCostRealization
  updateRealization: (id: string, patch: Partial<Omit<MonitoringCostRealization, 'id' | 'createdAt'>>) => void
  deleteRealization: (id: string) => void
  getRealizationsByProjectId: (projectId: string) => MonitoringCostRealization[]
}

export const useMonitoringCostStore = create<MonitoringCostState>()(
  persist(
    (set, get) => ({
      costs: [],
      realizations: [],

      addCost: (data) => {
        const now = nowIso()
        const cost: MonitoringCost = { ...data, id: uid('mc'), createdAt: now, updatedAt: now }
        set((s) => ({ costs: [cost, ...s.costs] }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_created',
          message: `Cost project "${data.projectName}" dibuat`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return cost
      },

      updateCost: (id, patch) => {
        set((s) => ({
          costs: s.costs.map((c) => c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_edited',
          message: `Cost project diperbarui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      deleteCost: (id) => {
        set((s) => ({
          costs: s.costs.filter((c) => c.id !== id),
          realizations: s.realizations.filter((r) => r.projectId !== id),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_deleted',
          message: `Cost project dihapus`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      getCostById: (id) => get().costs.find((c) => c.id === id),

      addRealization: (data) => {
        const now = nowIso()
        const real: MonitoringCostRealization = { ...data, id: uid('mcr'), createdAt: now, updatedAt: now }
        set((s) => ({ realizations: [real, ...s.realizations] }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_realization_created',
          message: `Realisasi biaya "${data.itemBiaya}" dibuat`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return real
      },

      updateRealization: (id, patch) => {
        set((s) => ({
          realizations: s.realizations.map((r) => r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_realization_edited',
          message: `Realisasi biaya diperbarui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      deleteRealization: (id) => {
        set((s) => ({ realizations: s.realizations.filter((r) => r.id !== id) }))
        useLogStore.getState().addLog({
          type: 'monitoring_cost_realization_deleted',
          message: `Realisasi biaya dihapus`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      getRealizationsByProjectId: (projectId) =>
        get().realizations.filter((r) => r.projectId === projectId),
    }),
    { name: 'flowdesk:monitoring-cost' },
  ),
)
