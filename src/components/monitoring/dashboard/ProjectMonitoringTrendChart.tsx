import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { bucketReportDocStatus, REPORT_DOC_STATUS_BUCKET_META } from '../../../utils/reportDocStatusBucket'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

export function ProjectMonitoringTrendChart() {
  const documents = useMonitoringReportStore((s) => s.documents)

  const data = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    documents.forEach((r) => {
      const month = new Date(r.createdAt).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      if (!months[month]) months[month] = { DRAFT: 0, PENDING: 0, REVISION: 0, APPROVED: 0 }
      const bucket = bucketReportDocStatus(r.status)
      months[month][bucket] = (months[month][bucket] ?? 0) + 1
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
              <Bar dataKey="DRAFT" stackId="a" fill={REPORT_DOC_STATUS_BUCKET_META.DRAFT.color} name={REPORT_DOC_STATUS_BUCKET_META.DRAFT.label} />
              <Bar dataKey="PENDING" stackId="a" fill={REPORT_DOC_STATUS_BUCKET_META.PENDING.color} name={REPORT_DOC_STATUS_BUCKET_META.PENDING.label} />
              <Bar dataKey="REVISION" stackId="a" fill={REPORT_DOC_STATUS_BUCKET_META.REVISION.color} name={REPORT_DOC_STATUS_BUCKET_META.REVISION.label} />
              <Bar dataKey="APPROVED" stackId="a" fill={REPORT_DOC_STATUS_BUCKET_META.APPROVED.color} name={REPORT_DOC_STATUS_BUCKET_META.APPROVED.label} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
