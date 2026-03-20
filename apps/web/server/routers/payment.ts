import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, providerProcedure, requireFeatureGate } from '../trpc'
import { createHash, randomBytes } from 'crypto'

export const paymentRouter = router({
  getPayments: providerProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED']).optional(),
        method: z.enum(['CARD', 'ACH', 'CASH', 'CHECK', 'STORE_CREDIT', 'GIFT_CARD']).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        search: z.string().max(100).optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { organizationId: ctx.orgId }
      if (input.status) where.status = input.status
      if (input.method) where.method = input.method
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        }
      }

      const payments = await ctx.db.payment.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              child: { select: { firstName: true, lastName: true } },
              session: {
                select: { activity: { select: { name: true } } },
              },
            },
          },
        },
      })

      const hasMore = payments.length > input.limit
      if (hasMore) payments.pop()

      return {
        payments,
        nextCursor: hasMore ? payments[payments.length - 1]?.id : null,
      }
    }),

  refund: providerProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        amountInCents: z.number().int().min(1).optional(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.paymentId, organizationId: ctx.orgId },
      })
      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      // Cannot refund disputed payments
      if (payment.status === 'DISPUTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot refund disputed payments' })
      }

      // Cannot refund more than original amount
      const alreadyRefunded = payment.refundedAmount ?? 0
      const refundAmount = input.amountInCents ?? (payment.amount - alreadyRefunded)
      if (refundAmount > payment.amount - alreadyRefunded) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot refund more than remaining amount (${payment.amount - alreadyRefunded} cents)`,
        })
      }

      // Update payment record
      const isFullRefund = refundAmount === payment.amount - alreadyRefunded
      await ctx.db.payment.update({
        where: { id: input.paymentId },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundedAt: new Date(),
          refundedAmount: alreadyRefunded + refundAmount,
        },
      })

      // Update booking status if applicable
      if (payment.bookingId && isFullRefund) {
        await ctx.db.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'REFUNDED' },
        })
      }

      // Create ledger entry
      await ctx.db.ledgerEntry.create({
        data: {
          organizationId: ctx.orgId!,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          type: 'REFUND',
          grossAmountCents: -refundAmount,
          stripeFeesCents: 0,
          platformFeeCents: 0,
          netAmountCents: -refundAmount,
        },
      })

      return { success: true, refundedAmount: refundAmount }
    }),

  issueStoreCredit: providerProcedure
    .input(
      z.object({
        parentProfileId: z.string().uuid(),
        amountInCents: z.number().int().min(1),
        reason: z.string().max(500).optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // SCALE tier only
      requireFeatureGate(ctx.orgTier, 'storeCredit')

      const credit = await ctx.db.storeCredit.create({
        data: {
          organizationId: ctx.orgId!,
          parentProfileId: input.parentProfileId,
          amountInCents: input.amountInCents,
          reason: input.reason,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      })

      return { id: credit.id }
    }),

  quickCharge: providerProcedure
    .input(
      z.object({
        parentProfileId: z.string().uuid(),
        amountInCents: z.number().int().min(1),
        description: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create a payment record for on-the-spot charges (no booking)
      const payment = await ctx.db.payment.create({
        data: {
          organizationId: ctx.orgId!,
          parentProfileId: input.parentProfileId,
          amount: input.amountInCents,
          status: 'PENDING',
          method: 'CARD',
          metadata: { description: input.description },
        },
      })

      // In production: create Stripe PaymentIntent here
      return { paymentId: payment.id, clientSecret: `pi_placeholder_${payment.id}` }
    }),

  recordManualPayment: providerProcedure
    .input(
      z.object({
        bookingId: z.string().uuid().optional(),
        parentProfileId: z.string().uuid().optional(),
        method: z.enum(['CASH', 'CHECK']),
        amountInCents: z.number().int().min(1),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // SCALE tier only for manual payment methods
      requireFeatureGate(ctx.orgTier, 'customPaymentMethods')

      const payment = await ctx.db.payment.create({
        data: {
          organizationId: ctx.orgId!,
          bookingId: input.bookingId,
          parentProfileId: input.parentProfileId,
          amount: input.amountInCents,
          status: 'SUCCEEDED',
          method: input.method,
          paidAt: new Date(),
          metadata: input.notes ? { notes: input.notes } : undefined,
        },
      })

      // Create ledger entry
      await ctx.db.ledgerEntry.create({
        data: {
          organizationId: ctx.orgId!,
          paymentId: payment.id,
          bookingId: input.bookingId,
          type: 'CHARGE',
          grossAmountCents: input.amountInCents,
          stripeFeesCents: 0,
          platformFeeCents: 0,
          netAmountCents: input.amountInCents,
        },
      })

      // If booking, update status
      if (input.bookingId) {
        await ctx.db.booking.update({
          where: { id: input.bookingId },
          data: { status: 'CONFIRMED' },
        })
      }

      return { id: payment.id }
    }),

  getPayoutHistory: providerProcedure.query(async ({ ctx }) => {
    // Fetch ledger entries grouped by payout ID
    const entries = await ctx.db.ledgerEntry.findMany({
      where: {
        organizationId: ctx.orgId,
        stripePayoutId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Group by payout
    const payouts = new Map<string, {
      payoutId: string
      entries: typeof entries
      totalGross: number
      totalFees: number
      totalNet: number
      reconciled: boolean
    }>()

    for (const entry of entries) {
      if (!entry.stripePayoutId) continue
      if (!payouts.has(entry.stripePayoutId)) {
        payouts.set(entry.stripePayoutId, {
          payoutId: entry.stripePayoutId,
          entries: [],
          totalGross: 0,
          totalFees: 0,
          totalNet: 0,
          reconciled: true,
        })
      }
      const payout = payouts.get(entry.stripePayoutId)!
      payout.entries.push(entry)
      payout.totalGross += entry.grossAmountCents
      payout.totalFees += entry.stripeFeesCents + entry.platformFeeCents
      payout.totalNet += entry.netAmountCents
      if (!entry.reconciled) payout.reconciled = false
    }

    return Array.from(payouts.values())
  }),

  // Ledger operations
  getLedger: providerProcedure
    .input(
      z.object({
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        reconciled: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { organizationId: ctx.orgId }
      if (input.reconciled !== undefined) where.reconciled = input.reconciled
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        }
      }

      const entries = await ctx.db.ledgerEntry.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
      })

      const hasMore = entries.length > input.limit
      if (hasMore) entries.pop()

      return {
        entries,
        nextCursor: hasMore ? entries[entries.length - 1]?.id : null,
      }
    }),

  reconcilePayout: providerProcedure
    .input(z.object({ stripePayoutId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.ledgerEntry.updateMany({
        where: {
          organizationId: ctx.orgId,
          stripePayoutId: input.stripePayoutId,
          reconciled: false,
        },
        data: { reconciled: true },
      })

      return { reconciledCount: result.count }
    }),

  exportLedger: providerProcedure
    .input(
      z.object({
        format: z.enum(['csv', 'pdf']),
        dateFrom: z.string().datetime(),
        dateTo: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entries = await ctx.db.ledgerEntry.findMany({
        where: {
          organizationId: ctx.orgId,
          createdAt: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (input.format === 'csv') {
        // QuickBooks-compatible CSV format
        const headers = ['Date', 'Type', 'Gross', 'Stripe Fee', 'Platform Fee', 'Net', 'Payout ID', 'Reconciled']
        const rows = entries.map((e) => [
          e.createdAt.toISOString().split('T')[0],
          e.type,
          (e.grossAmountCents / 100).toFixed(2),
          (e.stripeFeesCents / 100).toFixed(2),
          (e.platformFeeCents / 100).toFixed(2),
          (e.netAmountCents / 100).toFixed(2),
          e.stripePayoutId ?? '',
          e.reconciled ? 'Yes' : 'No',
        ])
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        return { data: csv, contentType: 'text/csv' }
      }

      // PDF generation would use pdfkit in production
      return { data: 'PDF export placeholder', contentType: 'application/pdf' }
    }),
})

// Gift Card router
export const giftCardRouter = router({
  create: providerProcedure
    .input(
      z.object({
        balanceInCents: z.number().int().min(100).max(100000),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate cryptographically random 16-char alphanumeric code
      const plainCode = randomBytes(12)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 16)
        .toUpperCase()

      // Hash for DB storage — plaintext returned ONCE to provider
      const hashedCode = createHash('sha256').update(plainCode).digest('hex')

      await ctx.db.giftCard.create({
        data: {
          organizationId: ctx.orgId!,
          code: hashedCode,
          balanceInCents: input.balanceInCents,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      })

      // Return plaintext code ONCE — it will never be retrievable again
      return { code: plainCode, balanceInCents: input.balanceInCents }
    }),

  redeem: providerProcedure
    .input(
      z.object({
        code: z.string().min(1).max(20),
        amountInCents: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Hash the provided code to look up
      const hashedCode = createHash('sha256').update(input.code).digest('hex')

      const giftCard = await ctx.db.giftCard.findFirst({
        where: {
          code: hashedCode,
          organizationId: ctx.orgId,
        },
      })

      if (!giftCard) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid gift card code' })
      }

      if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gift card has expired' })
      }

      const remaining = giftCard.balanceInCents - giftCard.usedInCents
      if (input.amountInCents > remaining) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient balance. Remaining: ${remaining} cents`,
        })
      }

      await ctx.db.giftCard.update({
        where: { id: giftCard.id },
        data: { usedInCents: { increment: input.amountInCents } },
      })

      return {
        redeemedAmount: input.amountInCents,
        remainingBalance: remaining - input.amountInCents,
      }
    }),

  getBalances: providerProcedure.query(async ({ ctx }) => {
    const cards = await ctx.db.giftCard.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
    })

    return cards.map((c) => ({
      id: c.id,
      balanceInCents: c.balanceInCents,
      usedInCents: c.usedInCents,
      remainingInCents: c.balanceInCents - c.usedInCents,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    }))
  }),
})

// Helper: compute prorated price for late joiners
export function computeProratedPrice(
  fullPriceInCents: number,
  totalSessions: number,
  remainingSessions: number
): number {
  if (totalSessions <= 0 || remainingSessions <= 0) return 0
  if (remainingSessions >= totalSessions) return fullPriceInCents
  return Math.ceil((remainingSessions / totalSessions) * fullPriceInCents)
}

// Helper: compute sibling discount
export function computeSiblingDiscount(
  priceInCents: number,
  discountPercent: number,
  isSecondChild: boolean
): number {
  if (!isSecondChild || discountPercent <= 0) return priceInCents
  return Math.ceil(priceInCents * (1 - discountPercent / 100))
}
