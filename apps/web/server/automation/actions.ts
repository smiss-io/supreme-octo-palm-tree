import { createHmac } from 'crypto'
import { db } from '../../lib/db'
import Handlebars from 'handlebars'

export type ActionContext = {
  automationId: string
  organizationId: string
  entityId: string
  actionType: string
  config: Record<string, unknown>
  dryRun?: boolean
}

/**
 * Execute a single automation action.
 * Returns the log entry status.
 */
export async function executeAction(ctx: ActionContext): Promise<{
  status: 'success' | 'failed' | 'skipped'
  error?: string
}> {
  if (ctx.dryRun) {
    return { status: 'skipped' }
  }

  try {
    switch (ctx.actionType) {
      case 'SEND_EMAIL':
        return await executeSendEmail(ctx)
      case 'SEND_SMS':
        return await executeSendSms(ctx)
      case 'NOTIFY_STAFF':
        return await executeNotifyStaff(ctx)
      case 'ISSUE_STORE_CREDIT':
        return await executeIssueStoreCredit(ctx)
      case 'WEBHOOK':
        return await executeWebhook(ctx)
      default:
        return { status: 'skipped' }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    // Log failure
    await db.automationLog.create({
      data: {
        automationId: ctx.automationId,
        triggeredAt: new Date(),
        entityId: ctx.entityId,
        status: 'failed',
        error,
      },
    })
    return { status: 'failed', error }
  }
}

async function executeSendEmail(ctx: ActionContext): Promise<{ status: 'success' | 'failed'; error?: string }> {
  const { templateId, recipientEmail, variables } = ctx.config as {
    templateId?: string
    recipientEmail?: string
    variables?: Record<string, unknown>
  }

  if (!templateId || !recipientEmail) {
    return { status: 'failed', error: 'Missing templateId or recipientEmail' }
  }

  // Fetch template
  const template = await db.messageTemplate.findFirst({
    where: { id: templateId, organizationId: ctx.organizationId },
  })
  if (!template) {
    return { status: 'failed', error: 'Template not found' }
  }

  // Compile Handlebars template
  const compiledBody = compileTemplate(template.body, variables ?? {})
  const compiledSubject = template.subject
    ? compileTemplate(template.subject, variables ?? {})
    : 'Notification'

  // In production: send via Resend
  // await resend.emails.send({
  //   from: 'noreply@kidspark.com',
  //   to: recipientEmail,
  //   subject: compiledSubject,
  //   html: compiledBody,
  // })

  return { status: 'success' }
}

async function executeSendSms(ctx: ActionContext): Promise<{ status: 'success' | 'failed' | 'skipped'; error?: string }> {
  const { recipientPhone, message, parentProfileId } = ctx.config as {
    recipientPhone?: string
    message?: string
    parentProfileId?: string
  }

  if (!recipientPhone || !message) {
    return { status: 'failed', error: 'Missing phone or message' }
  }

  // Check SMS opt-out
  if (parentProfileId) {
    const profile = await db.parentProfile.findUnique({
      where: { id: parentProfileId },
      select: { smsOptOut: true },
    })
    if (profile?.smsOptOut) {
      return { status: 'skipped' } // Honor opt-out
    }
  }

  // Ensure message is under 160 chars
  const truncated = message.slice(0, 160)

  // In production: send via Twilio
  // await twilioClient.messages.create({
  //   body: truncated,
  //   to: recipientPhone,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  // })

  return { status: 'success' }
}

async function executeNotifyStaff(ctx: ActionContext): Promise<{ status: 'success' | 'failed' }> {
  // Find all OWNER/ADMIN/MANAGER users in the org
  const staffMembers = await db.organizationUser.findMany({
    where: {
      organizationId: ctx.organizationId,
      role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
    },
    include: { user: { select: { email: true } } },
  })

  // In production: send email to each staff member via Resend
  // for (const staff of staffMembers) { ... }

  return { status: 'success' }
}

async function executeIssueStoreCredit(ctx: ActionContext): Promise<{ status: 'success' | 'failed' | 'skipped' }> {
  const { parentProfileId, amountInCents, reason } = ctx.config as {
    parentProfileId?: string
    amountInCents?: number
    reason?: string
  }

  if (!parentProfileId || !amountInCents) {
    return { status: 'failed', error: 'Missing parentProfileId or amount' } as any
  }

  // Check if org has SCALE tier (store credit is SCALE-only)
  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { subscriptionTier: true },
  })
  if (org?.subscriptionTier !== 'SCALE') {
    return { status: 'skipped' } // Skip if not SCALE tier
  }

  await db.storeCredit.create({
    data: {
      organizationId: ctx.organizationId,
      parentProfileId,
      amountInCents,
      reason: reason ?? 'Automation-issued credit',
    },
  })

  return { status: 'success' }
}

async function executeWebhook(ctx: ActionContext): Promise<{ status: 'success' | 'failed'; error?: string }> {
  const { webhookEndpointId } = ctx.config as { webhookEndpointId?: string }

  if (!webhookEndpointId) {
    return { status: 'failed', error: 'Missing webhookEndpointId' }
  }

  const endpoint = await db.webhookEndpoint.findFirst({
    where: { id: webhookEndpointId, organizationId: ctx.organizationId, isEnabled: true },
  })
  if (!endpoint) {
    return { status: 'failed', error: 'Webhook endpoint not found or disabled' }
  }

  // Validate URL: https only, no private IPs
  if (!isValidWebhookUrl(endpoint.url)) {
    return { status: 'failed', error: 'Invalid webhook URL (must be HTTPS, no private IPs)' }
  }

  // Build payload
  const payload = JSON.stringify({
    event: ctx.actionType,
    entityId: ctx.entityId,
    automationId: ctx.automationId,
    timestamp: new Date().toISOString(),
  })

  // Sign with HMAC-SHA256
  const signature = createHmacSignature(payload, endpoint.secret)

  // In production: POST with timeout and retries
  // const response = await fetch(endpoint.url, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-KidSpark-Signature': signature,
  //   },
  //   body: payload,
  //   signal: AbortSignal.timeout(10000),
  // })

  return { status: 'success' }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function compileTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  const compiled = Handlebars.compile(template)
  return compiled(variables)
}

export function createHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Must be HTTPS
    if (parsed.protocol !== 'https:') return false

    // Block private IP ranges
    const hostname = parsed.hostname
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}
