import { usePermissions } from './usePermissions'

const MONITORING_ROLES = new Set(['admin_osm', 'doccon_osm', 'engineer_os', 'sales'])

export function useMonitoringRole() {
  const { role } = usePermissions()
  const roleId = role?.id ?? ''

  const isAdminOSM   = roleId === 'admin_osm'
  const isDoccon     = roleId === 'doccon_osm'
  const isEngineerOS = roleId === 'engineer_os'
  const isSales      = roleId === 'sales'
  const isKadiv      = roleId === 'team_admin'

  return {
    isMonitoringOnly:    MONITORING_ROLES.has(roleId),
    isSales,
    isAdminOSM,
    isDoccon,
    isEngineerOS,
    isKadiv,
    canDeleteMonitoring: roleId !== 'doccon_osm' && roleId !== 'engineer_os',
    canEditMonitoring:   !isEngineerOS,
    canUnlockRecord:     isAdminOSM || roleId === 'super_admin',
    // Cost: kadiv bisa lihat (view-only), hanya admin_osm yang bisa edit/tambah/hapus
    canViewCost:         isAdminOSM || isKadiv,
    canEditCost:         isAdminOSM,
  }
}
