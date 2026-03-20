import { z } from 'zod'
import { router, providerProcedure } from '../trpc'

export const sessionRouter = router({
  create: providerProcedure
    .input(
      z.object({
        activityId: z.string().uuid(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional(),
        durationMin: z.number().int().min(1).max(1440),
        capacity: z.number().int().min(1).max(10000).optional(),
        recurRule: z.string().max(500).optional(),
        instructorId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 3
      return { id: '' }
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startDate: z.string().datetime().optional(),
        durationMin: z.number().int().min(1).max(1440).optional(),
        capacity: z.number().int().min(1).max(10000).optional(),
        instructorId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  cancel: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  list: providerProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return []
    }),
})
