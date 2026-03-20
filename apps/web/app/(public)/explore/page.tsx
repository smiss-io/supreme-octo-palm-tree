'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const CATEGORIES = ['All', 'STEM', 'Art', 'Dance', 'Sports', 'Music', 'Academic', 'Cooking', 'Language']
const FORMATS = ['All', 'In Person', 'Online', 'Camp', 'Drop-In']

const FORMAT_MAP: Record<string, string[]> = {
  All: [],
  'In Person': ['IN_PERSON'],
  Online: ['ONLINE', 'BLENDED'],
  Camp: ['CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY'],
  'Drop-In': ['DROP_IN'],
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

type ExploreActivity = {
  id: string
  name: string
  description: string | null
  format: string
  category: string
  organizationName: string
  organizationSlug: string
  minAge: number | null
  maxAge: number | null
  tags: string[]
  priceInCents: number | null
  nextSessionDate: string | null
  city: string | null
  state: string | null
  isFeatured: boolean
}

function formatAge(months: number | null): string {
  if (months == null) return 'Any'
  const years = Math.floor(months / 12)
  if (years === 0) return `${months}mo`
  return `${years}y`
}

function formatPrice(cents: number | null): string {
  if (cents == null) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [format, setFormat] = useState('All')
  const [minAge, setMinAge] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  // Activities loaded via search API / Meilisearch — placeholder data
  const activities: ExploreActivity[] = []

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
          !a.description?.toLowerCase().includes(search.toLowerCase())) return false
      if (category !== 'All' && a.category !== category) return false
      if (format !== 'All' && !FORMAT_MAP[format]?.includes(a.format)) return false
      if (minAge && a.maxAge != null && a.maxAge < parseInt(minAge) * 12) return false
      if (maxPrice && a.priceInCents != null && a.priceInCents > parseInt(maxPrice) * 100) return false
      return true
    })
  }, [activities, search, category, format, minAge, maxPrice])

  const featured = filtered.filter((a) => a.isFeatured)
  const regular = filtered.filter((a) => !a.isFeatured)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-navy px-4 py-12 text-center">
        <h1 className="font-display text-4xl font-bold text-white">
          Discover Activities for Your Kids
        </h1>
        <p className="mt-2 text-lg text-sky-200">
          Classes, camps, and programs in your area
        </p>

        {/* Search Bar */}
        <div className="mx-auto mt-6 max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes, camps, sports..."
              className="w-full rounded-lg border-0 px-4 py-3 pl-10 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
              aria-label="Search activities"
            />
            <svg
              className="absolute left-3 top-3.5 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Category</h3>
                <div className="mt-2 space-y-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`block w-full rounded px-2 py-1 text-left text-sm ${
                        category === c ? 'bg-sky-100 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">Format</h3>
                <div className="mt-2 space-y-1">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`block w-full rounded px-2 py-1 text-left text-sm ${
                        format === f ? 'bg-sky-100 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">Child&apos;s Age</h3>
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="Age in years"
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  aria-label="Minimum age in years"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">Max Price</h3>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="$ max"
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  aria-label="Maximum price in dollars"
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filtered.length} activit{filtered.length !== 1 ? 'ies' : 'y'} found
              </p>
              <div className="flex rounded-md border border-gray-300">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-navy text-white' : 'text-gray-600'} rounded-l-md`}
                  aria-label="Grid view"
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 text-sm ${viewMode === 'map' ? 'bg-navy text-white' : 'text-gray-600'} rounded-r-md`}
                  aria-label="Map view"
                >
                  Map
                </button>
              </div>
            </div>

            {/* Featured Carousel */}
            {featured.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-navy">Featured</h2>
                <div className="mt-2 flex gap-4 overflow-x-auto pb-2">
                  {featured.map((a) => (
                    <ActivityCard key={a.id} activity={a} featured />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {viewMode === 'grid' ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {regular.length === 0 && featured.length === 0 ? (
                  <div className="col-span-full py-16 text-center">
                    <p className="text-gray-500">No activities found matching your filters.</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Try adjusting your search or filters.
                    </p>
                  </div>
                ) : (
                  regular.map((a) => <ActivityCard key={a.id} activity={a} />)
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border bg-gray-200" style={{ height: 500 }}>
                <div className="flex h-full items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="font-medium">Map View</p>
                    <p className="mt-1 text-sm">Mapbox GL integration will render activity pins here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  featured = false,
}: {
  activity: ExploreActivity
  featured?: boolean
}) {
  return (
    <Link
      href={`/book/${activity.id}`}
      className={`block rounded-lg border bg-white shadow-sm transition hover:shadow-md ${
        featured ? 'min-w-[280px]' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-navy line-clamp-1">{activity.name}</h3>
          {featured && (
            <span className="ml-2 flex-shrink-0 rounded bg-coral-100 px-1.5 py-0.5 text-xs font-medium text-coral-700">
              Featured
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{activity.organizationName}</p>

        {activity.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{activity.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
            {FORMAT_LABELS[activity.format] ?? activity.format}
          </span>
          <span className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
            {activity.category}
          </span>
          <span className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
            Ages {formatAge(activity.minAge)}–{formatAge(activity.maxAge)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-medium text-navy">
            {formatPrice(activity.priceInCents)}
          </span>
          {activity.city && activity.state && (
            <span className="text-xs text-gray-400">
              {activity.city}, {activity.state}
            </span>
          )}
        </div>

        {activity.nextSessionDate && (
          <p className="mt-1 text-xs text-gray-400">
            Next: {new Date(activity.nextSessionDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </Link>
  )
}
