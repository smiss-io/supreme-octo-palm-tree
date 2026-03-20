'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsSubmitting(true)
    try {
      // TODO: Wire up tRPC mutation
      console.log('Forgot password:', data)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsSubmitted(true)
    } catch {
      // Still show success to avoid email enumeration
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <MailCheck className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          If an account exists with that email address, we&apos;ve sent a
          password reset link. Please check your inbox and spam folder.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-sky hover:text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            aria-describedby={
              errors.email ? 'forgot-email-error' : undefined
            }
            aria-invalid={!!errors.email}
            className={cn(
              'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
              errors.email ? 'border-red-300' : 'border-gray-300'
            )}
            {...register('email')}
          />
          {errors.email && (
            <p
              id="forgot-email-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Sending reset link...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm font-semibold text-sky hover:text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to login
        </Link>
      </p>
    </div>
  )
}
