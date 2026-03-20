// AI Enrollment Forecasting
// Uses historical enrollment data to predict future session performance
// Runs weekly via BullMQ cron job (every Monday 7 AM UTC)

import { db } from '../../lib/db'

export interface EnrollmentForecastResult {
  sessionId: string
  activityName: string
  currentEnrollment: number
  capacity: number
  historicalPace: number
  trendPercent: number
  alertRequired: boolean
  emailDraft?: string
}

export async function generateEnrollmentForecast(
  organizationId: string,
  sessionId: string
): Promise<EnrollmentForecastResult> {
  // 1. Fetch current session enrollment
  const session = await db.activitySession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { activity: true },
  })

  const currentEnrollment = session.enrolledCount
  const capacity = session.capacity ?? 0

  // 2. Fetch same activity's historical enrollment data
  const daysUntilStart = Math.ceil(
    (session.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const historicalSessions = await db.activitySession.findMany({
    where: {
      activity: {
        organizationId,
        category: session.activity.category,
      },
      status: 'COMPLETED',
      startDate: { lt: new Date() },
    },
    orderBy: { startDate: 'desc' },
    take: 10,
  })

  // 3. Calculate trend percentage vs same period last year
  const avgHistoricalEnrollment =
    historicalSessions.length > 0
      ? historicalSessions.reduce((sum, s) => sum + s.enrolledCount, 0) /
        historicalSessions.length
      : 0

  const historicalPace = avgHistoricalEnrollment > 0 ? avgHistoricalEnrollment : 1
  const trendPercent = ((currentEnrollment / historicalPace) - 1) * 100

  // 4. Determine if alert is needed (trending 40% below)
  const alertRequired = trendPercent < -40

  return {
    sessionId,
    activityName: session.activity.name,
    currentEnrollment,
    capacity,
    historicalPace: avgHistoricalEnrollment,
    trendPercent,
    alertRequired,
  }
}

// Generate promotional email prompt for AI
export function buildPromotionalEmailPrompt(
  activityName: string,
  orgName: string,
  startDate: Date,
  trendPercent: number
): string {
  return `You are a marketing assistant for a children's activity business.
A class "${activityName}" on ${startDate.toLocaleDateString()} at ${orgName} is currently
${Math.abs(trendPercent).toFixed(0)}% below last season's enrollment pace at the same time.
Write a concise, friendly promotional email to waitlisted parents.
Keep it under 150 words. Subject line should create urgency without being pushy.
Do not use emojis excessively.`
}
