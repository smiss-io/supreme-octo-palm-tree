import { z } from 'zod'
import { TRPCError } from '@trpc/server'
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
      // Verify activity belongs to org
      const activity = await ctx.db.activity.findFirst({
        where: { id: input.activityId, organizationId: ctx.orgId, deletedAt: null },
      })
      if (!activity) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      // If instructorId provided, verify they are a member of the org
      if (input.instructorId) {
        const member = await ctx.db.organizationUser.findUnique({
          where: {
            userId_organizationId: {
              userId: input.instructorId,
              organizationId: ctx.orgId,
            },
          },
        })
        if (!member) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Instructor not found in organization' })
        }
      }

      const session = await ctx.db.activitySession.create({
        data: {
          activityId: input.activityId,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          durationMin: input.durationMin,
          capacity: input.capacity ?? activity.capacity,
          recurRule: input.recurRule,
          instructorId: input.instructorId,
        },
      })

      return { id: session.id }
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().nullable().optional(),
        durationMin: z.number().int().min(1).max(1440).optional(),
        capacity: z.number().int().min(1).max(10000).optional(),
        instructorId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify session belongs to org via activity
      const session = await ctx.db.activitySession.findFirst({
        where: {
          id,
          activity: { organizationId: ctx.orgId, deletedAt: null },
        },
      })
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      if (session.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot update a cancelled session' })
      }

      // Verify new instructor if provided
      if (data.instructorId) {
        const member = await ctx.db.organizationUser.findUnique({
          where: {
            userId_organizationId: {
              userId: data.instructorId,
              organizationId: ctx.orgId,
            },
          },
        })
        if (!member) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Instructor not found in organization' })
        }
      }

      const updateData: Record<string, unknown> = {}
      if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
      if (data.durationMin !== undefined) updateData.durationMin = data.durationMin
      if (data.capacity !== undefined) updateData.capacity = data.capacity
      if (data.instructorId !== undefined) updateData.instructorId = data.instructorId

      await ctx.db.activitySession.update({
        where: { id },
        data: updateData,
      })

      return { success: true }
    }),

  cancel: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.activitySession.findFirst({
        where: {
          id: input.id,
          activity: { organizationId: ctx.orgId, deletedAt: null },
        },
      })
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      if (session.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is already cancelled' })
      }

      await ctx.db.activitySession.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      })

      return { success: true }
    }),

  list: providerProcedure
    .input(
      z.object({
        activityId: z.string().uuid().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        activity: { organizationId: ctx.orgId, deletedAt: null },
      }

      if (input.activityId) where.activityId = input.activityId
      if (input.status) where.status = input.status
      if (input.from || input.to) {
        const startFilter: Record<string, Date> = {}
        if (input.from) startFilter.gte = new Date(input.from)
        if (input.to) startFilter.lte = new Date(input.to)
        where.startDate = startFilter
      }

      const sessions = await ctx.db.activitySession.findMany({
        where,
        include: {
          activity: { select: { id: true, name: true, format: true, category: true } },
        },
        orderBy: { startDate: 'asc' },
      })

      return sessions
    }),
})
