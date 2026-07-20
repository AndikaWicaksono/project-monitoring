import { useRef, useState } from 'react'
import { UploadCloud, Download, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { downloadCsvText } from '../../utils/helpers'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import {
  parseCostRealizationImportRows, buildCostRealizationImportTemplate,
  type CostRealizationImportRow,
} from '../../utils/costRealizationImport'
import { formatCurrency, type MonitoringCost } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  cost: MonitoringCost
}

const REAL_STATUS_LABEL: Record<string, string> = { PAID: 'Paid', POPAY: 'PO/Pay', READY_TO_RELEASE: 'Ready to Release' }

export function MonitoringCostRealizationImportModal({ open, onClose, cost }: Props) {
  const addRealization = useMonitoringCostStore((s) => s.addRealization)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CostRealizationImportRow[] | null>(null)
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
    const csv = buildCostRealizationImportTemplate(cost.year)
    downloadCsvText(csv, `template-realisasi-${cost.projectCode}-${cost.year}.csv`)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseCostRealizationImportRows(text, cost.year)
      if (parsed.length === 0) {
        toast.error('File CSV kosong atau formatnya tidak dikenali')
        return
      }
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  const summary = rows
    ? { new: rows.filter((r) => r.rowStatus === 'new').length, error: rows.filter((r) => r.rowStatus === 'error').length }
    : null
  const hasActionableRows = (rows?.filter((r) => r.rowStatus === 'new').length ?? 0) > 0

  function handleConfirmImport() {
    if (!rows) return
    setSubmitting(true)
    let created = 0
    for (const row of rows) {
      if (row.rowStatus !== 'new' || row.status === null || row.realisasiBiaya === null) continue
      addRealization({
        kodeProject: cost.projectCode,
        projectId: cost.id,
        itemBiaya: row.itemBiaya,
        satuanKerja: row.satuanKerja,
        pic: row.pic,
        realisasiBiaya: row.realisasiBiaya,
        status: row.status,
        vendor: row.vendor,
        period: row.period,
        tanggalRealisasi: row.tanggalRealisasi || null,
      })
      created++
    }
    toast.success(`${created} realisasi biaya berhasil ditambahkan`)
    setSubmitting(false)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Realisasi Biaya"
      description={`${cost.projectCode} — ${cost.projectName}`}
      size="2xl"
      footer={
        rows ? (
          <>
            <Button variant="ghost" onClick={reset}>Pilih File Lain</Button>
            <Button onClick={handleConfirmImport} disabled={!hasActionableRows || submitting}>
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
              Format kolom: <strong>Item Biaya, Satuan Kerja, PIC, Vendor, Status, Bulan, Tanggal, Realisasi Biaya</strong>.
              Status harus salah satu dari: Paid / PO-Pay / Ready to Release. Setiap baris di file akan{' '}
              <strong>ditambahkan sebagai realisasi baru</strong> (bukan menimpa yang sudah ada) — realisasi lama tetap bisa diedit/dihapus manual seperti biasa.
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-medium text-ink-secondary hover:bg-black/[0.02] hover:text-ink-primary transition"
          >
            <Download size={14} /> Download Template
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
            <span className="text-ink-tertiary">· {rows.length} baris</span>
          </div>

          {summary && (
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-emerald-100 text-emerald-700">{summary.new} Baru</span>
              <span className="chip bg-red-100 text-red-700">{summary.error} Error</span>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border-subtle">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Baris</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Item Biaya</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Vendor</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Bulan</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Realisasi</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-2 text-ink-tertiary tabular-nums">{r.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-ink-primary whitespace-nowrap">{r.itemBiaya || '—'}</td>
                    <td className="px-3 py-2 text-ink-secondary whitespace-nowrap">{r.vendor || '—'}</td>
                    <td className="px-3 py-2 text-ink-secondary whitespace-nowrap">{r.bulanRaw || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-secondary whitespace-nowrap">
                      {r.realisasiBiaya !== null ? formatCurrency(r.realisasiBiaya) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.rowStatus === 'new' ? (
                        <span className="chip inline-flex items-center gap-1 bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={11} /> {r.status ? REAL_STATUS_LABEL[r.status] : 'Baru'}
                        </span>
                      ) : (
                        <span className="chip inline-flex items-center gap-1 bg-red-100 text-red-700" title={r.errorMessage}>
                          <XCircle size={11} /> {r.errorMessage}
                        </span>
                      )}
                    </td>
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
