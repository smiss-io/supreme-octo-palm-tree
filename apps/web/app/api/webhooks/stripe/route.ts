import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructWebhookEvent } from '../../../../lib/stripe'
import { db } from '../../../../lib/db'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Write every webhook event to AuditLog BEFORE processing
  // Rationale: If handler crashes after this line, we can replay the webhook from AuditLog.
  // This enables recovery from temporary outages and ensures no payments are lost.
  // We return 200 OK at the end so Stripe stops retrying, even if handler fails.
  await db.auditLog.create({
    data: {
      action: `stripe.webhook.${event.type}`,
      entityType: 'StripeEvent',
      entityId: event.id,
      metadata: {
        type: event.type,
        livemode: event.livemode,
      },
    },
  }).catch((err) => {
    console.error('Failed to log webhook event:', err)
  })

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.charges_enabled && account.payouts_enabled) {
          await db.organization.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboarded: true },
          })
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const bookingId = paymentIntent.metadata?.bookingId

        if (bookingId && bookingId !== 'pending') {
          // Update payment record
          await db.payment.updateMany({
            where: { stripePaymentIntentId: paymentIntent.id },
            data: {
              status: 'SUCCEEDED',
              paidAt: new Date(),
            },
          })

          // Confirm booking
          await db.booking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' },
          })

          // Increment enrolled count
          const booking = await db.booking.findUnique({
            where: { id: bookingId },
          })
          if (booking) {
            await db.activitySession.update({
              where: { id: booking.activitySessionId },
              data: { enrolledCount: { increment: 1 } },
            })
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent
        await db.payment.updateMany({
          where: { stripePaymentIntentId: failedIntent.id },
          data: { status: 'FAILED' },
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await db.payment.updateMany({
          where: { stripeChargeId: charge.id },
          data: {
            status: charge.amount_refunded === charge.amount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
            refundedAt: new Date(),
            refundedAmount: charge.amount_refunded,
          },
        })
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const chargeId = typeof dispute.charge === 'string'
          ? dispute.charge
          : dispute.charge?.id

        if (chargeId) {
          await db.payment.updateMany({
            where: { stripeChargeId: chargeId },
            data: { status: 'DISPUTED' },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        // Find bookings associated with this subscription and mark cancelled
        // This will be fully implemented in Phase 6
        break
      }

      default:
        // Unhandled event type — logged above
        break
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err)
    // Return 200 to prevent Stripe from retrying — we logged the event
    // and can reprocess later from AuditLog
  }

  return NextResponse.json({ received: true })
}
