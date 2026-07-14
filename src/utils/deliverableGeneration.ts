import type { DeliverablePlanItem, ReportProject } from '../types/monitoring'
import { addReportMonths, listReportMonthsInRange } from '../types/monitoring'

export const ROLLING_WINDOW_MONTHS = 3

// Menghitung periode (YYYY-MM) yang jatuh tempo buat satu item deliverable, sepanjang
// kontrakMulai..kontrakAkhir project. Kalau kontrakAkhir masih null (kontrak open-ended),
// dibatasi rolling window (bulan berjalan + N bulan ke depan) supaya gak generate "selamanya".
export function computeDuePeriods(
  item: Pick<DeliverablePlanItem, 'cadenceMonths'>,
  project: Pick<ReportProject, 'kontrakMulai' | 'kontrakAkhir' | 'excludedMonths'>,
  todayYm: string,
  rollingWindowMonths: number = ROLLING_WINDOW_MONTHS,
): string[] {
  const effectiveEnd = project.kontrakAkhir ?? addReportMonths(todayYm, rollingWindowMonths)
  const excluded = new Set(project.excludedMonths ?? [])
  const cadence = Math.max(1, Math.floor(item.cadenceMonths) || 1)
  return listReportMonthsInRange(project.kontrakMulai, effectiveEnd)
    .filter((ym, idx) => idx % cadence === 0 && !excluded.has(ym))
}
