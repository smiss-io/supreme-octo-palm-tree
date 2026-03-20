import { z } from 'zod'
import { router, providerProcedure } from '../trpc'

export const locationRouter = router({
  create: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        addressLine1: z.string().max(200).optional(),
        addressLine2: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(50).optional(),
        zip: z.string().max(20).optional(),
        isVirtual: z.boolean().default(false),
        timezone: z.string().max(50).default('America/Los_Angeles'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2 — geocode via Mapbox
      return { id: '' }
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        addressLine1: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(50).optional(),
        zip: z.string().max(20).optional(),
        timezone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  list: providerProcedure.query(async ({ ctx }) => {
    return []
  }),
})
