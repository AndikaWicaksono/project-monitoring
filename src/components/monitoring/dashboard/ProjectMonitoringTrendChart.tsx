import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

const STATUS_COLORS: Record<string, string> = {
  CREATE: '#64748b',
  UNDER_APPROVAL: '#d97706',
  UNDER_REVISION: '#E31E24',
  APPROVED: '#059669',
}

export function ProjectMonitoringTrendChart() {
  const documents = useMonitoringReportStore((s) => s.documents)

  const data = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    documents.forEach((r) => {
      const month = new Date(r.createdAt).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      if (!months[month]) months[month] = { CREATE: 0, UNDER_APPROVAL: 0, UNDER_REVISION: 0, APPROVED: 0 }
      months[month][r.status] = (months[month][r.status] ?? 0) + 1
    })
    return Object.entries(months)
      .slice(-6)
      .map(([month, counts]) => ({ month, ...counts }))
  }, [documents])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Tren Report Project Monitoring</h3>
        <span className="text-[11px] text-ink-tertiary">6 bulan terakhir</span>
      </div>
      <div className="h-[250px]">
        {documents.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data laporan
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} cursor={{ fill: 'rgba(227,30,36,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="CREATE" stackId="a" fill={STATUS_COLORS.CREATE} name="Draft" />
              <Bar dataKey="UNDER_APPROVAL" stackId="a" fill={STATUS_COLORS.UNDER_APPROVAL} name="Menunggu" />
              <Bar dataKey="UNDER_REVISION" stackId="a" fill={STATUS_COLORS.UNDER_REVISION} name="Revisi" />
              <Bar dataKey="APPROVED" stackId="a" fill={STATUS_COLORS.APPROVED} name="Disetujui" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
