import { z } from 'zod'
import { router, providerProcedure } from '../trpc'

export const automationRouter = router({
  create: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        trigger: z.enum([
          'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'CLASS_24H_BEFORE',
          'CLASS_1H_BEFORE', 'CAMP_ENDED', 'CONSECUTIVE_ABSENCES',
          'WAITLIST_SPOT_OPENED', 'MEMBERSHIP_EXPIRING', 'PAYMENT_FAILED',
          'REVIEW_REQUEST', 'ENROLLMENT_THRESHOLD',
        ]),
        triggerConfig: z.record(z.unknown()),
        actions: z.array(
          z.object({
            actionType: z.enum([
              'SEND_EMAIL', 'SEND_SMS', 'ADD_TO_WAITLIST',
              'ISSUE_STORE_CREDIT', 'CREATE_TASK', 'NOTIFY_STAFF', 'WEBHOOK',
            ]),
            config: z.record(z.unknown()),
            order: z.number().int().min(0),
            delaySeconds: z.number().int().min(0).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 7 — requires GROW+ tier
      return { id: '' }
    }),

  update: providerProcedure
    .input(z.object({ id: z.string().uuid() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  toggle: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isEnabled: z.boolean(),
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

  test: providerProcedure
    .input(
      z.object({
        automationId: z.string().uuid(),
        entityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Dry run — no actual emails/SMS sent
      return { wouldFire: true, actions: [] }
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
      return { logs: [], nextCursor: null }
    }),
})
