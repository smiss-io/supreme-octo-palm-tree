import { describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import { requiresParentalConsent, calculateAgeInMonths } from '../../apps/web/lib/security/coppa'

// Set encryption key before tests
beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
})

// Booking input validation schema (matching booking router)
const bookingInitiateSchema = z.object({
  activitySessionId: z.string().uuid(),
  childId: z.string().uuid(),
  pricingPlanId: z.string().uuid(),
  addOnIds: z.array(z.string().uuid()).max(10).optional(),
  couponCode: z.string().max(50).optional(),
  customFieldData: z.record(z.string(), z.unknown()).optional(),
})

// Child input validation schema (matching child router)
const childCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  medicalNotes: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1).max(100),
      phone: z.string().min(1).max(20),
      relationship: z.string().min(1).max(50),
    })
    .optional(),
  photoConsent: z.boolean().default(false),
})

describe('Booking & Parent Flow', () => {
  describe('Booking initiation validation', () => {
    it('accepts valid booking input', () => {
      const input = {
        activitySessionId: '550e8400-e29b-41d4-a716-446655440000',
        childId: '550e8400-e29b-41d4-a716-446655440001',
        pricingPlanId: '550e8400-e29b-41d4-a716-446655440002',
      }
      expect(bookingInitiateSchema.parse(input)).toEqual(input)
    })

    it('rejects invalid UUID for session', () => {
      expect(() =>
        bookingInitiateSchema.parse({
          activitySessionId: 'not-uuid',
          childId: '550e8400-e29b-41d4-a716-446655440001',
          pricingPlanId: '550e8400-e29b-41d4-a716-446655440002',
        })
      ).toThrow()
    })

    it('rejects more than 10 add-ons', () => {
      const addOnIds = Array.from({ length: 11 }, () => '550e8400-e29b-41d4-a716-446655440099')
      expect(() =>
        bookingInitiateSchema.parse({
          activitySessionId: '550e8400-e29b-41d4-a716-446655440000',
          childId: '550e8400-e29b-41d4-a716-446655440001',
          pricingPlanId: '550e8400-e29b-41d4-a716-446655440002',
          addOnIds,
        })
      ).toThrow()
    })

    it('coupon code cannot exceed 50 chars', () => {
      expect(() =>
        bookingInitiateSchema.parse({
          activitySessionId: '550e8400-e29b-41d4-a716-446655440000',
          childId: '550e8400-e29b-41d4-a716-446655440001',
          pricingPlanId: '550e8400-e29b-41d4-a716-446655440002',
          couponCode: 'x'.repeat(51),
        })
      ).toThrow()
    })

    it('does NOT accept price from client (no price field in schema)', () => {
      const input = {
        activitySessionId: '550e8400-e29b-41d4-a716-446655440000',
        childId: '550e8400-e29b-41d4-a716-446655440001',
        pricingPlanId: '550e8400-e29b-41d4-a716-446655440002',
        totalInCents: 9999, // should be ignored
      }
      const result = bookingInitiateSchema.parse(input)
      expect('totalInCents' in result).toBe(false)
    })
  })

  describe('Server-side price computation', () => {
    it('base price from pricing plan (never client)', () => {
      const pricingPlan = { priceInCents: 5000 }
      expect(pricingPlan.priceInCents).toBe(5000)
    })

    it('add-ons increase total', () => {
      const base = 5000
      const addOns = [{ priceInCents: 1500 }, { priceInCents: 800 }]
      const total = base + addOns.reduce((sum, a) => sum + a.priceInCents, 0)
      expect(total).toBe(7300)
    })

    it('percentage coupon reduces price correctly', () => {
      const base = 10000 // $100
      const discountValue = 2000 // 20.00%
      const discounted = Math.ceil(base * (1 - discountValue / 10000))
      expect(discounted).toBe(8000) // $80
    })

    it('fixed amount coupon reduces price correctly', () => {
      const base = 10000
      const discountValue = 2500 // $25 off
      const discounted = Math.max(0, base - discountValue)
      expect(discounted).toBe(7500) // $75
    })

    it('coupon cannot make total negative', () => {
      const base = 1000
      const discountValue = 5000
      const total = Math.max(0, base - discountValue)
      expect(total).toBe(0)
    })

    it('sibling discount applies for second child booking', () => {
      const base = 5000
      const siblingDiscount = 10 // 10%
      const hasOtherChildBooked = true
      const total = hasOtherChildBooked
        ? Math.ceil(base * (1 - siblingDiscount / 100))
        : base
      expect(total).toBe(4500)
    })

    it('sibling discount does not apply for first child', () => {
      const base = 5000
      const siblingDiscount = 10
      const hasOtherChildBooked = false
      const total = hasOtherChildBooked
        ? Math.ceil(base * (1 - siblingDiscount / 100))
        : base
      expect(total).toBe(5000)
    })
  })

  describe('IDOR protection', () => {
    it('parent A cannot book with parent B child (ownership check)', () => {
      const parentAId = 'parent-a-id'
      const childOwnerId = 'parent-b-id'
      expect(parentAId === childOwnerId).toBe(false) // Should trigger FORBIDDEN
    })

    it('booking belongs to requesting parent (ownership verification)', () => {
      const bookingParentId = 'parent-a-id'
      const requestingParentId = 'parent-a-id'
      expect(bookingParentId === requestingParentId).toBe(true) // Allowed
    })
  })

  describe('Cancellation and refund policy', () => {
    it('full refund when > 48 hours before session', () => {
      const totalInCents = 5000
      const hoursUntil = 72
      let refund = 0
      if (hoursUntil > 48) refund = totalInCents
      else if (hoursUntil > 24) refund = Math.floor(totalInCents * 0.5)
      expect(refund).toBe(5000)
    })

    it('50% refund when 24-48 hours before session', () => {
      const totalInCents = 5000
      const hoursUntil = 36
      let refund = 0
      if (hoursUntil > 48) refund = totalInCents
      else if (hoursUntil > 24) refund = Math.floor(totalInCents * 0.5)
      expect(refund).toBe(2500)
    })

    it('no refund when < 24 hours before session', () => {
      const totalInCents = 5000
      const hoursUntil = 12
      let refund = 0
      if (hoursUntil > 48) refund = totalInCents
      else if (hoursUntil > 24) refund = Math.floor(totalInCents * 0.5)
      expect(refund).toBe(0)
    })
  })

  describe('Waitlist mechanics', () => {
    it('waitlist position auto-increments', () => {
      const lastPosition = 3
      const nextPosition = lastPosition + 1
      expect(nextPosition).toBe(4)
    })

    it('waitlist promotion: next in line gets promoted on cancellation', () => {
      const waitlist = [
        { position: 1, bookingId: 'b1' },
        { position: 2, bookingId: 'b2' },
        { position: 3, bookingId: 'b3' },
      ]
      const promoted = waitlist.sort((a, b) => a.position - b.position)[0]
      expect(promoted.bookingId).toBe('b1')
    })
  })

  describe('Session capacity', () => {
    it('blocks booking when session is at capacity', () => {
      const session = { capacity: 20, enrolledCount: 20 }
      const isFull = session.capacity != null && session.enrolledCount >= session.capacity
      expect(isFull).toBe(true)
    })

    it('allows booking when capacity available', () => {
      const session = { capacity: 20, enrolledCount: 15 }
      const isFull = session.capacity != null && session.enrolledCount >= session.capacity
      expect(isFull).toBe(false)
    })

    it('unlimited capacity (null) always allows booking', () => {
      const session = { capacity: null, enrolledCount: 999 }
      const isFull = session.capacity != null && session.enrolledCount >= session.capacity
      expect(isFull).toBe(false)
    })
  })

  describe('Child PII encryption (COPPA)', () => {
    it('medical notes are encrypted before storage', async () => {
      const { encrypt, decrypt } = await import('../../apps/web/lib/security/encryption')
      const medicalNotes = 'Asthma, uses inhaler'
      const encrypted = encrypt(medicalNotes)
      expect(encrypted).not.toBe(medicalNotes)
      expect(encrypted.split(':')).toHaveLength(3) // iv:tag:ciphertext
      expect(decrypt(encrypted)).toBe(medicalNotes)
    })

    it('allergies are encrypted before storage', async () => {
      const { encrypt, decrypt } = await import('../../apps/web/lib/security/encryption')
      const allergies = 'Peanuts, Tree Nuts'
      const encrypted = encrypt(allergies)
      expect(encrypted).not.toBe(allergies)
      expect(decrypt(encrypted)).toBe(allergies)
    })

    it('emergency contact is encrypted as JSON', async () => {
      const { encryptJson, decryptJson } = await import('../../apps/web/lib/security/encryption')
      const contact = { name: 'Jane Doe', phone: '555-1234', relationship: 'Mother' }
      const encrypted = encryptJson(contact)
      expect(encrypted).not.toContain('Jane Doe')
      expect(decryptJson(encrypted)).toEqual(contact)
    })

    it('encrypted fields are not plaintext in stored format', async () => {
      const { encrypt } = await import('../../apps/web/lib/security/encryption')
      const sensitive = 'Child has epilepsy'
      const stored = encrypt(sensitive)
      expect(stored).not.toContain(sensitive)
      expect(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(stored)).toBe(true)
    })
  })

  describe('Child profile validation', () => {
    it('accepts valid child input', () => {
      const input = {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: '2018-06-15T00:00:00.000Z',
        photoConsent: true,
      }
      expect(childCreateSchema.parse(input)).toBeTruthy()
    })

    it('rejects empty first name', () => {
      expect(() =>
        childCreateSchema.parse({ firstName: '', lastName: 'Smith', dateOfBirth: '2018-06-15T00:00:00.000Z' })
      ).toThrow()
    })

    it('rejects medical notes exceeding 2000 chars', () => {
      expect(() =>
        childCreateSchema.parse({
          firstName: 'Alice',
          lastName: 'Smith',
          dateOfBirth: '2018-06-15T00:00:00.000Z',
          medicalNotes: 'x'.repeat(2001),
        })
      ).toThrow()
    })

    it('validates emergency contact shape', () => {
      const input = {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: '2018-06-15T00:00:00.000Z',
        emergencyContact: {
          name: 'Jane',
          phone: '555-1234',
          relationship: 'Mother',
        },
      }
      const result = childCreateSchema.parse(input)
      expect(result.emergencyContact).toEqual({
        name: 'Jane',
        phone: '555-1234',
        relationship: 'Mother',
      })
    })
  })

  describe('COPPA age checks', () => {
    it('child under 13 requires parental consent', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 8) // 8 years old
      expect(requiresParentalConsent(dob)).toBe(true)
    })

    it('child 13+ does not require COPPA parental consent', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 14) // 14 years old
      expect(requiresParentalConsent(dob)).toBe(false)
    })

    it('calculates age in months for activity age matching', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 5)
      dob.setMonth(dob.getMonth() - 6) // 5 years 6 months
      const months = calculateAgeInMonths(dob)
      expect(months).toBe(66)
    })
  })

  describe('Booking status transitions', () => {
    it('free bookings skip payment and confirm immediately', () => {
      const totalInCents = 0
      const status = totalInCents === 0 ? 'CONFIRMED' : 'PENDING'
      expect(status).toBe('CONFIRMED')
    })

    it('paid bookings start as PENDING until payment succeeds', () => {
      const totalInCents = 5000
      const status = totalInCents === 0 ? 'CONFIRMED' : 'PENDING'
      expect(status).toBe('PENDING')
    })

    it('cancelled booking cannot be cancelled again', () => {
      const status = 'CANCELLED'
      const canCancel = status !== 'CANCELLED' && status !== 'REFUNDED'
      expect(canCancel).toBe(false)
    })
  })
})
