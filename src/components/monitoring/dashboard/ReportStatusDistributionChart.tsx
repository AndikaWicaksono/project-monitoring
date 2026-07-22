import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useMonitoringReportStore } from '../../../store/useMonitoringReportStore'
import { bucketReportDocStatus, REPORT_DOC_STATUS_BUCKET_META, type ReportDocStatusBucket } from '../../../utils/reportDocStatusBucket'

const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }
const LABEL_STYLE = { color: '#475569' }

export function ReportStatusDistributionChart() {
  const documents = useMonitoringReportStore((s) => s.documents)

  const data = useMemo(() => {
    const counts: Record<ReportDocStatusBucket, number> = { DRAFT: 0, PENDING: 0, REVISION: 0, APPROVED: 0 }
    documents.forEach((d) => { counts[bucketReportDocStatus(d.status)]++ })
    return (Object.keys(REPORT_DOC_STATUS_BUCKET_META) as ReportDocStatusBucket[])
      .map((key) => ({ name: REPORT_DOC_STATUS_BUCKET_META[key].label, value: counts[key], color: REPORT_DOC_STATUS_BUCKET_META[key].color }))
      .filter((d) => d.value > 0)
  }, [documents])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Distribusi Status Report</h3>
        <span className="text-[11px] text-ink-tertiary">Semua dokumen</span>
      </div>
      <div className="h-[250px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">
            Belum ada data dokumen
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
