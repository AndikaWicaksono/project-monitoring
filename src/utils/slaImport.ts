import type { SLAComponent, SLAMonthlyRecord } from '../types/monitoring'
import { SLA_MONTHS, slaMonthLabel } from '../types/monitoring'
import { parseCsv } from './csvParser'

export interface SlaImportCell {
  month: number
  raw: string
  value: number | null
  status: 'empty' | 'new' | 'overwrite' | 'skip-locked' | 'error'
  errorMessage?: string
  existingRecordId?: string
}

export interface SlaImportComponentRow {
  rowNumber: number
  componentName: string
  componentId?: string // undefined = component belum ada, bakal dibikin baru pas confirm
  cells: SlaImportCell[] // urut ikut SLA_MONTHS (Jan..Des)
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

// Template matrix: baris = component yang sudah ada di project ini, kolom = Jan..Des —
// bentuknya sama persis kayak tabel "Komponen SLA" di halaman detail project. Sel yang
// datanya sudah ada langsung diisi nilai sekarang (bukan dikosongin), jadi user tinggal
// edit angka yang berubah aja tanpa perlu ngetik ulang semuanya dari nol.
export function buildSlaProjectImportTemplate(projectComponents: SLAComponent[], monthlyRecords: SLAMonthlyRecord[], year: number): string {
  const header = ['Component', ...SLA_MONTHS.map((m) => slaMonthLabel(m))]
  const rows: string[][] = [header]
  for (const c of projectComponents) {
    const values = SLA_MONTHS.map((m) => {
      const rec = monthlyRecords.find((r) => r.componentId === c.id && r.month === m && r.year === year)
      return rec ? String(rec.achievement) : ''
    })
    rows.push([c.componentName, ...values])
  }
  if (projectComponents.length === 0) rows.push(['', ...SLA_MONTHS.map(() => '')])
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

// Parse file CSV matrix untuk satu project + satu tahun. Kolom bulan dicocokkan by label
// (Jan, Feb, ...) atau angka 1-12, jadi urutan kolom di file gak wajib sama persis.
export function parseSlaProjectImportRows(
  csvText: string,
  projectComponents: SLAComponent[],
  monthlyRecords: SLAMonthlyRecord[],
  year: number,
): SlaImportComponentRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  const header = table[0].map((h) => h.trim())
  const monthColIndex: Partial<Record<number, number>> = {}
  SLA_MONTHS.forEach((m) => {
    const label = slaMonthLabel(m)
    const idx = header.findIndex((h) => h.toLowerCase() === label.toLowerCase() || h === String(m))
    if (idx >= 0) monthColIndex[m] = idx
  })

  return table
    .slice(1)
    .filter((cols) => (cols[0] ?? '').trim() !== '')
    .map((cols, i): SlaImportComponentRow => {
      const rowNumber = i + 2
      const componentName = (cols[0] ?? '').trim()
      const component = projectComponents.find((c) => c.componentName.toLowerCase() === componentName.toLowerCase())

      const cells: SlaImportCell[] = SLA_MONTHS.map((m): SlaImportCell => {
        const colIdx = monthColIndex[m]
        const raw = colIdx !== undefined ? (cols[colIdx] ?? '').trim() : ''
        if (raw === '') return { month: m, raw: '', value: null, status: 'empty' }

        const value = Number(raw)
        if (isNaN(value) || value < 0 || value > 100) {
          return { month: m, raw, value: null, status: 'error', errorMessage: `"${raw}" harus angka 0–100` }
        }

        const existingRecord = component
          ? monthlyRecords.find((r) => r.componentId === component.id && r.month === m && r.year === year)
          : undefined

        if (existingRecord?.lockedAt) {
          return { month: m, raw, value, status: 'skip-locked', existingRecordId: existingRecord.id }
        }

        return { month: m, raw, value, status: existingRecord ? 'overwrite' : 'new', existingRecordId: existingRecord?.id }
      })

      return { rowNumber, componentName, componentId: component?.id, cells }
    })
}
