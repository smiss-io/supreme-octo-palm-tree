import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { db } from '../lib/db'
import type { Tier } from '@prisma/client'
import { hasFeature, type Feature } from '../lib/tiers'

// Context type — created for each request
export type TRPCContext = {
  db: typeof db
  session: {
    userId: string
    email: string
    role: string
  } | null
  orgId: string | null
  orgTier: Tier | null
  ipAddress: string | null
  userAgent: string | null
}

export async function createTRPCContext(opts: {
  headers: Headers
}): Promise<TRPCContext> {
  // Session will be populated by auth middleware in actual request handling
  return {
    db,
    session: null,
    orgId: null,
    orgTier: null,
    ipAddress: opts.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: opts.headers.get('user-agent') ?? null,
  }
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

export const router = t.router
export const createCallerFactory = t.createCallerFactory

// ─── Middleware ──────────────────────────────────────────────────────────────

// Audit log middleware — logs all mutations
const auditLogMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const result = await next()

  if (type === 'mutation' && ctx.session) {
    try {
      const hashIp = ctx.ipAddress
        ? require('crypto')
            .createHash('sha256')
            .update(ctx.ipAddress)
            .digest('hex')
        : null

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.userId,
          action: path,
          entityType: path.split('.')[0] ?? 'unknown',
          entityId: 'mutation',
          ipAddress: hashIp,
          userAgent: ctx.userAgent,
        },
      })
    } catch (err) {
      // Don't fail the request if audit logging fails
      console.error('Audit log write failed:', err)
    }
  }

  return result
})

// Auth middleware — requires valid session
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

// Provider middleware — requires session + provider org role
const enforceProvider = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  if (!ctx.orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be associated with an organization',
    })
  }

  // Verify the user has a provider-level role in the org
  const membership = await ctx.db.organizationUser.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.session.userId,
        organizationId: ctx.orgId,
      },
    },
  })

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization',
    })
  }

  const providerRoles = ['OWNER', 'ADMIN', 'MANAGER']
  if (!providerRoles.includes(membership.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have sufficient permissions for this action',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      orgId: ctx.orgId,
      orgTier: ctx.orgTier,
      membership,
    },
  })
})

// ─── Procedures ─────────────────────────────────────────────────────────────

// Public procedure — no auth required
export const publicProcedure = t.procedure

// Protected procedure — requires valid session
export const protectedProcedure = t.procedure
  .use(enforceAuth)
  .use(auditLogMiddleware)

// Provider procedure — requires session + OWNER/ADMIN/MANAGER role
export const providerProcedure = t.procedure
  .use(enforceProvider)
  .use(auditLogMiddleware)

// Helper to check feature gates in procedures
export function requireFeatureGate(tier: Tier | null, feature: Feature): void {
  if (!tier) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization tier not found',
    })
  }
  if (!hasFeature(tier, feature)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This feature requires a higher plan. Upgrade to access ${feature}.`,
    })
  }
}
