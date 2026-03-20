import { z } from 'zod'
import { router, providerProcedure, protectedProcedure } from '../trpc'

export const progressRouter = router({
  awardMilestone: providerProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        milestoneId: z.string().uuid(),
        activityId: z.string().uuid(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 5 — requires GROW+ tier
      return { id: '' }
    }),

  revokeMilestone: providerProcedure
    .input(z.object({ progressRecordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  bulkAwardMilestone: providerProcedure
    .input(
      z.object({
        milestoneId: z.string().uuid(),
        activityId: z.string().uuid(),
        childIds: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { count: 0 }
    }),

  getChildProgress: protectedProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        activityId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return []
    }),
})
