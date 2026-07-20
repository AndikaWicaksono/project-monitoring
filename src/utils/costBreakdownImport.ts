import type { MonitoringCost, CostBasedMonthlyItem, CostBasedMonthlyPlan } from '../types/monitoring'
import { parseCsv } from './csvParser'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export interface CostBreakdownImportCell {
  monthIndex: number // 0-11 (0 = Jan)
  raw: string
  value: number | null
  status: 'empty' | 'new' | 'overwrite' | 'error'
  errorMessage?: string
}

export interface CostBreakdownImportRow {
  rowNumber: number
  itemBiaya: string
  satuanKerja: string
  cells: CostBreakdownImportCell[] // urut Jan..Des
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

// Template matrix: baris = union item biaya yang sudah ada di breakdown bulanan project ini
// (dari bulan manapun), kolom = Jan..Des berisi planned amount yang sudah ada (kalau ada).
export function buildCostBreakdownImportTemplate(cost: MonitoringCost): string {
  const header = ['Item Biaya', 'Satuan Kerja', ...MONTH_NAMES]
  const rows: string[][] = [header]

  const order: string[] = []
  const displayName = new Map<string, string>()
  for (let mi = 0; mi < 12; mi++) {
    const plan = cost.costBasedMonthly?.[monthKey(cost.year, mi)]
    plan?.items.forEach((it) => {
      const key = it.itemBiaya.toLowerCase()
      if (!displayName.has(key)) { displayName.set(key, it.itemBiaya); order.push(key) }
    })
  }

  for (const key of order) {
    const itemBiaya = displayName.get(key)!
    let satuanKerja = ''
    const values = MONTH_NAMES.map((_, mi) => {
      const plan = cost.costBasedMonthly?.[monthKey(cost.year, mi)]
      const item = plan?.items.find((it) => it.itemBiaya.toLowerCase() === key)
      if (item && !satuanKerja) satuanKerja = item.satuanKerja
      return item ? String(item.planned) : ''
    })
    rows.push([itemBiaya, satuanKerja, ...values])
  }
  if (order.length === 0) rows.push(['', '', ...MONTH_NAMES.map(() => '')])

  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

// Parse file CSV matrix untuk breakdown bulanan satu project (tahun mengikuti cost.year).
export function parseCostBreakdownImportRows(csvText: string, cost: MonitoringCost): CostBreakdownImportRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  const header = table[0].map((h) => h.trim())
  const iItem = header.findIndex((h) => h.toLowerCase() === 'item biaya')
  const iSatker = header.findIndex((h) => h.toLowerCase() === 'satuan kerja')
  const monthColIndex = MONTH_NAMES.map((label) => header.findIndex((h) => h.toLowerCase() === label.toLowerCase()))

  return table
    .slice(1)
    .filter((cols) => (cols[iItem] ?? '').trim() !== '')
    .map((cols, i): CostBreakdownImportRow => {
      const rowNumber = i + 2
      const itemBiaya = (cols[iItem] ?? '').trim()
      const satuanKerja = iSatker >= 0 ? (cols[iSatker] ?? '').trim() : ''
      const itemKey = itemBiaya.toLowerCase()

      const cells: CostBreakdownImportCell[] = MONTH_NAMES.map((_, mi): CostBreakdownImportCell => {
        const colIdx = monthColIndex[mi]
        const raw = colIdx >= 0 ? (cols[colIdx] ?? '').trim() : ''
        if (raw === '') return { monthIndex: mi, raw: '', value: null, status: 'empty' }

        const digits = raw.replace(/[^0-9]/g, '')
        if (digits === '') {
          return { monthIndex: mi, raw, value: null, status: 'error', errorMessage: `"${raw}" harus berupa angka` }
        }
        const value = parseInt(digits, 10)

        const existingItem = cost.costBasedMonthly?.[monthKey(cost.year, mi)]?.items.find((it) => it.itemBiaya.toLowerCase() === itemKey)
        return { monthIndex: mi, raw, value, status: existingItem ? 'overwrite' : 'new' }
      })

      return { rowNumber, itemBiaya, satuanKerja, cells }
    })
}

// Gabungin hasil parse ke costBasedMonthly yang sudah ada — item & bulan yang gak disebut
// di file tetap dipertahankan apa adanya (bukan full-replace).
export function mergeCostBreakdownImport(cost: MonitoringCost, rows: CostBreakdownImportRow[]): Record<string, CostBasedMonthlyPlan> {
  const result: Record<string, CostBasedMonthlyPlan> = {}

  for (let mi = 0; mi < 12; mi++) {
    const key = monthKey(cost.year, mi)
    const itemsByKey = new Map<string, CostBasedMonthlyItem>()
    cost.costBasedMonthly?.[key]?.items.forEach((it) => itemsByKey.set(it.itemBiaya.toLowerCase(), it))

    for (const row of rows) {
      const cell = row.cells[mi]
      if ((cell.status !== 'new' && cell.status !== 'overwrite') || cell.value === null) continue
      itemsByKey.set(row.itemBiaya.toLowerCase(), { itemBiaya: row.itemBiaya, satuanKerja: row.satuanKerja, planned: cell.value })
    }

    if (itemsByKey.size > 0) {
      const items = [...itemsByKey.values()]
      result[key] = { planned: items.reduce((s, it) => s + it.planned, 0), items }
    }
  }

  return result
}
