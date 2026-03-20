// AI Enrollment Forecasting
// Uses historical enrollment data to predict future session performance
// Runs weekly via BullMQ cron job (every Monday 7 AM UTC)
// SCALE tier only — gated via requireFeatureGate in forecastRouter

import { db } from '../../lib/db'

export interface EnrollmentForecastResult {
  sessionId: string
  activityName: string
  currentEnrollment: number
  capacity: number
  historicalPace: number
  trendPercent: number
  predictedFillRate: number
  daysUntilStart: number
  alertRequired: boolean
  alertReason?: string
  emailDraft?: string
}

export interface ForecastSummary {
  organizationId: string
  generatedAt: Date
  forecasts: EnrollmentForecastResult[]
  alertCount: number
}

/**
 * Calculate linear regression slope for enrollment trend
 */
export function calculateTrendSlope(dataPoints: number[]): number {
  if (dataPoints.length < 2) return 0
  const n = dataPoints.length
  const sumX = (n * (n - 1)) / 2
  const sumY = dataPoints.reduce((a, b) => a + b, 0)
  const sumXY = dataPoints.reduce((sum, y, x) => sum + x * y, 0)
  const sumXX = dataPoints.reduce((sum, _, x) => sum + x * x, 0)
  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return 0
  return (n * sumXY - sumX * sumY) / denominator
}

/**
 * Predict fill rate based on current pace and historical data
 */
export function predictFillRate(
  currentEnrollment: number,
  capacity: number,
  daysUntilStart: number,
  historicalPace: number
): number {
  if (capacity <= 0) return 0
  if (daysUntilStart <= 0) return Math.round((currentEnrollment / capacity) * 100)

  // Project enrollment at start based on current pace vs historical
  const paceRatio = historicalPace > 0 ? currentEnrollment / historicalPace : 1
  const projectedEnrollment = Math.min(capacity, Math.round(currentEnrollment * (1 + paceRatio * 0.1 * daysUntilStart / 7)))
  return Math.min(100, Math.round((projectedEnrollment / capacity) * 100))
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

  // 2. Calculate days until start
  const daysUntilStart = Math.ceil(
    (session.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  // 3. Fetch same activity's historical enrollment data
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

  // 4. Calculate trend percentage vs historical average
  const avgHistoricalEnrollment =
    historicalSessions.length > 0
      ? historicalSessions.reduce((sum, s) => sum + s.enrolledCount, 0) /
        historicalSessions.length
      : 0

  const historicalPace = avgHistoricalEnrollment > 0 ? avgHistoricalEnrollment : 1
  const trendPercent = ((currentEnrollment / historicalPace) - 1) * 100

  // 5. Predict fill rate
  const predictedFillRate = predictFillRate(currentEnrollment, capacity, daysUntilStart, historicalPace)

  // 6. Determine alert conditions
  let alertRequired = false
  let alertReason: string | undefined

  if (trendPercent < -40) {
    alertRequired = true
    alertReason = `Enrollment is ${Math.abs(Math.round(trendPercent))}% below historical pace`
  } else if (capacity > 0 && predictedFillRate < 50 && daysUntilStart <= 14) {
    alertRequired = true
    alertReason = `Predicted fill rate is only ${predictedFillRate}% with ${daysUntilStart} days until start`
  }

  return {
    sessionId,
    activityName: session.activity.name,
    currentEnrollment,
    capacity,
    historicalPace: avgHistoricalEnrollment,
    trendPercent: Math.round(trendPercent * 10) / 10,
    predictedFillRate,
    daysUntilStart,
    alertRequired,
    alertReason,
  }
}

/**
 * Run forecasts for all upcoming sessions of a SCALE org
 */
export async function runOrganizationForecast(
  organizationId: string
): Promise<ForecastSummary> {
  const upcomingSessions = await db.activitySession.findMany({
    where: {
      activity: { organizationId },
      startDate: { gt: new Date() },
      status: { in: ['OPEN', 'PUBLISHED'] },
    },
    select: { id: true },
  })

  const forecasts: EnrollmentForecastResult[] = []
  for (const session of upcomingSessions) {
    const forecast = await generateEnrollmentForecast(organizationId, session.id)
    forecasts.push(forecast)
  }

  return {
    organizationId,
    generatedAt: new Date(),
    forecasts,
    alertCount: forecasts.filter((f) => f.alertRequired).length,
  }
}

/**
 * Generate promotional email prompt for Anthropic API
 */
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
