import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, CheckCircle2, FileText, TrendingUp, DollarSign, FileCheck } from 'lucide-react'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'
import { getEffectiveCostStatus } from '../../../types/monitoring'
import { useMonitoringRole } from '../../../hooks/useMonitoringRole'

// Hitung berapa item yang createdAt-nya jatuh di bulan berjalan — dipakai buat teks trend
// singkat di bawah angka utama kartu KPI (cuma dipasang di metrik kumulatif yang wajar
// dibandingkan "penambahan bulan ini"; metrik status kayak Project Aktif/Closed dilewati
// karena "+N bulan ini" gak punya makna yang jujur buat angka itu).
function countThisMonth(items: { createdAt: string }[]): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return items.filter((i) => {
    const d = new Date(i.createdAt)
    return d.getFullYear() === year && d.getMonth() === month
  }).length
}

export function MonitoringStatsOverview() {
  const { canViewCost } = useMonitoringRole()

  const reportProjects   = useMonitoringReportStore((s) => s.projects)
  const billingDocuments = useMonitoringReportStore((s) => s.billingDocuments)
  const slaProjects      = useMonitoringSLAStore((s) => s.projects)
  const costs            = useMonitoringCostStore((s) => s.costs)

  const stats = useMemo(() => ({
    activeProjects:   costs.filter((c) => getEffectiveCostStatus(c.startDate, c.endDate, c.status === 'cancelled') === 'active').length,
    closedProjects:   costs.filter((c) => getEffectiveCostStatus(c.startDate, c.endDate, c.status === 'cancelled') === 'closed').length,
    totalReports:     reportProjects.length,
    totalSLA:         slaProjects.length,
    totalCostProjects: costs.length,
    billingCompleted: billingDocuments.filter((b) => b.status === 'COMPLETED').length,
    billingTotal:     billingDocuments.length,
    costsThisMonth:   countThisMonth(costs),
    reportsThisMonth: countThisMonth(reportProjects),
    slaThisMonth:     countThisMonth(slaProjects),
  }), [reportProjects, slaProjects, costs, billingDocuments])

  // Kartu khusus admin_osm (cost monitoring)
  const costCards = [
    {
      label: 'Project Aktif',
      value: stats.activeProjects,
      icon: <Briefcase size={16} />,
      accent: 'from-blue-400 to-transparent',
      bg: 'bg-blue-100',
      tone: 'text-blue-700',
      valueTone: 'text-blue-700',
    },
    {
      label: 'Project Closed',
      value: stats.closedProjects,
      icon: <CheckCircle2 size={16} />,
      accent: 'from-emerald-400 to-transparent',
      bg: 'bg-emerald-100',
      tone: 'text-emerald-700',
      valueTone: 'text-emerald-700',
    },
    {
      label: 'Total Cost Project',
      value: stats.totalCostProjects,
      icon: <DollarSign size={16} />,
      accent: 'from-amber-400 to-transparent',
      bg: 'bg-amber-100',
      tone: 'text-amber-700',
      valueTone: 'text-amber-700',
      trend: stats.costsThisMonth > 0 ? `+${stats.costsThisMonth} baru bulan ini` : undefined,
    },
    {
      label: 'Billing Selesai',
      value: `${stats.billingCompleted}/${stats.billingTotal}`,
      icon: <FileCheck size={16} />,
      accent: 'from-pertamina-red to-transparent',
      bg: 'bg-pertamina-red-50',
      tone: 'text-pertamina-red',
      valueTone: 'text-pertamina-red',
    },
  ]

  // Kartu untuk doccon_osm & engineer_os (SLA & Report)
  const slaReportCards = [
    {
      label: 'Total Project SLA',
      value: stats.totalSLA,
      icon: <TrendingUp size={16} />,
      accent: 'from-cyan-400 to-transparent',
      bg: 'bg-cyan-100',
      tone: 'text-cyan-700',
      valueTone: 'text-cyan-700',
      trend: stats.slaThisMonth > 0 ? `+${stats.slaThisMonth} baru bulan ini` : undefined,
    },
    {
      label: 'Total Laporan',
      value: stats.totalReports,
      icon: <FileText size={16} />,
      accent: 'from-violet-400 to-transparent',
      bg: 'bg-violet-100',
      tone: 'text-violet-700',
      valueTone: 'text-violet-700',
      trend: stats.reportsThisMonth > 0 ? `+${stats.reportsThisMonth} baru bulan ini` : undefined,
    },
    {
      label: 'Billing Selesai',
      value: `${stats.billingCompleted}/${stats.billingTotal}`,
      icon: <FileCheck size={16} />,
      accent: 'from-pertamina-red to-transparent',
      bg: 'bg-pertamina-red-50',
      tone: 'text-pertamina-red',
      valueTone: 'text-pertamina-red',
    },
  ]

  const cards = canViewCost ? costCards : slaReportCards

  return (
    <div className={`grid gap-3 ${canViewCost ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="surface relative overflow-hidden rounded-xl p-4"
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
              <div className={`mt-1.5 text-2xl font-semibold ${c.valueTone}`}>{c.value}</div>
              {c.trend && <div className="mt-1 text-[10px] font-medium text-emerald-600">{c.trend}</div>}
            </div>
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${c.bg} ${c.tone}`}>{c.icon}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
