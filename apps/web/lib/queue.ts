import { Queue } from 'bullmq'
import IORedis from 'ioredis'

function getRedisConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  if (!url) {
    throw new Error('UPSTASH_REDIS_REST_URL environment variable is required')
  }
  return new IORedis(url, { maxRetriesPerRequest: null })
}

let connection: IORedis | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = getRedisConnection()
  }
  return connection
}

export const emailQueue = new Queue('email', { connection: getConnection() })
export const smsQueue = new Queue('sms', { connection: getConnection() })
export const automationQueue = new Queue('automation', {
  connection: getConnection(),
})
export const forecastQueue = new Queue('forecast', {
  connection: getConnection(),
})

export type EmailJobData = {
  to: string
  templateId: string
  variables: Record<string, string>
  organizationId: string
}

export type SmsJobData = {
  to: string
  body: string
  organizationId: string
}

export type AutomationJobData = {
  automationId: string
  trigger: string
  entityId: string
  organizationId: string
}
