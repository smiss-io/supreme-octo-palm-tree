'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type BookingStep = 'session' | 'child' | 'fields' | 'discount' | 'payment' | 'confirmation'

const STEPS: { key: BookingStep; label: string }[] = [
  { key: 'session', label: 'Select Session' },
  { key: 'child', label: 'Select Child' },
  { key: 'fields', label: 'Details & Waiver' },
  { key: 'discount', label: 'Discounts' },
  { key: 'payment', label: 'Payment' },
  { key: 'confirmation', label: 'Confirmation' },
]

export default function BookingFlowPage() {
  const params = useParams()
  const router = useRouter()
  const activityId = params.activityId as string
  const [step, setStep] = useState<BookingStep>('session')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedChildId, setSelectedChildId] = useState('')
  const [couponCode, setCouponCode] = useState('')

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex].key)
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) setStep(STEPS[prevIndex].key)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <Link href={`/explore`} className="text-sm text-gray-500 hover:text-navy">
          &larr; Back to Explore
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Book Activity</h1>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i <= currentStepIndex
                    ? 'bg-navy text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-6 ${
                    i < currentStepIndex ? 'bg-navy' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm font-medium text-navy">
          Step {currentStepIndex + 1}: {STEPS[currentStepIndex].label}
        </p>

        {/* Step Content */}
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          {step === 'session' && (
            <SessionSelectStep
              activityId={activityId}
              selectedId={selectedSessionId}
              onSelect={setSelectedSessionId}
            />
          )}

          {step === 'child' && (
            <ChildSelectStep
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          )}

          {step === 'fields' && (
            <CustomFieldsStep activityId={activityId} />
          )}

          {step === 'discount' && (
            <DiscountStep couponCode={couponCode} onCouponChange={setCouponCode} />
          )}

          {step === 'payment' && (
            <PaymentStep />
          )}

          {step === 'confirmation' && (
            <ConfirmationStep onDone={() => router.push('/parent/bookings')} />
          )}
        </div>

        {/* Navigation */}
        {step !== 'confirmation' && (
          <div className="mt-6 flex items-center justify-between">
            {currentStepIndex > 0 ? (
              <button
                onClick={goBack}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={goNext}
              disabled={
                (step === 'session' && !selectedSessionId) ||
                (step === 'child' && !selectedChildId)
              }
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'payment' ? 'Complete Booking' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionSelectStep({
  activityId,
  selectedId,
  onSelect,
}: {
  activityId: string
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Sessions loaded via tRPC — placeholder
  const sessions: {
    id: string
    startDate: string
    durationMin: number
    capacity: number | null
    enrolledCount: number
  }[] = []

  return (
    <div>
      <h2 className="text-lg font-medium text-navy">Choose a Session</h2>
      <p className="mt-1 text-sm text-gray-500">Select the date and time that works for your family.</p>

      {sessions.length === 0 ? (
        <p className="mt-6 text-center text-gray-400">No sessions available at this time.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map((s) => {
            const isFull = s.capacity != null && s.enrolledCount >= s.capacity
            const spotsLeft = s.capacity != null ? s.capacity - s.enrolledCount : null
            return (
              <button
                key={s.id}
                onClick={() => !isFull && onSelect(s.id)}
                disabled={isFull}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedId === s.id
                    ? 'border-navy bg-navy/5 ring-1 ring-navy'
                    : isFull
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(s.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(s.startDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {' '}· {s.durationMin} min
                    </p>
                  </div>
                  <div className="text-right">
                    {isFull ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Full</span>
                    ) : spotsLeft != null ? (
                      <span className="text-sm text-gray-500">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                    ) : (
                      <span className="text-sm text-gray-500">Open</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChildSelectStep({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Children loaded via tRPC childRouter.list — placeholder
  const children: { id: string; firstName: string; lastName: string; dateOfBirth: string }[] = []

  return (
    <div>
      <h2 className="text-lg font-medium text-navy">Select Child</h2>
      <p className="mt-1 text-sm text-gray-500">Which child is attending this activity?</p>

      {children.length === 0 ? (
        <div className="mt-6 text-center">
          <p className="text-gray-400">No children on your profile yet.</p>
          <Link
            href="/parent/children/new"
            className="mt-2 inline-block rounded-md bg-navy px-3 py-1.5 text-sm text-white hover:bg-navy-600"
          >
            Add a Child
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full rounded-lg border p-4 text-left transition ${
                selectedId === c.id
                  ? 'border-navy bg-navy/5 ring-1 ring-navy'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">
                {c.firstName} {c.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Born {new Date(c.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomFieldsStep({ activityId }: { activityId: string }) {
  // Custom fields loaded from activity — placeholder
  return (
    <div>
      <h2 className="text-lg font-medium text-navy">Additional Details</h2>
      <p className="mt-1 text-sm text-gray-500">Complete any required information and sign the waiver.</p>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-sm font-medium text-yellow-800">Participation Waiver</h3>
          <p className="mt-1 text-xs text-yellow-700">
            By proceeding, you acknowledge that your child will participate in physical activities
            and you agree to our terms of participation.
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">I agree to the participation waiver</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function DiscountStep({
  couponCode,
  onCouponChange,
}: {
  couponCode: string
  onCouponChange: (v: string) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-medium text-navy">Apply Discounts</h2>
      <p className="mt-1 text-sm text-gray-500">
        Enter a coupon code or gift card to reduce your total.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="coupon" className="block text-sm font-medium text-gray-700">
            Coupon Code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="coupon"
              type="text"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
              placeholder="SAVE10"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
            />
            <button className="rounded-md border border-navy px-3 py-2 text-sm font-medium text-navy hover:bg-navy/5">
              Apply
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="gift-card" className="block text-sm font-medium text-gray-700">
            Gift Card
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="gift-card"
              type="text"
              placeholder="Enter gift card code"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md border border-navy px-3 py-2 text-sm font-medium text-navy hover:bg-navy/5">
              Apply
            </button>
          </div>
        </div>

        {/* Price Summary */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">Order Summary</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Base price</dt>
              <dd>$0.00</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Add-ons</dt>
              <dd>$0.00</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Discount</dt>
              <dd className="text-green-600">-$0.00</dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium text-gray-900">
              <dt>Total</dt>
              <dd>$0.00</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function PaymentStep() {
  return (
    <div>
      <h2 className="text-lg font-medium text-navy">Payment</h2>
      <p className="mt-1 text-sm text-gray-500">
        Complete your payment securely via Stripe.
      </p>

      {/* Stripe Payment Element will be rendered here */}
      <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          Stripe Payment Element renders here (SAQ A compliant — no card data touches our servers)
        </p>
      </div>

      <p className="mt-3 text-xs text-gray-400 text-center">
        Your payment is processed securely by Stripe. We never see your card details.
      </p>
    </div>
  )
}

function ConfirmationStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-navy">Booking Confirmed!</h2>
      <p className="mt-2 text-sm text-gray-600">
        You&apos;re all set. We&apos;ve sent a confirmation email with all the details.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Download .ics Calendar
        </button>
        <button
          onClick={onDone}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          View My Bookings
        </button>
      </div>
    </div>
  )
}
