import { Worker } from 'bullmq'
import IORedis from 'ioredis'

// BullMQ worker processes
// Queues: email, sms, automation, forecast

const connection = new IORedis(process.env.UPSTASH_REDIS_REST_URL ?? '', {
  maxRetriesPerRequest: null,
})

// Email worker — concurrency 10, 3 retries with exponential backoff
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html, templateId, variables, organizationId } = job.data
    // Send via Resend in production:
    // const { Resend } = await import('resend')
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: 'KidSpark <noreply@kidspark.com>', to, subject, html })
    console.log(`[email] Sent ${templateId ?? subject} to ${to}`)
  },
  {
    connection,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 },
  }
)

// SMS worker — concurrency 5
const smsWorker = new Worker(
  'sms',
  async (job) => {
    const { to, body, parentProfileId, organizationId } = job.data

    // Check SMS opt-out before sending
    if (parentProfileId) {
      const { db } = await import('../apps/web/lib/db')
      const profile = await db.parentProfile.findUnique({
        where: { id: parentProfileId },
        select: { smsOptOut: true },
      })
      if (profile?.smsOptOut) {
        console.log(`[sms] Skipped — parent ${parentProfileId} opted out`)
        return
      }
    }

    // Truncate to 160 chars
    const message = (body as string).slice(0, 160)
    // Send via Twilio in production:
    // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    // await twilio.messages.create({ body: message, to, from: process.env.TWILIO_PHONE_NUMBER })
    console.log(`[sms] Sent to ${to}: ${message}`)
  },
  {
    connection,
    concurrency: 5,
  }
)

// Automation worker — concurrency 3
const automationWorker = new Worker(
  'automation',
  async (job) => {
    const { automationId, trigger, entityId, organizationId } = job.data
    const { executeAction } = await import('../apps/web/server/automation/actions')
    const { db } = await import('../apps/web/lib/db')

    const automation = await db.automation.findUnique({
      where: { id: automationId },
      include: { actions: { orderBy: { order: 'asc' } } },
    })
    if (!automation || !automation.isEnabled) return

    for (const action of automation.actions) {
      // Apply delay if configured
      if (action.delaySeconds && action.delaySeconds > 0) {
        await new Promise((r) => setTimeout(r, action.delaySeconds! * 1000))
      }

      const result = await executeAction({
        automationId,
        organizationId,
        entityId,
        actionType: action.actionType,
        config: action.config as Record<string, unknown>,
      })

      await db.automationLog.create({
        data: {
          automationId,
          triggeredAt: new Date(),
          entityId,
          status: result.status,
          error: result.error,
        },
      })
    }
  },
  {
    connection,
    concurrency: 3,
  }
)

// Forecast worker — concurrency 1 (weekly cron, Monday 7 AM UTC)
const forecastWorker = new Worker(
  'forecast',
  async (job) => {
    const { runOrganizationForecast } = await import('../apps/web/server/ai/forecasting')
    const { db } = await import('../apps/web/lib/db')
    const { hasFeature } = await import('../apps/web/lib/tiers')

    // Find all SCALE orgs
    const scaleOrgs = await db.organization.findMany({
      where: { tier: 'SCALE' },
      select: { id: true, name: true },
    })

    console.log(`[forecast] Running forecasts for ${scaleOrgs.length} SCALE orgs`)

    for (const org of scaleOrgs) {
      try {
        const summary = await runOrganizationForecast(org.id)
        console.log(`[forecast] ${org.name}: ${summary.forecasts.length} sessions, ${summary.alertCount} alerts`)

        // Enqueue alert emails for sessions needing attention
        for (const forecast of summary.forecasts.filter((f) => f.alertRequired)) {
          console.log(`[forecast] Alert: ${forecast.activityName} — ${forecast.alertReason}`)
        }
      } catch (err) {
        console.error(`[forecast] Error for org ${org.id}:`, err)
      }
    }
  },
  {
    connection,
    concurrency: 1,
  }
)

// Retry policy: 3 retries with exponential backoff
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...')
  await Promise.all([
    emailWorker.close(),
    smsWorker.close(),
    automationWorker.close(),
    forecastWorker.close(),
  ])
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('Workers started')

export { emailWorker, smsWorker, automationWorker, forecastWorker, defaultJobOptions }
