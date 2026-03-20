import { db } from '../../lib/db'

export type AutomationTrigger =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'CLASS_24H_BEFORE'
  | 'CLASS_1H_BEFORE'
  | 'CAMP_ENDED'
  | 'CONSECUTIVE_ABSENCES'
  | 'WAITLIST_SPOT_OPENED'
  | 'MEMBERSHIP_EXPIRING'
  | 'PAYMENT_FAILED'
  | 'REVIEW_REQUEST'
  | 'ENROLLMENT_THRESHOLD'

export type TriggerPayload = {
  trigger: AutomationTrigger
  organizationId: string
  entityId: string
  metadata?: Record<string, unknown>
}

/**
 * Fire a trigger event. Finds matching automations and enqueues actions.
 */
export async function fireTrigger(payload: TriggerPayload): Promise<{
  automationsMatched: number
  actionsEnqueued: number
}> {
  // Find all enabled automations matching this trigger for this org
  const automations = await db.automation.findMany({
    where: {
      organizationId: payload.organizationId,
      trigger: payload.trigger,
      isEnabled: true,
    },
    include: {
      actions: { orderBy: { order: 'asc' } },
    },
  })

  let actionsEnqueued = 0

  for (const automation of automations) {
    // Log the trigger firing
    await db.automationLog.create({
      data: {
        automationId: automation.id,
        triggeredAt: new Date(),
        entityId: payload.entityId,
        status: 'triggered',
      },
    })

    // Enqueue each action (in production via BullMQ)
    for (const action of automation.actions) {
      // In production: add to BullMQ automationQueue with delay
      actionsEnqueued++
    }
  }

  return {
    automationsMatched: automations.length,
    actionsEnqueued,
  }
}

/**
 * Check for sessions happening in 24h — fire CLASS_24H_BEFORE triggers.
 * Should be called from a nightly cron job at 6 AM UTC.
 */
export async function checkUpcomingSessions24h(): Promise<string[]> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const sessions = await db.activitySession.findMany({
    where: {
      startDate: { gte: in24h, lt: in25h },
      status: 'SCHEDULED',
    },
    include: {
      activity: { select: { organizationId: true } },
    },
  })

  const fired: string[] = []
  for (const session of sessions) {
    // Idempotency: check if already fired for this session
    const existing = await db.automationLog.findFirst({
      where: {
        entityId: session.id,
        status: { startsWith: 'triggered' },
        automation: {
          trigger: 'CLASS_24H_BEFORE',
          organizationId: session.activity.organizationId,
        },
        triggeredAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    })
    if (existing) continue // Already fired within 24h — skip

    await fireTrigger({
      trigger: 'CLASS_24H_BEFORE',
      organizationId: session.activity.organizationId,
      entityId: session.id,
    })
    fired.push(session.id)
  }

  return fired
}

/**
 * Check for sessions happening in 1h — fire CLASS_1H_BEFORE triggers.
 */
export async function checkUpcomingSessions1h(): Promise<string[]> {
  const now = new Date()
  const in1h = new Date(now.getTime() + 60 * 60 * 1000)
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const sessions = await db.activitySession.findMany({
    where: {
      startDate: { gte: in1h, lt: in2h },
      status: 'SCHEDULED',
    },
    include: {
      activity: { select: { organizationId: true } },
    },
  })

  const fired: string[] = []
  for (const session of sessions) {
    await fireTrigger({
      trigger: 'CLASS_1H_BEFORE',
      organizationId: session.activity.organizationId,
      entityId: session.id,
    })
    fired.push(session.id)
  }

  return fired
}

/**
 * Check for expiring memberships (7 days out).
 */
export async function checkExpiringMemberships(): Promise<string[]> {
  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in8days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)

  const bookings = await db.booking.findMany({
    where: {
      status: 'CONFIRMED',
      pricingPlan: { billingType: 'MEMBERSHIP' },
      session: {
        endDate: { gte: in7days, lt: in8days },
      },
    },
    include: {
      session: {
        include: { activity: { select: { organizationId: true } } },
      },
    },
  })

  const fired: string[] = []
  for (const booking of bookings) {
    await fireTrigger({
      trigger: 'MEMBERSHIP_EXPIRING',
      organizationId: booking.session.activity.organizationId,
      entityId: booking.id,
    })
    fired.push(booking.id)
  }

  return fired
}
