import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import {
  hashPassword,
  verifyPassword,
  isPasswordBreached,
  validatePasswordStrength,
  generateSessionToken,
  hashIpAddress,
  isAccountLocked,
  calculateLockoutDuration,
} from '../../lib/security/auth'
import { generateToken, hashToken } from '../../lib/security/tokens'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../lib/email'

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(255).toLowerCase(),
        password: passwordSchema,
        firstName: z.string().min(1).max(100).trim(),
        lastName: z.string().min(1).max(100).trim(),
        role: z.enum(['PARENT', 'PROVIDER']),
        organizationName: z.string().min(1).max(200).trim().optional(),
        organizationSlug: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate password strength
      const strength = validatePasswordStrength(input.password)
      if (!strength.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: strength.errors.join('. '),
        })
      }

      // Check if email already exists
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        })
      }

      // Provider must supply org name and slug
      if (input.role === 'PROVIDER') {
        if (!input.organizationName || !input.organizationSlug) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization name and slug are required for providers',
          })
        }
        // Check slug uniqueness
        const existingOrg = await ctx.db.organization.findUnique({
          where: { slug: input.organizationSlug },
        })
        if (existingOrg) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This organization URL is already taken',
          })
        }
      }

      // Check if password is breached (warn only, don't block)
      let passwordBreached = false
      try {
        passwordBreached = await isPasswordBreached(input.password)
      } catch {
        // Don't block registration if HIBP is down
      }

      // Hash password
      const passwordHash = await hashPassword(input.password)

      // Create user in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            role: input.role,
          },
        })

        if (input.role === 'PARENT') {
          await tx.parentProfile.create({
            data: {
              userId: user.id,
              firstName: input.firstName,
              lastName: input.lastName,
            },
          })
        }

        if (input.role === 'PROVIDER' && input.organizationName && input.organizationSlug) {
          const org = await tx.organization.create({
            data: {
              name: input.organizationName,
              slug: input.organizationSlug,
            },
          })

          await tx.organizationUser.create({
            data: {
              userId: user.id,
              organizationId: org.id,
              role: 'OWNER',
            },
          })
        }

        // Generate email verification token
        const { raw, hashed } = generateToken()
        await tx.verificationToken.create({
          data: {
            userId: user.id,
            token: hashed,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'auth.register',
            entityType: 'User',
            entityId: user.id,
            ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
            userAgent: ctx.userAgent,
          },
        })

        return { userId: user.id, verificationToken: raw }
      })

      // Send verification email (non-blocking)
      const verifyUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/auth/verify?token=${result.verificationToken}`
      sendVerificationEmail(input.email, input.firstName, verifyUrl).catch((err) => {
        console.error('Failed to send verification email:', err)
      })

      return {
        success: true,
        passwordBreached,
        message: passwordBreached
          ? 'Account created. Warning: this password has appeared in data breaches. Consider changing it.'
          : 'Account created. Please check your email to verify your account.',
      }
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      })

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Check soft delete
      if (user.deletedAt) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'This account has been deactivated',
        })
      }

      // Check account lockout
      if (isAccountLocked(user.lockedUntil)) {
        const remainingMs = user.lockedUntil!.getTime() - Date.now()
        const remainingMin = Math.ceil(remainingMs / 60000)
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Account locked. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
        })
      }

      // Verify password
      const valid = await verifyPassword(input.password, user.passwordHash)
      if (!valid) {
        const newAttempts = user.failedLoginAttempts + 1
        const lockoutDuration = calculateLockoutDuration(newAttempts)
        const lockedUntil = lockoutDuration > 0
          ? new Date(Date.now() + lockoutDuration)
          : null

        await ctx.db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil,
          },
        })

        // Audit log failed attempt
        await ctx.db.auditLog.create({
          data: {
            userId: user.id,
            action: 'auth.login.failed',
            entityType: 'User',
            entityId: user.id,
            ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
            userAgent: ctx.userAgent,
          },
        })

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Successful login — reset failed attempts, create session
      const { raw: sessionToken, hashed: hashedToken } = generateSessionToken()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
          },
        }),
        ctx.db.session.create({
          data: {
            userId: user.id,
            token: hashedToken,
            expiresAt,
            ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
            userAgent: ctx.userAgent,
          },
        }),
        ctx.db.auditLog.create({
          data: {
            userId: user.id,
            action: 'auth.login.success',
            entityType: 'User',
            entityId: user.id,
            ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
            userAgent: ctx.userAgent,
          },
        }),
      ])

      return {
        sessionToken,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: !!user.emailVerified,
        },
      }
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Invalidate all sessions for this user (or just the current one)
    await ctx.db.session.deleteMany({
      where: { userId: ctx.session.userId },
    })

    await ctx.db.auditLog.create({
      data: {
        userId: ctx.session.userId,
        action: 'auth.logout',
        entityType: 'User',
        entityId: ctx.session.userId,
        ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
      },
    })

    return { success: true }
  }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hashed = hashToken(input.token)

      const verificationToken = await ctx.db.verificationToken.findUnique({
        where: { token: hashed },
        include: { user: true },
      })

      if (!verificationToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired verification link',
        })
      }

      if (verificationToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Verification link has expired. Please request a new one.',
        })
      }

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerified: new Date() },
        }),
        ctx.db.verificationToken.delete({
          where: { id: verificationToken.id },
        }),
        ctx.db.auditLog.create({
          data: {
            userId: verificationToken.userId,
            action: 'auth.email.verified',
            entityType: 'User',
            entityId: verificationToken.userId,
          },
        }),
      ])

      return { success: true }
    }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email().toLowerCase() }))
    .mutation(async ({ ctx, input }) => {
      // Always return success to prevent email enumeration
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: { profile: true },
      })

      if (user) {
        // Rate limit: max 3 reset requests per hour per email
        const recentResets = await ctx.db.passwordResetToken.count({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        })

        if (recentResets < 3) {
          const { raw, hashed } = generateToken()
          await ctx.db.passwordResetToken.create({
            data: {
              userId: user.id,
              token: hashed,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
          })

          const resetUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${raw}`
          const userName = user.profile?.firstName ?? 'there'

          sendPasswordResetEmail(user.email, userName, resetUrl).catch((err) => {
            console.error('Failed to send password reset email:', err)
          })
        }
      }

      return {
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link.',
      }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: passwordSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate password strength
      const strength = validatePasswordStrength(input.password)
      if (!strength.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: strength.errors.join('. '),
        })
      }

      const hashed = hashToken(input.token)

      const resetToken = await ctx.db.passwordResetToken.findUnique({
        where: { token: hashed },
      })

      if (!resetToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired reset link',
        })
      }

      if (resetToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reset link has expired. Please request a new one.',
        })
      }

      if (resetToken.usedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link has already been used.',
        })
      }

      const passwordHash = await hashPassword(input.password)

      await ctx.db.$transaction([
        // Update password
        ctx.db.user.update({
          where: { id: resetToken.userId },
          data: {
            passwordHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),
        // Mark token as used (single-use)
        ctx.db.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
        // Invalidate ALL sessions (force re-login)
        ctx.db.session.deleteMany({
          where: { userId: resetToken.userId },
        }),
        // Audit log
        ctx.db.auditLog.create({
          data: {
            userId: resetToken.userId,
            action: 'auth.password.reset',
            entityType: 'User',
            entityId: resetToken.userId,
            ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
          },
        }),
      ])

      return { success: true }
    }),
})
