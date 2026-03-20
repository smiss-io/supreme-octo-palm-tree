import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure, requireFeatureGate } from '../trpc'

export const milestoneRouter = router({
  create: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        activityId: z.string().uuid().optional(),
        badgeImageUrl: z.string().url().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      // If activityId provided, verify it belongs to org
      if (input.activityId) {
        const activity = await ctx.db.activity.findFirst({
          where: { id: input.activityId, organizationId: ctx.orgId, deletedAt: null },
        })
        if (!activity) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
        }
      }

      // Auto-set order if not provided
      let order = input.order
      if (order === undefined) {
        const lastMilestone = await ctx.db.milestone.findFirst({
          where: { organizationId: ctx.orgId, activityId: input.activityId ?? null },
          orderBy: { order: 'desc' },
        })
        order = lastMilestone ? lastMilestone.order + 1 : 0
      }

      const milestone = await ctx.db.milestone.create({
        data: {
          organizationId: ctx.orgId,
          name: input.name,
          description: input.description,
          activityId: input.activityId,
          badgeImageUrl: input.badgeImageUrl,
          order,
        },
      })

      return { id: milestone.id }
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        badgeImageUrl: z.string().url().nullable().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      const { id, ...data } = input
      const milestone = await ctx.db.milestone.findFirst({
        where: { id, organizationId: ctx.orgId },
      })
      if (!milestone) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' })
      }

      const updateData: Record<string, unknown> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.badgeImageUrl !== undefined) updateData.badgeImageUrl = data.badgeImageUrl
      if (data.order !== undefined) updateData.order = data.order

      await ctx.db.milestone.update({ where: { id }, data: updateData })

      return { success: true }
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      const milestone = await ctx.db.milestone.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      })
      if (!milestone) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' })
      }

      await ctx.db.milestone.delete({ where: { id: input.id } })

      return { success: true }
    }),

  list: providerProcedure
    .input(
      z.object({
        activityId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      const where: Record<string, unknown> = { organizationId: ctx.orgId }
      if (input?.activityId) {
        where.activityId = input.activityId
      }

      return ctx.db.milestone.findMany({
        where,
        orderBy: { order: 'asc' },
      })
    }),

  reorder: providerProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      // Batch update order based on array position
      await ctx.db.$transaction(
        input.ids.map((id, index) =>
          ctx.db.milestone.updateMany({
            where: { id, organizationId: ctx.orgId },
            data: { order: index },
          })
        )
      )

      return { success: true }
    }),
})
