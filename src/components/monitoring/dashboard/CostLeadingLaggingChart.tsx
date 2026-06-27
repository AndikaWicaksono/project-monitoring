import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06']
const MONTH_SHORT: Record<string, string> = {
  '2026-01': 'Jan', '2026-02': 'Feb', '2026-03': 'Mar',
  '2026-04': 'Apr', '2026-05': 'Mei', '2026-06': 'Jun',
}
const STROKE_COLORS = ['#002F6C', '#E31E24', '#8b5cf6', '#0891b2', '#10b981', '#f59e0b']
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }

function fmt(v: number) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}M`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}Jt`
  return `${sign}${abs}`
}

function fmtFull(v: number) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(0)} Jt`
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`
}

export function CostLeadingLaggingChart() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)

  const { chartData, projectKeys } = useMemo(() => {
    const projectKeys = costs.map((c) => c.projectCode.replace(/-00$/, ''))

    const chartData = MONTHS.map((month) => {
      const row: Record<string, number | string> = { month: MONTH_SHORT[month] }
      costs.forEach((c, i) => {
        let cumPlan = 0
        let cumActual = 0
        for (const m of MONTHS) {
          if (m > month) break
          cumPlan   += c.costBasedMonthly?.[m]?.planned ?? 0
          cumActual += realizations
            .filter((r) => r.projectId === c.id && r.period === m)
            .reduce((s, r) => s + r.realisasiBiaya, 0)
        }
        row[projectKeys[i]] = cumActual - cumPlan
      })
      return row
    })

    return { chartData, projectKeys }
  }, [costs, realizations])

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-ink-primary">Tren Leading / Lagging</h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-red-500"><span className="inline-block w-2 h-0.5 bg-red-400 rounded" /> Over</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600"><span className="inline-block w-2 h-0.5 bg-emerald-400 rounded" /> Under</span>
        </div>
      </div>
      <div className="flex-1">
        {costs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">Belum ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: '0', position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: 'rgba(15,23,42,0.1)' }}
                formatter={(v) => [fmtFull(typeof v === 'number' ? v : 0)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {projectKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={STROKE_COLORS[i % STROKE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
