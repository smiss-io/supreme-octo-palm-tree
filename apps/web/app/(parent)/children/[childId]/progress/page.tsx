'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

type MilestoneRecord = {
  id: string
  milestoneId: string
  activityId: string
  achievedAt: string
  notes: string | null
  milestone: {
    name: string
    description: string | null
    badgeImageUrl: string | null
    order: number
  } | null
}

type ActivityProgress = {
  activityId: string
  activityName: string
  totalMilestones: number
  achievedMilestones: number
  records: MilestoneRecord[]
}

export default function ChildProgressPage() {
  const params = useParams()
  const childId = params.childId as string

  // Data loaded via tRPC progressRouter.getChildProgress — placeholder
  const childName = 'Loading...'
  const activities: ActivityProgress[] = []
  const allRecords: MilestoneRecord[] = []

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/parent/children" className="text-sm text-gray-500 hover:text-navy">
        &larr; Back to Children
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold text-navy">
        {childName}&apos;s Progress
      </h1>
      <p className="mt-1 text-gray-600">
        Milestones achieved across all activities
      </p>

      {/* Badge Gallery */}
      {allRecords.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-navy">Badges Earned</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {allRecords
              .filter((r) => r.milestone?.badgeImageUrl)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col items-center gap-1"
                  title={r.milestone?.name}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 ring-2 ring-yellow-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.milestone!.badgeImageUrl!}
                      alt={`${r.milestone!.name} badge`}
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <span className="text-xs text-gray-600 text-center max-w-[72px] truncate">
                    {r.milestone?.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Activity Progress Cards */}
      {activities.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No milestones yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Progress will appear here as your child achieves milestones in their activities.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {activities.map((activity) => (
            <div key={activity.activityId} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-navy">{activity.activityName}</h3>
                <span className="text-sm text-gray-500">
                  {activity.achievedMilestones}/{activity.totalMilestones} milestones
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{
                      width: `${activity.totalMilestones > 0
                        ? (activity.achievedMilestones / activity.totalMilestones) * 100
                        : 0}%`,
                    }}
                    role="progressbar"
                    aria-valuenow={activity.achievedMilestones}
                    aria-valuemin={0}
                    aria-valuemax={activity.totalMilestones}
                    aria-label={`${activity.achievedMilestones} of ${activity.totalMilestones} milestones achieved`}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-4 space-y-3">
                {activity.records.map((record) => (
                  <div key={record.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="mt-1 h-full w-px bg-gray-200" />
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-gray-900">
                        {record.milestone?.name ?? 'Unknown Milestone'}
                      </p>
                      {record.milestone?.description && (
                        <p className="text-xs text-gray-500">{record.milestone.description}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(record.achievedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {record.notes && (
                        <p className="mt-1 text-xs italic text-gray-500">{record.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shareable Progress Card */}
      {allRecords.length > 0 && (
        <div className="mt-8 text-center">
          <button className="rounded-md border border-navy px-4 py-2 text-sm font-medium text-navy hover:bg-navy/5">
            Share Progress Card (PNG)
          </button>
          <p className="mt-1 text-xs text-gray-400">
            Generate a shareable image of your child&apos;s achievements
          </p>
        </div>
      )}
    </div>
  )
}
