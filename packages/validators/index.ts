import { z } from 'zod'

// ─── Common Validators ──────────────────────────────────────────────────────

export const emailSchema = z.string().email().max(255).toLowerCase()

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')

export const uuidSchema = z.string().uuid()

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(63, 'Slug must be less than 63 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^[+\d\s()-]+$/, 'Invalid phone number format')

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
})

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

// ─── Activity Validators ─────────────────────────────────────────────────────

export const activityFormats = [
  'IN_PERSON', 'ONLINE', 'BLENDED', 'DROP_IN', 'APPOINTMENT',
  'CAMP_SINGLE_DAY', 'CAMP_MULTI_DAY', 'SEMESTER', 'PRIVATE_PARTY', 'FREE_TRIAL',
] as const

export const activityFormatSchema = z.enum(activityFormats)

export const categorySchema = z.string().min(1).max(100)

// ─── Price Validators ────────────────────────────────────────────────────────

export const priceInCentsSchema = z.number().int().min(0).max(99999999)

export const currencySchema = z.string().length(3).default('usd')
