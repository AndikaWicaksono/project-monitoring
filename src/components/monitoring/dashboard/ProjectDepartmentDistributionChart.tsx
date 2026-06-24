import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

export function ProjectDepartmentDistributionChart() {
  const projects = useMonitoringReportStore((s) => s.projects)

  const data = useMemo(() => {
    const map: Record<string, number> = {}
    projects.forEach((r) => {
      const dept = r.department || 'Lainnya'
      map[dept] = (map[dept] ?? 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dept, count]) => ({ dept, Laporan: count }))
  }, [projects])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Distribusi Laporan per Departemen</h3>
        <span className="text-[11px] text-ink-tertiary">Top departemen</span>
      </div>
      <div className="h-[250px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 60 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="dept" stroke="#475569" tick={{ fontSize: 10 }} width={55} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} cursor={{ fill: 'rgba(227,30,36,0.04)' }} />
              <Bar dataKey="Laporan" fill="#E31E24" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
