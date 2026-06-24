import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { BULAN_ID } from '../../types/monitoring'

interface Props {
  value: string  // YYYY-MM
  onChange: (value: string) => void
}

const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const TODAY = new Date().toISOString().slice(0, 7)

export function MonthPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => parseInt(value.split('-')[0]))
  const ref = useRef<HTMLDivElement>(null)

  const selectedYear = parseInt(value.split('-')[0])
  const selectedMonth = parseInt(value.split('-')[1])

  useEffect(() => {
    if (open) setPickerYear(selectedYear)
  }, [open, selectedYear])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function selectMonth(month: number) {
    onChange(`${pickerYear}-${String(month).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-black/[0.03] transition min-w-[130px] justify-between"
      >
        <span>{BULAN_ID[selectedMonth - 1]} {selectedYear}</span>
        <ChevronDown size={12} className={`text-ink-tertiary transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-border bg-white shadow-xl p-3 w-56">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              className="rounded-md p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-sm font-bold text-ink-primary tracking-wide">{pickerYear}</span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              className="rounded-md p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.05] transition"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Month grid 4x3 */}
          <div className="grid grid-cols-4 gap-1">
            {BULAN_SHORT.map((name, i) => {
              const month = i + 1
              const ymStr = `${pickerYear}-${String(month).padStart(2, '0')}`
              const isSelected = pickerYear === selectedYear && month === selectedMonth
              const isToday = ymStr === TODAY
              return (
                <button
                  key={name}
                  onClick={() => selectMonth(month)}
                  className={`relative rounded-lg py-2 text-[11px] font-medium transition
                    ${isSelected
                      ? 'bg-pertamina-red text-white shadow-sm'
                      : 'text-ink-secondary hover:bg-black/[0.05] hover:text-ink-primary'
                    }`}
                >
                  {name}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pertamina-red" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
