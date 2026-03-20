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
    const { to, templateId, variables, organizationId } = job.data
    // Implementation in Phase 7 — send via Resend
    console.log(`[email] Sending ${templateId} to ${to}`)
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
    const { to, body, organizationId } = job.data
    // Implementation in Phase 7 — send via Twilio
    console.log(`[sms] Sending to ${to}`)
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
    // Implementation in Phase 7
    console.log(`[automation] Running ${automationId} for trigger ${trigger}`)
  },
  {
    connection,
    concurrency: 3,
  }
)

// Forecast worker — concurrency 1 (weekly cron)
const forecastWorker = new Worker(
  'forecast',
  async (job) => {
    // Implementation in Phase 8 — AI enrollment forecasting
    console.log('[forecast] Running enrollment forecast')
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
