'use client'

import { useState } from 'react'
import Link from 'next/link'

type BookingItem = {
  id: string
  status: string
  totalInCents: number
  child: { firstName: string; lastName: string }
  session: {
    startDate: string
    durationMin: number
    activity: {
      name: string
      format: string
      organization: { name: string }
    }
  }
  waitlistPosition: number | null
  createdAt: string
  cancelledAt: string | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  WAITLISTED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
}

export default function BookingsPage() {
  const [filter, setFilter] = useState<string>('all')

  // Bookings loaded via tRPC bookingRouter.getMyBookings — placeholder
  const bookings: BookingItem[] = []

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === filter)

  const upcoming = filtered.filter((b) =>
    b.status === 'CONFIRMED' && new Date(b.session.startDate) > new Date()
  )
  const past = filtered.filter((b) =>
    b.status === 'COMPLETED' || new Date(b.session.startDate) <= new Date()
  )
  const other = filtered.filter((b) =>
    !upcoming.includes(b) && !past.includes(b)
  )

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-navy">My Bookings</h1>
      <p className="mt-1 text-gray-600">View and manage your activity bookings.</p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {['all', 'CONFIRMED', 'PENDING', 'WAITLISTED', 'CANCELLED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f
                ? 'bg-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No bookings yet.</p>
          <Link
            href="/explore"
            className="mt-3 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Explore Activities
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {upcoming.length > 0 && (
            <BookingSection title="Upcoming" bookings={upcoming} />
          )}
          {other.length > 0 && (
            <BookingSection title="Pending / Waitlisted" bookings={other} />
          )}
          {past.length > 0 && (
            <BookingSection title="Past" bookings={past} />
          )}
        </div>
      )}
    </div>
  )
}

function BookingSection({ title, bookings }: { title: string; bookings: BookingItem[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-navy">{b.session.activity.name}</h3>
                <p className="text-sm text-gray-500">{b.session.activity.organization.name}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {b.status}
                {b.waitlistPosition != null && ` (#${b.waitlistPosition})`}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span>
                {new Date(b.session.startDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span>{b.session.durationMin} min</span>
              <span>
                For: {b.child.firstName} {b.child.lastName}
              </span>
              <span>${(b.totalInCents / 100).toFixed(2)}</span>
            </div>

            <div className="mt-3 flex gap-2">
              {b.status === 'CONFIRMED' && new Date(b.session.startDate) > new Date() && (
                <>
                  <button className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Download .ics
                  </button>
                  <button className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                    Cancel Booking
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
