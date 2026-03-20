'use client'

import { useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'

type RosterStudent = {
  bookingId: string
  childId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  allergies: string | null
  medicalNotes: string | null
  emergencyContact: { name: string; phone: string; relationship: string } | null
  photoConsent: boolean
  waiverSignedAt: string | null
  attendance: {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    checkedInAt: string | null
    checkedOutAt: string | null
    notes: string | null
  } | null
}

type SessionInfo = {
  activityName: string
  date: string
  time: string
  location: string
  enrolledCount: number
  capacity: number | null
}

const STATUS_STYLES = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LATE: 'bg-yellow-100 text-yellow-700',
  EXCUSED: 'bg-blue-100 text-blue-700',
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function calculateAge(dob: string): string {
  const birth = new Date(dob)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  return `${years}y`
}

export default function RosterPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  // Loaded via tRPC attendanceRouter.getRoster — placeholder
  const session: SessionInfo = {
    activityName: 'Loading...',
    date: '',
    time: '',
    location: '',
    enrolledCount: 0,
    capacity: null,
  }
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null)
  const [activeTab, setActiveTab] = useState<'roster' | 'progress'>('roster')

  // Swipe check-in
  const touchStartX = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, student: RosterStudent) => {
      const diff = e.changedTouches[0].clientX - touchStartX.current
      if (Math.abs(diff) < 50) return // Too short

      if (diff > 50) {
        // Swipe right = check in
        setStudents((prev) =>
          prev.map((s) =>
            s.childId === student.childId
              ? {
                  ...s,
                  attendance: {
                    status: 'PRESENT' as const,
                    checkedInAt: new Date().toISOString(),
                    checkedOutAt: null,
                    notes: null,
                  },
                }
              : s
          )
        )
      } else if (diff < -50) {
        // Swipe left = absent
        setStudents((prev) =>
          prev.map((s) =>
            s.childId === student.childId
              ? {
                  ...s,
                  attendance: {
                    status: 'ABSENT' as const,
                    checkedInAt: null,
                    checkedOutAt: null,
                    notes: null,
                  },
                }
              : s
          )
        )
      }
    },
    []
  )

  const markAllPresent = () => {
    const now = new Date().toISOString()
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attendance: {
          status: 'PRESENT' as const,
          checkedInAt: now,
          checkedOutAt: null,
          notes: null,
        },
      }))
    )
    // tRPC call: attendanceRouter.bulkMarkAttendance
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Session Header */}
      <div className="bg-navy px-4 py-4 text-white print:bg-white print:text-black">
        <h1 className="text-xl font-bold">{session.activityName}</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-sky-200 print:text-gray-600">
          {session.date && <span>{session.date}</span>}
          {session.time && <span>{session.time}</span>}
          {session.location && <span>{session.location}</span>}
          <span>
            {session.enrolledCount}
            {session.capacity ? `/${session.capacity}` : ''} enrolled
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b bg-white print:hidden">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'roster'
              ? 'border-b-2 border-navy text-navy'
              : 'text-gray-500'
          }`}
        >
          Roster
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'progress'
              ? 'border-b-2 border-navy text-navy'
              : 'text-gray-500'
          }`}
        >
          Progress
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="px-4 py-4">
          {/* Quick Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={markAllPresent}
              className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Mark All Present
            </button>
            <button className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Print
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400 print:hidden">
            Swipe right to check in, swipe left to mark absent
          </p>

          {/* Student List */}
          <div className="mt-4 space-y-2">
            {students.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No students enrolled in this session.</p>
            ) : (
              students.map((student) => (
                <div
                  key={student.childId}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, student)}
                  onClick={() => setSelectedStudent(student)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md active:bg-gray-50 print:shadow-none print:border-gray-200"
                  role="button"
                  tabIndex={0}
                  aria-label={`${student.firstName} ${student.lastName}, ${student.attendance?.status ?? 'not checked in'}`}
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {getInitials(student.firstName, student.lastName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <span className="text-xs text-gray-400">{calculateAge(student.dateOfBirth)}</span>
                      {student.allergies && (
                        <span className="text-xs text-amber-600" title={student.allergies}>
                          Allergies
                        </span>
                      )}
                    </div>
                    {student.attendance?.checkedInAt && (
                      <p className="text-xs text-gray-400">
                        In: {new Date(student.attendance.checkedInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {student.attendance.checkedOutAt && (
                          <> · Out: {new Date(student.attendance.checkedOutAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="print:block">
                    {student.attendance ? (
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[student.attendance.status]}`}>
                        {student.attendance.status}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 print:hidden">
                        —
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="px-4 py-4">
          <p className="text-sm text-gray-500">
            Tap a milestone to award or revoke for students on the roster.
          </p>
          <div className="mt-4 rounded-lg border bg-white p-6 text-center text-gray-400">
            Milestone grid will load here (GROW+ tier only)
          </div>
        </div>
      )}

      {/* Student Detail Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedStudent(null)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl animate-in slide-in-from-bottom">
            <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-gray-300" />

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-medium text-sky-700">
                {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-navy">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <p className="text-sm text-gray-500">{calculateAge(selectedStudent.dateOfBirth)}</p>
              </div>
            </div>

            {/* Allergies Warning */}
            {selectedStudent.allergies && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Allergies</p>
                <p className="text-sm text-amber-700">{selectedStudent.allergies}</p>
              </div>
            )}

            {/* Medical Notes */}
            {selectedStudent.medicalNotes && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-800">Medical Notes</p>
                <p className="text-sm text-blue-700">{selectedStudent.medicalNotes}</p>
              </div>
            )}

            {/* Emergency Contact */}
            {selectedStudent.emergencyContact && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Emergency Contact</p>
                <p className="text-sm text-gray-600">
                  {selectedStudent.emergencyContact.name} ({selectedStudent.emergencyContact.relationship})
                  {' — '}
                  <a href={`tel:${selectedStudent.emergencyContact.phone}`} className="text-navy underline">
                    {selectedStudent.emergencyContact.phone}
                  </a>
                </p>
              </div>
            )}

            {/* Waiver Status */}
            <div className="mt-3">
              <p className="text-sm text-gray-500">
                Waiver: {selectedStudent.waiverSignedAt ? (
                  <span className="text-green-600">Signed on {new Date(selectedStudent.waiverSignedAt).toLocaleDateString()}</span>
                ) : (
                  <span className="text-red-600">Not signed</span>
                )}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white">
                Check In
              </button>
              <button className="flex-1 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700">
                Absent
              </button>
              <button className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700">
                Late
              </button>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white; }
          .print\\:bg-white { background: white; }
          .print\\:text-black { color: black; }
          .print\\:text-gray-600 { color: #4b5563; }
          .print\\:shadow-none { box-shadow: none; }
          .print\\:border-gray-200 { border-color: #e5e7eb; }
          .print\\:block { display: block; }
        }
      `}</style>
    </div>
  )
}
