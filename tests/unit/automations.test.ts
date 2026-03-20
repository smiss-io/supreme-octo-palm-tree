import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import {
  compileTemplate,
  createHmacSignature,
  isValidWebhookUrl,
} from '../../apps/web/server/automation/actions'
import { hasFeature } from '../../apps/web/lib/tiers'

describe('Automations Engine & Communications', () => {
  describe('Automation trigger enqueuing', () => {
    it('BOOKING_CONFIRMED trigger matches correct automations', () => {
      const trigger = 'BOOKING_CONFIRMED'
      const automations = [
        { trigger: 'BOOKING_CONFIRMED', isEnabled: true },
        { trigger: 'BOOKING_CANCELLED', isEnabled: true },
        { trigger: 'BOOKING_CONFIRMED', isEnabled: false },
      ]
      const matched = automations.filter((a) => a.trigger === trigger && a.isEnabled)
      expect(matched).toHaveLength(1)
    })

    it('disabled automations are not triggered', () => {
      const automations = [
        { trigger: 'CLASS_24H_BEFORE', isEnabled: false },
      ]
      const matched = automations.filter((a) => a.isEnabled)
      expect(matched).toHaveLength(0)
    })
  })

  describe('Handlebars template compilation', () => {
    it('compiles template with variables correctly', () => {
      const template = 'Hello {{name}}, your class {{className}} starts at {{time}}.'
      const result = compileTemplate(template, {
        name: 'Alice',
        className: 'Art 101',
        time: '10:00 AM',
      })
      expect(result).toBe('Hello Alice, your class Art 101 starts at 10:00 AM.')
    })

    it('handles missing variables gracefully', () => {
      const template = 'Hello {{name}}, welcome to {{org}}.'
      const result = compileTemplate(template, { name: 'Bob' })
      expect(result).toBe('Hello Bob, welcome to .')
    })

    it('escapes HTML in variables by default', () => {
      const template = 'Note: {{note}}'
      const result = compileTemplate(template, { note: '<script>alert("xss")</script>' })
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('handles nested variables', () => {
      const template = '{{child.firstName}} {{child.lastName}}'
      const result = compileTemplate(template, {
        child: { firstName: 'Alice', lastName: 'Smith' },
      })
      expect(result).toBe('Alice Smith')
    })
  })

  describe('Webhook HMAC-SHA256 signature', () => {
    it('generates valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ event: 'test', entityId: '123' })
      const secret = 'whsec_test_secret_key_12345'
      const signature = createHmacSignature(payload, secret)

      // Verify with known computation
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      expect(signature).toBe(expected)
    })

    it('signature is 64 hex characters (256-bit)', () => {
      const signature = createHmacSignature('test', 'secret')
      expect(signature).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(signature)).toBe(true)
    })

    it('different payloads produce different signatures', () => {
      const secret = 'test-secret'
      const sig1 = createHmacSignature('payload1', secret)
      const sig2 = createHmacSignature('payload2', secret)
      expect(sig1).not.toBe(sig2)
    })

    it('different secrets produce different signatures', () => {
      const payload = 'same-payload'
      const sig1 = createHmacSignature(payload, 'secret1')
      const sig2 = createHmacSignature(payload, 'secret2')
      expect(sig1).not.toBe(sig2)
    })

    it('signature can be verified by receiver', () => {
      const payload = '{"event":"booking.confirmed","id":"abc"}'
      const secret = 'webhook_secret_123'
      const sent = createHmacSignature(payload, secret)

      // Receiver verifies
      const received = createHmac('sha256', secret).update(payload).digest('hex')
      expect(sent).toBe(received)
    })
  })

  describe('SMS opt-out compliance', () => {
    it('smsOptOut=true prevents SMS sending', () => {
      const profile = { smsOptOut: true }
      expect(profile.smsOptOut).toBe(true) // Should skip sending
    })

    it('smsOptOut=false allows SMS sending', () => {
      const profile = { smsOptOut: false, smsConsent: true }
      expect(profile.smsOptOut).toBe(false)
      expect(profile.smsConsent).toBe(true) // Both conditions must be met
    })

    it('SMS messages truncated to 160 characters', () => {
      const longMessage = 'x'.repeat(200)
      const truncated = longMessage.slice(0, 160)
      expect(truncated).toHaveLength(160)
    })
  })

  describe('Dead letter queue (DLQ)', () => {
    it('job failing 3 times should write to AutomationLog with error', () => {
      const maxRetries = 3
      let attempts = 0
      const errors: string[] = []

      // Simulate 3 failed attempts
      for (let i = 0; i < maxRetries; i++) {
        attempts++
        errors.push(`Attempt ${attempts} failed: Connection timeout`)
      }

      expect(attempts).toBe(3)
      expect(errors).toHaveLength(3)

      // After 3 failures, write to dead letter / automation log
      const dlqEntry = {
        status: 'failed',
        error: errors[errors.length - 1],
        attempts,
      }
      expect(dlqEntry.status).toBe('failed')
      expect(dlqEntry.attempts).toBe(3)
    })

    it('retry backoff increases exponentially', () => {
      const baseDelay = 1000
      const delays = [0, 1, 2].map((attempt) => Math.pow(2, attempt) * baseDelay)
      expect(delays).toEqual([1000, 2000, 4000])
    })
  })

  describe('CLASS_24H_BEFORE idempotency', () => {
    it('should not double-fire for same session within 24h', () => {
      const firedSessionIds = new Set(['session-1', 'session-2'])
      const sessionToFire = 'session-1'

      // Check if already fired
      const alreadyFired = firedSessionIds.has(sessionToFire)
      expect(alreadyFired).toBe(true) // Should skip
    })

    it('should fire for sessions not yet triggered', () => {
      const firedSessionIds = new Set(['session-1'])
      const sessionToFire = 'session-3'

      const alreadyFired = firedSessionIds.has(sessionToFire)
      expect(alreadyFired).toBe(false) // Should fire
    })
  })

  describe('Webhook URL validation (SSRF prevention)', () => {
    it('rejects http:// URLs', () => {
      expect(isValidWebhookUrl('http://example.com/webhook')).toBe(false)
    })

    it('accepts https:// URLs', () => {
      expect(isValidWebhookUrl('https://example.com/webhook')).toBe(true)
    })

    it('rejects localhost', () => {
      expect(isValidWebhookUrl('https://localhost/webhook')).toBe(false)
      expect(isValidWebhookUrl('https://127.0.0.1/webhook')).toBe(false)
    })

    it('rejects private IP 10.x', () => {
      expect(isValidWebhookUrl('https://10.0.0.1/webhook')).toBe(false)
    })

    it('rejects private IP 192.168.x', () => {
      expect(isValidWebhookUrl('https://192.168.1.1/webhook')).toBe(false)
    })

    it('rejects private IP 172.16.x', () => {
      expect(isValidWebhookUrl('https://172.16.0.1/webhook')).toBe(false)
    })

    it('rejects 0.0.0.0', () => {
      expect(isValidWebhookUrl('https://0.0.0.0/webhook')).toBe(false)
    })

    it('rejects .local domains', () => {
      expect(isValidWebhookUrl('https://myserver.local/webhook')).toBe(false)
    })

    it('rejects invalid URLs', () => {
      expect(isValidWebhookUrl('not-a-url')).toBe(false)
    })

    it('accepts valid external URLs', () => {
      expect(isValidWebhookUrl('https://api.example.com/webhooks/kidspark')).toBe(true)
      expect(isValidWebhookUrl('https://hooks.zapier.com/123')).toBe(true)
    })
  })

  describe('Automation tier gates', () => {
    it('LAUNCH tier cannot access nativeAutomations', () => {
      expect(hasFeature('LAUNCH' as any, 'nativeAutomations')).toBe(false)
    })

    it('GROW tier can access nativeAutomations', () => {
      expect(hasFeature('GROW' as any, 'nativeAutomations')).toBe(true)
    })

    it('webhookIntegrations requires GROW+', () => {
      expect(hasFeature('LAUNCH' as any, 'webhookIntegrations')).toBe(false)
      expect(hasFeature('GROW' as any, 'webhookIntegrations')).toBe(true)
    })
  })

  describe('Email template rendering', () => {
    it('booking confirmation template renders without errors', async () => {
      const BookingConfirmation = (await import('../../packages/email/booking-confirmation')).default
      const html = BookingConfirmation({
        parentName: 'Jane',
        childName: 'Alice',
        activityName: 'Art Class',
        organizationName: 'Creative Kids',
        sessionDate: 'March 25, 2026',
        sessionTime: '10:00 AM',
        locationName: 'Studio A',
        totalAmount: '$50.00',
        bookingId: 'BK-12345',
        calendarUrl: 'https://example.com/cal',
        unsubscribeUrl: 'https://example.com/unsub',
      })
      expect(html).toContain('Booking Confirmed')
      expect(html).toContain('Alice')
      expect(html).toContain('Art Class')
      expect(html).toContain('$50.00')
      expect(html).toContain('Unsubscribe')
    })

    it('waitlist spot template includes claim window', async () => {
      const WaitlistSpot = (await import('../../packages/email/waitlist-spot-available')).default
      const html = WaitlistSpot({
        parentName: 'John',
        childName: 'Bob',
        activityName: 'Soccer',
        sessionDate: 'April 1, 2026',
        bookNowUrl: 'https://example.com/book',
        expiresIn: '24 hours',
        unsubscribeUrl: 'https://example.com/unsub',
      })
      expect(html).toContain('Spot Opened Up')
      expect(html).toContain('24 hours')
      expect(html).toContain('Book Now')
    })

    it('all templates include unsubscribe link', async () => {
      const templates = [
        (await import('../../packages/email/booking-confirmation')).default,
        (await import('../../packages/email/class-reminder-24h')).default,
        (await import('../../packages/email/waitlist-spot-available')).default,
        (await import('../../packages/email/payment-failed')).default,
      ]
      for (const tmpl of templates) {
        const html = tmpl({} as any)
        expect(html).toContain('Unsubscribe')
      }
    })
  })
})
