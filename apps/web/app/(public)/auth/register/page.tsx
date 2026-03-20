'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Must contain at least one special character'
  )

const baseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
})

const parentSchema = baseSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
)

const providerSchema = baseSchema
  .extend({
    organizationName: z
      .string()
      .min(1, 'Organization name is required')
      .max(100),
    organizationSlug: z
      .string()
      .min(1, 'Organization slug is required')
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase letters, numbers, and hyphens only'
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ParentFormData = z.infer<typeof parentSchema>
type ProviderFormData = z.infer<typeof providerSchema>

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  {
    label: 'One special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

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

type TabType = 'parent' | 'provider'

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('parent')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const parentForm = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const providerForm = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      organizationSlug: '',
    },
  })

  const form = activeTab === 'parent' ? parentForm : providerForm
  const watchedPassword = form.watch('password') ?? ''

  async function onSubmit(data: ParentFormData | ProviderFormData) {
    setIsSubmitting(true)
    setServerError(null)
    try {
      // TODO: Wire up tRPC mutation
      console.log('Register:', { role: activeTab, ...data })
      // Placeholder: POST to /api/auth/register
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch {
      setServerError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOrgNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    providerForm.setValue('organizationName', name, { shouldValidate: true })
    const currentSlug = providerForm.getValues('organizationSlug')
    const expectedSlug = generateSlug(
      providerForm.getValues('organizationName')
    )
    // Only auto-generate if slug hasn't been manually edited
    if (!currentSlug || currentSlug === expectedSlug || currentSlug === generateSlug(name.slice(0, -1))) {
      providerForm.setValue('organizationSlug', generateSlug(name), {
        shouldValidate: true,
      })
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Join KidSpark to discover amazing activities for kids.
      </p>

      {/* Tab Switcher */}
      <div className="mt-6 flex rounded-lg bg-gray-100 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'parent'}
          aria-controls="panel-parent"
          id="tab-parent"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'parent'
              ? 'bg-white text-navy shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          onClick={() => setActiveTab('parent')}
        >
          I&apos;m a Parent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'provider'}
          aria-controls="panel-provider"
          id="tab-provider"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'provider'
              ? 'bg-white text-navy shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          onClick={() => setActiveTab('provider')}
        >
          I&apos;m a Provider
        </button>
      </div>

      {serverError && (
        <div
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {/* Parent Form */}
      <div
        id="panel-parent"
        role="tabpanel"
        aria-labelledby="tab-parent"
        className={activeTab !== 'parent' ? 'hidden' : undefined}
      >
        <form
          onSubmit={parentForm.handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="parent-firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First name
              </label>
              <input
                id="parent-firstName"
                type="text"
                autoComplete="given-name"
                aria-describedby={
                  parentForm.formState.errors.firstName
                    ? 'parent-firstName-error'
                    : undefined
                }
                aria-invalid={!!parentForm.formState.errors.firstName}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  parentForm.formState.errors.firstName
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...parentForm.register('firstName')}
              />
              {parentForm.formState.errors.firstName && (
                <p
                  id="parent-firstName-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {parentForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="parent-lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last name
              </label>
              <input
                id="parent-lastName"
                type="text"
                autoComplete="family-name"
                aria-describedby={
                  parentForm.formState.errors.lastName
                    ? 'parent-lastName-error'
                    : undefined
                }
                aria-invalid={!!parentForm.formState.errors.lastName}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  parentForm.formState.errors.lastName
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...parentForm.register('lastName')}
              />
              {parentForm.formState.errors.lastName && (
                <p
                  id="parent-lastName-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {parentForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="parent-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="parent-email"
              type="email"
              autoComplete="email"
              aria-describedby={
                parentForm.formState.errors.email
                  ? 'parent-email-error'
                  : undefined
              }
              aria-invalid={!!parentForm.formState.errors.email}
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                parentForm.formState.errors.email
                  ? 'border-red-300'
                  : 'border-gray-300'
              )}
              {...parentForm.register('email')}
            />
            {parentForm.formState.errors.email && (
              <p
                id="parent-email-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {parentForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="parent-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="parent-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby="parent-password-requirements"
                aria-invalid={!!parentForm.formState.errors.password}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  parentForm.formState.errors.password
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...parentForm.register('password')}
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
            <div id="parent-password-requirements">
              <PasswordRequirements password={watchedPassword} />
            </div>
          </div>

          <div>
            <label
              htmlFor="parent-confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <div className="relative mt-1">
              <input
                id="parent-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={
                  parentForm.formState.errors.confirmPassword
                    ? 'parent-confirmPassword-error'
                    : undefined
                }
                aria-invalid={!!parentForm.formState.errors.confirmPassword}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  parentForm.formState.errors.confirmPassword
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...parentForm.register('confirmPassword')}
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
            {parentForm.formState.errors.confirmPassword && (
              <p
                id="parent-confirmPassword-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {parentForm.formState.errors.confirmPassword.message}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </div>

      {/* Provider Form */}
      <div
        id="panel-provider"
        role="tabpanel"
        aria-labelledby="tab-provider"
        className={activeTab !== 'provider' ? 'hidden' : undefined}
      >
        <form
          onSubmit={providerForm.handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="provider-firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First name
              </label>
              <input
                id="provider-firstName"
                type="text"
                autoComplete="given-name"
                aria-describedby={
                  providerForm.formState.errors.firstName
                    ? 'provider-firstName-error'
                    : undefined
                }
                aria-invalid={!!providerForm.formState.errors.firstName}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  providerForm.formState.errors.firstName
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...providerForm.register('firstName')}
              />
              {providerForm.formState.errors.firstName && (
                <p
                  id="provider-firstName-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {providerForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="provider-lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last name
              </label>
              <input
                id="provider-lastName"
                type="text"
                autoComplete="family-name"
                aria-describedby={
                  providerForm.formState.errors.lastName
                    ? 'provider-lastName-error'
                    : undefined
                }
                aria-invalid={!!providerForm.formState.errors.lastName}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  providerForm.formState.errors.lastName
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...providerForm.register('lastName')}
              />
              {providerForm.formState.errors.lastName && (
                <p
                  id="provider-lastName-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {providerForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="provider-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="provider-email"
              type="email"
              autoComplete="email"
              aria-describedby={
                providerForm.formState.errors.email
                  ? 'provider-email-error'
                  : undefined
              }
              aria-invalid={!!providerForm.formState.errors.email}
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                providerForm.formState.errors.email
                  ? 'border-red-300'
                  : 'border-gray-300'
              )}
              {...providerForm.register('email')}
            />
            {providerForm.formState.errors.email && (
              <p
                id="provider-email-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {providerForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="provider-organizationName"
              className="block text-sm font-medium text-gray-700"
            >
              Organization name
            </label>
            <input
              id="provider-organizationName"
              type="text"
              autoComplete="organization"
              aria-describedby={
                providerForm.formState.errors.organizationName
                  ? 'provider-organizationName-error'
                  : undefined
              }
              aria-invalid={!!providerForm.formState.errors.organizationName}
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                providerForm.formState.errors.organizationName
                  ? 'border-red-300'
                  : 'border-gray-300'
              )}
              onChange={handleOrgNameChange}
              onBlur={providerForm.register('organizationName').onBlur}
              ref={providerForm.register('organizationName').ref}
              name={providerForm.register('organizationName').name}
            />
            {providerForm.formState.errors.organizationName && (
              <p
                id="provider-organizationName-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {providerForm.formState.errors.organizationName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="provider-organizationSlug"
              className="block text-sm font-medium text-gray-700"
            >
              Organization URL slug
            </label>
            <div className="mt-1 flex rounded-lg border border-gray-300 shadow-sm focus-within:border-sky focus-within:ring-2 focus-within:ring-sky">
              <span className="inline-flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                kidspark.com/
              </span>
              <input
                id="provider-organizationSlug"
                type="text"
                aria-describedby={
                  providerForm.formState.errors.organizationSlug
                    ? 'provider-organizationSlug-error'
                    : undefined
                }
                aria-invalid={!!providerForm.formState.errors.organizationSlug}
                className="block w-full rounded-r-lg border-0 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none"
                {...providerForm.register('organizationSlug')}
              />
            </div>
            {providerForm.formState.errors.organizationSlug && (
              <p
                id="provider-organizationSlug-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {providerForm.formState.errors.organizationSlug.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="provider-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="provider-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby="provider-password-requirements"
                aria-invalid={!!providerForm.formState.errors.password}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  providerForm.formState.errors.password
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...providerForm.register('password')}
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
            <div id="provider-password-requirements">
              <PasswordRequirements password={watchedPassword} />
            </div>
          </div>

          <div>
            <label
              htmlFor="provider-confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <div className="relative mt-1">
              <input
                id="provider-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={
                  providerForm.formState.errors.confirmPassword
                    ? 'provider-confirmPassword-error'
                    : undefined
                }
                aria-invalid={!!providerForm.formState.errors.confirmPassword}
                className={cn(
                  'block w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky',
                  providerForm.formState.errors.confirmPassword
                    ? 'border-red-300'
                    : 'border-gray-300'
                )}
                {...providerForm.register('confirmPassword')}
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
            {providerForm.formState.errors.confirmPassword && (
              <p
                id="provider-confirmPassword-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {providerForm.formState.errors.confirmPassword.message}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creating account...
              </>
            ) : (
              'Create provider account'
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-semibold text-sky hover:text-sky-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
