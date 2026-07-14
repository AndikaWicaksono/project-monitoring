import { usePermissions } from './usePermissions'
import { useMonitoringAssignmentStore } from '../store/useMonitoringAssignmentStore'

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
  const assignments = useMonitoringAssignmentStore((s) => s.assignments)
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

  // Realisasi pengeluaran: DMO/SCS tetap broad-role, Admin OSM sekarang per-project
  // (di-assign Nurlaela lewat useMonitoringAssignmentStore, sama seperti assign Doccon).
  function canEditCostForProject(kodeProject: string): boolean {
    if (isSuperAdmin || isAdminDMO || isAdminSCS) return true
    if (!isAdminOSM) return false
    const asgn = assignments.find((a) => a.kodeProject === kodeProject)
    return !!asgn?.assignedAdminOsmId && asgn.assignedAdminOsmId === (user?.id ?? null)
  }

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
    // Master data project Cost Monitoring: PCRM atau Nurlaela (isKadep) bisa tambah/edit/hapus project
    canManageCostMaster:    isSuperAdmin || isPcrm || isKadep,
    canViewCost:            isSuperAdmin || isCostAdmin || isKadiv || isKadep || isKadepParaf || isPcrm,
    canEditCostForProject,
    // Assign Doccon tetap wewenang Nurlaela (isKadep) — bukan Kadep paraf
    canAssignDoccon:        isSuperAdmin || isKadep,
    costSatker:             COST_SATKER_MAP[roleId] ?? null,
    currentUserId:          user?.id ?? null,
    currentUserName:        user?.name ?? null,
  }
}
