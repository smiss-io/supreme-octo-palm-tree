'use client'

import { useState } from 'react'

type OnboardingStep = 'organization' | 'stripe' | 'location' | 'done'

const STEPS: { key: OnboardingStep; label: string; number: number }[] = [
  { key: 'organization', label: 'Organization Details', number: 1 },
  { key: 'stripe', label: 'Connect Payments', number: 2 },
  { key: 'location', label: 'Add Location', number: 3 },
  { key: 'done', label: 'All Set!', number: 4 },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('organization')
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="font-display text-3xl font-bold text-navy">
        Set up your business
      </h1>
      <p className="mt-2 text-gray-600">
        Complete these steps to start accepting bookings.
      </p>

      {/* Progress Indicator */}
      <div className="mt-8 flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                i <= currentIndex
                  ? 'bg-navy text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < currentIndex ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span className={`hidden text-sm sm:inline ${i <= currentIndex ? 'font-medium text-navy' : 'text-gray-500'}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < currentIndex ? 'bg-navy' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
        {currentStep === 'organization' && (
          <OrganizationStep onNext={() => setCurrentStep('stripe')} />
        )}
        {currentStep === 'stripe' && (
          <StripeStep onNext={() => setCurrentStep('location')} />
        )}
        {currentStep === 'location' && (
          <LocationStep onNext={() => setCurrentStep('done')} />
        )}
        {currentStep === 'done' && <DoneStep />}
      </div>
    </div>
  )
}

function OrganizationStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const generateSlug = (orgName: string) => {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-navy">Organization Details</h2>
      <p className="mt-1 text-sm text-gray-500">Tell us about your business.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSlug(generateSlug(e.target.value))
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="Little Stars Academy"
          />
        </div>

        <div>
          <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700">
            Your URL
          </label>
          <div className="mt-1 flex items-center rounded-md border border-gray-300 shadow-sm">
            <span className="px-3 text-sm text-gray-500">kidspark.app/</span>
            <input
              id="org-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="block w-full border-0 border-l border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-0"
              placeholder="little-stars"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Logo</label>
          <div className="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Drag and drop or click to upload
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!name || !slug}
        className="mt-6 rounded-md bg-navy px-6 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}

function StripeStep({ onNext }: { onNext: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    // In production: call organizationRouter.connectStripe and redirect to Stripe
    // For now, simulate
    setTimeout(() => {
      setLoading(false)
      onNext()
    }, 1000)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-navy">Connect Payments</h2>
      <p className="mt-1 text-sm text-gray-500">
        Connect Stripe to accept payments from families. You&apos;ll be redirected
        to Stripe to complete verification.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Stripe Connect</p>
            <p className="text-sm text-gray-500">
              Secure payment processing. No card data touches our servers.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="rounded-md bg-navy px-6 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Stripe'}
        </button>
        <button
          onClick={onNext}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

function LocationStep({ onNext }: { onNext: () => void }) {
  const [isVirtual, setIsVirtual] = useState(false)

  return (
    <div>
      <h2 className="text-lg font-semibold text-navy">Add Your Location</h2>
      <p className="mt-1 text-sm text-gray-500">
        Where do your activities take place?
      </p>

      <div className="mt-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isVirtual}
            onChange={(e) => setIsVirtual(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Online only (no physical location)</span>
        </label>
      </div>

      {!isVirtual && (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="loc-name" className="block text-sm font-medium text-gray-700">
              Location Name
            </label>
            <input
              id="loc-name"
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="Main Campus"
            />
          </div>
          <div>
            <label htmlFor="loc-address" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              id="loc-address"
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="loc-city" className="block text-sm font-medium text-gray-700">City</label>
              <input
                id="loc-city"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div>
              <label htmlFor="loc-state" className="block text-sm font-medium text-gray-700">State</label>
              <input
                id="loc-state"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div>
              <label htmlFor="loc-zip" className="block text-sm font-medium text-gray-700">ZIP</label>
              <input
                id="loc-zip"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        className="mt-6 rounded-md bg-navy px-6 py-2 text-sm font-medium text-white hover:bg-navy-600"
      >
        {isVirtual ? 'Continue' : 'Save Location & Continue'}
      </button>
    </div>
  )
}

function DoneStep() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-navy">You&apos;re all set!</h2>
      <p className="mt-2 text-sm text-gray-500">
        Your organization is ready. Start by creating your first activity.
      </p>
      <a
        href="/provider/dashboard"
        className="mt-6 inline-block rounded-md bg-navy px-8 py-3 text-sm font-medium text-white hover:bg-navy-600"
      >
        Go to Dashboard
      </a>
    </div>
  )
}
