import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useMonitoringAssignmentStore } from '../../../store/useMonitoringAssignmentStore'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useAuthStore } from '../../../store/useAuthStore'

const COLORS = ['#0D9488', '#0891B2', '#8B5CF6', '#F59E0B', '#EC4899', '#059669']
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
}

// SOM cuma relevan buat project Report — beda scope dari Doccon (Report+SLA) & Admin OSM (Cost).
export function SOMWorkloadChart() {
  const assignments    = useMonitoringAssignmentStore((s) => s.assignments)
  const reportProjects = useMonitoringReportStore((s) => s.projects)
  const users          = useAuthStore((s) => s.users)

  const reportCodes = useMemo(() => [...new Set(reportProjects.map((p) => p.kodeProject))], [reportProjects])

  const somUsers = useMemo(
    () => users.filter((u) => u.role === 'site_ops_manager' && u.active),
    [users],
  )

  const data = useMemo(() => {
    const countMap: Record<string, number> = {}
    let unassigned = 0

    for (const code of reportCodes) {
      const asgn = assignments.find((a) => a.kodeProject === code)
      if (asgn?.assignedSOMId) {
        countMap[asgn.assignedSOMId] = (countMap[asgn.assignedSOMId] ?? 0) + 1
      } else {
        unassigned++
      }
    }

    const result = somUsers
      .filter((u) => countMap[u.id])
      .map((u, i) => ({
        name:  u.name,
        value: countMap[u.id],
        color: COLORS[i % COLORS.length],
      }))

    if (unassigned > 0) {
      result.push({ name: 'Belum Diassign', value: unassigned, color: '#CBD5E1' })
    }

    return result
  }, [reportCodes, assignments, somUsers])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Beban Kerja Site Ops Manager</h3>
        <span className="text-[11px] text-ink-tertiary">{reportCodes.length} project total</span>
      </div>
      <div className="h-[250px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data project
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [`${typeof value === 'number' ? value : 0} project`, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
