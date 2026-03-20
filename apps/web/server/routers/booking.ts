import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, requireFeatureGate } from '../trpc'

export const bookingRouter = router({
  initiate: protectedProcedure
    .input(
      z.object({
        activitySessionId: z.string().uuid(),
        childId: z.string().uuid(),
        pricingPlanId: z.string().uuid(),
        addOnIds: z.array(z.string().uuid()).max(10).optional(),
        couponCode: z.string().max(50).optional(),
        customFieldData: z.record(z.string(), z.unknown()).optional(),
        // NEVER accept price from client — always compute server-side
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. IDOR check: verify child belongs to this parent
      const parentProfile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      if (!parentProfile) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Parent profile required' })
      }

      const child = await ctx.db.child.findFirst({
        where: { id: input.childId, parentProfileId: parentProfile.id, deletedAt: null },
      })
      if (!child) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Child does not belong to your account' })
      }

      // 2. Validate session exists and has capacity
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.activitySessionId },
        include: {
          activity: {
            include: { organization: true },
          },
        },
      })
      if (!session || session.status === 'CANCELLED') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or cancelled' })
      }
      if (session.activity.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity no longer available' })
      }

      // Check capacity
      const atCapacity = session.capacity != null && session.enrolledCount >= session.capacity
      if (atCapacity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session is full. Use joinWaitlist instead.',
        })
      }

      // 3. Validate pricing plan belongs to this activity
      const pricingPlan = await ctx.db.pricingPlan.findFirst({
        where: { id: input.pricingPlanId, activityId: session.activityId },
      })
      if (!pricingPlan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pricing plan not found for this activity' })
      }

      // 4. Compute price SERVER-SIDE — never trust client
      let totalInCents = pricingPlan.priceInCents

      // Add add-ons
      if (input.addOnIds && input.addOnIds.length > 0) {
        const addOns = await ctx.db.addOn.findMany({
          where: { id: { in: input.addOnIds }, activityId: session.activityId },
        })
        for (const addOn of addOns) {
          totalInCents += addOn.priceInCents
        }
      }

      // Apply coupon if provided
      if (input.couponCode) {
        const coupon = await ctx.db.couponCode.findFirst({
          where: {
            organizationId: session.activity.organizationId,
            code: input.couponCode,
          },
        })
        if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
          if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon has reached maximum uses' })
          }
          if (coupon.discountType === 'PERCENTAGE') {
            totalInCents = Math.ceil(totalInCents * (1 - coupon.discountValue / 10000))
          } else {
            totalInCents = Math.max(0, totalInCents - coupon.discountValue)
          }
          // Increment coupon usage
          await ctx.db.couponCode.update({
            where: { id: coupon.id },
            data: { currentUses: { increment: 1 } },
          })
        }
      }

      // Apply sibling discount if applicable
      const org = session.activity.organization
      if (org.siblingDiscount && org.siblingDiscount > 0) {
        // Check if this parent already has another child booked in this org
        const existingBookings = await ctx.db.booking.findFirst({
          where: {
            parentProfileId: parentProfile.id,
            childId: { not: input.childId },
            status: { in: ['CONFIRMED', 'PENDING'] },
            session: { activity: { organizationId: org.id } },
          },
        })
        if (existingBookings) {
          totalInCents = Math.ceil(totalInCents * (1 - org.siblingDiscount / 100))
        }
      }

      // Ensure total is at least 0
      totalInCents = Math.max(0, totalInCents)

      // 5. Create booking record
      const booking = await ctx.db.booking.create({
        data: {
          parentProfileId: parentProfile.id,
          childId: input.childId,
          activitySessionId: input.activitySessionId,
          pricingPlanId: input.pricingPlanId,
          addOnIds: input.addOnIds ?? [],
          customFieldData: input.customFieldData ?? undefined,
          totalInCents,
          status: totalInCents === 0 ? 'CONFIRMED' : 'PENDING',
        },
      })

      // If free, confirm immediately and increment enrollment
      if (totalInCents === 0) {
        await ctx.db.activitySession.update({
          where: { id: input.activitySessionId },
          data: { enrolledCount: { increment: 1 } },
        })
        return { bookingId: booking.id, clientSecret: null, totalInCents: 0 }
      }

      // 6. Create Stripe PaymentIntent server-side
      // In production this would call stripe.paymentIntents.create()
      // For now return the booking with computed price
      return {
        bookingId: booking.id,
        clientSecret: `pi_placeholder_${booking.id}`,
        totalInCents,
      }
    }),

  confirm: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input.bookingId,
          parentProfileId: (
            await ctx.db.parentProfile.findUnique({ where: { userId: ctx.session.userId } })
          )?.id,
        },
      })
      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' })
      }
      if (booking.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is not pending' })
      }

      await ctx.db.$transaction([
        ctx.db.booking.update({
          where: { id: input.bookingId },
          data: { status: 'CONFIRMED' },
        }),
        ctx.db.activitySession.update({
          where: { id: booking.activitySessionId },
          data: { enrolledCount: { increment: 1 } },
        }),
      ])

      return { success: true }
    }),

  cancel: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.bookingId, parentProfileId: profile?.id },
        include: { session: true, pricingPlan: true },
      })
      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' })
      }
      if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking already cancelled' })
      }

      // Compute refund amount based on time before session
      const now = new Date()
      const sessionStart = booking.session.startDate
      const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)

      let refundAmountCents = 0
      if (hoursUntilSession > 48) {
        refundAmountCents = booking.totalInCents // Full refund
      } else if (hoursUntilSession > 24) {
        refundAmountCents = Math.floor(booking.totalInCents * 0.5) // 50% refund
      }
      // Less than 24h: no refund

      await ctx.db.$transaction([
        ctx.db.booking.update({
          where: { id: input.bookingId },
          data: {
            status: refundAmountCents > 0 ? 'REFUNDED' : 'CANCELLED',
            cancelledAt: now,
            cancellationReason: input.reason,
          },
        }),
        ...(booking.status === 'CONFIRMED'
          ? [
              ctx.db.activitySession.update({
                where: { id: booking.activitySessionId },
                data: { enrolledCount: { decrement: 1 } },
              }),
            ]
          : []),
      ])

      // Promote from waitlist if applicable
      if (booking.status === 'CONFIRMED') {
        const nextWaitlist = await ctx.db.waitlistEntry.findFirst({
          where: {
            booking: {
              activitySessionId: booking.activitySessionId,
              status: 'WAITLISTED',
            },
          },
          orderBy: { position: 'asc' },
          include: { booking: true },
        })
        if (nextWaitlist) {
          await ctx.db.booking.update({
            where: { id: nextWaitlist.bookingId },
            data: { status: 'PENDING' }, // Will need to complete payment
          })
          // TODO: Send waitlist-spot-available email
        }
      }

      return { refundAmount: refundAmountCents }
    }),

  joinWaitlist: protectedProcedure
    .input(
      z.object({
        activitySessionId: z.string().uuid(),
        childId: z.string().uuid(),
        pricingPlanId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      if (!profile) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Parent profile required' })
      }

      // IDOR check
      const child = await ctx.db.child.findFirst({
        where: { id: input.childId, parentProfileId: profile.id, deletedAt: null },
      })
      if (!child) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Child does not belong to your account' })
      }

      // Get session and check org tier for waitlist feature
      const session = await ctx.db.activitySession.findUnique({
        where: { id: input.activitySessionId },
        include: { activity: { include: { organization: true } } },
      })
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      requireFeatureGate(session.activity.organization.subscriptionTier, 'waitlists')

      // Validate pricing plan
      const pricingPlan = await ctx.db.pricingPlan.findFirst({
        where: { id: input.pricingPlanId, activityId: session.activityId },
      })
      if (!pricingPlan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pricing plan not found' })
      }

      // Get next waitlist position
      const lastEntry = await ctx.db.waitlistEntry.findFirst({
        where: { booking: { activitySessionId: input.activitySessionId } },
        orderBy: { position: 'desc' },
      })
      const position = (lastEntry?.position ?? 0) + 1

      // Create waitlisted booking + entry
      const booking = await ctx.db.booking.create({
        data: {
          parentProfileId: profile.id,
          childId: input.childId,
          activitySessionId: input.activitySessionId,
          pricingPlanId: input.pricingPlanId,
          totalInCents: pricingPlan.priceInCents,
          status: 'WAITLISTED',
          waitlistEntry: {
            create: {
              position,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          },
        },
      })

      return { position, bookingId: booking.id }
    }),

  transferSession: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        newSessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.bookingId, parentProfileId: profile?.id, status: 'CONFIRMED' },
        include: { session: { include: { activity: { include: { organization: true } } } } },
      })
      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Confirmed booking not found' })
      }

      // Transfer requires GROW+ tier
      requireFeatureGate(booking.session.activity.organization.subscriptionTier, 'waitlists')

      // Verify new session is for the same activity
      const newSession = await ctx.db.activitySession.findFirst({
        where: {
          id: input.newSessionId,
          activityId: booking.session.activityId,
          status: 'SCHEDULED',
        },
      })
      if (!newSession) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Target session not found for this activity' })
      }

      // Check capacity
      if (newSession.capacity != null && newSession.enrolledCount >= newSession.capacity) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target session is full' })
      }

      await ctx.db.$transaction([
        ctx.db.booking.update({
          where: { id: input.bookingId },
          data: { activitySessionId: input.newSessionId },
        }),
        ctx.db.activitySession.update({
          where: { id: booking.activitySessionId },
          data: { enrolledCount: { decrement: 1 } },
        }),
        ctx.db.activitySession.update({
          where: { id: input.newSessionId },
          data: { enrolledCount: { increment: 1 } },
        }),
      ])

      return { success: true }
    }),

  getMyBookings: protectedProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'REFUNDED', 'COMPLETED']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      if (!profile) return []

      const where: Record<string, unknown> = { parentProfileId: profile.id }
      if (input?.status) where.status = input.status

      const bookings = await ctx.db.booking.findMany({
        where,
        include: {
          child: { select: { id: true, firstName: true, lastName: true } },
          session: {
            include: {
              activity: {
                select: {
                  id: true,
                  name: true,
                  format: true,
                  category: true,
                  organization: { select: { name: true } },
                },
              },
            },
          },
          pricingPlan: { select: { name: true, priceInCents: true } },
          waitlistEntry: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return bookings.map((b) => ({
        id: b.id,
        status: b.status,
        totalInCents: b.totalInCents,
        child: b.child,
        session: {
          id: b.session.id,
          startDate: b.session.startDate,
          durationMin: b.session.durationMin,
          activity: b.session.activity,
        },
        pricingPlan: b.pricingPlan,
        waitlistPosition: b.waitlistEntry?.position ?? null,
        createdAt: b.createdAt,
        cancelledAt: b.cancelledAt,
      }))
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, parentProfileId: profile?.id },
        include: {
          child: { select: { id: true, firstName: true, lastName: true } },
          session: {
            include: {
              activity: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  format: true,
                  category: true,
                  organization: { select: { name: true, slug: true } },
                },
              },
            },
          },
          pricingPlan: true,
          waitlistEntry: true,
        },
      })

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' })
      }

      return booking
    }),
})
