import { describe, it, expect, vi } from 'vitest'
import Stripe from 'stripe'

describe('Stripe Webhook Security', () => {
  it('rejects requests with invalid signature', () => {
    const stripe = new Stripe('sk_test_fake', { apiVersion: '2024-11-20.acacia' })

    const payload = JSON.stringify({ type: 'test', data: {} })
    const invalidSignature = 'invalid_signature_value'
    const secret = 'whsec_test_secret_value'

    expect(() => {
      stripe.webhooks.constructEvent(payload, invalidSignature, secret)
    }).toThrow()
  })

  it('accepts requests with valid signature', () => {
    const stripe = new Stripe('sk_test_fake', { apiVersion: '2024-11-20.acacia' })
    const secret = 'whsec_test_secret_12345'

    const payload = JSON.stringify({
      id: 'evt_test_123',
      object: 'event',
      type: 'account.updated',
      data: { object: {} },
    })

    // Generate a valid signature
    const timestamp = Math.floor(Date.now() / 1000)
    const signedPayload = `${timestamp}.${payload}`
    const crypto = require('crypto')
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')
    const header = `t=${timestamp},v1=${hmac}`

    const event = stripe.webhooks.constructEvent(payload, header, secret)
    expect(event.type).toBe('account.updated')
  })

  it('rejects expired webhook signatures', () => {
    const stripe = new Stripe('sk_test_fake', { apiVersion: '2024-11-20.acacia' })
    const secret = 'whsec_test_secret_12345'

    const payload = JSON.stringify({
      id: 'evt_test_123',
      object: 'event',
      type: 'test',
      data: { object: {} },
    })

    // Create a signature from 10 minutes ago
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600
    const signedPayload = `${oldTimestamp}.${payload}`
    const crypto = require('crypto')
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')
    const header = `t=${oldTimestamp},v1=${hmac}`

    // Stripe's default tolerance is 300 seconds (5 min)
    expect(() => {
      stripe.webhooks.constructEvent(payload, header, secret)
    }).toThrow()
  })
})
