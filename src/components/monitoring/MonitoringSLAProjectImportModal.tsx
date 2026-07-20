import { useRef, useState } from 'react'
import { UploadCloud, Download, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { classNames, downloadCsvText, nowIso } from '../../utils/helpers'
import { useMonitoringSLAStore } from '../../store/useMonitoringSLAStore'
import { useAuthStore } from '../../store/useAuthStore'
import { parseSlaProjectImportRows, buildSlaProjectImportTemplate, type SlaImportComponentRow, type SlaImportCell } from '../../utils/slaImport'
import { SLA_MONTHS, slaMonthLabel, type SLAComponent, type SLAMonthlyRecord } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  projectComponents: SLAComponent[]
  monthlyRecords: SLAMonthlyRecord[]
  year: number
}

const CELL_CLS: Record<SlaImportCell['status'], string> = {
  empty:        'text-ink-muted/50',
  new:          'bg-emerald-50 text-emerald-700 font-medium',
  overwrite:    'bg-amber-50 text-amber-700 font-medium',
  'skip-locked':'bg-slate-100 text-slate-500',
  error:        'bg-red-50 text-red-700 font-medium',
}

export function MonitoringSLAProjectImportModal({ open, onClose, projectId, projectComponents, monthlyRecords, year }: Props) {
  const store = useMonitoringSLAStore()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const currentUser = users.find((u) => u.id === session?.userId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<SlaImportComponentRow[] | null>(null)
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
    const csv = buildSlaProjectImportTemplate(projectComponents, monthlyRecords, year)
    downloadCsvText(csv, `template-import-sla-${year}.csv`)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseSlaProjectImportRows(text, projectComponents, monthlyRecords, year)
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
        skipLocked: allCells.filter((c) => c.status === 'skip-locked').length,
        error: allCells.filter((c) => c.status === 'error').length,
      }
    : null
  const hasActionableCells = allCells.some((c) => c.status === 'new' || c.status === 'overwrite')

  function handleConfirmImport() {
    if (!rows) return
    setSubmitting(true)
    let createdComponents = 0
    let createdRecords = 0
    let updatedRecords = 0

    for (const row of rows) {
      const actionableCells = row.cells.filter((c) => c.status === 'new' || c.status === 'overwrite')
      if (actionableCells.length === 0) continue

      let componentId = row.componentId
      if (!componentId) {
        const created = store.addComponent({ projectId, componentName: row.componentName })
        componentId = created.id
        createdComponents++
      }

      for (const cell of actionableCells) {
        if (cell.value === null) continue
        const payload = {
          componentId,
          projectId,
          month: cell.month,
          year,
          achievement: cell.value,
          remark: '',
          engineerReconfirmNote: '',
        }
        if (cell.status === 'overwrite' && cell.existingRecordId) {
          store.updateMonthlyRecord(cell.existingRecordId, { ...payload, lockedAt: nowIso(), lockedByName: currentUser?.name ?? null })
          updatedRecords++
        } else {
          store.addMonthlyRecord(payload, currentUser?.name)
          createdRecords++
        }
      }
    }

    toast.success(`Import selesai: ${createdRecords} data baru, ${updatedRecords} ditimpa${createdComponents ? `, ${createdComponents} komponen baru dibuat` : ''}`)
    setSubmitting(false)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Import Data SLA — ${year}`}
      description="Upload file CSV untuk mengisi achievement bulanan project ini secara massal"
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
              Format kolom: <strong>Component, Jan, Feb, …, Des</strong> (persis seperti tabel di halaman ini), untuk tahun <strong>{year}</strong>.
              Template yang di-download sudah otomatis terisi data yang ada sekarang — tinggal edit angka yang mau diubah, gak perlu ketik ulang semua.
              Component yang belum ada akan otomatis dibuat. Sel yang dikosongkan akan dilewati, dan data yang sudah terkunci tidak akan ditimpa.
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-medium text-ink-secondary hover:bg-black/[0.02] hover:text-ink-primary transition"
          >
            <Download size={14} /> Download Template ({year})
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
            <span className="text-ink-tertiary">· {rows.length} komponen</span>
          </div>

          {summary && (
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-emerald-100 text-emerald-700">{summary.new} Baru</span>
              <span className="chip bg-amber-100 text-amber-700">{summary.overwrite} Ditimpa</span>
              <span className="chip bg-slate-200 text-slate-600">{summary.skipLocked} Dilewati (Lock)</span>
              <span className="chip bg-red-100 text-red-700">{summary.error} Error</span>
            </div>
          )}

          <div className="max-h-[420px] overflow-auto rounded-lg border border-border-subtle">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-border-subtle bg-black/[0.02]">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap min-w-[140px]">Component</th>
                  {SLA_MONTHS.map((m) => (
                    <th key={m} className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                      {slaMonthLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 font-medium text-ink-primary whitespace-nowrap">
                      {row.componentName}
                      {!row.componentId && <span className="ml-1.5 chip bg-blue-100 text-blue-700 text-[9px]">Baru</span>}
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.month}
                        title={cell.errorMessage}
                        className={classNames('px-2 py-2 text-center tabular-nums whitespace-nowrap', CELL_CLS[cell.status])}
                      >
                        {cell.status === 'error' ? '!' : cell.value !== null ? cell.value : '—'}
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
