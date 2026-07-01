import { usePermissions } from './usePermissions'

const MONITORING_ROLES = new Set([
  'admin_osm', 'admin_dmo', 'admin_scs',
  'doccon_osm', 'engineer_os', 'sales', 'kadep',
])

const COST_SATKER_MAP: Record<string, string> = {
  admin_osm: 'OSM',
  admin_dmo: 'DMO',
  admin_scs: 'SCS',
}

export function useMonitoringRole() {
  const { role, user } = usePermissions()
  const roleId = role?.id ?? ''

  const isAdminOSM   = roleId === 'admin_osm'
  const isAdminDMO   = roleId === 'admin_dmo'
  const isAdminSCS   = roleId === 'admin_scs'
  const isDoccon     = roleId === 'doccon_osm'
  const isEngineerOS = roleId === 'engineer_os'
  const isSales      = roleId === 'sales'
  const isKadiv      = roleId === 'team_admin'
  const isKadep      = roleId === 'kadep'
  const isCostAdmin  = isAdminOSM || isAdminDMO || isAdminSCS

  return {
    isMonitoringOnly:    MONITORING_ROLES.has(roleId),
    isSales,
    isAdminOSM,
    isAdminDMO,
    isAdminSCS,
    isCostAdmin,
    isDoccon,
    isEngineerOS,
    isKadiv,
    isKadep,
    canDeleteMonitoring:    roleId !== 'doccon_osm' && roleId !== 'engineer_os' && roleId !== 'kadep',
    canManageProjectPeriod: !isEngineerOS && !isKadep,
    canEditMonitoring:      !isEngineerOS && !isKadep,
    canUnlockRecord:     isAdminOSM || roleId === 'super_admin',
    canViewCost:         isCostAdmin || isKadiv || isKadep,
    canEditCost:         isCostAdmin,
    canAssignDoccon:     isKadep,
    costSatker:          COST_SATKER_MAP[roleId] ?? null,
    currentUserId:       user?.id ?? null,
    currentUserName:     user?.name ?? null,
  }
}
