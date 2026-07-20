import { useRef, useState } from 'react'
import { UploadCloud, Download, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { classNames, downloadCsvText } from '../../utils/helpers'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import {
  parseCostBreakdownImportRows, buildCostBreakdownImportTemplate, mergeCostBreakdownImport,
  type CostBreakdownImportRow, type CostBreakdownImportCell,
} from '../../utils/costBreakdownImport'
import type { MonitoringCost } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  cost: MonitoringCost
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const CELL_CLS: Record<CostBreakdownImportCell['status'], string> = {
  empty:     'text-ink-muted/50',
  new:       'bg-emerald-50 text-emerald-700 font-medium',
  overwrite: 'bg-amber-50 text-amber-700 font-medium',
  error:     'bg-red-50 text-red-700 font-medium',
}

function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function MonitoringCostBreakdownImportModal({ open, onClose, cost }: Props) {
  const store = useMonitoringCostStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CostBreakdownImportRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setRows(null)
    setFileName('')
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleDownloadTemplate() {
    const csv = buildCostBreakdownImportTemplate(cost)
    downloadCsvText(csv, `template-breakdown-${cost.projectCode}-${cost.year}.csv`)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseCostBreakdownImportRows(text, cost)
      if (parsed.length === 0) {
        toast.error('File CSV kosong atau formatnya tidak dikenali')
        return
      }
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  const allCells = rows?.flatMap((r) => r.cells) ?? []
  const summary = rows
    ? {
        new: allCells.filter((c) => c.status === 'new').length,
        overwrite: allCells.filter((c) => c.status === 'overwrite').length,
        error: allCells.filter((c) => c.status === 'error').length,
      }
    : null
  const hasActionableCells = allCells.some((c) => c.status === 'new' || c.status === 'overwrite')

  function handleConfirmImport() {
    if (!rows) return
    setSubmitting(true)
    const merged = mergeCostBreakdownImport(cost, rows)
    store.updateCost(cost.id, { costBasedMonthly: merged })
    toast.success(`Breakdown bulanan berhasil diupdate: ${summary?.new ?? 0} data baru, ${summary?.overwrite ?? 0} ditimpa`)
    setSubmitting(false)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Import Breakdown Bulanan — ${cost.year}`}
      description={`${cost.projectCode} — ${cost.projectName}`}
      size="3xl"
      footer={
        rows ? (
          <>
            <Button variant="ghost" onClick={reset}>Pilih File Lain</Button>
            <Button onClick={handleConfirmImport} disabled={!hasActionableCells || submitting}>
              {submitting ? 'Memproses…' : 'Konfirmasi Import'}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={handleClose}>Tutup</Button>
        )
      }
    >
      {!rows ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-black/[0.03] border border-border-subtle px-3 py-2.5 text-xs text-ink-secondary">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              Format kolom: <strong>Item Biaya, Satuan Kerja, Jan, …, Des</strong> (planned amount dalam IDR), untuk tahun <strong>{cost.year}</strong>.
              Template yang di-download sudah terisi data breakdown yang ada sekarang. Item/bulan yang tidak disebut di file akan tetap dipertahankan.
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-medium text-ink-secondary hover:bg-black/[0.02] hover:text-ink-primary transition"
          >
            <Download size={14} /> Download Template ({cost.year})
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-10 text-center hover:bg-black/[0.02] hover:border-pertamina-red/40 transition"
          >
            <UploadCloud size={26} className="text-ink-tertiary" />
            <span className="text-sm font-medium text-ink-primary">Klik untuk pilih file CSV</span>
            <span className="text-[11px] text-ink-tertiary">atau seret file ke sini</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <FileText size={13} /> <span className="font-medium">{fileName}</span>
            <span className="text-ink-tertiary">· {rows.length} item biaya</span>
          </div>

          {summary && (
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-emerald-100 text-emerald-700">{summary.new} Baru</span>
              <span className="chip bg-amber-100 text-amber-700">{summary.overwrite} Ditimpa</span>
              <span className="chip bg-red-100 text-red-700">{summary.error} Error</span>
            </div>
          )}

          <div className="max-h-[420px] overflow-auto rounded-lg border border-border-subtle">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap min-w-[160px]">Item Biaya</th>
                  {MONTH_NAMES.map((m) => (
                    <th key={m} className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 font-medium text-ink-primary whitespace-nowrap">
                      {row.itemBiaya}
                      {row.satuanKerja && <span className="ml-1.5 text-ink-tertiary">({row.satuanKerja})</span>}
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.monthIndex}
                        title={cell.errorMessage}
                        className={classNames('px-2 py-2 text-right tabular-nums whitespace-nowrap', CELL_CLS[cell.status])}
                      >
                        {cell.status === 'error' ? '!' : cell.value !== null ? fmtIDR(cell.value) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
