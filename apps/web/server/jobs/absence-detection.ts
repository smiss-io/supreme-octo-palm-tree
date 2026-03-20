import { db } from '../../lib/db'

/**
 * Automated absence detection — runs nightly via BullMQ cron.
 *
 * Finds children with 2+ consecutive absences in the same activity
 * and enqueues CONSECUTIVE_ABSENCES automation triggers.
 */
export async function detectConsecutiveAbsences(
  threshold: number = 2
): Promise<{ triggered: { childId: string; activityId: string; consecutiveCount: number }[] }> {
  // Get all completed sessions grouped by activity, ordered by date
  const activities = await db.activity.findMany({
    where: { deletedAt: null, isPublished: true },
    select: {
      id: true,
      organizationId: true,
      sessions: {
        where: { status: 'COMPLETED' },
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          startDate: true,
        },
      },
    },
  })

  const triggered: { childId: string; activityId: string; consecutiveCount: number }[] = []

  for (const activity of activities) {
    if (activity.sessions.length < threshold) continue

    // Get the most recent N sessions
    const recentSessionIds = activity.sessions.slice(0, threshold + 2).map((s) => s.id)

    // Get all attendance records for these sessions
    const records = await db.attendanceRecord.findMany({
      where: {
        sessionId: { in: recentSessionIds },
        status: 'ABSENT',
      },
      select: { childId: true, sessionId: true },
    })

    // Group by child
    const childAbsences = new Map<string, Set<string>>()
    for (const record of records) {
      if (!childAbsences.has(record.childId)) {
        childAbsences.set(record.childId, new Set())
      }
      childAbsences.get(record.childId)!.add(record.sessionId)
    }

    // Check for consecutive absences (most recent sessions)
    for (const [childId, absentSessionIds] of childAbsences) {
      // Count how many of the most recent sessions this child was absent
      let consecutiveCount = 0
      for (const sessionId of recentSessionIds) {
        if (absentSessionIds.has(sessionId)) {
          consecutiveCount++
        } else {
          break // Streak broken
        }
      }

      if (consecutiveCount >= threshold) {
        triggered.push({
          childId,
          activityId: activity.id,
          consecutiveCount,
        })
      }
    }
  }

  return { triggered }
}

/**
 * Generate a unique QR token for a booking.
 * Uses UUID v4 — not sequential to prevent enumeration.
 */
export function generateQrToken(): string {
  const { randomUUID } = require('crypto')
  return randomUUID()
}

/**
 * Check if a QR token has expired.
 * Tokens expire 24h after the session ends.
 */
export function isQrTokenExpired(
  sessionStartDate: Date,
  durationMin: number,
  now: Date = new Date()
): boolean {
  const sessionEnd = new Date(sessionStartDate.getTime() + durationMin * 60 * 1000)
  const expiresAt = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000)
  return now > expiresAt
}
