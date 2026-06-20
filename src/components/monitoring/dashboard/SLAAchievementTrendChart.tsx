import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { SLA_MONTHS, slaMonthLabel, computeProjectMonthAvg } from '../../../types/monitoring'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

const YEAR = new Date().getFullYear()

export function SLAAchievementTrendChart() {
  const projects = useMonitoringSLAStore((s) => s.projects)
  const components = useMonitoringSLAStore((s) => s.components)
  const monthlyRecords = useMonitoringSLAStore((s) => s.monthlyRecords)

  const data = useMemo(() => {
    const avgTarget = projects.length
      ? projects.reduce((sum, p) => sum + p.targetSLA, 0) / projects.length
      : null

    return SLA_MONTHS.map((month) => {
      // Average achievement across ALL project components for this month
      const allRecs = monthlyRecords.filter((r) => r.month === month && r.year === YEAR)
      const avg = allRecs.length
        ? allRecs.reduce((sum, r) => sum + r.achievement, 0) / allRecs.length
        : null
      return {
        month: slaMonthLabel(month),
        'Rata-rata Pencapaian': avg !== null ? Math.round(avg * 10) / 10 : null,
        'Target Rata-rata': avgTarget !== null ? Math.round(avgTarget * 10) / 10 : null,
      }
    })
  }, [projects, components, monthlyRecords])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Tren SLA Achievement</h3>
        <span className="text-[11px] text-ink-tertiary">Rata-rata semua kontrak {YEAR}</span>
      </div>
      <div className="h-[250px]">
        {projects.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data SLA
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} formatter={(v) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={80} stroke="#d97706" strokeDasharray="4 4" label={{ value: '80%', fill: '#d97706', fontSize: 10 }} />
              <Line type="monotone" dataKey="Target Rata-rata" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="Rata-rata Pencapaian" stroke="#E31E24" strokeWidth={2.5} dot={{ r: 3, fill: '#E31E24' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
