'use client'

import { useState } from 'react'
import Link from 'next/link'

const FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: 'In Person',
  ONLINE: 'Online',
  BLENDED: 'Blended',
  DROP_IN: 'Drop-In',
  APPOINTMENT: 'Appointment',
  CAMP_SINGLE_DAY: 'Camp (1 Day)',
  CAMP_MULTI_DAY: 'Camp (Multi-Day)',
  SEMESTER: 'Semester',
  PRIVATE_PARTY: 'Private Party',
  FREE_TRIAL: 'Free Trial',
}

type Activity = {
  id: string
  name: string
  format: string
  category: string
  isPublished: boolean
  capacity: number | null
  sessionCount: number
  nextSession: { startDate: string } | null
  createdAt: string
}

export default function ActivitiesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  // Activities will be loaded via tRPC in real usage — static placeholder for now
  const activities: Activity[] = []

  const filteredActivities = activities.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && a.category !== categoryFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Activities</h1>
          <p className="mt-1 text-gray-600">
            Create and manage your classes, camps, and programs.
          </p>
        </div>
        <Link
          href="/provider/activities/new"
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          Create Activity
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="">All Categories</option>
          <option value="STEM">STEM</option>
          <option value="Art">Art</option>
          <option value="Dance">Dance</option>
          <option value="Sports">Sports</option>
          <option value="Music">Music</option>
          <option value="Academic">Academic</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No activities yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first activity.
          </p>
          <Link
            href="/provider/activities/new"
            className="mt-4 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Create Activity
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => (
            <Link
              key={activity.id}
              href={`/provider/activities/${activity.id}`}
              className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-navy">{activity.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    activity.isPublished
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activity.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-700">
                  {FORMAT_LABELS[activity.format] ?? activity.format}
                </span>
                <span className="rounded bg-gray-50 px-2 py-0.5">{activity.category}</span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>{activity.sessionCount} session{activity.sessionCount !== 1 ? 's' : ''}</span>
                {activity.capacity && <span>Cap: {activity.capacity}</span>}
              </div>
              {activity.nextSession && (
                <p className="mt-2 text-xs text-gray-400">
                  Next: {new Date(activity.nextSession.startDate).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
