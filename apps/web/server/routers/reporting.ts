import { z } from 'zod'
import { router, providerProcedure, requireFeatureGate } from '../trpc'

const dateRangeInput = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
})

export const reportingRouter = router({
  revenue: providerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        organizationId: ctx.orgId,
        status: 'SUCCEEDED',
        paidAt: {
          gte: new Date(input.dateFrom),
          lte: new Date(input.dateTo),
        },
      }

      const payments = await ctx.db.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              session: {
                select: {
                  activity: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })

      const total = payments.reduce((sum, p) => sum + p.amount, 0)

      // Group by activity
      const byActivity = new Map<string, { name: string; totalCents: number; count: number }>()
      for (const p of payments) {
        const actName = p.booking?.session?.activity?.name ?? 'Other'
        const actId = p.booking?.session?.activity?.id ?? 'other'
        const existing = byActivity.get(actId) ?? { name: actName, totalCents: 0, count: 0 }
        existing.totalCents += p.amount
        existing.count++
        byActivity.set(actId, existing)
      }

      // Group by day
      const daily = new Map<string, number>()
      for (const p of payments) {
        if (!p.paidAt) continue
        const day = p.paidAt.toISOString().split('T')[0]
        daily.set(day, (daily.get(day) ?? 0) + p.amount)
      }

      return {
        total,
        byActivity: Array.from(byActivity.entries()).map(([id, data]) => ({
          activityId: id,
          ...data,
        })),
        byLocation: [], // Would join through session -> activity -> location
        daily: Array.from(daily.entries()).map(([date, amount]) => ({ date, amountCents: amount })),
      }
    }),

  enrollment: providerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.activitySession.findMany({
        where: {
          activity: { organizationId: ctx.orgId },
          startDate: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        },
        include: {
          activity: { select: { id: true, name: true } },
        },
      })

      const total = sessions.reduce((sum, s) => sum + s.enrolledCount, 0)

      // Capacity utilization
      const withCapacity = sessions.filter((s) => s.capacity != null && s.capacity > 0)
      const capacityUtilization = withCapacity.length > 0
        ? withCapacity.reduce((sum, s) => sum + s.enrolledCount / s.capacity!, 0) / withCapacity.length
        : 0

      // Group by activity
      const byActivity = new Map<string, { name: string; enrolled: number; capacity: number | null }>()
      for (const s of sessions) {
        const existing = byActivity.get(s.activity.id) ?? { name: s.activity.name, enrolled: 0, capacity: 0 }
        existing.enrolled += s.enrolledCount
        if (s.capacity) existing.capacity = (existing.capacity ?? 0) + s.capacity
        byActivity.set(s.activity.id, existing)
      }

      return {
        total,
        capacityUtilization: Math.round(capacityUtilization * 100),
        byActivity: Array.from(byActivity.entries()).map(([id, data]) => ({ activityId: id, ...data })),
      }
    }),

  retention: providerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      // Families with 2+ booking seasons
      const bookings = await ctx.db.booking.findMany({
        where: {
          session: { activity: { organizationId: ctx.orgId } },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          createdAt: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        },
        select: { parentProfileId: true },
      })

      const familyBookings = new Map<string, number>()
      for (const b of bookings) {
        familyBookings.set(b.parentProfileId, (familyBookings.get(b.parentProfileId) ?? 0) + 1)
      }

      const totalFamilies = familyBookings.size
      const returningFamilies = Array.from(familyBookings.values()).filter((c) => c >= 2).length
      const returningFamilyRate = totalFamilies > 0
        ? Math.round((returningFamilies / totalFamilies) * 100)
        : 0

      return { returningFamilyRate, totalFamilies, returningFamilies, cohorts: [] }
    }),

  waitlist: providerProcedure.query(async ({ ctx }) => {
    const waitlistEntries = await ctx.db.waitlistEntry.findMany({
      where: {
        booking: {
          status: 'WAITLISTED',
          session: { activity: { organizationId: ctx.orgId } },
        },
      },
      include: {
        booking: {
          select: {
            session: {
              select: { activity: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    // Group by activity
    const byActivity = new Map<string, { name: string; depth: number }>()
    for (const entry of waitlistEntries) {
      const actId = entry.booking.session.activity.id
      const existing = byActivity.get(actId) ?? { name: entry.booking.session.activity.name, depth: 0 }
      existing.depth++
      byActivity.set(actId, existing)
    }

    return {
      activities: Array.from(byActivity.entries()).map(([id, data]) => ({ activityId: id, ...data })),
    }
  }),

  attendance: providerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.attendanceRecord.findMany({
        where: {
          session: {
            activity: { organizationId: ctx.orgId },
            startDate: {
              gte: new Date(input.dateFrom),
              lte: new Date(input.dateTo),
            },
          },
        },
        include: {
          session: {
            select: { activity: { select: { id: true, name: true } } },
          },
        },
      })

      const total = records.length
      const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
      const averageRate = total > 0 ? Math.round((present / total) * 100) : 0

      return { averageRate, total, present }
    }),

  staff: providerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.activitySession.findMany({
        where: {
          activity: { organizationId: ctx.orgId },
          instructorId: { not: null },
          startDate: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        },
        select: { instructorId: true },
      })

      const byInstructor = new Map<string, number>()
      for (const s of sessions) {
        if (!s.instructorId) continue
        byInstructor.set(s.instructorId, (byInstructor.get(s.instructorId) ?? 0) + 1)
      }

      return {
        instructors: Array.from(byInstructor.entries()).map(([id, count]) => ({
          instructorId: id,
          sessionCount: count,
        })),
      }
    }),

  exportReport: providerProcedure
    .input(
      z.object({
        reportType: z.enum(['revenue', 'enrollment', 'retention', 'attendance']),
        format: z.enum(['csv', 'pdf']),
        dateFrom: z.string().datetime(),
        dateTo: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate CSV with appropriate headers based on report type
      const headers: Record<string, string[]> = {
        revenue: ['Date', 'Activity', 'Amount', 'Method', 'Status'],
        enrollment: ['Activity', 'Enrolled', 'Capacity', 'Utilization'],
        retention: ['Family', 'Bookings', 'First Booking', 'Last Booking'],
        attendance: ['Session', 'Date', 'Present', 'Absent', 'Rate'],
      }

      const csv = headers[input.reportType]?.join(',') ?? ''
      return { data: csv, contentType: input.format === 'csv' ? 'text/csv' : 'application/pdf' }
    }),
})
