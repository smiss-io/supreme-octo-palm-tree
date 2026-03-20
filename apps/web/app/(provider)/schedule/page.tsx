'use client'

import { useState, useMemo } from 'react'

type CalendarView = 'month' | 'week' | 'day'

type SessionEvent = {
  id: string
  activityName: string
  activityId: string
  startDate: string
  durationMin: number
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'
  capacity: number | null
  enrolledCount: number
  format: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-sky-100 text-sky-800 border-sky-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200 line-through',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
}

export default function SchedulePage() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Sessions will be loaded via tRPC session.list with date range filters
  const sessions: SessionEvent[] = []

  const navigate = (direction: -1 | 1) => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    // week view
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }, [currentDate, view])

  // Generate calendar grid for month view
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: { date: number; isCurrentMonth: boolean; fullDate: Date }[] = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i),
      })
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: d,
        isCurrentMonth: true,
        fullDate: new Date(year, month, d),
      })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: d,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, d),
      })
    }

    return days
  }, [currentDate])

  // Generate week view hours
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [currentDate])

  const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7 AM to 8 PM

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((s) => {
      const sessionDate = new Date(s.startDate)
      return (
        sessionDate.getFullYear() === date.getFullYear() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getDate() === date.getDate()
      )
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Schedule</h1>
          <p className="mt-1 text-gray-600">View and manage all your sessions.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50"
            aria-label="Previous"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50"
            aria-label="Next"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h2 className="ml-3 text-lg font-semibold text-navy">{headerTitle}</h2>
        </div>

        <div className="flex rounded-md border border-gray-300">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize ${
                view === v
                  ? 'bg-navy text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${v === 'month' ? 'rounded-l-md' : ''} ${v === 'day' ? 'rounded-r-md' : ''}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="mt-4">
        {view === 'month' && (
          <div className="rounded-lg border bg-white">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {monthGrid.map((day, idx) => {
                const daySessions = getSessionsForDate(day.fullDate)
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-b border-r p-1.5 ${
                      !day.isCurrentMonth ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday(day.fullDate)
                          ? 'bg-navy text-white font-bold'
                          : day.isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      }`}
                    >
                      {day.date}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {daySessions.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className={`truncate rounded border px-1 py-0.5 text-xs ${STATUS_COLORS[s.status]}`}
                        >
                          {s.activityName}
                        </div>
                      ))}
                      {daySessions.length > 3 && (
                        <span className="text-xs text-gray-500">+{daySessions.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="rounded-lg border bg-white overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                <div className="border-r" />
                {weekDays.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={`border-r px-2 py-2 text-center ${isToday(date) ? 'bg-sky-50' : ''}`}
                  >
                    <div className="text-xs text-gray-500">
                      {DAYS[date.getDay()]}
                    </div>
                    <div
                      className={`mt-0.5 text-sm font-medium ${
                        isToday(date) ? 'text-navy' : 'text-gray-900'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Time grid */}
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                  <div className="border-r px-2 py-3 text-right text-xs text-gray-400">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  {weekDays.map((date) => {
                    const hourSessions = getSessionsForDate(date).filter((s) => {
                      const h = new Date(s.startDate).getHours()
                      return h === hour
                    })
                    return (
                      <div key={date.toISOString()} className="relative border-r p-0.5">
                        {hourSessions.map((s) => (
                          <div
                            key={s.id}
                            className={`truncate rounded border px-1 py-0.5 text-xs ${STATUS_COLORS[s.status]}`}
                          >
                            {s.activityName}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'day' && (
          <div className="rounded-lg border bg-white">
            {hours.map((hour) => {
              const hourSessions = getSessionsForDate(currentDate).filter((s) => {
                const h = new Date(s.startDate).getHours()
                return h === hour
              })
              return (
                <div key={hour} className="flex border-b">
                  <div className="w-20 flex-shrink-0 border-r px-3 py-4 text-right text-xs text-gray-400">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  <div className="flex-1 p-2">
                    {hourSessions.map((s) => (
                      <div
                        key={s.id}
                        className={`rounded border p-2 text-sm ${STATUS_COLORS[s.status]}`}
                      >
                        <span className="font-medium">{s.activityName}</span>
                        <span className="ml-2 text-xs">
                          {s.durationMin}min · {s.enrolledCount}/{s.capacity ?? '∞'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {sessions.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-500">No sessions scheduled for this period.</p>
            <p className="mt-1 text-sm text-gray-400">
              Create activities and add sessions to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
