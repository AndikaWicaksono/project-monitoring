import { useUIStore } from '../../store/useUIStore'
import { MonitoringReportModal } from '../monitoring/MonitoringReportModal'
import { MonitoringSLAModal } from '../monitoring/MonitoringSLAModal'
import { MonitoringCostModal } from '../monitoring/MonitoringCostModal'
import { MonitoringCostRealizationModal } from '../monitoring/MonitoringCostRealizationModal'
import { MonitoringBAPModal } from '../monitoring/MonitoringBAPModal'
import { AddTaskModal } from './AddTaskModal'
import { EditTaskModal } from './EditTaskModal'
import { TaskDetailModal } from './TaskDetailModal'
import { HandoffModal } from './HandoffModal'
import { AddTeamModal } from './AddTeamModal'
import { DeleteTeamModal } from './DeleteTeamModal'
import { ShortcutsModal } from './ShortcutsModal'
import { UserManagementModal } from './UserManagementModal'
import { InviteUserModal } from './InviteUserModal'
import { ApprovalQueueModal } from './ApprovalQueueModal'
import { ApprovalDetailModal } from './ApprovalDetailModal'
import { MasterRoleModal } from './MasterRoleModal'
import { WorkflowConfigModal } from './WorkflowConfigModal'
import { StageOwnersModal } from './StageOwnersModal'
import { ProjectListModal } from './ProjectListModal'
import { TaskListModal } from './TaskListModal'
import { HandoffRequirementsModal } from './HandoffRequirementsModal'
import { RequestDeleteTaskModal } from './RequestDeleteTaskModal'
import { DeleteRequestDetailModal } from './DeleteRequestDetailModal'
import { AddProjectModal } from './AddProjectModal'
import { ProjectDetailModal } from './ProjectDetailModal'
import { KanbanConfigModal } from './KanbanConfigModal'
import { SegmentRequestModal } from './SegmentRequestModal'
import { SegmentRequestDetailModal } from './SegmentRequestDetailModal'
import { PromoteStageModal } from './PromoteStageModal'
import { DivisionWorkflowModal } from './DivisionWorkflowModal'

export function ModalsRoot() {
  const modal = useUIStore((s) => s.modal)
  const close = useUIStore((s) => s.closeAllModals)

  if (!modal) return null

  switch (modal.type) {
    case 'add-task':
      return (
        <AddTaskModal
          open
          onClose={close}
          defaultStatus={modal.defaultStatus}
          defaultProjectId={modal.defaultProjectId}
          defaultStage={modal.defaultStage}
        />
      )
    case 'edit-task':
      return <EditTaskModal open onClose={close} taskId={modal.taskId} />
    case 'detail-task':
      return <TaskDetailModal open onClose={close} taskId={modal.taskId} />
    case 'handoff':
      return <HandoffModal open onClose={close} taskId={modal.taskId} />
    case 'add-team':
      return <AddTeamModal open onClose={close} />
    case 'edit-team':
      return <AddTeamModal open onClose={close} teamId={modal.teamId} />
    case 'delete-team':
      return <DeleteTeamModal open onClose={close} teamId={modal.teamId} />
    case 'shortcuts':
      return <ShortcutsModal open onClose={close} />
    case 'user-management':
      return <UserManagementModal open onClose={close} />
    case 'invite-user':
      return <InviteUserModal open onClose={close} userId={modal.userId} />
    case 'approval-queue':
      return <ApprovalQueueModal open onClose={close} />
    case 'approval-detail':
      return <ApprovalDetailModal open onClose={close} requestId={modal.requestId} />
    case 'role-management':
      return <MasterRoleModal open onClose={close} />
    case 'workflow-config':
      return <WorkflowConfigModal open onClose={close} />
    case 'stage-owners':
      return <StageOwnersModal open onClose={close} />
    case 'project-list':
      return <ProjectListModal open onClose={close} stage={modal.stage} />
    case 'task-list':
      return <TaskListModal open onClose={close} statusKey={modal.statusKey} teamIds={modal.teamIds} />
    case 'handoff-requirements':
      return <HandoffRequirementsModal open onClose={close} teamId={modal.teamId} />
    case 'request-delete-task':
      return <RequestDeleteTaskModal open onClose={close} taskId={modal.taskId} />
    case 'delete-request-detail':
      return <DeleteRequestDetailModal open onClose={close} requestId={modal.requestId} />
    case 'add-project':
      return <AddProjectModal open onClose={close} defaultStage={modal.defaultStage} />
    case 'project-detail':
      return <ProjectDetailModal open onClose={close} projectId={modal.projectId} />
    case 'kanban-config':
      return <KanbanConfigModal open onClose={close} teamId={modal.teamId} />
    case 'segment-request':
      return (
        <SegmentRequestModal
          open
          onClose={close}
          teamId={modal.teamId}
          action={modal.action}
          columnId={modal.columnId}
        />
      )
    case 'segment-request-detail':
      return <SegmentRequestDetailModal open onClose={close} requestId={modal.requestId} />
    case 'promote-stage':
      return <PromoteStageModal open onClose={close} taskId={modal.taskId} />
    case 'division-workflow':
      return <DivisionWorkflowModal open onClose={close} teamId={modal.teamId} />

    // ── Monitoring — Report ──────────────────────────────────────
    case 'monitoring-report-create':
      return <MonitoringReportModal open onClose={close} mode="create" />
    case 'monitoring-report-edit':
      return <MonitoringReportModal open onClose={close} mode="edit" reportId={modal.reportId} />
    case 'monitoring-report-detail':
      return <MonitoringReportModal open onClose={close} mode="detail" reportId={modal.reportId} />

    // ── Monitoring — SLA ─────────────────────────────────────────
    case 'monitoring-sla-create':
      return <MonitoringSLAModal open onClose={close} mode="create" />
    case 'monitoring-sla-edit':
      return <MonitoringSLAModal open onClose={close} mode="edit" slaId={modal.slaId} />
    case 'monitoring-sla-detail':
      return <MonitoringSLAModal open onClose={close} mode="detail" slaId={modal.slaId} />

    // ── Monitoring — Cost ─────────────────────────────────────────
    case 'monitoring-cost-create':
      return <MonitoringCostModal open onClose={close} mode="create" />
    case 'monitoring-cost-edit':
      return <MonitoringCostModal open onClose={close} mode="edit" costId={modal.costId} />
    case 'monitoring-cost-detail':
      return <MonitoringCostModal open onClose={close} mode="detail" costId={modal.costId} />
    case 'monitoring-cost-realization-create':
      return <MonitoringCostRealizationModal open onClose={close} mode="create" costId={modal.costId} />
    case 'monitoring-cost-realization-edit':
      return <MonitoringCostRealizationModal open onClose={close} mode="edit" costId={modal.costId} realizationId={modal.realizationId} />

    // ── Monitoring — BAP ──────────────────────────────────────────
    case 'monitoring-bap-create':
      return <MonitoringBAPModal open onClose={close} mode="create" />
    case 'monitoring-bap-edit':
      return <MonitoringBAPModal open onClose={close} mode="edit" bapId={modal.bapId} />
    case 'monitoring-bap-detail':
      return <MonitoringBAPModal open onClose={close} mode="detail" bapId={modal.bapId} />

    default:
      return null
  }
}
