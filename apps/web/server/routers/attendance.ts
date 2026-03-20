import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure } from '../trpc'
import { decrypt, decryptJson } from '../../lib/security/encryption'

// Sanitize CSV fields to prevent CSV injection (OWASP)
function sanitizeCsvField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`
  }
  // Wrap in quotes if contains comma, quote, or newline
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export const attendanceRouter = router({
  getRoster: providerProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              organizationId: true,
              organization: { select: { id: true } },
            },
          },
        },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      // Get all confirmed bookings for this session
      const bookings = await ctx.db.booking.findMany({
        where: {
          activitySessionId: input.sessionId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        include: {
          child: true,
        },
      })

      // Get existing attendance records
      const attendanceRecords = await ctx.db.attendanceRecord.findMany({
        where: { sessionId: input.sessionId },
      })
      const attendanceMap = new Map(
        attendanceRecords.map((r) => [r.childId, r])
      )

      // Decrypt child PII on the fly — never cache
      return bookings.map((b) => ({
        bookingId: b.id,
        childId: b.child.id,
        firstName: b.child.firstName,
        lastName: b.child.lastName,
        dateOfBirth: b.child.dateOfBirth,
        allergies: b.child.allergies ? decrypt(b.child.allergies) : null,
        medicalNotes: b.child.medicalNotes ? decrypt(b.child.medicalNotes) : null,
        emergencyContact: b.child.emergencyContact
          ? decryptJson<{ name: string; phone: string; relationship: string }>(
              b.child.emergencyContact as string
            )
          : null,
        photoConsent: b.child.photoConsent,
        waiverSignedAt: b.waiverSignedAt,
        attendance: attendanceMap.get(b.child.id)
          ? {
              status: attendanceMap.get(b.child.id)!.status,
              checkedInAt: attendanceMap.get(b.child.id)!.checkedInAt,
              checkedOutAt: attendanceMap.get(b.child.id)!.checkedOutAt,
              notes: attendanceMap.get(b.child.id)!.notes,
            }
          : null,
      }))
    }),

  markAttendance: providerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        childId: z.string().uuid(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify session belongs to this org
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: { activity: { select: { organizationId: true } } },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      // Upsert attendance record
      const record = await ctx.db.attendanceRecord.upsert({
        where: {
          sessionId_childId: {
            sessionId: input.sessionId,
            childId: input.childId,
          },
        },
        create: {
          sessionId: input.sessionId,
          childId: input.childId,
          status: input.status,
          notes: input.notes,
          checkedInAt: input.status === 'PRESENT' || input.status === 'LATE' ? new Date() : null,
        },
        update: {
          status: input.status,
          notes: input.notes,
          checkedInAt: input.status === 'PRESENT' || input.status === 'LATE' ? new Date() : undefined,
        },
      })

      return { id: record.id, status: record.status }
    }),

  bulkMarkAttendance: providerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        records: z.array(
          z.object({
            childId: z.string().uuid(),
            status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify session belongs to this org
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: { activity: { select: { organizationId: true } } },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      // Atomic transaction — partial failure rolls back all
      const now = new Date()
      await ctx.db.$transaction(
        input.records.map((r) =>
          ctx.db.attendanceRecord.upsert({
            where: {
              sessionId_childId: {
                sessionId: input.sessionId,
                childId: r.childId,
              },
            },
            create: {
              sessionId: input.sessionId,
              childId: r.childId,
              status: r.status,
              checkedInAt: r.status === 'PRESENT' || r.status === 'LATE' ? now : null,
            },
            update: {
              status: r.status,
              checkedInAt: r.status === 'PRESENT' || r.status === 'LATE' ? now : undefined,
            },
          })
        )
      )

      return { success: true, count: input.records.length }
    }),

  checkIn: providerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        childId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: { activity: { select: { organizationId: true } } },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      const record = await ctx.db.attendanceRecord.upsert({
        where: {
          sessionId_childId: {
            sessionId: input.sessionId,
            childId: input.childId,
          },
        },
        create: {
          sessionId: input.sessionId,
          childId: input.childId,
          status: 'PRESENT',
          checkedInAt: new Date(),
        },
        update: {
          status: 'PRESENT',
          checkedInAt: new Date(),
        },
      })

      return { checkedInAt: record.checkedInAt }
    }),

  checkOut: providerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        childId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: { activity: { select: { organizationId: true } } },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      const existing = await ctx.db.attendanceRecord.findUnique({
        where: {
          sessionId_childId: {
            sessionId: input.sessionId,
            childId: input.childId,
          },
        },
      })

      if (!existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Child has not checked in yet' })
      }

      const record = await ctx.db.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkedOutAt: new Date() },
      })

      return { checkedOutAt: record.checkedOutAt }
    }),

  exportAttendance: providerProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.sessionId },
        include: {
          activity: {
            select: { name: true, organizationId: true },
          },
        },
      })
      if (!session || session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      const records = await ctx.db.attendanceRecord.findMany({
        where: { sessionId: input.sessionId },
        include: { child: { select: { firstName: true, lastName: true } } },
      })

      // Build CSV with injection prevention
      const headers = ['Name', 'Status', 'Check-In Time', 'Check-Out Time', 'Notes']
      const rows = records.map((r) => [
        sanitizeCsvField(`${r.child.firstName} ${r.child.lastName}`),
        sanitizeCsvField(r.status),
        sanitizeCsvField(r.checkedInAt?.toISOString() ?? ''),
        sanitizeCsvField(r.checkedOutAt?.toISOString() ?? ''),
        sanitizeCsvField(r.notes ?? ''),
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      return { csv, filename: `attendance-${session.activity.name}-${session.startDate.toISOString().split('T')[0]}.csv` }
    }),

  getAbsenteeHistory: providerProcedure
    .input(
      z.object({
        activityId: z.string().uuid(),
        consecutiveThreshold: z.number().int().min(2).max(10).default(2),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find sessions for this activity, ordered by date
      const sessions = await ctx.db.activitySession.findMany({
        where: {
          activityId: input.activityId,
          activity: { organizationId: ctx.orgId },
          status: 'COMPLETED',
        },
        orderBy: { startDate: 'desc' },
        select: { id: true, startDate: true },
      })

      if (sessions.length < input.consecutiveThreshold) return []

      // Get all attendance records for these sessions
      const sessionIds = sessions.map((s) => s.id)
      const records = await ctx.db.attendanceRecord.findMany({
        where: {
          sessionId: { in: sessionIds },
          status: 'ABSENT',
        },
        include: { child: { select: { id: true, firstName: true, lastName: true } } },
      })

      // Group by child and check consecutive absences
      const childAbsences = new Map<string, { child: { id: string; firstName: string; lastName: string }; consecutiveCount: number }>()

      for (const record of records) {
        const existing = childAbsences.get(record.childId)
        if (existing) {
          existing.consecutiveCount++
        } else {
          childAbsences.set(record.childId, {
            child: record.child,
            consecutiveCount: 1,
          })
        }
      }

      return Array.from(childAbsences.values()).filter(
        (entry) => entry.consecutiveCount >= input.consecutiveThreshold
      )
    }),

  // QR code check-in verification endpoint
  verifyQrCheckIn: providerProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Look up the booking by QR token
      const booking = await ctx.db.booking.findFirst({
        where: {
          qrToken: input.token,
          status: 'CONFIRMED',
        },
        include: {
          child: { select: { id: true, firstName: true, lastName: true, photoConsent: true } },
          session: {
            include: {
              activity: { select: { organizationId: true } },
            },
          },
        },
      })

      if (!booking || booking.session.activity.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired QR code' })
      }

      // Check if token has expired (24h after session end)
      const sessionEnd = new Date(booking.session.startDate.getTime() + booking.session.durationMin * 60 * 1000)
      const expiresAt = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000)
      if (new Date() > expiresAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code has expired' })
      }

      // Create attendance record
      await ctx.db.attendanceRecord.upsert({
        where: {
          sessionId_childId: {
            sessionId: booking.activitySessionId,
            childId: booking.childId,
          },
        },
        create: {
          sessionId: booking.activitySessionId,
          childId: booking.childId,
          status: 'PRESENT',
          checkedInAt: new Date(),
        },
        update: {
          status: 'PRESENT',
          checkedInAt: new Date(),
        },
      })

      return {
        childName: `${booking.child.firstName} ${booking.child.lastName}`,
        photoConsent: booking.child.photoConsent,
        sessionId: booking.activitySessionId,
      }
    }),
})

// Export sanitizer for testing
export { sanitizeCsvField }
