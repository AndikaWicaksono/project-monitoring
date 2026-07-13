import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { MonitoringCost, MonitoringCostRealization } from '../../types/monitoring'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const TOOLTIP_STYLE = {
  background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
}

function fmtAbs(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `Rp ${(abs / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `Rp ${(abs / 1e6).toFixed(0)} Jt`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

interface Props {
  cost: MonitoringCost
  realizations: MonitoringCostRealization[]
}

export function CostLeadingLaggingDetailChart({ cost, realizations }: Props) {
  const data = useMemo(() => {
    const year = cost.year
    let cumPlan = 0, cumActual = 0
    return Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`
      const plan = cost.costBasedMonthly?.[month]?.planned ?? 0
      const actual = realizations
        .filter((r) => r.period === month)
        .reduce((s, r) => s + r.realisasiBiaya, 0)
      cumPlan += plan
      cumActual += actual
      return { month: MONTH_SHORT[i], 'Kum. Plan': cumPlan, 'Kum. Aktual': cumActual }
    })
  }, [cost, realizations])

  const hasData = data.some((d) => d['Kum. Plan'] > 0 || d['Kum. Aktual'] > 0)

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 320 }}>
      <h3 className="text-sm font-semibold text-ink-primary mb-2">Leading / Lagging — Kumulatif Plan vs Aktual</h3>
      {!hasData ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-ink-tertiary">Belum ada data breakdown bulanan.</div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => fmtAbs(v).replace('Rp ', '')} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: 'rgba(15,23,42,0.1)' }}
                formatter={(v) => [fmtAbs(typeof v === 'number' ? v : 0)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Line type="monotone" dataKey="Kum. Plan"   stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Kum. Aktual" stroke="#E31E24" strokeWidth={2.5} dot={{ r: 3, fill: '#E31E24' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
