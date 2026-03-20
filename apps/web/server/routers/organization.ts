import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  router,
  protectedProcedure,
  providerProcedure,
} from '../trpc'
import { stripe } from '../../lib/stripe'
import { generateToken, hashToken } from '../../lib/security/tokens'
import { hashIpAddress } from '../../lib/security/auth'
import { sendStaffInviteEmail } from '../../lib/email'

export const organizationRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).trim(),
        slug: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const existing = await ctx.db.organization.findUnique({
        where: { slug: input.slug },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This organization URL is already taken',
        })
      }

      // Create Stripe customer for the organization
      let stripeCustomerId: string | undefined
      try {
        const customer = await stripe.customers.create({
          name: input.name,
          metadata: { platform: 'kidspark' },
        })
        stripeCustomerId = customer.id
      } catch {
        // Don't block org creation if Stripe is down
        console.error('Failed to create Stripe customer')
      }

      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          stripeCustomerId,
          users: {
            create: {
              userId: ctx.session.userId,
              role: 'OWNER',
            },
          },
        },
      })

      // Update user role to PROVIDER
      await ctx.db.user.update({
        where: { id: ctx.session.userId },
        data: { role: 'PROVIDER' },
      })

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.userId,
          action: 'organization.created',
          entityType: 'Organization',
          entityId: org.id,
          ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
        },
      })

      return { id: org.id, slug: org.slug }
    }),

  update: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).trim().optional(),
        logoUrl: z.string().url().optional(),
        timezone: z.string().max(50).optional(),
        allowedDomain: z.string().max(200).optional(),
        siblingDiscount: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: ctx.orgId! },
        data: input,
      })

      return { success: true, organization: org }
    }),

  getMyOrg: providerProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId! },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                lastLoginAt: true,
              },
            },
          },
        },
        locations: true,
      },
    })

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' })
    }

    return org
  }),

  inviteStaff: providerProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase(),
        role: z.enum(['ADMIN', 'MANAGER', 'INSTRUCTOR', 'VIEWER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can invite
      const membership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can invite staff',
        })
      }

      // Check if already a member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      })
      if (existingUser) {
        const existingMembership = await ctx.db.organizationUser.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: ctx.orgId!,
            },
          },
        })
        if (existingMembership) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This person is already a member of your organization',
          })
        }
      }

      // Generate invite token
      const { raw, hashed } = generateToken()

      await ctx.db.staffInvite.upsert({
        where: {
          organizationId_email: {
            organizationId: ctx.orgId!,
            email: input.email,
          },
        },
        create: {
          organizationId: ctx.orgId!,
          email: input.email,
          role: input.role,
          token: hashed,
          invitedById: ctx.session.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        update: {
          role: input.role,
          token: hashed,
          invitedById: ctx.session.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: null,
        },
      })

      // Get inviter and org info for email
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId! },
      })
      const inviter = await ctx.db.user.findUnique({
        where: { id: ctx.session.userId },
        include: { profile: true },
      })

      const acceptUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/auth/accept-invite?token=${raw}`
      const inviterName = inviter?.profile
        ? `${inviter.profile.firstName} ${inviter.profile.lastName}`
        : inviter?.email ?? 'A team member'

      sendStaffInviteEmail(
        input.email,
        org?.name ?? 'an organization',
        inviterName,
        input.role,
        acceptUrl
      ).catch((err) => {
        console.error('Failed to send staff invite email:', err)
      })

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.userId,
          action: 'organization.staff.invited',
          entityType: 'StaffInvite',
          entityId: input.email,
          ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
          metadata: { role: input.role },
        },
      })

      return { success: true }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hashed = hashToken(input.token)

      const invite = await ctx.db.staffInvite.findUnique({
        where: { token: hashed },
        include: { organization: true },
      })

      if (!invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invite link' })
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has expired' })
      }

      if (invite.acceptedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has already been accepted' })
      }

      await ctx.db.$transaction([
        ctx.db.organizationUser.create({
          data: {
            userId: ctx.session.userId,
            organizationId: invite.organizationId,
            role: invite.role,
          },
        }),
        ctx.db.staffInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
        ctx.db.user.update({
          where: { id: ctx.session.userId },
          data: { role: 'STAFF' },
        }),
      ])

      return { success: true, organizationName: invite.organization.name }
    }),

  updateStaffRole: providerProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['ADMIN', 'MANAGER', 'INSTRUCTOR', 'VIEWER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can change roles
      const currentMembership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!currentMembership || !['OWNER', 'ADMIN'].includes(currentMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can change staff roles',
        })
      }

      // Cannot demote self
      if (input.userId === ctx.session.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own role',
        })
      }

      // Cannot change OWNER role
      const targetMembership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!targetMembership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Staff member not found' })
      }

      if (targetMembership.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change the owner\'s role',
        })
      }

      await ctx.db.organizationUser.update({
        where: { id: targetMembership.id },
        data: { role: input.role },
      })

      return { success: true }
    }),

  removeStaff: providerProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const currentMembership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!currentMembership || !['OWNER', 'ADMIN'].includes(currentMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can remove staff',
        })
      }

      if (input.userId === ctx.session.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself',
        })
      }

      const targetMembership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!targetMembership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Staff member not found' })
      }

      if (targetMembership.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the organization owner',
        })
      }

      await ctx.db.organizationUser.delete({
        where: { id: targetMembership.id },
      })

      return { success: true }
    }),

  connectStripe: providerProcedure.mutation(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId! },
    })

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' })
    }

    // If already connected, return the dashboard link
    if (org.stripeAccountId && org.stripeOnboarded) {
      const loginLink = await stripe.accounts.createLoginLink(org.stripeAccountId)
      return { url: loginLink.url, alreadyConnected: true }
    }

    // Create or reuse Connect Express account
    let accountId = org.stripeAccountId
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { organizationId: org.id, platform: 'kidspark' },
      })
      accountId = account.id

      await ctx.db.organization.update({
        where: { id: org.id },
        data: { stripeAccountId: accountId },
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/provider/onboarding?step=stripe&refresh=1`,
      return_url: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/provider/onboarding?step=stripe&success=1`,
      type: 'account_onboarding',
    })

    await ctx.db.auditLog.create({
      data: {
        userId: ctx.session.userId,
        action: 'organization.stripe.connect.started',
        entityType: 'Organization',
        entityId: org.id,
      },
    })

    return { url: accountLink.url, alreadyConnected: false }
  }),

  getStripeStatus: providerProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId! },
    })

    if (!org || !org.stripeAccountId) {
      return { connected: false, onboarded: false, payoutsEnabled: false }
    }

    try {
      const account = await stripe.accounts.retrieve(org.stripeAccountId)
      return {
        connected: true,
        onboarded: org.stripeOnboarded,
        payoutsEnabled: account.payouts_enabled ?? false,
        chargesEnabled: account.charges_enabled ?? false,
      }
    } catch {
      return { connected: false, onboarded: false, payoutsEnabled: false }
    }
  }),

  deleteOrganization: providerProcedure
    .input(
      z.object({
        confirmName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId! },
      })

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Must be OWNER
      const membership = await ctx.db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.userId,
            organizationId: ctx.orgId!,
          },
        },
      })

      if (!membership || membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the organization owner can delete it',
        })
      }

      if (input.confirmName !== org.name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization name does not match',
        })
      }

      // Soft delete (cascade handled by relationships)
      await ctx.db.organization.delete({
        where: { id: org.id },
      })

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.userId,
          action: 'organization.deleted',
          entityType: 'Organization',
          entityId: org.id,
          ipAddress: ctx.ipAddress ? hashIpAddress(ctx.ipAddress) : null,
        },
      })

      return { success: true }
    }),
})
