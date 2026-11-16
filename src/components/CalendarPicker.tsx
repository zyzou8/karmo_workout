'use client'

import { useMemo, useState } from 'react'

interface CalendarPickerProps {
  locale: string
  selected: Date
  onSelect: (date: Date) => void
  getDots: (date: Date) => string[]
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export function CalendarPicker({ locale, selected, onSelect, getDots }: CalendarPickerProps) {
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2021, 7, i + 1)))
  }, [locale])

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate),
    [locale, viewDate]
  )

  const cells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const result: { date: Date; inMonth: boolean }[] = []
    for (let i = firstWeekday - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: new Date(year, month, d), inMonth: true })
    }
    while (result.length % 7 !== 0 || result.length < 42) {
      const last = result[result.length - 1].date
      result.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
    }
    return result
  }, [viewDate])

  const today = new Date()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{monthLabel}</span>
        <button
          onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdayLabels.map((label, i) => (
          <div key={i} className="text-center text-xs text-gray-400 dark:text-gray-600 font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }, i) => {
          const dots = getDots(date)
          const isSelected = sameDay(date, selected)
          const isToday = sameDay(date, today)
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                isSelected
                  ? 'bg-violet-500 text-white font-semibold'
                  : isToday
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300 font-medium'
                    : inMonth
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-300 dark:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{date.getDate()}</span>
              {dots.length > 0 && (
                <span className="flex items-center gap-0.5">
                  {dots.slice(0, 3).map((dot, di) => (
                    <span key={di} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : dot}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
