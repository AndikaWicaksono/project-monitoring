import { BarChart2, TrendingUp, AlertTriangle } from 'lucide-react'
import { MonitoringStatsOverview } from '../../components/monitoring/dashboard/MonitoringStatsOverview'
import { SLAAchievementTrendChart } from '../../components/monitoring/dashboard/SLAAchievementTrendChart'
import { ProjectMonitoringTrendChart } from '../../components/monitoring/dashboard/ProjectMonitoringTrendChart'
import { CostRealizationTrendChart } from '../../components/monitoring/dashboard/CostRealizationTrendChart'
import { ReportStatusDistributionChart } from '../../components/monitoring/dashboard/ReportStatusDistributionChart'

export function MonitoringDashboardPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      <MonitoringStatsOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SLAAchievementTrendChart />
        <ProjectMonitoringTrendChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostRealizationTrendChart />
        <ReportStatusDistributionChart />
      </div>

      {/* Cost Overview Section — placeholder */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink-primary">Cost Overview</h2>
          <span className="chip bg-amber-100 text-amber-700">Coming Soon</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              icon: BarChart2,
              title: 'Bar Chart: Actual vs Cost Based per Project',
              desc: 'Perbandingan biaya aktual vs anggaran cost based per project secara bulanan.',
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              icon: TrendingUp,
              title: 'Line Chart: Tren Leading/Lagging per Project',
              desc: 'Tren deviasi realisasi dari rencana — identifikasi project yang leading atau lagging.',
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              icon: AlertTriangle,
              title: 'Top 5 Over Budget Projects',
              desc: 'Daftar 5 project dengan realisasi biaya melampaui anggaran terbesar (% over budget).',
              color: 'text-red-600',
              bg: 'bg-red-50',
            },
          ].map((card) => (
            <div key={card.title} className="surface rounded-xl p-5 flex flex-col gap-3 border border-dashed border-border-subtle opacity-75">
              <div className={classNames('w-9 h-9 rounded-lg flex items-center justify-center', card.bg)}>
                <card.icon size={18} className={card.color} />
              </div>
              <div>
                <div className="text-xs font-semibold text-ink-primary mb-1">{card.title}</div>
                <div className="text-[11px] text-ink-tertiary leading-relaxed">{card.desc}</div>
              </div>
              <div className="mt-auto pt-3 border-t border-border-subtle">
                <span className="text-[10px] text-ink-tertiary">Visualisasi akan dikonfigurasi di iterasi berikutnya</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
