import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure, requireFeatureGate } from '../trpc'

const activityCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  format: z.enum([
    'IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'APPOINTMENT',
    'CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY', 'SEMESTER', 'PRIVATE_PARTY', 'FREE_TRIAL',
  ]),
  category: z.string().min(1).max(100),
  locationId: z.string().uuid().optional(),
  minAge: z.number().int().min(0).max(216).optional(),
  maxAge: z.number().int().min(0).max(216).optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
})

const activityUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  format: z.enum([
    'IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'APPOINTMENT',
    'CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY', 'SEMESTER', 'PRIVATE_PARTY', 'FREE_TRIAL',
  ]).optional(),
  category: z.string().min(1).max(100).optional(),
  locationId: z.string().uuid().nullable().optional(),
  minAge: z.number().int().min(0).max(216).nullable().optional(),
  maxAge: z.number().int().min(0).max(216).nullable().optional(),
  capacity: z.number().int().min(1).max(10000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
})

export const activityRouter = router({
  create: providerProcedure
    .input(activityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate age range
      if (input.minAge != null && input.maxAge != null && input.minAge > input.maxAge) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Minimum age cannot be greater than maximum age',
        })
      }

      // If locationId provided, verify it belongs to the org
      if (input.locationId) {
        const location = await ctx.db.location.findFirst({
          where: { id: input.locationId, organizationId: ctx.orgId },
        })
        if (!location) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Location not found in your organization',
          })
        }
      }

      // Check tier gates for specific formats
      const advancedFormats = ['CAMP_MULTI_DAY', 'SEMESTER']
      if (advancedFormats.includes(input.format)) {
        requireFeatureGate(ctx.orgTier, 'multiDaySemesters')
      }
      if (input.format === 'APPOINTMENT') {
        requireFeatureGate(ctx.orgTier, 'appointmentBooking')
      }

      const activity = await ctx.db.activity.create({
        data: {
          organizationId: ctx.orgId,
          name: input.name,
          description: input.description,
          format: input.format,
          category: input.category,
          locationId: input.locationId,
          minAge: input.minAge,
          maxAge: input.maxAge,
          capacity: input.capacity,
          tags: input.tags ?? [],
          imageUrls: input.imageUrls ?? [],
        },
      })

      return { id: activity.id }
    }),

  update: providerProcedure
    .input(activityUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify activity belongs to org
      const existing = await ctx.db.activity.findFirst({
        where: { id, organizationId: ctx.orgId, deletedAt: null },
      })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      // Validate age range
      const minAge = data.minAge !== undefined ? data.minAge : existing.minAge
      const maxAge = data.maxAge !== undefined ? data.maxAge : existing.maxAge
      if (minAge != null && maxAge != null && minAge > maxAge) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Minimum age cannot be greater than maximum age',
        })
      }

      // If changing locationId, verify ownership
      if (data.locationId) {
        const location = await ctx.db.location.findFirst({
          where: { id: data.locationId, organizationId: ctx.orgId },
        })
        if (!location) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Location not found in your organization' })
        }
      }

      // Build update payload, converting null to Prisma-compatible values
      const updateData: Record<string, unknown> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.format !== undefined) updateData.format = data.format
      if (data.category !== undefined) updateData.category = data.category
      if (data.locationId !== undefined) updateData.locationId = data.locationId
      if (data.minAge !== undefined) updateData.minAge = data.minAge
      if (data.maxAge !== undefined) updateData.maxAge = data.maxAge
      if (data.capacity !== undefined) updateData.capacity = data.capacity
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls

      await ctx.db.activity.update({
        where: { id },
        data: updateData,
      })

      return { success: true }
    }),

  publish: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const activity = await ctx.db.activity.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, deletedAt: null },
        include: { sessions: { where: { status: 'SCHEDULED' }, take: 1 } },
      })
      if (!activity) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      // Require at least one scheduled session to publish
      if (activity.sessions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Activity must have at least one scheduled session before publishing',
        })
      }

      await ctx.db.activity.update({
        where: { id: input.id },
        data: { isPublished: true },
      })

      return { success: true }
    }),

  unpublish: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const activity = await ctx.db.activity.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, deletedAt: null },
      })
      if (!activity) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      await ctx.db.activity.update({
        where: { id: input.id },
        data: { isPublished: false },
      })

      return { success: true }
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const activity = await ctx.db.activity.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, deletedAt: null },
      })
      if (!activity) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      // Soft delete — preserve for audit trail
      await ctx.db.activity.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isPublished: false },
      })

      return { success: true }
    }),

  duplicate: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.activity.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, deletedAt: null },
        include: { customFields: true },
      })
      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      const duplicate = await ctx.db.activity.create({
        data: {
          organizationId: ctx.orgId,
          locationId: source.locationId,
          name: `${source.name} (Copy)`,
          description: source.description,
          format: source.format,
          category: source.category,
          minAge: source.minAge,
          maxAge: source.maxAge,
          capacity: source.capacity,
          tags: source.tags,
          imageUrls: source.imageUrls,
          isPublished: false, // copies start unpublished
          customFields: {
            create: source.customFields.map((f) => ({
              label: f.label,
              fieldType: f.fieldType,
              required: f.required,
              options: f.options,
              order: f.order,
              isPii: f.isPii,
            })),
          },
        },
      })

      return { id: duplicate.id }
    }),

  list: providerProcedure
    .input(
      z.object({
        includeDeleted: z.boolean().optional(),
        publishedOnly: z.boolean().optional(),
        category: z.string().optional(),
        search: z.string().max(200).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input ?? {}
      const where: Record<string, unknown> = { organizationId: ctx.orgId }

      if (!filters.includeDeleted) {
        where.deletedAt = null
      }
      if (filters.publishedOnly) {
        where.isPublished = true
      }
      if (filters.category) {
        where.category = filters.category
      }
      if (filters.search) {
        where.name = { contains: filters.search, mode: 'insensitive' }
      }

      const activities = await ctx.db.activity.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          sessions: {
            where: { status: 'SCHEDULED' },
            orderBy: { startDate: 'asc' },
            take: 1,
          },
          _count: { select: { sessions: true, pricing: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return activities.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        format: a.format,
        category: a.category,
        minAge: a.minAge,
        maxAge: a.maxAge,
        capacity: a.capacity,
        isPublished: a.isPublished,
        isFeatured: a.isFeatured,
        tags: a.tags,
        imageUrls: a.imageUrls,
        location: a.location,
        nextSession: a.sessions[0] ?? null,
        sessionCount: a._count.sessions,
        pricingCount: a._count.pricing,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    }),

  getById: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const activity = await ctx.db.activity.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, deletedAt: null },
        include: {
          location: true,
          sessions: { orderBy: { startDate: 'asc' } },
          pricing: true,
          addOns: true,
          customFields: { orderBy: { order: 'asc' } },
        },
      })

      if (!activity) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity not found' })
      }

      return activity
    }),
})
