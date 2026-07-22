import type { ReportDocument, DocPhase } from '../types/monitoring'

export interface PhaseStep {
  key: DocPhase
  label: string
}

const NEW_CUSTOMER_PHASES: PhaseStep[] = [
  { key: 'engineer', label: 'Engineer' },
  { key: 'doccon', label: 'Doccon' },
  { key: 'som', label: 'Site Ops Manager' },
  { key: 'kadep', label: 'Kadep' },
  { key: 'kadiv', label: 'Kadiv' },
  { key: 'customer_email', label: 'Customer' },
  { key: 'sales', label: 'Sales' },
]

const DOCCON_START_PHASES: PhaseStep[] = [
  { key: 'doccon', label: 'Doccon' },
  { key: 'som', label: 'Site Ops Manager' },
  { key: 'kadep', label: 'Kadep' },
  { key: 'kadiv', label: 'Kadiv' },
  { key: 'customer_email', label: 'Customer' },
  { key: 'sales', label: 'Sales' },
]

const NEW_VENDOR_PHASES: PhaseStep[] = [
  { key: 'doccon', label: 'Doccon' },
  { key: 'kadep', label: 'Kadep' },
  { key: 'kadiv', label: 'Kadiv' },
  { key: 'vendor_confirm', label: 'Vendor' },
  { key: 'completed', label: 'Selesai' },
]

const LEGACY_PHASES: PhaseStep[] = [
  { key: 'engineer', label: 'Engineer' },
  { key: 'customer', label: 'Customer' },
  { key: 'doccon', label: 'Doccon' },
]

const CUSTOMER_FLOW_PHASES: DocPhase[] = ['engineer', 'doccon', 'som', 'kadep', 'kadiv', 'customer_email', 'sales']

// Susunan pipeline approval satu dokumen — satu-satunya sumber, dipakai PhaseStepperMini
// (MonitoringReportDetailPage) dan panel "Phase Pipeline" di MonitoringReportDocumentModal,
// supaya SOM/skip-Kadiv gak perlu di-duplikasi tiap ada perubahan alur.
export function getDocPhaseSteps(doc: ReportDocument): PhaseStep[] {
  const current = doc.currentPhase ?? 'engineer'
  const isVendor = doc.docType === 'vendor'
  const isLegacy = !isVendor && (current === 'customer' || !CUSTOMER_FLOW_PHASES.includes(current))

  let base: PhaseStep[]
  if (isVendor) base = NEW_VENDOR_PHASES
  else if (isLegacy) base = LEGACY_PHASES
  else if (doc.startPhase === 'doccon') base = DOCCON_START_PHASES
  else base = NEW_CUSTOMER_PHASES

  return doc.requiresKadiv === false ? base.filter((s) => s.key !== 'kadiv') : base
}
