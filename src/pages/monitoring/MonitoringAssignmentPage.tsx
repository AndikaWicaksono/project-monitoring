import { DocconAssignmentSection } from '../../components/monitoring/dashboard/DocconAssignmentSection'
import { useMonitoringRole } from '../../hooks/useMonitoringRole'

export function MonitoringAssignmentPage() {
  const { canAssignDoccon } = useMonitoringRole()

  return (
    <div className="absolute inset-0 overflow-y-auto p-5">
      <DocconAssignmentSection canAssign={canAssignDoccon} />
    </div>
  )
}
