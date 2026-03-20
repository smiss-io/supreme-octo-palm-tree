import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const bookingRouter = router({
  initiate: protectedProcedure
    .input(
      z.object({
        activitySessionId: z.string().uuid(),
        childId: z.string().uuid(),
        pricingPlanId: z.string().uuid(),
        addOnIds: z.array(z.string().uuid()).max(10).optional(),
        couponCode: z.string().max(50).optional(),
        // NEVER accept price from client — always compute server-side
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 4
      return { clientSecret: '' }
    }),

  confirm: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
      return { refundAmount: 0 }
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
      return { position: 0 }
    }),

  transferSession: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        newSessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  getMyBookings: protectedProcedure.query(async ({ ctx }) => {
    return []
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return null
    }),
})
