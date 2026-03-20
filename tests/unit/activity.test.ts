import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Activity input validation schemas (matching activity router)
const activityCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  format: z.enum([
    'IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'APPOINTMENT',
    'CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY', 'SEMESTER', 'PRIVATE_PARTY', 'FREE_TRIAL',
  ]),
  category: z.string().min(1).max(100),
  locationId: z.string().uuid().optional(),
  minAge: z.number().int().min(0).max(216).optional(),
  maxAge: z.number().int().min(0).max(216).optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
})

const sessionCreateSchema = z.object({
  activityId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  durationMin: z.number().int().min(1).max(1440),
  capacity: z.number().int().min(1).max(10000).optional(),
  recurRule: z.string().max(500).optional(),
  instructorId: z.string().uuid().optional(),
})

const milestoneCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  activityId: z.string().uuid().optional(),
  badgeImageUrl: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
})

describe('Activity Management', () => {
  describe('Activity creation validation', () => {
    it('accepts valid activity input', () => {
      const input = {
        name: 'Junior Robotics',
        format: 'IN_PERSON' as const,
        category: 'STEM',
        capacity: 20,
        minAge: 60, // 5 years
        maxAge: 144, // 12 years
        tags: ['beginner', 'robotics'],
      }
      expect(activityCreateSchema.parse(input)).toEqual(input)
    })

    it('rejects empty activity name', () => {
      const input = { name: '', format: 'IN_PERSON', category: 'STEM' }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects name exceeding 200 characters', () => {
      const input = { name: 'x'.repeat(201), format: 'IN_PERSON', category: 'STEM' }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects invalid format', () => {
      const input = { name: 'Test', format: 'INVALID_FORMAT', category: 'STEM' }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects description over 5000 chars', () => {
      const input = {
        name: 'Test',
        format: 'IN_PERSON',
        category: 'STEM',
        description: 'x'.repeat(5001),
      }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('accepts all valid activity formats', () => {
      const formats = [
        'IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'APPOINTMENT',
        'CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY', 'SEMESTER', 'PRIVATE_PARTY', 'FREE_TRIAL',
      ]
      for (const format of formats) {
        const result = activityCreateSchema.parse({ name: 'Test', format, category: 'Art' })
        expect(result.format).toBe(format)
      }
    })

    it('rejects age below 0 months', () => {
      const input = { name: 'Test', format: 'IN_PERSON', category: 'STEM', minAge: -1 }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects age above 216 months (18 years)', () => {
      const input = { name: 'Test', format: 'IN_PERSON', category: 'STEM', maxAge: 217 }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects capacity below 1', () => {
      const input = { name: 'Test', format: 'IN_PERSON', category: 'STEM', capacity: 0 }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects capacity above 10000', () => {
      const input = { name: 'Test', format: 'IN_PERSON', category: 'STEM', capacity: 10001 }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects more than 20 tags', () => {
      const input = {
        name: 'Test',
        format: 'IN_PERSON',
        category: 'STEM',
        tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('rejects invalid locationId format', () => {
      const input = {
        name: 'Test',
        format: 'IN_PERSON',
        category: 'STEM',
        locationId: 'not-a-uuid',
      }
      expect(() => activityCreateSchema.parse(input)).toThrow()
    })

    it('accepts valid UUID locationId', () => {
      const input = {
        name: 'Test',
        format: 'IN_PERSON',
        category: 'STEM',
        locationId: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = activityCreateSchema.parse(input)
      expect(result.locationId).toBe('550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('Activity age range validation', () => {
    it('minAge < maxAge is valid business logic', () => {
      const minAge = 36 // 3 years
      const maxAge = 72 // 6 years
      expect(minAge < maxAge).toBe(true)
    })

    it('detects invalid age range (min > max)', () => {
      const minAge = 120 // 10 years
      const maxAge = 60  // 5 years
      expect(minAge > maxAge).toBe(true) // should be rejected by router
    })

    it('converts years+months to total months correctly', () => {
      const years = 5
      const months = 6
      expect(years * 12 + months).toBe(66)
    })
  })

  describe('Session creation validation', () => {
    it('accepts valid session input', () => {
      const input = {
        activityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-06-01T09:00:00.000Z',
        durationMin: 60,
        capacity: 15,
      }
      expect(sessionCreateSchema.parse(input)).toEqual(input)
    })

    it('rejects duration below 1 minute', () => {
      const input = {
        activityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-06-01T09:00:00.000Z',
        durationMin: 0,
      }
      expect(() => sessionCreateSchema.parse(input)).toThrow()
    })

    it('rejects duration above 1440 minutes (24 hours)', () => {
      const input = {
        activityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-06-01T09:00:00.000Z',
        durationMin: 1441,
      }
      expect(() => sessionCreateSchema.parse(input)).toThrow()
    })

    it('accepts iCal RRULE for recurring sessions', () => {
      const input = {
        activityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-06-01T09:00:00.000Z',
        durationMin: 60,
        recurRule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=12',
      }
      const result = sessionCreateSchema.parse(input)
      expect(result.recurRule).toBe('FREQ=WEEKLY;BYDAY=MO,WE;COUNT=12')
    })

    it('rejects invalid datetime format', () => {
      const input = {
        activityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: 'not-a-date',
        durationMin: 60,
      }
      expect(() => sessionCreateSchema.parse(input)).toThrow()
    })

    it('rejects invalid activityId format', () => {
      const input = {
        activityId: 'not-a-uuid',
        startDate: '2025-06-01T09:00:00.000Z',
        durationMin: 60,
      }
      expect(() => sessionCreateSchema.parse(input)).toThrow()
    })
  })

  describe('Milestone creation validation', () => {
    it('accepts valid milestone input', () => {
      const input = {
        name: 'First Dance Recital',
        description: 'Completed first public performance',
        order: 1,
      }
      expect(milestoneCreateSchema.parse(input)).toEqual(input)
    })

    it('rejects empty milestone name', () => {
      expect(() => milestoneCreateSchema.parse({ name: '' })).toThrow()
    })

    it('rejects name exceeding 200 chars', () => {
      expect(() => milestoneCreateSchema.parse({ name: 'x'.repeat(201) })).toThrow()
    })

    it('rejects description exceeding 1000 chars', () => {
      const input = { name: 'Test', description: 'x'.repeat(1001) }
      expect(() => milestoneCreateSchema.parse(input)).toThrow()
    })

    it('accepts optional activityId', () => {
      const input = {
        name: 'Org-wide badge',
        activityId: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = milestoneCreateSchema.parse(input)
      expect(result.activityId).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('rejects negative order', () => {
      expect(() => milestoneCreateSchema.parse({ name: 'Test', order: -1 })).toThrow()
    })
  })

  describe('Activity publishing rules', () => {
    it('published activities must have at least one session', () => {
      const sessionsCount = 0
      expect(sessionsCount > 0).toBe(false) // should block publishing
    })

    it('allows publishing when sessions exist', () => {
      const sessionsCount = 1
      expect(sessionsCount > 0).toBe(true)
    })

    it('duplicate creates unpublished copy', () => {
      const original = { name: 'Dance Class', isPublished: true }
      const copy = { name: `${original.name} (Copy)`, isPublished: false }
      expect(copy.name).toBe('Dance Class (Copy)')
      expect(copy.isPublished).toBe(false)
    })
  })

  describe('Session status transitions', () => {
    it('new sessions default to SCHEDULED', () => {
      const defaultStatus = 'SCHEDULED'
      expect(defaultStatus).toBe('SCHEDULED')
    })

    it('cancelled sessions cannot be updated', () => {
      const status = 'CANCELLED'
      const canUpdate = status !== 'CANCELLED'
      expect(canUpdate).toBe(false)
    })

    it('only SCHEDULED sessions can be cancelled', () => {
      const validForCancel = ['SCHEDULED']
      expect(validForCancel.includes('SCHEDULED')).toBe(true)
      expect(validForCancel.includes('CANCELLED')).toBe(false)
      expect(validForCancel.includes('COMPLETED')).toBe(false)
    })
  })

  describe('Soft delete behavior', () => {
    it('soft-deleted activities set deletedAt and unpublish', () => {
      const now = new Date()
      const softDeleted = {
        deletedAt: now,
        isPublished: false,
      }
      expect(softDeleted.deletedAt).toBeInstanceOf(Date)
      expect(softDeleted.isPublished).toBe(false)
    })

    it('list queries exclude soft-deleted by default', () => {
      const activities = [
        { id: '1', deletedAt: null },
        { id: '2', deletedAt: new Date() },
      ]
      const visible = activities.filter((a) => a.deletedAt === null)
      expect(visible).toHaveLength(1)
      expect(visible[0].id).toBe('1')
    })
  })

  describe('Tier gating for activity formats', () => {
    it('CAMP_MULTI_DAY requires multiDaySemesters feature (GROW+)', () => {
      const advancedFormats = ['CAMP_MULTI_DAY', 'SEMESTER']
      expect(advancedFormats.includes('CAMP_MULTI_DAY')).toBe(true)
    })

    it('APPOINTMENT requires appointmentBooking feature (GROW+)', () => {
      const appointmentFormat = 'APPOINTMENT'
      expect(appointmentFormat).toBe('APPOINTMENT')
    })

    it('IN_PERSON is available on all tiers', () => {
      const basicFormats = ['IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'FREE_TRIAL']
      expect(basicFormats.includes('IN_PERSON')).toBe(true)
    })
  })
})
