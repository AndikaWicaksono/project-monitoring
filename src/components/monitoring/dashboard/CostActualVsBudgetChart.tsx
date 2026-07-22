import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'
import { getYtdMonths } from '../../../utils/helpers'
import { slaMonthLabel } from '../../../types/monitoring'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }

function fmt(v: number) {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}M`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}Jt`
  return String(v)
}

function fmtFull(v: number) {
  if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toFixed(2)} M`
  if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toFixed(0)} Jt`
  return `Rp ${v.toLocaleString('id-ID')}`
}

export function CostActualVsBudgetChart() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)
  const ytdMonths = useMemo(() => getYtdMonths(), [])
  const ytdYear = ytdMonths[0]?.slice(0, 4) ?? String(new Date().getFullYear())
  const ytdLabel = ytdMonths.length > 1
    ? `${slaMonthLabel(1)}–${slaMonthLabel(ytdMonths.length)} ${ytdYear}`
    : `${slaMonthLabel(1)} ${ytdYear}`

  const data = useMemo(() => costs.map((c) => {
    const ytdPlanned = ytdMonths.reduce((s, m) => s + (c.costBasedMonthly?.[m]?.planned ?? 0), 0)
    const ytdActual  = realizations
      .filter((r) => r.projectId === c.id && ytdMonths.includes(r.period ?? ''))
      .reduce((s, r) => s + r.realisasiBiaya, 0)
    const code = c.projectCode.replace(/-00$/, '')
    return { code, 'Plan YTD': ytdPlanned, 'Aktual YTD': ytdActual, isOver: ytdActual > ytdPlanned }
  }), [costs, realizations, ytdMonths])

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-ink-primary">Aktual vs Plan per Project</h3>
        <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] text-ink-tertiary">{ytdLabel}</span>
      </div>
      <div className="flex-1">
        {costs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">Belum ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="code" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                formatter={(v) => [fmtFull(typeof v === 'number' ? v : 0)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar dataKey="Plan YTD" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Aktual YTD" radius={[3, 3, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.isOver ? '#E31E24' : '#002F6C'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
