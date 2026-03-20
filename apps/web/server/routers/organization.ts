import { z } from 'zod'
import { router, protectedProcedure, providerProcedure } from '../trpc'

export const organizationRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { id: '', slug: input.slug }
    }),

  update: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).optional(),
        logoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  getMyOrg: providerProcedure.query(async ({ ctx }) => {
    // Implementation in Phase 2
    return null
  }),

  inviteStaff: providerProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(['ADMIN', 'MANAGER', 'INSTRUCTOR', 'VIEWER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  updateStaffRole: providerProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['ADMIN', 'MANAGER', 'INSTRUCTOR', 'VIEWER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  removeStaff: providerProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  connectStripe: providerProcedure.mutation(async ({ ctx }) => {
    // Implementation in Phase 2
    return { url: '' }
  }),

  getStripeStatus: providerProcedure.query(async ({ ctx }) => {
    // Implementation in Phase 2
    return { connected: false }
  }),
})
