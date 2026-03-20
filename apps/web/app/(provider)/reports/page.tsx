'use client'

import { useState } from 'react'
import { trpc } from '../../../lib/trpc'

type ReportTab = 'revenue' | 'enrollment' | 'retention' | 'attendance' | 'waitlist' | 'staff' | 'forecast'

const TABS: { id: ReportTab; label: string; tier?: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'retention', label: 'Retention' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'staff', label: 'Staff' },
  { id: 'forecast', label: 'AI Forecast', tier: 'SCALE' },
]

function getDefaultDateRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  }
}

function StatCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}

function RevenueReport({ dateRange }: { dateRange: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading } = trpc.reporting.revenue.useQuery(dateRange)
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={`$${(data.total / 100).toFixed(2)}`} />
        <StatCard label="Transactions" value={data.byActivity.reduce((s, a) => s + a.count, 0)} />
        <StatCard label="Activities" value={data.byActivity.length} />
      </div>

      {/* Revenue by activity */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Activity</h3>
        <div className="space-y-3">
          {data.byActivity.map((a) => (
            <div key={a.activityId} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{a.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{a.count} payments</span>
                <span className="font-medium">${(a.totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily trend */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h3>
        <div className="h-64 flex items-end gap-1">
          {data.daily.map((d) => {
            const maxAmount = Math.max(...data.daily.map((x) => x.amountCents), 1)
            const height = (d.amountCents / maxAmount) * 100
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: $${(d.amountCents / 100).toFixed(2)}`}>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EnrollmentReport({ dateRange }: { dateRange: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading } = trpc.reporting.enrollment.useQuery(dateRange)
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Enrolled" value={data.total} />
        <StatCard label="Capacity Utilization" value={`${data.capacityUtilization}%`} />
        <StatCard label="Activities" value={data.byActivity.length} />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment by Activity</h3>
        <div className="space-y-4">
          {data.byActivity.map((a) => {
            const utilization = a.capacity ? Math.round((a.enrolled / a.capacity) * 100) : 0
            return (
              <div key={a.activityId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{a.name}</span>
                  <span className="text-gray-500">{a.enrolled}/{a.capacity ?? '?'} ({utilization}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${utilization >= 90 ? 'bg-green-500' : utilization >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RetentionReport({ dateRange }: { dateRange: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading } = trpc.reporting.retention.useQuery(dateRange)
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Returning Family Rate" value={`${data.returningFamilyRate}%`} subtitle="Families with 2+ bookings" />
        <StatCard label="Total Families" value={data.totalFamilies} />
        <StatCard label="Returning Families" value={data.returningFamilies} />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Breakdown</h3>
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3"
                strokeDasharray={`${data.returningFamilyRate} ${100 - data.returningFamilyRate}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{data.returningFamilyRate}%</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>{data.returningFamilies} out of {data.totalFamilies} families booked 2 or more times in this period.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AttendanceReport({ dateRange }: { dateRange: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading } = trpc.reporting.attendance.useQuery(dateRange)
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Average Attendance Rate" value={`${data.averageRate}%`} />
        <StatCard label="Total Records" value={data.total} />
        <StatCard label="Present/On-Time" value={data.present} />
      </div>
    </div>
  )
}

function WaitlistReport() {
  const { data, isLoading } = trpc.reporting.waitlist.useQuery()
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <StatCard label="Activities with Waitlists" value={data.activities.length} />

      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Waitlist Depth by Activity</h3>
        <div className="space-y-3">
          {data.activities.sort((a, b) => b.depth - a.depth).map((a) => (
            <div key={a.activityId} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{a.name}</span>
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                {a.depth} waiting
              </span>
            </div>
          ))}
          {data.activities.length === 0 && <p className="text-sm text-gray-500">No active waitlists</p>}
        </div>
      </div>
    </div>
  )
}

function StaffReport({ dateRange }: { dateRange: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading } = trpc.reporting.staff.useQuery(dateRange)
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <StatCard label="Active Instructors" value={data.instructors.length} />

      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions per Instructor</h3>
        <div className="space-y-3">
          {data.instructors.sort((a, b) => b.sessionCount - a.sessionCount).map((i) => (
            <div key={i.instructorId} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 font-mono">{i.instructorId.slice(0, 8)}...</span>
              <span className="text-sm font-medium">{i.sessionCount} sessions</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ForecastReport() {
  const { data, isLoading, error } = trpc.forecast.list.useQuery()
  if (error?.message?.includes('SCALE')) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">AI Forecasting</h3>
        <p className="mt-2 text-sm text-gray-500">Upgrade to the SCALE plan to access AI-powered enrollment forecasting.</p>
        <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Upgrade Plan
        </button>
      </div>
    )
  }
  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Sessions Analyzed" value={data.forecasts.length} />
        <StatCard label="Alerts" value={data.alertCount} subtitle="Sessions needing attention" />
        <StatCard label="Last Generated" value={new Date(data.generatedAt).toLocaleDateString()} />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Forecasts</h3>
        <div className="space-y-4">
          {data.forecasts.map((f) => (
            <div key={f.sessionId} className={`rounded-lg border p-4 ${f.alertRequired ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{f.activityName}</h4>
                  <p className="text-sm text-gray-500">{f.daysUntilStart} days until start</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{f.currentEnrollment}/{f.capacity}</p>
                  <p className={`text-sm font-medium ${f.trendPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {f.trendPercent >= 0 ? '+' : ''}{f.trendPercent}% vs history
                  </p>
                </div>
              </div>
              {f.alertRequired && f.alertReason && (
                <p className="mt-2 text-sm text-red-700">{f.alertReason}</p>
              )}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Predicted fill rate</span>
                  <span>{f.predictedFillRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${f.predictedFillRate >= 80 ? 'bg-green-500' : f.predictedFillRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${f.predictedFillRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {data.forecasts.length === 0 && <p className="text-sm text-gray-500">No upcoming sessions to forecast</p>}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue')
  const [dateRange, setDateRange] = useState(getDefaultDateRange)

  const exportMutation = trpc.reporting.exportReport.useMutation()

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (activeTab === 'waitlist' || activeTab === 'staff' || activeTab === 'forecast') return
    const result = await exportMutation.mutateAsync({
      reportType: activeTab as 'revenue' | 'enrollment' | 'retention' | 'attendance',
      format,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    })
    // Trigger download
    const blob = new Blob([result.data], { type: result.contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}-report.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track performance across your organization</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.dateFrom.split('T')[0]}
            onChange={(e) => setDateRange((prev) => ({ ...prev, dateFrom: new Date(e.target.value).toISOString() }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.dateTo.split('T')[0]}
            onChange={(e) => setDateRange((prev) => ({ ...prev, dateTo: new Date(e.target.value).toISOString() }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {activeTab !== 'waitlist' && activeTab !== 'staff' && activeTab !== 'forecast' && (
            <button
              onClick={() => handleExport('csv')}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.tier && (
                <span className="ml-1 inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                  {tab.tier}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Report content */}
      {activeTab === 'revenue' && <RevenueReport dateRange={dateRange} />}
      {activeTab === 'enrollment' && <EnrollmentReport dateRange={dateRange} />}
      {activeTab === 'retention' && <RetentionReport dateRange={dateRange} />}
      {activeTab === 'attendance' && <AttendanceReport dateRange={dateRange} />}
      {activeTab === 'waitlist' && <WaitlistReport />}
      {activeTab === 'staff' && <StaffReport dateRange={dateRange} />}
      {activeTab === 'forecast' && <ForecastReport />}
    </div>
  )
}
