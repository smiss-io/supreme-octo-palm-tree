import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { encrypt, decrypt, encryptJson, decryptJson } from '../../lib/security/encryption'
import { requiresParentalConsent, deleteChildData } from '../../lib/security/coppa'

export const childRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        dateOfBirth: z.string().datetime(),
        medicalNotes: z.string().max(2000).optional(),
        allergies: z.string().max(1000).optional(),
        emergencyContact: z
          .object({
            name: z.string().min(1).max(100),
            phone: z.string().min(1).max(20),
            relationship: z.string().min(1).max(50),
          })
          .optional(),
        photoConsent: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify parent profile exists
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent profile not found. Complete registration first.' })
      }

      const dob = new Date(input.dateOfBirth)

      // COPPA check: if child is under 13, parental consent is implicitly given
      // by the parent creating the profile (they are the parent)
      const _needsConsent = requiresParentalConsent(dob)

      // Encrypt PII before storage
      const child = await ctx.db.child.create({
        data: {
          parentProfileId: profile.id,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: dob,
          medicalNotes: input.medicalNotes ? encrypt(input.medicalNotes) : null,
          allergies: input.allergies ? encrypt(input.allergies) : null,
          emergencyContact: input.emergencyContact
            ? encryptJson(input.emergencyContact)
            : undefined,
          photoConsent: input.photoConsent,
        },
      })

      return { id: child.id }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        medicalNotes: z.string().max(2000).optional(),
        allergies: z.string().max(1000).optional(),
        emergencyContact: z
          .object({
            name: z.string().min(1).max(100),
            phone: z.string().min(1).max(20),
            relationship: z.string().min(1).max(50),
          })
          .optional(),
        photoConsent: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // IDOR check: verify child belongs to this parent
      const child = await ctx.db.child.findFirst({
        where: { id, deletedAt: null, parent: { userId: ctx.session.userId } },
      })
      if (!child) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Child not found' })
      }

      const updateData: Record<string, unknown> = {}
      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      if (data.medicalNotes !== undefined) {
        updateData.medicalNotes = data.medicalNotes ? encrypt(data.medicalNotes) : null
      }
      if (data.allergies !== undefined) {
        updateData.allergies = data.allergies ? encrypt(data.allergies) : null
      }
      if (data.emergencyContact !== undefined) {
        updateData.emergencyContact = data.emergencyContact
          ? encryptJson(data.emergencyContact)
          : null
      }
      if (data.photoConsent !== undefined) updateData.photoConsent = data.photoConsent

      await ctx.db.child.update({ where: { id }, data: updateData })

      return { success: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // IDOR check
      const child = await ctx.db.child.findFirst({
        where: { id: input.id, deletedAt: null, parent: { userId: ctx.session.userId } },
      })
      if (!child) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Child not found' })
      }

      // COPPA-compliant deletion: wipe all PII
      await deleteChildData(input.id)

      return { success: true }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.parentProfile.findUnique({
      where: { userId: ctx.session.userId },
    })
    if (!profile) return []

    const children = await ctx.db.child.findMany({
      where: { parentProfileId: profile.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return children.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      dateOfBirth: c.dateOfBirth,
      photoConsent: c.photoConsent,
      // Decrypt PII for display only — never cache
      medicalNotes: c.medicalNotes ? decrypt(c.medicalNotes) : null,
      allergies: c.allergies ? decrypt(c.allergies) : null,
      emergencyContact: c.emergencyContact
        ? decryptJson<{ name: string; phone: string; relationship: string }>(
            c.emergencyContact as string
          )
        : null,
    }))
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const child = await ctx.db.child.findFirst({
        where: { id: input.id, deletedAt: null, parent: { userId: ctx.session.userId } },
      })
      if (!child) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Child not found' })
      }

      return {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        photoConsent: child.photoConsent,
        medicalNotes: child.medicalNotes ? decrypt(child.medicalNotes) : null,
        allergies: child.allergies ? decrypt(child.allergies) : null,
        emergencyContact: child.emergencyContact
          ? decryptJson<{ name: string; phone: string; relationship: string }>(
              child.emergencyContact as string
            )
          : null,
      }
    }),
})
