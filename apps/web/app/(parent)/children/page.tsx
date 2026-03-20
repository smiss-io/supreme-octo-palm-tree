'use client'

import { useState } from 'react'
import Link from 'next/link'

type ChildProfile = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  allergies: string | null
  medicalNotes: string | null
  photoConsent: boolean
}

export default function ChildrenPage() {
  // Children loaded via tRPC childRouter.list — placeholder
  const children: ChildProfile[] = []
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const formatAge = (dob: string) => {
    const birth = new Date(dob)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    const totalMonths = years * 12 + months
    if (totalMonths < 12) return `${totalMonths} months`
    const y = Math.floor(totalMonths / 12)
    return `${y} year${y !== 1 ? 's' : ''} old`
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">My Children</h1>
          <p className="mt-1 text-gray-600">Manage your children&apos;s profiles.</p>
        </div>
        <Link
          href="/parent/children/new"
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          Add Child
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No children added yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your children&apos;s profiles to book activities.
          </p>
          <Link
            href="/parent/children/new"
            className="mt-4 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Add Your First Child
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {children.map((child) => (
            <div key={child.id} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {child.firstName[0]}{child.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{formatAge(child.dateOfBirth)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/parent/children/${child.id}`}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/parent/children/${child.id}/progress`}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Progress
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(child.id)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {(child.allergies || child.medicalNotes) && (
                <div className="mt-3 flex gap-4 text-xs">
                  {child.allergies && (
                    <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700">
                      Allergies: {child.allergies}
                    </span>
                  )}
                  {child.medicalNotes && (
                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
                      Medical notes on file
                    </span>
                  )}
                </div>
              )}

              {/* Delete Confirmation */}
              {showDeleteConfirm === child.id && (
                <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">
                    Are you sure? This will permanently delete all data for {child.firstName} per COPPA requirements.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
