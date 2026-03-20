import { z } from 'zod'
import { router, providerProcedure, protectedProcedure } from '../trpc'

export const paymentRouter = router({
  getPayments: providerProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED']).optional(),
        method: z.enum(['CARD', 'ACH', 'CASH', 'CHECK', 'STORE_CREDIT', 'GIFT_CARD']).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Implementation in Phase 6
      return { payments: [], nextCursor: null }
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
      return { success: true }
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
      return { id: '' }
    }),

  recordManualPayment: providerProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        method: z.enum(['CASH', 'CHECK']),
        amountInCents: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { id: '' }
    }),

  getPayoutHistory: providerProcedure.query(async ({ ctx }) => {
    return []
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
      return { downloadUrl: '' }
    }),
})
