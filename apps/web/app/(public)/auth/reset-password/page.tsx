'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, Check, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  {
    label: 'One special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
]

function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1" role="list" aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = password ? req.test(password) : false
        return (
          <li
            key={req.label}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              met ? 'text-green-600' : 'text-gray-400'
            )}
          >
            {met ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3" aria-hidden="true" />
            )}
            {req.label}
          </li>
        )
      })}
    </ul>
  )
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const watchedPassword = watch('password') ?? ''

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) return

    setIsSubmitting(true)
    setServerError(null)
    try {
      // TODO: Wire up tRPC mutation
      console.log('Reset password:', { token, ...data })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsSuccess(true)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch {
      setServerError(
        'Unable to reset your password. The link may have expired. Please request a new one.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-navy">
          Invalid reset link
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          This password reset link is missing or invalid. Please request a new
          one.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          Request new reset link
        </Link>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2
            className="h-6 w-6 text-green-600"
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">
          Password reset successful
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Your password has been updated. Redirecting you to login...
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          Go to login now
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy">
        Set a new password
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Choose a strong password for your account.
      </p>

      {serverError && (
        <div
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="reset-password"
            className="block text-sm font-medium text-gray-700"
          >
            New password
          </label>
          <div className="relative mt-1">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby="reset-password-requirements"
              aria-invalid={!!errors.password}
              className={cn(
                'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                errors.password ? 'border-red-300' : 'border-gray-300'
              )}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <div id="reset-password-requirements">
            <PasswordRequirements password={watchedPassword} />
          </div>
        </div>

        <div>
          <label
            htmlFor="reset-confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm new password
          </label>
          <div className="relative mt-1">
            <input
              id="reset-confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword
                  ? 'reset-confirmPassword-error'
                  : undefined
              }
              aria-invalid={!!errors.confirmPassword}
              className={cn(
                'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              )}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p
              id="reset-confirmPassword-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
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
              Resetting password...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </div>
  )
}
