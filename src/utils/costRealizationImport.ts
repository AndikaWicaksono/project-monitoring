import type { MonitoringCostRealizationStatus } from '../types/monitoring'
import { parseCsv } from './csvParser'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const STATUS_LABELS: Record<string, MonitoringCostRealizationStatus> = {
  paid: 'PAID',
  'po/pay': 'POPAY',
  popay: 'POPAY',
  'ready to release': 'READY_TO_RELEASE',
  readytorelease: 'READY_TO_RELEASE',
}

export interface CostRealizationImportRow {
  rowNumber: number
  itemBiaya: string
  satuanKerja: string
  pic: string
  vendor: string
  statusRaw: string
  status: MonitoringCostRealizationStatus | null
  bulanRaw: string
  period: string | null // YYYY-MM
  tanggalRealisasi: string
  realisasiRaw: string
  realisasiBiaya: number | null
  rowStatus: 'new' | 'error'
  errorMessage?: string
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function parseMonthToPeriod(raw: string, year: number): string | null {
  const trimmed = raw.trim()
  const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase())
  if (idx >= 0) return `${year}-${String(idx + 1).padStart(2, '0')}`
  const asNum = Number(trimmed)
  if (!isNaN(asNum) && asNum >= 1 && asNum <= 12) return `${year}-${String(asNum).padStart(2, '0')}`
  return null
}

// Realisasi itu sifatnya transaksional (bisa ada berkali-kali untuk item+bulan yang sama,
// misal beda vendor) — jadi templatenya cuma header + 1 baris contoh, BUKAN pre-filled data
// yang ada sekarang. Setiap baris di file yang diimport akan ditambahkan sebagai realisasi baru.
export function buildCostRealizationImportTemplate(year: number): string {
  const header = ['Item Biaya', 'Satuan Kerja', 'PIC', 'Vendor', 'Status', 'Bulan', 'Tanggal', 'Realisasi Biaya']
  const example = ['Contoh: Sewa Server', 'OSM', 'Nama PIC', 'Nama Vendor', 'PO/Pay', 'Jan', `${year}-01-15`, '15000000']
  return [header, example].map((r) => r.map(csvEscape).join(',')).join('\n')
}

export function parseCostRealizationImportRows(csvText: string, year: number): CostRealizationImportRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  const header = table[0].map((h) => h.trim())
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase())
  const iItem = idx('Item Biaya')
  const iSatker = idx('Satuan Kerja')
  const iPic = idx('PIC')
  const iVendor = idx('Vendor')
  const iStatus = idx('Status')
  const iBulan = idx('Bulan')
  const iTanggal = idx('Tanggal')
  const iReal = idx('Realisasi Biaya')

  return table
    .slice(1)
    .filter((cols) => (cols[iItem] ?? '').trim() !== '')
    .map((cols, i): CostRealizationImportRow => {
      const rowNumber = i + 2
      const itemBiaya = (cols[iItem] ?? '').trim()
      const satuanKerja = iSatker >= 0 ? (cols[iSatker] ?? '').trim() : ''
      const pic = iPic >= 0 ? (cols[iPic] ?? '').trim() : ''
      const vendor = iVendor >= 0 ? (cols[iVendor] ?? '').trim() : ''
      const statusRaw = iStatus >= 0 ? (cols[iStatus] ?? '').trim() : ''
      const bulanRaw = iBulan >= 0 ? (cols[iBulan] ?? '').trim() : ''
      const tanggalRealisasi = iTanggal >= 0 ? (cols[iTanggal] ?? '').trim() : ''
      const realisasiRaw = iReal >= 0 ? (cols[iReal] ?? '').trim() : ''
      const base = { rowNumber, itemBiaya, satuanKerja, pic, vendor, statusRaw, bulanRaw, tanggalRealisasi, realisasiRaw }

      if (!itemBiaya) {
        return { ...base, status: null, period: null, realisasiBiaya: null, rowStatus: 'error', errorMessage: 'Item Biaya kosong' }
      }

      const status = STATUS_LABELS[statusRaw.toLowerCase()] ?? null
      if (!status) {
        return { ...base, status: null, period: null, realisasiBiaya: null, rowStatus: 'error', errorMessage: `Status "${statusRaw}" tidak dikenali (pakai: Paid / PO/Pay / Ready to Release)` }
      }

      const period = bulanRaw ? parseMonthToPeriod(bulanRaw, year) : null
      if (bulanRaw && !period) {
        return { ...base, status, period: null, realisasiBiaya: null, rowStatus: 'error', errorMessage: `Bulan "${bulanRaw}" tidak valid` }
      }

      const digits = realisasiRaw.replace(/[^0-9]/g, '')
      if (digits === '') {
        return { ...base, status, period, realisasiBiaya: null, rowStatus: 'error', errorMessage: 'Realisasi Biaya harus berupa angka' }
      }

      return { ...base, status, period, realisasiBiaya: parseInt(digits, 10), rowStatus: 'new' }
    })
}
