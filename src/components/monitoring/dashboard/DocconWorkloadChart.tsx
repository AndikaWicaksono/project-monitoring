import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useMonitoringAssignmentStore } from '../../../store/useMonitoringAssignmentStore'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { useMonitoringSLAStore } from '../../../store/useMonitoringSLAStore'
import { useAuthStore } from '../../../store/useAuthStore'

const COLORS = ['#2563EB', '#0EA5E9', '#059669', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#F97316']
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
}

export function DocconWorkloadChart() {
  const assignments    = useMonitoringAssignmentStore((s) => s.assignments)
  const reportProjects = useMonitoringReportStore((s) => s.projects)
  const slaProjects    = useMonitoringSLAStore((s) => s.projects)
  const users          = useAuthStore((s) => s.users)

  const allCodes = useMemo(() => {
    const codes = new Set<string>()
    reportProjects.forEach((p) => codes.add(p.kodeProject))
    slaProjects.forEach((p) => codes.add(p.kodeProject))
    return [...codes]
  }, [reportProjects, slaProjects])

  const docconUsers = useMemo(
    () => users.filter((u) => u.role === 'doccon_osm' && u.active),
    [users],
  )

  const data = useMemo(() => {
    const countMap: Record<string, number> = {}
    let unassigned = 0

    for (const code of allCodes) {
      const asgn = assignments.find((a) => a.kodeProject === code)
      if (asgn?.assignedDocconId) {
        countMap[asgn.assignedDocconId] = (countMap[asgn.assignedDocconId] ?? 0) + 1
      } else {
        unassigned++
      }
    }

    const result = docconUsers
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
  }, [allCodes, assignments, docconUsers])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Beban Kerja Doccon</h3>
        <span className="text-[11px] text-ink-tertiary">{allCodes.length} project total</span>
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
                formatter={(value: number, name: string) => [`${value} project`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
