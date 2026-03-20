import { z } from 'zod'
import { router, providerProcedure, requireFeatureGate } from '../trpc'
import {
  generateEnrollmentForecast,
  runOrganizationForecast,
  buildPromotionalEmailPrompt,
} from '../ai/forecasting'

export const forecastRouter = router({
  list: providerProcedure.query(async ({ ctx }) => {
    requireFeatureGate(ctx.orgTier, 'aiForecasting')

    const summary = await runOrganizationForecast(ctx.orgId)
    return summary
  }),

  getSession: providerProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'aiForecasting')

      const forecast = await generateEnrollmentForecast(ctx.orgId, input.sessionId)
      return forecast
    }),

  sendAlert: providerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        emailDraft: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'aiForecasting')

      // In production: enqueue email job via BullMQ
      // const emailQueue = new Queue('email', { connection })
      // await emailQueue.add('forecast-alert', { ... })

      await ctx.db.automationLog.create({
        data: {
          automationId: 'forecast-alert',
          triggeredAt: new Date(),
          entityId: input.sessionId,
          status: 'success',
          error: null,
        },
      })

      return { sent: true }
    }),

  generateEmailDraft: providerProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'aiForecasting')

      const forecast = await generateEnrollmentForecast(ctx.orgId, input.sessionId)
      const org = await ctx.db.organization.findUniqueOrThrow({
        where: { id: ctx.orgId },
        select: { name: true },
      })

      const session = await ctx.db.activitySession.findUniqueOrThrow({
        where: { id: input.sessionId },
        select: { startDate: true },
      })

      const prompt = buildPromotionalEmailPrompt(
        forecast.activityName,
        org.name,
        session.startDate,
        forecast.trendPercent
      )

      // In production: call Anthropic API
      // const anthropic = new Anthropic()
      // const message = await anthropic.messages.create({
      //   model: 'claude-sonnet-4-20250514',
      //   max_tokens: 500,
      //   messages: [{ role: 'user', content: prompt }],
      // })

      // Return the prompt for now — in production returns AI-generated draft
      return {
        prompt,
        draft: `Subject: Spots Still Available in ${forecast.activityName}!\n\nDear families,\n\nWe still have spots available in ${forecast.activityName}. Don't miss out on this great opportunity for your child!\n\nRegister today to secure your spot.\n\nBest regards,\n${org.name}`,
      }
    }),
})
