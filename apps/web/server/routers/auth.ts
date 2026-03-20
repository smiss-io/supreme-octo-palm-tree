import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(255),
        password: z.string().min(12).max(128),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        role: z.enum(['PARENT', 'PROVIDER']),
        organizationName: z.string().min(1).max(200).optional(),
        organizationSlug: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Implementation in Phase 2
    return { success: true }
  }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(12).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Implementation in Phase 2
      return { success: true }
    }),
})
