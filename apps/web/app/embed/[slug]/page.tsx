'use client'

import { useParams } from 'next/navigation'

type PublicActivity = {
  id: string
  name: string
  description: string | null
  format: string
  category: string
  minAge: number | null
  maxAge: number | null
  capacity: number | null
  tags: string[]
  imageUrls: string[]
  nextSession: {
    startDate: string
    durationMin: number
    capacity: number | null
    enrolledCount: number
  } | null
}

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

function formatAge(months: number | null): string {
  if (months == null) return 'Any age'
  const years = Math.floor(months / 12)
  const remaining = months % 12
  if (years === 0) return `${remaining}mo`
  if (remaining === 0) return `${years} yrs`
  return `${years}y ${remaining}mo`
}

export default function EmbedBookingWidget() {
  const params = useParams()
  const slug = params.slug as string

  // Activities will be fetched via public API using org slug
  const orgName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const activities: PublicActivity[] = []

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Widget Header */}
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-navy">{orgName}</h1>
          <p className="mt-1 text-sm text-gray-600">Browse and book activities</p>
        </div>

        {/* Activity Cards */}
        {activities.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-gray-500">No activities available at this time.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-navy">{activity.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-700">
                        {FORMAT_LABELS[activity.format] ?? activity.format}
                      </span>
                      <span className="rounded bg-gray-50 px-2 py-0.5 text-gray-600">
                        {activity.category}
                      </span>
                      <span className="rounded bg-gray-50 px-2 py-0.5 text-gray-600">
                        Ages {formatAge(activity.minAge)} – {formatAge(activity.maxAge)}
                      </span>
                    </div>
                  </div>
                </div>

                {activity.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                )}

                {activity.nextSession && (
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Next: {new Date(activity.nextSession.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {activity.nextSession.capacity && (
                      <span>
                        {activity.nextSession.capacity - activity.nextSession.enrolledCount} spots left
                      </span>
                    )}
                  </div>
                )}

                {activity.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activity.tags.map((tag) => (
                      <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <button className="mt-4 w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by KidSpark
        </div>
      </div>
    </div>
  )
}
