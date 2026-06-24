import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

function formatM(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`
  return String(v)
}

export function CostRealizationTrendChart() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)

  const data = useMemo(() => {
    return costs.slice(0, 8).map((c) => {
      const computedActual = realizations
        .filter((r) => r.projectId === c.id)
        .reduce((s, r) => s + r.realisasiBiaya, 0)
      return {
        code: c.projectCode || c.projectName.slice(0, 8),
        'Nilai Kontrak': c.projectValue,
        'Biaya Aktual': computedActual,
      }
    })
  }, [costs, realizations])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Tren Realisasi Cost</h3>
        <span className="text-[11px] text-ink-tertiary">Kontrak vs Aktual</span>
      </div>
      <div className="h-[250px]">
        {costs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data cost
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="code" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={formatM} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={LABEL_STYLE}
                cursor={{ fill: 'rgba(227,30,36,0.04)' }}
                formatter={(v) => [formatM(typeof v === 'number' ? v : 0)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Nilai Kontrak" fill="#002F6C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Biaya Aktual" fill="#E31E24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
