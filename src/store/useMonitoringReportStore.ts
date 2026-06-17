import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MonitoringProjectReport, MonitoringReportActivity, MonitoringReportStatus } from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

interface MonitoringReportState {
  reports: MonitoringProjectReport[]

  addReport: (data: Omit<MonitoringProjectReport, 'id' | 'revisionCount' | 'status' | 'activities' | 'createdAt' | 'updatedAt'>) => MonitoringProjectReport
  updateReport: (id: string, patch: Partial<Omit<MonitoringProjectReport, 'id' | 'activities' | 'createdAt'>>) => void
  deleteReport: (id: string) => void

  submitReport: (id: string, byUserId: string, byName: string, comment?: string) => void
  approveReport: (id: string, byUserId: string, byName: string, comment?: string) => void
  requestRevision: (id: string, byUserId: string, byName: string, comment: string) => void
  resubmitReport: (id: string, byUserId: string, byName: string, comment?: string) => void

  getById: (id: string) => MonitoringProjectReport | undefined
}

function addActivity(report: MonitoringProjectReport, act: Omit<MonitoringReportActivity, 'id' | 'timestamp'>): MonitoringReportActivity {
  return { id: uid('mra'), timestamp: nowIso(), comment: '', ...act }
}

export const useMonitoringReportStore = create<MonitoringReportState>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (data) => {
        const now = nowIso()
        const activity: MonitoringReportActivity = {
          id: uid('mra'),
          action: 'CREATE',
          byUserId: data.createdByUserId,
          byName: data.createdByName,
          comment: '',
          timestamp: now,
        }
        const report: MonitoringProjectReport = {
          ...data,
          id: uid('mr'),
          revisionCount: 0,
          status: 'CREATE',
          activities: [activity],
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ reports: [report, ...s.reports] }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_created',
          message: `Laporan "${data.namaKontrak}" dibuat`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return report
      },

      updateReport: (id, patch) => {
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r
          ),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_edited',
          message: `Laporan diperbarui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      deleteReport: (id) => {
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_deleted',
          message: `Laporan dihapus`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      submitReport: (id, byUserId, byName, comment = '') => {
        const now = nowIso()
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== id) return r
            const status: MonitoringReportStatus = 'UNDER_APPROVAL'
            const act = addActivity(r, { action: 'SUBMIT', byUserId, byName, comment })
            return { ...r, status, submitDate: now, activities: [...r.activities, act], updatedAt: now }
          }),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_submitted',
          message: `Laporan disubmit untuk approval`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      approveReport: (id, byUserId, byName, comment = '') => {
        const now = nowIso()
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== id) return r
            const status: MonitoringReportStatus = 'APPROVED'
            const act = addActivity(r, { action: 'APPROVE', byUserId, byName, comment })
            return { ...r, status, feedbackDate: now, activities: [...r.activities, act], updatedAt: now }
          }),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_approved',
          message: `Laporan disetujui`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      requestRevision: (id, byUserId, byName, comment) => {
        const now = nowIso()
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== id) return r
            const status: MonitoringReportStatus = 'UNDER_REVISION'
            const act = addActivity(r, { action: 'REQUEST_REVISION', byUserId, byName, comment })
            return { ...r, status, feedback: comment, feedbackDate: now, activities: [...r.activities, act], updatedAt: now }
          }),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_revision',
          message: `Revisi diminta untuk laporan`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      resubmitReport: (id, byUserId, byName, comment = '') => {
        const now = nowIso()
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== id) return r
            const status: MonitoringReportStatus = 'UNDER_APPROVAL'
            const act = addActivity(r, { action: 'RESUBMIT', byUserId, byName, comment })
            return {
              ...r,
              status,
              revisionCount: r.revisionCount + 1,
              submitDate: now,
              activities: [...r.activities, act],
              updatedAt: now,
            }
          }),
        }))
        useLogStore.getState().addLog({
          type: 'monitoring_report_resubmitted',
          message: `Laporan diresubmit setelah revisi`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
      },

      getById: (id) => get().reports.find((r) => r.id === id),
    }),
    { name: 'flowdesk:monitoring-report' },
  ),
)
