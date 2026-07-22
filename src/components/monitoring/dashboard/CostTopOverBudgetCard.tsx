import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useMonitoringCostStore } from '../../../store/useMonitoringCostStore'
import { getYtdMonths } from '../../../utils/helpers'
import { slaMonthLabel } from '../../../types/monitoring'

function fmtShort(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(1)}M`
  if (abs >= 1e6) return `${(abs / 1e6).toFixed(0)}Jt`
  return abs.toLocaleString('id-ID')
}

export function CostTopOverBudgetCard() {
  const costs = useMonitoringCostStore((s) => s.costs)
  const realizations = useMonitoringCostStore((s) => s.realizations)

  const ytdMonths = useMemo(() => getYtdMonths(), [])
  const ytdYear = ytdMonths[0]?.slice(0, 4) ?? String(new Date().getFullYear())
  const ytdLabel = ytdMonths.length > 1
    ? `${slaMonthLabel(1)}–${slaMonthLabel(ytdMonths.length)} ${ytdYear}`
    : `${slaMonthLabel(1)} ${ytdYear}`

  const ranked = useMemo(() => {
    return costs
      .map((c) => {
        const ytdPlanned = ytdMonths.reduce((s, m) => s + (c.costBasedMonthly?.[m]?.planned ?? 0), 0)
        const ytdActual  = realizations
          .filter((r) => r.projectId === c.id && ytdMonths.includes(r.period ?? ''))
          .reduce((s, r) => s + r.realisasiBiaya, 0)
        const variance = ytdActual - ytdPlanned
        const pct = ytdPlanned > 0 ? (variance / ytdPlanned) * 100 : 0
        return {
          code: c.projectCode.replace(/-00$/, ''),
          name: c.projectName,
          ytdActual,
          ytdPlanned,
          variance,
          pct,
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [costs, realizations, ytdMonths])

  const maxAbsPct = Math.max(...ranked.map((r) => Math.abs(r.pct)), 1)

  return (
    <div className="surface rounded-xl p-4 flex flex-col" style={{ height: 300 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-primary">Status Anggaran</h3>
        <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] text-ink-tertiary">YTD {ytdLabel}</span>
      </div>

      {ranked.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-ink-tertiary">Belum ada data</div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1 overflow-auto">
          {ranked.map((p, i) => {
            const isOver  = p.pct > 1
            const isUnder = p.pct < -1
            const barW    = Math.min((Math.abs(p.pct) / maxAbsPct) * 100, 100)

            return (
              <div key={p.code} className="flex items-center gap-2.5">
                <span className="w-4 shrink-0 text-[10px] text-ink-tertiary font-mono tabular-nums text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-mono font-semibold text-pertamina-red shrink-0">{p.code}</span>
                      <span className="text-[10px] text-ink-muted truncate hidden sm:block">{p.name.slice(0, 28)}{p.name.length > 28 ? '…' : ''}</span>
                    </div>
                    <div className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums shrink-0 ${isOver ? 'text-red-600' : isUnder ? 'text-emerald-600' : 'text-ink-secondary'}`}>
                      {isOver  ? <TrendingUp size={10}  /> :
                       isUnder ? <TrendingDown size={10} /> :
                       <Minus size={10} />}
                      {p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${isOver ? 'bg-red-400' : isUnder ? 'bg-emerald-400' : 'bg-slate-300'}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-ink-tertiary">Aktual: Rp {fmtShort(p.ytdActual)}</span>
                    <span className="text-[9px] text-ink-tertiary">Plan: Rp {fmtShort(p.ytdPlanned)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
