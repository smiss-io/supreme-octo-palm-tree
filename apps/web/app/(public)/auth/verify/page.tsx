import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

async function verifyEmail(
  token: string
): Promise<{ success: boolean; message: string }> {
  // TODO: Wire up tRPC or server action to verify the token
  // Placeholder implementation - simulate verification
  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (!token || token.length < 10) {
    return {
      success: false,
      message:
        'This verification link is invalid or has expired. Please request a new one.',
    }
  }

  return {
    success: true,
    message: 'Your email has been verified successfully!',
  }
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">
          Missing verification token
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          No verification token was provided. Please check your email and click
          the verification link.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block text-sm font-semibold text-sky hover:text-sky-700"
        >
          Go to login
        </Link>
      </div>
    )
  }

  const result = await verifyEmail(token)

  if (result.success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2
            className="h-6 w-6 text-green-600"
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">
          Email verified
        </h1>
        <p className="mt-2 text-sm text-gray-500">{result.message}</p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          Continue to login
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">
        Verification failed
      </h1>
      <p className="mt-2 text-sm text-gray-500">{result.message}</p>
      <Link
        href="/auth/login"
        className="mt-6 inline-block text-sm font-semibold text-sky hover:text-sky-700"
      >
        Go to login
      </Link>
    </div>
  )
}
