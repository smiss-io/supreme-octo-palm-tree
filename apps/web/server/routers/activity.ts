import { z } from 'zod'
import { router, providerProcedure } from '../trpc'

export const activityRouter = router({
  create: providerProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 3
      return { id: '' }
    }),

  update: providerProcedure
    .input(z.object({ id: z.string().uuid() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  publish: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  unpublish: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  duplicate: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { id: '' }
    }),

  list: providerProcedure.query(async ({ ctx }) => {
    return []
  }),

  getById: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return null
    }),
})
