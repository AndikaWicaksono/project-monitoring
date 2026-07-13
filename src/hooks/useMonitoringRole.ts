import { usePermissions } from './usePermissions'

const MONITORING_ROLES = new Set([
  'admin_osm', 'admin_dmo', 'admin_scs',
  'doccon_osm', 'engineer_os', 'sales', 'kadep', 'kadep_paraf', 'pcrm',
])

const COST_SATKER_MAP: Record<string, string> = {
  admin_osm: 'OSM',
  admin_dmo: 'DMO',
  admin_scs: 'SCS',
}

export function useMonitoringRole() {
  const { role, user } = usePermissions()
  const roleId = role?.id ?? ''

  const isSuperAdmin = roleId === 'super_admin'
  const isAdminOSM   = roleId === 'admin_osm'
  const isAdminDMO   = roleId === 'admin_dmo'
  const isAdminSCS   = roleId === 'admin_scs'
  const isDoccon     = roleId === 'doccon_osm'
  const isEngineerOS = roleId === 'engineer_os'
  const isSales      = roleId === 'sales'
  const isKadiv      = roleId === 'team_admin'
  const isKadep      = roleId === 'kadep'
  // Kadep asli (Kepala Departemen) — paraf laporan & minta revisi ke Doccon. Berbeda dari isKadep (Nurlaela / Jr. Analyst, assign Doccon).
  const isKadepParaf = roleId === 'kadep_paraf'
  const isPcrm       = roleId === 'pcrm'
  const isCostAdmin  = isAdminOSM || isAdminDMO || isAdminSCS

  return {
    isMonitoringOnly:    MONITORING_ROLES.has(roleId),
    isSuperAdmin,
    isSales,
    isAdminOSM,
    isAdminDMO,
    isAdminSCS,
    isCostAdmin,
    isDoccon,
    isEngineerOS,
    isKadiv,
    isKadep,
    isKadepParaf,
    isPcrm,
    canDeleteMonitoring:    isSuperAdmin || (roleId !== 'doccon_osm' && roleId !== 'engineer_os' && roleId !== 'kadep' && roleId !== 'kadep_paraf'),
    canManageProjectPeriod: isSuperAdmin || (!isEngineerOS && !isKadep && !isKadepParaf),
    canEditMonitoring:      isSuperAdmin || (!isEngineerOS && !isKadep && !isKadepParaf),
    // Master data (project + komponen SLA): Doccon hanya bisa lihat & isi data bulanan
    canManageSLAMaster:     isSuperAdmin || (!isEngineerOS && !isKadep && !isKadepParaf && !isDoccon),
    canUnlockRecord:        isSuperAdmin || isAdminOSM,
    // Master data project Cost Monitoring: hanya PCRM yang bisa tambah/edit/hapus project
    canManageCostMaster:    isSuperAdmin || isPcrm,
    canViewCost:            isSuperAdmin || isCostAdmin || isKadiv || isKadep || isKadepParaf || isPcrm,
    // Realisasi pengeluaran: tetap wewenang Admin OSM/DMO/SCS, bukan PCRM (read-only)
    canEditCost:            isSuperAdmin || isCostAdmin,
    // Assign Doccon tetap wewenang Nurlaela (isKadep) — bukan Kadep paraf
    canAssignDoccon:        isSuperAdmin || isKadep,
    costSatker:             COST_SATKER_MAP[roleId] ?? null,
    currentUserId:          user?.id ?? null,
    currentUserName:        user?.name ?? null,
  }
}
