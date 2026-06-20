import { usePermissions } from './usePermissions'

const OSM_ROLES = new Set(['admin_osm', 'doccon_osm'])

export function useMonitoringRole() {
  const { role } = usePermissions()
  const roleId = role?.id ?? ''
  return {
    isMonitoringOnly: OSM_ROLES.has(roleId),
    canDeleteMonitoring: roleId !== 'doccon_osm',
  }
}
