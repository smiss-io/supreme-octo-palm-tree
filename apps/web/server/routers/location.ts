import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure } from '../trpc'

async function geocodeAddress(
  addressLine1: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!mapboxToken) return null

  const query = encodeURIComponent(
    `${addressLine1}, ${city}, ${state} ${zip}`
  )

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1&country=US`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) return null

    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature?.center) return null

    return {
      lng: feature.center[0],
      lat: feature.center[1],
    }
  } catch {
    return null
  }
}

export const locationRouter = router({
  create: providerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).trim(),
        addressLine1: z.string().max(200).trim().optional(),
        addressLine2: z.string().max(200).trim().optional(),
        city: z.string().max(100).trim().optional(),
        state: z.string().max(50).trim().optional(),
        zip: z.string().max(20).trim().optional(),
        isVirtual: z.boolean().default(false),
        timezone: z.string().max(50).default('America/Los_Angeles'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let lat: number | null = null
      let lng: number | null = null

      // Geocode if physical address provided
      if (
        !input.isVirtual &&
        input.addressLine1 &&
        input.city &&
        input.state &&
        input.zip
      ) {
        const coords = await geocodeAddress(
          input.addressLine1,
          input.city,
          input.state,
          input.zip
        )
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }

      const location = await ctx.db.location.create({
        data: {
          organizationId: ctx.orgId!,
          name: input.name,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          zip: input.zip,
          lat,
          lng,
          isVirtual: input.isVirtual,
          timezone: input.timezone,
        },
      })

      return location
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).trim().optional(),
        addressLine1: z.string().max(200).trim().optional(),
        addressLine2: z.string().max(200).trim().optional(),
        city: z.string().max(100).trim().optional(),
        state: z.string().max(50).trim().optional(),
        zip: z.string().max(20).trim().optional(),
        timezone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify location belongs to org
      const location = await ctx.db.location.findFirst({
        where: { id: input.id, organizationId: ctx.orgId! },
      })

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        })
      }

      const { id, ...data } = input

      // Re-geocode if address changed
      let lat = location.lat
      let lng = location.lng
      const addr1 = data.addressLine1 ?? location.addressLine1
      const city = data.city ?? location.city
      const state = data.state ?? location.state
      const zip = data.zip ?? location.zip

      if (addr1 && city && state && zip) {
        const coords = await geocodeAddress(addr1, city, state, zip)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }

      const updated = await ctx.db.location.update({
        where: { id },
        data: { ...data, lat, lng },
      })

      return updated
    }),

  delete: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const location = await ctx.db.location.findFirst({
        where: { id: input.id, organizationId: ctx.orgId! },
      })

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        })
      }

      await ctx.db.location.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  list: providerProcedure.query(async ({ ctx }) => {
    return ctx.db.location.findMany({
      where: { organizationId: ctx.orgId! },
      orderBy: { name: 'asc' },
    })
  }),
})
