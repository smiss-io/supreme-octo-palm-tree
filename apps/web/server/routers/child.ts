import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

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
      // Implementation in Phase 4 — encrypt PII before storage
      return { id: '' }
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
      return { success: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Calls deleteChildData() — wipe PII per COPPA
      return { success: true }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return []
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return null
    }),
})
