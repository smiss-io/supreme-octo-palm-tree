'use client'

import { useEffect } from 'react'

// Custom error page — NEVER shows stack traces or internal paths.
// Shows generic message + Sentry event ID only.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Sentry (configured separately via @sentry/nextjs)
    console.error('Application error:', error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-navy">
          Something went wrong
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We&apos;re sorry for the inconvenience. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-2 text-sm text-muted-foreground">
            Reference ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-8 rounded-md bg-navy px-6 py-3 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
