'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (!lockoutUntil) return

    function tick() {
      const remaining = Math.max(
        0,
        Math.ceil((lockoutUntil!.getTime() - Date.now()) / 1000)
      )
      setLockoutSeconds(remaining)
      if (remaining <= 0) {
        setLockoutUntil(null)
        setServerError(null)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  async function onSubmit(data: LoginFormData) {
    if (lockoutUntil) return

    setIsSubmitting(true)
    setServerError(null)
    try {
      // TODO: Wire up tRPC mutation
      console.log('Login:', data)
      // Placeholder: POST to /api/auth/login
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Placeholder: simulate lockout for demo purposes
      // In production, the API response would indicate lockout
      // setLockoutUntil(new Date(Date.now() + 5 * 60 * 1000))
    } catch {
      setServerError('Invalid email or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLockedOut = lockoutUntil !== null && lockoutSeconds > 0

  function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Sign in to your KidSpark account.
      </p>

      {serverError && !isLockedOut && (
        <div
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {isLockedOut && (
        <div
          className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700"
          role="alert"
        >
          <p className="font-medium">Account temporarily locked</p>
          <p className="mt-1">
            Too many failed attempts. Try again in{' '}
            <span className="font-mono font-semibold">
              {formatCountdown(lockoutSeconds)}
            </span>
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            aria-invalid={!!errors.email}
            className={cn(
              'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
              errors.email ? 'border-red-300' : 'border-gray-300'
            )}
            {...register('email')}
          />
          {errors.email && (
            <p
              id="login-email-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-sky hover:text-sky-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
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
          {errors.password && (
            <p
              id="login-password-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLockedOut}
          className="flex w-full items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-semibold text-sky hover:text-sky-700"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
