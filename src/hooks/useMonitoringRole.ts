import { usePermissions } from './usePermissions'

const MONITORING_ROLES = new Set(['admin_osm', 'doccon_osm', 'engineer_os'])

export function useMonitoringRole() {
  const { role } = usePermissions()
  const roleId = role?.id ?? ''

  const isAdminOSM    = roleId === 'admin_osm'
  const isDoccon      = roleId === 'doccon_osm'
  const isEngineerOS  = roleId === 'engineer_os'

  return {
    isMonitoringOnly:   MONITORING_ROLES.has(roleId),
    isAdminOSM,
    isDoccon,
    isEngineerOS,
    canDeleteMonitoring: roleId !== 'doccon_osm' && roleId !== 'engineer_os',
    canEditMonitoring:  !isEngineerOS,
    canUnlockRecord:    isAdminOSM || roleId === 'super_admin',
  }
}
