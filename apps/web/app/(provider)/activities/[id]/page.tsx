'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

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

type Tab = 'overview' | 'sessions' | 'pricing' | 'milestones'

export default function ActivityDetailPage() {
  const params = useParams()
  const activityId = params.id as string
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Activity data will be loaded via tRPC — placeholder for now
  const activity = {
    id: activityId,
    name: 'Loading...',
    description: '',
    format: 'IN_PERSON',
    category: '',
    isPublished: false,
    capacity: null as number | null,
    minAge: null as number | null,
    maxAge: null as number | null,
    tags: [] as string[],
    location: null as { name: string } | null,
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'milestones', label: 'Milestones' },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/provider/activities" className="text-sm text-gray-500 hover:text-navy">
            &larr; Back to Activities
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy">{activity.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                activity.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {activity.isPublished ? 'Published' : 'Draft'}
            </span>
            <span className="text-sm text-gray-500">
              {FORMAT_LABELS[activity.format] ?? activity.format}
            </span>
            {activity.category && (
              <span className="text-sm text-gray-500">{activity.category}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Duplicate
          </button>
          {activity.isPublished ? (
            <button className="rounded-md border border-orange-300 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50">
              Unpublish
            </button>
          ) : (
            <button className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-600">
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab activity={activity} />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab activityId={activityId} />
        )}
        {activeTab === 'pricing' && (
          <PricingTab activityId={activityId} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab activityId={activityId} />
        )}
      </div>
    </div>
  )
}

function OverviewTab({ activity }: { activity: Record<string, unknown> }) {
  const formatAge = (months: number | null) => {
    if (months == null) return 'Any'
    const years = Math.floor(months / 12)
    const remaining = months % 12
    if (years === 0) return `${remaining}mo`
    if (remaining === 0) return `${years}y`
    return `${years}y ${remaining}mo`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-medium text-navy">Details</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Description</dt>
            <dd className="mt-1 text-gray-900">
              {(activity.description as string) || 'No description'}
            </dd>
          </div>
          <div className="flex gap-8">
            <div>
              <dt className="text-gray-500">Age Range</dt>
              <dd className="mt-1 text-gray-900">
                {formatAge(activity.minAge as number | null)} – {formatAge(activity.maxAge as number | null)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Capacity</dt>
              <dd className="mt-1 text-gray-900">
                {(activity.capacity as number | null) ?? 'Unlimited'}
              </dd>
            </div>
          </div>
          {activity.location && (
            <div>
              <dt className="text-gray-500">Location</dt>
              <dd className="mt-1 text-gray-900">{(activity.location as { name: string }).name}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h3 className="font-medium text-navy">Tags</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {((activity.tags as string[]) ?? []).length > 0 ? (
            (activity.tags as string[]).map((tag) => (
              <span key={tag} className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                {tag}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400">No tags added</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionsTab({ activityId }: { activityId: string }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-navy">Sessions</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-600"
        >
          Add Session
        </button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="session-start" className="block text-sm font-medium text-gray-700">
                Start Date & Time
              </label>
              <input
                id="session-start"
                type="datetime-local"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="session-end" className="block text-sm font-medium text-gray-700">
                End Date (optional)
              </label>
              <input
                id="session-end"
                type="datetime-local"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="session-duration" className="block text-sm font-medium text-gray-700">
                Duration (minutes)
              </label>
              <input
                id="session-duration"
                type="number"
                min={1}
                max={1440}
                defaultValue={60}
                className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="session-capacity" className="block text-sm font-medium text-gray-700">
                Capacity (override)
              </label>
              <input
                id="session-capacity"
                type="number"
                min={1}
                className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Inherit from activity"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="session-recur" className="block text-sm font-medium text-gray-700">
                Recurrence Rule (iCal RRULE, optional)
              </label>
              <input
                id="session-recur"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE;COUNT=12"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use iCal RRULE format for recurring sessions
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-600">
              Create Session
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-sm text-gray-400">No sessions scheduled yet. Add your first session above.</p>
      </div>
    </div>
  )
}

function PricingTab({ activityId }: { activityId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-navy">Pricing Plans</h3>
        <button className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-600">
          Add Pricing
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-400">
          No pricing plans configured. Add pricing to allow parents to book this activity.
        </p>
      </div>
    </div>
  )
}

function MilestonesTab({ activityId }: { activityId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-navy">Milestones</h3>
        <button className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-600">
          Add Milestone
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Track student progress with milestones. Requires GROW plan or higher.
      </p>
      <div className="mt-4">
        <p className="text-sm text-gray-400">No milestones defined yet.</p>
      </div>
    </div>
  )
}
