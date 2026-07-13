import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { useMonitoringCostStore } from '../../store/useMonitoringCostStore'
import { classNames } from '../../utils/helpers'
import { formatCurrency, type CostBasedMonthlyItem, type CostBasedMonthlyPlan } from '../../types/monitoring'

interface Props {
  open: boolean
  onClose: () => void
  costId: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const SATKER_OPTIONS = [
  { value: '', label: '— Pilih —' },
  { value: 'OSM', label: 'OSM' },
  { value: 'DMO', label: 'DMO' },
  { value: 'SCS', label: 'SCS' },
]

function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function MonitoringCostPlanningModal({ open, onClose, costId }: Props) {
  const store = useMonitoringCostStore()
  const cost = store.getCostById(costId)

  const months = useMemo(() => {
    const year = cost?.year ?? new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  }, [cost?.year])

  const [draft, setDraft] = useState<Record<string, CostBasedMonthlyItem[]>>({})
  const [selectedMonth, setSelectedMonth] = useState(months[0])

  useEffect(() => {
    if (!open) return
    const initial: Record<string, CostBasedMonthlyItem[]> = {}
    months.forEach((m) => {
      initial[m] = cost?.costBasedMonthly?.[m]?.items ? [...cost.costBasedMonthly[m].items] : []
    })
    setDraft(initial)
    setSelectedMonth(months[0])
  }, [open, costId]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = draft[selectedMonth] ?? []
  const monthTotal = items.reduce((s, it) => s + (it.planned || 0), 0)

  function updateItem(index: number, patch: Partial<CostBasedMonthlyItem>) {
    setDraft((d) => ({
      ...d,
      [selectedMonth]: (d[selectedMonth] ?? []).map((it, i) => i === index ? { ...it, ...patch } : it),
    }))
  }

  function addItem() {
    setDraft((d) => ({
      ...d,
      [selectedMonth]: [...(d[selectedMonth] ?? []), { itemBiaya: '', satuanKerja: '', planned: 0 }],
    }))
  }

  function removeItem(index: number) {
    setDraft((d) => ({
      ...d,
      [selectedMonth]: (d[selectedMonth] ?? []).filter((_, i) => i !== index),
    }))
  }

  function handleSave() {
    const costBasedMonthly: Record<string, CostBasedMonthlyPlan> = {}
    for (const m of months) {
      const monthItems = (draft[m] ?? []).filter((it) => it.itemBiaya.trim() !== '')
      if (monthItems.length > 0) {
        costBasedMonthly[m] = { planned: monthItems.reduce((s, it) => s + (it.planned || 0), 0), items: monthItems }
      }
    }
    store.updateCost(costId, { costBasedMonthly })
    onClose()
  }

  if (!cost) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kelola Breakdown Bulanan"
      description={`${cost.projectCode} — ${cost.projectName}`}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Month selector */}
        <div className="flex flex-wrap gap-1.5">
          {months.map((m, i) => {
            const count = (draft[m] ?? []).filter((it) => it.itemBiaya.trim() !== '').length
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={classNames(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium border transition',
                  selectedMonth === m
                    ? 'bg-pertamina-red text-white border-pertamina-red'
                    : 'bg-white text-ink-secondary border-border-subtle hover:border-pertamina-red/40',
                )}
              >
                {MONTH_NAMES[i]}
                {count > 0 && (
                  <span className={classNames(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-mono',
                    selectedMonth === m ? 'bg-white/20' : 'bg-black/[0.06]',
                  )}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Item rows for selected month */}
        <div className="surface rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-black/[0.02]">
                {['Item Biaya', 'Satuan Kerja', 'Planned (IDR)', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-5 text-center text-ink-tertiary">Belum ada item untuk bulan ini.</td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={it.itemBiaya}
                        onChange={(e) => updateItem(i, { itemBiaya: e.target.value })}
                        placeholder="Nama item biaya"
                        className="input-base text-xs py-1.5"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={it.satuanKerja}
                        onChange={(e) => updateItem(i, { satuanKerja: e.target.value })}
                        options={SATKER_OPTIONS}
                        className="text-xs py-1.5"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={it.planned === 0 ? '' : fmtIDR(it.planned)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '')
                          updateItem(i, { planned: digits === '' ? 0 : parseInt(digits, 10) })
                        }}
                        placeholder="0"
                        className="input-base text-xs py-1.5 text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => removeItem(i)}
                        className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-pertamina-red-50 transition"
                        title="Hapus item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t border-border-subtle bg-black/[0.02]">
                  <td colSpan={2} className="px-3 py-2 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Total {MONTH_NAMES[months.indexOf(selectedMonth)]}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-ink-primary tabular-nums text-right">{formatCurrency(monthTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <button
          onClick={addItem}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
        >
          <Plus size={11} /> Tambah Item
        </button>
      </div>
    </Modal>
  )
}
