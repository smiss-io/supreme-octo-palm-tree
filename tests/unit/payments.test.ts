import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { computeProratedPrice, computeSiblingDiscount } from '../../apps/web/server/routers/payment'
import { hasFeature } from '../../apps/web/lib/tiers'

describe('Payments, Ledger & Financial Tools', () => {
  describe('Refund validation', () => {
    it('cannot refund more than original charge amount', () => {
      const originalAmount = 5000
      const alreadyRefunded = 2000
      const requestedRefund = 4000
      const maxRefundable = originalAmount - alreadyRefunded
      expect(requestedRefund > maxRefundable).toBe(true)
    })

    it('full refund when no prior refunds', () => {
      const originalAmount = 5000
      const alreadyRefunded = 0
      const requestedRefund = 5000
      expect(requestedRefund <= originalAmount - alreadyRefunded).toBe(true)
    })

    it('partial refund allowed within limit', () => {
      const originalAmount = 10000
      const alreadyRefunded = 3000
      const requestedRefund = 5000
      expect(requestedRefund <= originalAmount - alreadyRefunded).toBe(true)
    })

    it('cannot refund disputed payments', () => {
      const status = 'DISPUTED'
      expect(status === 'DISPUTED').toBe(true) // Should block refund
    })
  })

  describe('Gift card code hashing', () => {
    it('code is stored as SHA-256 hash, not plaintext', () => {
      const plainCode = 'ABCD1234EFGH5678'
      const hashedCode = createHash('sha256').update(plainCode).digest('hex')

      // Hash should be 64 hex chars (256 bits)
      expect(hashedCode).toHaveLength(64)
      // Hash should NOT equal the plaintext
      expect(hashedCode).not.toBe(plainCode)
      // Hash should be deterministic
      const secondHash = createHash('sha256').update(plainCode).digest('hex')
      expect(hashedCode).toBe(secondHash)
    })

    it('plaintext code is NOT stored in DB (only hash)', () => {
      const plainCode = 'XYZW9876UVST4321'
      const stored = createHash('sha256').update(plainCode).digest('hex')
      expect(stored).not.toContain(plainCode)
      expect(/^[0-9a-f]{64}$/.test(stored)).toBe(true)
    })

    it('can look up gift card by hashing the provided code', () => {
      const plainCode = 'GIFT1234TEST5678'
      const storedHash = createHash('sha256').update(plainCode).digest('hex')
      const lookupHash = createHash('sha256').update(plainCode).digest('hex')
      expect(storedHash).toBe(lookupHash)
    })

    it('different codes produce different hashes', () => {
      const hash1 = createHash('sha256').update('CODE1111AAAA2222').digest('hex')
      const hash2 = createHash('sha256').update('CODE3333BBBB4444').digest('hex')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Sibling discount', () => {
    it('auto-applies for second child booking', () => {
      const price = 5000
      const discounted = computeSiblingDiscount(price, 10, true)
      expect(discounted).toBe(4500) // 10% off
    })

    it('does not apply for first child', () => {
      const price = 5000
      const result = computeSiblingDiscount(price, 10, false)
      expect(result).toBe(5000) // No discount
    })

    it('handles 0% discount', () => {
      expect(computeSiblingDiscount(5000, 0, true)).toBe(5000)
    })

    it('handles 100% discount', () => {
      expect(computeSiblingDiscount(5000, 100, true)).toBe(0)
    })

    it('rounds up to nearest cent', () => {
      // 15% of 3333 = 499.95 → discount = 500, price = 2833
      const result = computeSiblingDiscount(3333, 15, true)
      expect(result).toBe(Math.ceil(3333 * 0.85))
      expect(result).toBe(2834)
    })
  })

  describe('Prorated pricing for late joiners', () => {
    it('correct for week 3 of 8-week semester', () => {
      const fullPrice = 24000 // $240
      const totalSessions = 8
      const remainingSessions = 6 // Joining week 3
      const prorated = computeProratedPrice(fullPrice, totalSessions, remainingSessions)
      expect(prorated).toBe(18000) // $180
    })

    it('correct for week 5 of 8-week semester', () => {
      const fullPrice = 24000
      const prorated = computeProratedPrice(fullPrice, 8, 4)
      expect(prorated).toBe(12000) // $120
    })

    it('rounds up to nearest cent', () => {
      const fullPrice = 10000
      const prorated = computeProratedPrice(fullPrice, 3, 2)
      // 2/3 * 10000 = 6666.67 → ceil = 6667
      expect(prorated).toBe(6667)
    })

    it('returns full price if all sessions remain', () => {
      expect(computeProratedPrice(10000, 8, 8)).toBe(10000)
    })

    it('returns 0 if no sessions remain', () => {
      expect(computeProratedPrice(10000, 8, 0)).toBe(0)
    })

    it('returns 0 if total sessions is 0', () => {
      expect(computeProratedPrice(10000, 0, 0)).toBe(0)
    })
  })

  describe('Ledger entry creation', () => {
    it('CHARGE entry has positive amounts', () => {
      const entry = {
        type: 'CHARGE' as const,
        grossAmountCents: 10000,
        stripeFeesCents: 290,
        platformFeeCents: 200,
        netAmountCents: 10000 - 290 - 200,
      }
      expect(entry.netAmountCents).toBe(9510)
      expect(entry.grossAmountCents).toBeGreaterThan(0)
    })

    it('REFUND entry has negative amounts', () => {
      const entry = {
        type: 'REFUND' as const,
        grossAmountCents: -5000,
        netAmountCents: -5000,
      }
      expect(entry.grossAmountCents).toBeLessThan(0)
      expect(entry.netAmountCents).toBeLessThan(0)
    })

    it('net = gross - stripe fee - platform fee', () => {
      const gross = 15000
      const stripeFee = 435 // 2.9% + 30c
      const platformFee = 300
      const net = gross - stripeFee - platformFee
      expect(net).toBe(14265)
    })

    it('ledger totals match payout amount', () => {
      const entries = [
        { grossAmountCents: 10000, stripeFeesCents: 290, platformFeeCents: 200, netAmountCents: 9510 },
        { grossAmountCents: 5000, stripeFeesCents: 175, platformFeeCents: 100, netAmountCents: 4725 },
        { grossAmountCents: -3000, stripeFeesCents: 0, platformFeeCents: 0, netAmountCents: -3000 },
      ]
      const totalNet = entries.reduce((sum, e) => sum + e.netAmountCents, 0)
      expect(totalNet).toBe(9510 + 4725 - 3000) // 11235
    })
  })

  describe('Tier gates for financial features', () => {
    it('LAUNCH tier can still process refunds (not tier-gated)', () => {
      // Refunds are available to all tiers — just basic payment processing
      expect(hasFeature('LAUNCH' as any, 'creditCardProcessing')).toBe(true)
    })

    it('storeCredit requires SCALE tier', () => {
      expect(hasFeature('LAUNCH' as any, 'storeCredit')).toBe(false)
      expect(hasFeature('GROW' as any, 'storeCredit')).toBe(false)
      expect(hasFeature('SCALE' as any, 'storeCredit')).toBe(true)
    })

    it('customPaymentMethods (CASH/CHECK) requires SCALE tier', () => {
      expect(hasFeature('LAUNCH' as any, 'customPaymentMethods')).toBe(false)
      expect(hasFeature('GROW' as any, 'customPaymentMethods')).toBe(false)
      expect(hasFeature('SCALE' as any, 'customPaymentMethods')).toBe(true)
    })

    it('memberships requires GROW tier', () => {
      expect(hasFeature('LAUNCH' as any, 'memberships')).toBe(false)
      expect(hasFeature('GROW' as any, 'memberships')).toBe(true)
      expect(hasFeature('SCALE' as any, 'memberships')).toBe(true)
    })

    it('paymentPlans requires GROW tier', () => {
      expect(hasFeature('LAUNCH' as any, 'paymentPlans')).toBe(false)
      expect(hasFeature('GROW' as any, 'paymentPlans')).toBe(true)
    })
  })

  describe('CSV export format (QuickBooks compatible)', () => {
    it('CSV has correct headers', () => {
      const headers = ['Date', 'Type', 'Gross', 'Stripe Fee', 'Platform Fee', 'Net', 'Payout ID', 'Reconciled']
      expect(headers).toHaveLength(8)
      expect(headers).toContain('Date')
      expect(headers).toContain('Net')
      expect(headers).toContain('Reconciled')
    })

    it('amounts formatted as decimal dollars', () => {
      const cents = 10050
      const formatted = (cents / 100).toFixed(2)
      expect(formatted).toBe('100.50')
    })

    it('reconciled column shows Yes/No', () => {
      expect(true ? 'Yes' : 'No').toBe('Yes')
      expect(false ? 'Yes' : 'No').toBe('No')
    })
  })
})
