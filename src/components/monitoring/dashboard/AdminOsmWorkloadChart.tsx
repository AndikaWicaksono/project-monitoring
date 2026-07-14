import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useMonitoringAssignmentStore } from '../../../store/useMonitoringAssignmentStore'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'
import { useAuthStore } from '../../../store/useAuthStore'

const COLORS = ['#059669', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6']
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
}

export function AdminOsmWorkloadChart() {
  const assignments = useMonitoringAssignmentStore((s) => s.assignments)
  const costs        = useMonitoringCostStore((s) => s.costs)
  const users         = useAuthStore((s) => s.users)

  const costCodes = useMemo(() => [...new Set(costs.map((c) => c.projectCode))], [costs])

  const adminOsmUsers = useMemo(
    () => users.filter((u) => u.role === 'admin_osm' && u.active),
    [users],
  )

  const data = useMemo(() => {
    const countMap: Record<string, number> = {}
    let unassigned = 0

    for (const code of costCodes) {
      const asgn = assignments.find((a) => a.kodeProject === code)
      if (asgn?.assignedAdminOsmId) {
        countMap[asgn.assignedAdminOsmId] = (countMap[asgn.assignedAdminOsmId] ?? 0) + 1
      } else {
        unassigned++
      }
    }

    const result = adminOsmUsers
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
  }, [costCodes, assignments, adminOsmUsers])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Beban Kerja Admin OSM</h3>
        <span className="text-[11px] text-ink-tertiary">{costCodes.length} project total</span>
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
