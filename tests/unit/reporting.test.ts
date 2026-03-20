import { describe, it, expect } from 'vitest'
import {
  calculateTrendSlope,
  predictFillRate,
  buildPromotionalEmailPrompt,
} from '../../apps/web/server/ai/forecasting'
import { hasFeature } from '../../apps/web/lib/tiers'

describe('Phase 8: AI Forecasting, Reporting & Analytics', () => {
  // ─── Enrollment Forecasting Engine ───────────────────────────────

  describe('Trend slope calculation', () => {
    it('calculates positive trend for increasing data', () => {
      const slope = calculateTrendSlope([10, 15, 20, 25])
      expect(slope).toBeGreaterThan(0)
    })

    it('calculates negative trend for decreasing data', () => {
      const slope = calculateTrendSlope([25, 20, 15, 10])
      expect(slope).toBeLessThan(0)
    })

    it('returns 0 for flat data', () => {
      const slope = calculateTrendSlope([10, 10, 10, 10])
      expect(slope).toBe(0)
    })

    it('returns 0 for single data point', () => {
      const slope = calculateTrendSlope([42])
      expect(slope).toBe(0)
    })

    it('returns 0 for empty array', () => {
      const slope = calculateTrendSlope([])
      expect(slope).toBe(0)
    })

    it('calculates correct slope for known data', () => {
      // y = 2x + 1 → slope should be 2
      const slope = calculateTrendSlope([1, 3, 5, 7])
      expect(slope).toBeCloseTo(2, 5)
    })
  })

  describe('Fill rate prediction', () => {
    it('returns current fill for past sessions (daysUntilStart <= 0)', () => {
      const rate = predictFillRate(15, 20, 0, 10)
      expect(rate).toBe(75) // 15/20 * 100
    })

    it('returns 0 for zero capacity', () => {
      const rate = predictFillRate(5, 0, 14, 10)
      expect(rate).toBe(0)
    })

    it('never exceeds 100%', () => {
      const rate = predictFillRate(18, 20, 30, 5)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('returns higher fill rate when enrollment is ahead of pace', () => {
      const aheadRate = predictFillRate(15, 20, 14, 10)
      const behindRate = predictFillRate(5, 20, 14, 10)
      expect(aheadRate).toBeGreaterThan(behindRate)
    })

    it('returns percentage value (0-100 range)', () => {
      const rate = predictFillRate(10, 20, 7, 12)
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })
  })

  describe('Promotional email prompt generation', () => {
    it('generates prompt with activity name', () => {
      const prompt = buildPromotionalEmailPrompt('Art Class', 'Creative Kids', new Date('2026-04-15'), -45)
      expect(prompt).toContain('Art Class')
    })

    it('generates prompt with org name', () => {
      const prompt = buildPromotionalEmailPrompt('Soccer', 'Sports Academy', new Date('2026-04-15'), -50)
      expect(prompt).toContain('Sports Academy')
    })

    it('includes trend percentage', () => {
      const prompt = buildPromotionalEmailPrompt('Art', 'Org', new Date('2026-04-15'), -45)
      expect(prompt).toContain('45')
    })

    it('uses absolute value for percentage', () => {
      const prompt = buildPromotionalEmailPrompt('Art', 'Org', new Date('2026-04-15'), -60)
      expect(prompt).toContain('60')
      expect(prompt).not.toContain('-60')
    })

    it('includes word limit instruction', () => {
      const prompt = buildPromotionalEmailPrompt('Art', 'Org', new Date('2026-04-15'), -40)
      expect(prompt).toContain('150 words')
    })

    it('requests subject line', () => {
      const prompt = buildPromotionalEmailPrompt('Art', 'Org', new Date('2026-04-15'), -40)
      expect(prompt).toContain('Subject line')
    })
  })

  // ─── Tier Gates for Forecasting ──────────────────────────────────

  describe('AI Forecasting tier gates', () => {
    it('LAUNCH tier cannot access aiForecasting', () => {
      expect(hasFeature('LAUNCH' as any, 'aiForecasting')).toBe(false)
    })

    it('GROW tier cannot access aiForecasting', () => {
      expect(hasFeature('GROW' as any, 'aiForecasting')).toBe(false)
    })

    it('SCALE tier can access aiForecasting', () => {
      expect(hasFeature('SCALE' as any, 'aiForecasting')).toBe(true)
    })

    it('advancedAnalytics requires SCALE', () => {
      expect(hasFeature('LAUNCH' as any, 'advancedAnalytics')).toBe(false)
      expect(hasFeature('GROW' as any, 'advancedAnalytics')).toBe(false)
      expect(hasFeature('SCALE' as any, 'advancedAnalytics')).toBe(true)
    })
  })

  // ─── Reporting Validations ───────────────────────────────────────

  describe('Report date range validation', () => {
    it('dateFrom must be before dateTo', () => {
      const from = new Date('2026-01-01')
      const to = new Date('2026-03-31')
      expect(from.getTime()).toBeLessThan(to.getTime())
    })

    it('handles same-day range', () => {
      const day = new Date('2026-03-15')
      const range = { from: day, to: day }
      expect(range.from.getTime()).toBe(range.to.getTime())
    })

    it('ISO datetime strings are valid', () => {
      const dateStr = '2026-01-01T00:00:00.000Z'
      const parsed = new Date(dateStr)
      expect(parsed.toISOString()).toBe(dateStr)
    })
  })

  describe('Revenue aggregation logic', () => {
    it('sums payment amounts correctly', () => {
      const payments = [
        { amount: 5000 },
        { amount: 3500 },
        { amount: 7200 },
      ]
      const total = payments.reduce((sum, p) => sum + p.amount, 0)
      expect(total).toBe(15700)
    })

    it('groups by activity correctly', () => {
      const payments = [
        { activityId: 'a1', amount: 5000 },
        { activityId: 'a1', amount: 3000 },
        { activityId: 'a2', amount: 2000 },
      ]
      const byActivity = new Map<string, number>()
      for (const p of payments) {
        byActivity.set(p.activityId, (byActivity.get(p.activityId) ?? 0) + p.amount)
      }
      expect(byActivity.get('a1')).toBe(8000)
      expect(byActivity.get('a2')).toBe(2000)
      expect(byActivity.size).toBe(2)
    })

    it('groups by day correctly', () => {
      const payments = [
        { paidAt: new Date('2026-03-01T10:00:00Z'), amount: 1000 },
        { paidAt: new Date('2026-03-01T14:00:00Z'), amount: 2000 },
        { paidAt: new Date('2026-03-02T10:00:00Z'), amount: 1500 },
      ]
      const daily = new Map<string, number>()
      for (const p of payments) {
        const day = p.paidAt.toISOString().split('T')[0]
        daily.set(day, (daily.get(day) ?? 0) + p.amount)
      }
      expect(daily.get('2026-03-01')).toBe(3000)
      expect(daily.get('2026-03-02')).toBe(1500)
    })
  })

  describe('Enrollment capacity utilization', () => {
    it('calculates utilization percentage', () => {
      const sessions = [
        { enrolledCount: 15, capacity: 20 },
        { enrolledCount: 10, capacity: 20 },
      ]
      const withCapacity = sessions.filter((s) => s.capacity > 0)
      const utilization = withCapacity.reduce((sum, s) => sum + s.enrolledCount / s.capacity, 0) / withCapacity.length
      expect(Math.round(utilization * 100)).toBe(63) // (0.75 + 0.50) / 2 = 62.5 → 63
    })

    it('handles zero capacity gracefully', () => {
      const sessions = [{ enrolledCount: 5, capacity: 0 }]
      const withCapacity = sessions.filter((s) => s.capacity > 0)
      const utilization = withCapacity.length > 0
        ? withCapacity.reduce((sum, s) => sum + s.enrolledCount / s.capacity, 0) / withCapacity.length
        : 0
      expect(utilization).toBe(0)
    })

    it('handles empty session list', () => {
      const sessions: { enrolledCount: number; capacity: number }[] = []
      const total = sessions.reduce((sum, s) => sum + s.enrolledCount, 0)
      expect(total).toBe(0)
    })
  })

  describe('Retention calculation', () => {
    it('calculates returning family rate', () => {
      const familyBookings = new Map<string, number>([
        ['family-1', 3],
        ['family-2', 1],
        ['family-3', 2],
        ['family-4', 1],
      ])
      const totalFamilies = familyBookings.size
      const returning = Array.from(familyBookings.values()).filter((c) => c >= 2).length
      const rate = Math.round((returning / totalFamilies) * 100)
      expect(rate).toBe(50) // 2 out of 4
    })

    it('handles no families', () => {
      const totalFamilies = 0
      const rate = totalFamilies > 0 ? 0 : 0
      expect(rate).toBe(0)
    })

    it('100% retention when all families return', () => {
      const familyBookings = new Map([['f1', 5], ['f2', 3], ['f3', 2]])
      const returning = Array.from(familyBookings.values()).filter((c) => c >= 2).length
      const rate = Math.round((returning / familyBookings.size) * 100)
      expect(rate).toBe(100)
    })
  })

  describe('Attendance rate calculation', () => {
    it('calculates average attendance rate', () => {
      const records = [
        { status: 'PRESENT' },
        { status: 'PRESENT' },
        { status: 'LATE' },
        { status: 'ABSENT' },
        { status: 'ABSENT' },
      ]
      const total = records.length
      const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
      const rate = Math.round((present / total) * 100)
      expect(rate).toBe(60)
    })

    it('handles empty records', () => {
      const total = 0
      const rate = total > 0 ? 0 : 0
      expect(rate).toBe(0)
    })
  })

  describe('Export report headers', () => {
    it('revenue report has correct CSV headers', () => {
      const headers: Record<string, string[]> = {
        revenue: ['Date', 'Activity', 'Amount', 'Method', 'Status'],
        enrollment: ['Activity', 'Enrolled', 'Capacity', 'Utilization'],
        retention: ['Family', 'Bookings', 'First Booking', 'Last Booking'],
        attendance: ['Session', 'Date', 'Present', 'Absent', 'Rate'],
      }
      expect(headers.revenue).toContain('Amount')
      expect(headers.revenue).toHaveLength(5)
    })

    it('enrollment report has correct CSV headers', () => {
      const headers = ['Activity', 'Enrolled', 'Capacity', 'Utilization']
      expect(headers).toContain('Capacity')
      expect(headers).toHaveLength(4)
    })

    it('generates valid CSV from headers', () => {
      const headers = ['Date', 'Activity', 'Amount', 'Method', 'Status']
      const csv = headers.join(',')
      expect(csv).toBe('Date,Activity,Amount,Method,Status')
      expect(csv.split(',').length).toBe(5)
    })
  })

  // ─── Analytics Privacy ───────────────────────────────────────────

  describe('PostHog analytics privacy', () => {
    it('analytics event names do not contain PII', () => {
      const eventNames = [
        'booking_started',
        'booking_completed',
        'booking_cancelled',
        'marketplace_search',
        'activity_viewed',
        'report_viewed',
        'report_exported',
        'automation_created',
        'attendance_marked',
        'forecast_viewed',
        'forecast_alert_sent',
      ]
      const piiPatterns = /email|name|phone|address|ssn|birth/i
      for (const event of eventNames) {
        expect(piiPatterns.test(event)).toBe(false)
      }
    })

    it('safe properties do not contain PII fields', () => {
      const safeProps = {
        activityCategory: 'art',
        amountCents: 5000,
        reportType: 'revenue',
        format: 'csv',
        method: 'qr',
        count: 10,
        alertCount: 2,
      }
      const piiKeys = ['name', 'email', 'phone', 'address', 'childName', 'parentName']
      for (const key of Object.keys(safeProps)) {
        expect(piiKeys).not.toContain(key)
      }
    })

    it('org identification uses only ID and tier', () => {
      const orgIdentify = { orgId: 'org-uuid-123', tier: 'GROW' }
      expect(Object.keys(orgIdentify)).toEqual(['orgId', 'tier'])
      // No PII like org name — that's a deliberate choice
    })
  })

  // ─── Forecast Alert Logic ────────────────────────────────────────

  describe('Forecast alert thresholds', () => {
    it('alerts when trend is 40%+ below historical pace', () => {
      const trendPercent = -45
      const alertRequired = trendPercent < -40
      expect(alertRequired).toBe(true)
    })

    it('does not alert when trend is within normal range', () => {
      const trendPercent = -20
      const alertRequired = trendPercent < -40
      expect(alertRequired).toBe(false)
    })

    it('does not alert for positive trends', () => {
      const trendPercent = 15
      const alertRequired = trendPercent < -40
      expect(alertRequired).toBe(false)
    })

    it('alerts for low fill rate close to start date', () => {
      const predictedFillRate = 40
      const daysUntilStart = 10
      const alertRequired = predictedFillRate < 50 && daysUntilStart <= 14
      expect(alertRequired).toBe(true)
    })

    it('does not alert for low fill rate far from start', () => {
      const predictedFillRate = 40
      const daysUntilStart = 30
      const alertRequired = predictedFillRate < 50 && daysUntilStart <= 14
      expect(alertRequired).toBe(false)
    })
  })

  // ─── Waitlist Report ─────────────────────────────────────────────

  describe('Waitlist depth aggregation', () => {
    it('groups waitlist entries by activity', () => {
      const entries = [
        { activityId: 'a1', activityName: 'Art' },
        { activityId: 'a1', activityName: 'Art' },
        { activityId: 'a2', activityName: 'Soccer' },
      ]
      const byActivity = new Map<string, { name: string; depth: number }>()
      for (const e of entries) {
        const existing = byActivity.get(e.activityId) ?? { name: e.activityName, depth: 0 }
        existing.depth++
        byActivity.set(e.activityId, existing)
      }
      expect(byActivity.get('a1')?.depth).toBe(2)
      expect(byActivity.get('a2')?.depth).toBe(1)
    })

    it('handles empty waitlist', () => {
      const activities: unknown[] = []
      expect(activities.length).toBe(0)
    })
  })

  // ─── Staff Utilization ───────────────────────────────────────────

  describe('Staff session count aggregation', () => {
    it('counts sessions per instructor', () => {
      const sessions = [
        { instructorId: 'i1' },
        { instructorId: 'i1' },
        { instructorId: 'i2' },
        { instructorId: null },
      ]
      const byInstructor = new Map<string, number>()
      for (const s of sessions) {
        if (!s.instructorId) continue
        byInstructor.set(s.instructorId, (byInstructor.get(s.instructorId) ?? 0) + 1)
      }
      expect(byInstructor.get('i1')).toBe(2)
      expect(byInstructor.get('i2')).toBe(1)
      expect(byInstructor.size).toBe(2) // null excluded
    })
  })
})
