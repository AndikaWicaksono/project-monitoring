import { create } from 'zustand'
import type { Filters, PageView } from '../types'

export type ModalType =
  | { type: 'add-task'; defaultStatus?: import('../types').Status; defaultProjectId?: string; defaultStage?: import('../types').BusinessStage }
  | { type: 'edit-task'; taskId: string }
  | { type: 'detail-task'; taskId: string }
  | { type: 'handoff'; taskId: string }
  | { type: 'add-team' }
  | { type: 'edit-team'; teamId: string }
  | { type: 'delete-team'; teamId: string }
  | { type: 'shortcuts' }
  | { type: 'user-management' }
  | { type: 'invite-user'; userId?: string }
  | { type: 'approval-queue' }
  | { type: 'approval-detail'; requestId: string }
  | { type: 'role-management' }
  | { type: 'workflow-config' }
  | { type: 'stage-owners' }
  | { type: 'project-list'; stage: import('../types').BusinessStage }
  | { type: 'task-list'; statusKey: string; teamIds: string[] | null }
  | { type: 'handoff-requirements'; teamId: string }
  | { type: 'request-delete-task'; taskId: string }
  | { type: 'delete-request-detail'; requestId: string }
  | { type: 'add-project'; defaultStage?: import('../types').BusinessStage }
  | { type: 'project-detail'; projectId: string }
  | { type: 'project-advance'; projectId: string }
  | { type: 'kanban-config'; teamId: string }
  | { type: 'segment-request'; teamId: string; action: 'add' | 'remove'; columnId?: string }
  | { type: 'segment-request-detail'; requestId: string }
  | { type: 'promote-stage'; taskId: string }
  | { type: 'division-workflow'; teamId: string }
  // Monitoring — Report Project
  | { type: 'monitoring-report-project-create' }
  | { type: 'monitoring-report-project-edit'; projectId: string }
  | { type: 'monitoring-report-document-create'; projectId: string; docType: 'customer' | 'vendor' }
  | { type: 'monitoring-report-document-edit'; documentId: string }
  | { type: 'monitoring-report-document-detail'; documentId: string }
  // Monitoring — Billing Tracker
  | { type: 'monitoring-billing-create'; projectId: string }
  | { type: 'monitoring-billing-edit'; billingId: string }
  // Monitoring — SLA
  | { type: 'monitoring-sla-project-create' }
  | { type: 'monitoring-sla-project-edit'; projectId: string }
  | { type: 'monitoring-sla-component-add'; projectId: string }
  | { type: 'monitoring-sla-component-edit'; componentId: string }
  | { type: 'monitoring-sla-monthly-add'; componentId: string; projectId: string }
  | { type: 'monitoring-sla-monthly-edit'; recordId: string }
  // Monitoring — Cost
  | { type: 'monitoring-cost-create' }
  | { type: 'monitoring-cost-edit'; costId: string }
  | { type: 'monitoring-cost-detail'; costId: string }
  | { type: 'monitoring-cost-realization-create'; costId: string }
  | { type: 'monitoring-cost-realization-edit'; realizationId: string; costId: string }
  // Monitoring — BAP
  | { type: 'monitoring-bap-create' }
  | { type: 'monitoring-bap-edit'; bapId: string }
  | { type: 'monitoring-bap-detail'; bapId: string }

interface UIState {
  view: PageView
  setView: (v: PageView) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void

  activityLogOpen: boolean
  toggleActivityLog: () => void
  setActivityLogOpen: (open: boolean) => void

  filters: Filters
  setSearch: (q: string) => void
  togglePriority: (p: import('../types').Priority) => void
  toggleTeamFilter: (id: string) => void
  toggleStatusFilter: (s: import('../types').Status) => void
  setProjectFilter: (projectId: string | null) => void
  resetFilters: () => void

  /** Stage L0 yang dipilih saat masuk Board Divisi via klik stage column. */
  boardStageContext: import('../types').BusinessStage | null
  setBoardStageContext: (s: import('../types').BusinessStage | null) => void

  slaDetailProjectId: string | null
  setSlaDetailProjectId: (id: string | null) => void

  reportDetailProjectId: string | null
  setReportDetailProjectId: (id: string | null) => void

  sidebarTeamFilter: string | null
  setSidebarTeamFilter: (id: string | null) => void

  modal: ModalType | null
  openModal: (m: ModalType) => void
  closeAllModals: () => void

  searchFocusToken: number
  focusSearch: () => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'project-board',
  setView: (v) => set({ view: v }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  activityLogOpen: false,
  toggleActivityLog: () => set((s) => ({ activityLogOpen: !s.activityLogOpen })),
  setActivityLogOpen: (open) => set({ activityLogOpen: open }),

  filters: { search: '', priorities: [], teamIds: [], statuses: [], projectId: null },
  setSearch: (q) => set((s) => ({ filters: { ...s.filters, search: q } })),
  setProjectFilter: (projectId) => set((s) => ({ filters: { ...s.filters, projectId } })),
  togglePriority: (p) =>
    set((s) => ({
      filters: {
        ...s.filters,
        priorities: s.filters.priorities.includes(p)
          ? s.filters.priorities.filter((x) => x !== p)
          : [...s.filters.priorities, p],
      },
    })),
  toggleTeamFilter: (id) =>
    set((s) => ({
      filters: {
        ...s.filters,
        teamIds: s.filters.teamIds.includes(id)
          ? s.filters.teamIds.filter((x) => x !== id)
          : [...s.filters.teamIds, id],
      },
    })),
  toggleStatusFilter: (st) =>
    set((s) => ({
      filters: {
        ...s.filters,
        statuses: s.filters.statuses.includes(st)
          ? s.filters.statuses.filter((x) => x !== st)
          : [...s.filters.statuses, st],
      },
    })),
  resetFilters: () => set({ filters: { search: '', priorities: [], teamIds: [], statuses: [], projectId: null }, sidebarTeamFilter: null }),

  sidebarTeamFilter: null,
  setSidebarTeamFilter: (id) => set({ sidebarTeamFilter: id }),

  boardStageContext: null,
  setBoardStageContext: (s) => set({ boardStageContext: s }),

  slaDetailProjectId: null,
  setSlaDetailProjectId: (id) => set({ slaDetailProjectId: id }),

  reportDetailProjectId: null,
  setReportDetailProjectId: (id) => set({ reportDetailProjectId: id }),

  modal: null,
  openModal: (m) => set({ modal: m }),
  closeAllModals: () => set({ modal: null }),

  searchFocusToken: 0,
  focusSearch: () => set((s) => ({ searchFocusToken: s.searchFocusToken + 1 })),
}))
