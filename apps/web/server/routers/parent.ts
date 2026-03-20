import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const parentRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // Implementation in Phase 4
    return null
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().max(20).optional(),
        timezone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),
})
