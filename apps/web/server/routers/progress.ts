import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure, protectedProcedure, requireFeatureGate } from '../trpc'

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
      // GROW+ tier required for progress tracking
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      // Verify milestone belongs to this org
      const milestone = await ctx.db.milestone.findFirst({
        where: { id: input.milestoneId, organizationId: ctx.orgId },
      })
      if (!milestone) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' })
      }

      // Verify the child has a confirmed booking in this activity under this org
      const booking = await ctx.db.booking.findFirst({
        where: {
          childId: input.childId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          session: {
            activityId: input.activityId,
            activity: { organizationId: ctx.orgId },
          },
        },
      })
      if (!booking) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Child is not enrolled in this activity' })
      }

      // Check for duplicate award
      const existing = await ctx.db.progressRecord.findFirst({
        where: {
          childId: input.childId,
          milestoneId: input.milestoneId,
          activityId: input.activityId,
        },
      })
      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Milestone already awarded to this child' })
      }

      const record = await ctx.db.progressRecord.create({
        data: {
          childId: input.childId,
          milestoneId: input.milestoneId,
          activityId: input.activityId,
          organizationId: ctx.orgId!,
          notes: input.notes,
          awardedById: ctx.session.userId,
        },
      })

      return { id: record.id }
    }),

  revokeMilestone: providerProcedure
    .input(z.object({ progressRecordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      const record = await ctx.db.progressRecord.findFirst({
        where: { id: input.progressRecordId, organizationId: ctx.orgId },
      })
      if (!record) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Progress record not found' })
      }

      await ctx.db.progressRecord.delete({
        where: { id: input.progressRecordId },
      })

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
      requireFeatureGate(ctx.orgTier, 'progressTracking')

      // Verify milestone belongs to this org
      const milestone = await ctx.db.milestone.findFirst({
        where: { id: input.milestoneId, organizationId: ctx.orgId },
      })
      if (!milestone) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' })
      }

      // Filter out children who already have this milestone
      const existing = await ctx.db.progressRecord.findMany({
        where: {
          milestoneId: input.milestoneId,
          activityId: input.activityId,
          childId: { in: input.childIds },
        },
        select: { childId: true },
      })
      const existingChildIds = new Set(existing.map((r) => r.childId))
      const newChildIds = input.childIds.filter((id) => !existingChildIds.has(id))

      if (newChildIds.length === 0) {
        return { count: 0 }
      }

      // Bulk create in transaction
      await ctx.db.$transaction(
        newChildIds.map((childId) =>
          ctx.db.progressRecord.create({
            data: {
              childId,
              milestoneId: input.milestoneId,
              activityId: input.activityId,
              organizationId: ctx.orgId!,
              awardedById: ctx.session.userId,
            },
          })
        )
      )

      return { count: newChildIds.length }
    }),

  getChildProgress: protectedProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        activityId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify child belongs to requesting parent (IDOR check)
      const child = await ctx.db.child.findFirst({
        where: {
          id: input.childId,
          deletedAt: null,
          parent: { userId: ctx.session.userId },
        },
      })
      // If not parent, check if user is a provider for the org
      if (!child) {
        // Check provider access
        const progressRecords = await ctx.db.progressRecord.findMany({
          where: {
            childId: input.childId,
            ...(input.activityId ? { activityId: input.activityId } : {}),
          },
          include: {
            child: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { achievedAt: 'desc' },
        })

        // Verify user has org access to at least one of these records
        if (progressRecords.length > 0) {
          const orgMembership = await ctx.db.organizationUser.findFirst({
            where: {
              userId: ctx.session.userId,
              organizationId: progressRecords[0].organizationId,
            },
          })
          if (!orgMembership) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
          }
        }

        return progressRecords
      }

      // Parent accessing their own child's progress
      const records = await ctx.db.progressRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.activityId ? { activityId: input.activityId } : {}),
        },
        orderBy: { achievedAt: 'desc' },
      })

      // Enrich with milestone details
      const milestoneIds = [...new Set(records.map((r) => r.milestoneId))]
      const milestones = await ctx.db.milestone.findMany({
        where: { id: { in: milestoneIds } },
      })
      const milestoneMap = new Map(milestones.map((m) => [m.id, m]))

      return records.map((r) => ({
        id: r.id,
        milestoneId: r.milestoneId,
        activityId: r.activityId,
        achievedAt: r.achievedAt,
        notes: r.notes,
        milestone: milestoneMap.get(r.milestoneId) ?? null,
      }))
    }),
})
