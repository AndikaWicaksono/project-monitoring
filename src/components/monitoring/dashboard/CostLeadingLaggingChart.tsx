import { useMemo, useState } from 'react'
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
const TOOLTIP_STYLE = {
  background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)',
  borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
}

function fmt(v: number) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}M`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}Jt`
  return `${sign}${abs}`
}

function fmtAbs(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `Rp ${(abs / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `Rp ${(abs / 1e6).toFixed(0)} Jt`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

function fmtVariance(v: number) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(0)} Jt`
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`
}

export function CostLeadingLaggingChart() {
  const costs       = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)

  const [selectedId, setSelectedId] = useState<string>('all')

  // ── All-projects overview (multi-line) ──────────────────────────────────────
  const { overviewData, projectEntries } = useMemo(() => {
    const projectEntries = costs.map((c, i) => ({
      id: c.id,
      code: c.projectCode.replace(/-00$/, ''),
      color: STROKE_COLORS[i % STROKE_COLORS.length],
    }))

    const overviewData = MONTHS.map((month) => {
      const row: Record<string, number | string> = { month: MONTH_SHORT[month] }
      costs.forEach((c, i) => {
        let cumPlan = 0, cumActual = 0
        for (const m of MONTHS) {
          if (m > month) break
          cumPlan   += c.costBasedMonthly?.[m]?.planned ?? 0
          cumActual += realizations
            .filter((r) => r.projectId === c.id && r.period === m)
            .reduce((s, r) => s + r.realisasiBiaya, 0)
        }
        row[projectEntries[i].code] = cumActual - cumPlan
      })
      return row
    })

    return { overviewData, projectEntries }
  }, [costs, realizations])

  // ── Single-project detail: S-curve kumulatif ───────────────────────────────
  const detailData = useMemo(() => {
    if (selectedId === 'all') return []
    const c = costs.find((x) => x.id === selectedId)
    if (!c) return []

    let cumPlan = 0, cumActual = 0
    return MONTHS.map((month) => {
      const plan   = c.costBasedMonthly?.[month]?.planned ?? 0
      const actual = realizations
        .filter((r) => r.projectId === c.id && r.period === month)
        .reduce((s, r) => s + r.realisasiBiaya, 0)
      cumPlan   += plan
      cumActual += actual
      return { month: MONTH_SHORT[month], 'Kum. Plan': cumPlan, 'Kum. Aktual': cumActual }
    })
  }, [selectedId, costs, realizations])

  const selectedProject = costs.find((c) => c.id === selectedId)
  const selectedEntry   = projectEntries.find((e) => e.id === selectedId)

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold text-ink-primary shrink-0">
          {selectedId === 'all' ? 'Tren Leading / Lagging' : 'Detail Leading / Lagging'}
        </h3>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input-base text-[11px] py-0.5 pr-6 h-6 min-w-0 max-w-[160px]"
        >
          <option value="all">Semua Project</option>
          {costs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.projectCode.replace(/-00$/, '')} — {c.projectClient.slice(0, 16)}
            </option>
          ))}
        </select>
      </div>

      {costs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-ink-tertiary">Belum ada data</div>
      ) : selectedId === 'all' ? (
        /* ── Multi-line overview ── */
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overviewData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(15,23,42,0.1)' }} formatter={(v) => [fmtVariance(typeof v === 'number' ? v : 0)]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {projectEntries.map((e) => (
                <Line key={e.code} type="monotone" dataKey={e.code} stroke={e.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* ── Single-project detail ── */
        <div className="flex flex-col flex-1 gap-1.5">
          {/* Project info strip */}
          <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-2.5 py-1.5">
            <span className="text-[11px] font-mono font-semibold" style={{ color: selectedEntry?.color }}>
              {selectedEntry?.code}
            </span>
            <span className="text-[10px] text-ink-tertiary truncate">{selectedProject?.projectName}</span>
            <span className="ml-auto text-[10px] text-ink-tertiary shrink-0">{selectedProject?.projectClient}</span>
          </div>

          {/* S-curve: dua garis kumulatif Plan vs Aktual */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detailData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => fmtAbs(v).replace('Rp ', '')} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ stroke: 'rgba(15,23,42,0.1)' }}
                  formatter={(v) => [fmtAbs(typeof v === 'number' ? v : 0)]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} />
                <Line type="monotone" dataKey="Kum. Plan"   stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Kum. Aktual" stroke="#E31E24" strokeWidth={2.5} dot={{ r: 3, fill: '#E31E24' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
