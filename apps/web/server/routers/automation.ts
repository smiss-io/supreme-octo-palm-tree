import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure, requireFeatureGate } from '../trpc'

const triggerEnum = z.enum([
  'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'CLASS_24H_BEFORE',
  'CLASS_1H_BEFORE', 'CAMP_ENDED', 'CONSECUTIVE_ABSENCES',
  'WAITLIST_SPOT_OPENED', 'MEMBERSHIP_EXPIRING', 'PAYMENT_FAILED',
  'REVIEW_REQUEST', 'ENROLLMENT_THRESHOLD',
])

const actionTypeEnum = z.enum([
  'SEND_EMAIL', 'SEND_SMS', 'ADD_TO_WAITLIST',
  'ISSUE_STORE_CREDIT', 'CREATE_TASK', 'NOTIFY_STAFF', 'WEBHOOK',
])

export const automationRouter = router({
  create: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        trigger: triggerEnum,
        triggerConfig: z.record(z.unknown()),
        actions: z.array(
          z.object({
            actionType: actionTypeEnum,
            config: z.record(z.unknown()),
            order: z.number().int().min(0),
            delaySeconds: z.number().int().min(0).optional(),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // GROW+ tier required for automations
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.create({
        data: {
          organizationId: ctx.orgId!,
          name: input.name,
          trigger: input.trigger,
          triggerConfig: input.triggerConfig,
          isEnabled: true,
          actions: {
            create: input.actions.map((a) => ({
              actionType: a.actionType,
              config: a.config,
              order: a.order,
              delaySeconds: a.delaySeconds,
            })),
          },
        },
      })

      return { id: automation.id }
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        trigger: triggerEnum.optional(),
        triggerConfig: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      })
      if (!automation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found' })
      }

      const { id, ...data } = input
      await ctx.db.automation.update({ where: { id }, data })

      return { success: true }
    }),

  toggle: providerProcedure
    .input(z.object({ id: z.string().uuid(), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      })
      if (!automation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found' })
      }

      await ctx.db.automation.update({
        where: { id: input.id },
        data: { isEnabled: input.isEnabled },
      })

      return { success: true }
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      })
      if (!automation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found' })
      }

      await ctx.db.$transaction([
        ctx.db.automationAction.deleteMany({ where: { automationId: input.id } }),
        ctx.db.automationLog.deleteMany({ where: { automationId: input.id } }),
        ctx.db.automation.delete({ where: { id: input.id } }),
      ])

      return { success: true }
    }),

  list: providerProcedure.query(async ({ ctx }) => {
    requireFeatureGate(ctx.orgTier, 'nativeAutomations')

    const automations = await ctx.db.automation.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get last log entry for each automation
    const automationIds = automations.map((a) => a.id)
    const lastLogs = await ctx.db.automationLog.findMany({
      where: { automationId: { in: automationIds } },
      orderBy: { triggeredAt: 'desc' },
      distinct: ['automationId'],
    })
    const logMap = new Map(lastLogs.map((l) => [l.automationId, l]))

    return automations.map((a) => ({
      ...a,
      lastRun: logMap.get(a.id) ?? null,
    }))
  }),

  test: providerProcedure
    .input(
      z.object({
        automationId: z.string().uuid(),
        entityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.findFirst({
        where: { id: input.automationId, organizationId: ctx.orgId },
        include: { actions: { orderBy: { order: 'asc' } } },
      })
      if (!automation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found' })
      }

      // Dry run: describe what WOULD happen, no actual emails/SMS
      const wouldExecute = automation.actions.map((a) => ({
        actionType: a.actionType,
        order: a.order,
        delaySeconds: a.delaySeconds,
        dryRun: true,
      }))

      return { wouldFire: true, actions: wouldExecute }
    }),

  getLogs: providerProcedure
    .input(
      z.object({
        automationId: z.string().uuid(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')

      const automation = await ctx.db.automation.findFirst({
        where: { id: input.automationId, organizationId: ctx.orgId },
      })
      if (!automation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found' })
      }

      const logs = await ctx.db.automationLog.findMany({
        where: { automationId: input.automationId },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { triggeredAt: 'desc' },
      })

      const hasMore = logs.length > input.limit
      if (hasMore) logs.pop()

      return {
        logs,
        nextCursor: hasMore ? logs[logs.length - 1]?.id : null,
      }
    }),
})
