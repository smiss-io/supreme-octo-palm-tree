import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { encrypt, decrypt } from '../../lib/security/encryption'

export const parentRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.parentProfile.findUnique({
      where: { userId: ctx.session.userId },
      include: {
        children: {
          where: { deletedAt: null },
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
        },
      },
    })

    if (!profile) return null

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ? decrypt(profile.phone) : null,
      timezone: profile.timezone,
      stripeCustomerId: profile.stripeCustomerId,
      children: profile.children.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth,
      })),
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().max(20).optional(),
        timezone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent profile not found' })
      }

      const updateData: Record<string, unknown> = {}
      if (input.firstName !== undefined) updateData.firstName = input.firstName
      if (input.lastName !== undefined) updateData.lastName = input.lastName
      if (input.phone !== undefined) updateData.phone = input.phone ? encrypt(input.phone) : null
      if (input.timezone !== undefined) updateData.timezone = input.timezone

      await ctx.db.parentProfile.update({
        where: { id: profile.id },
        data: updateData,
      })

      return { success: true }
    }),
})
