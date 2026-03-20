'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FORMATS = [
  { value: 'IN_PERSON', label: 'In Person', description: 'Classes held at a physical location' },
  { value: 'ONLINE', label: 'Online', description: 'Virtual classes via video call' },
  { value: 'BLENDED', label: 'Blended', description: 'Mix of in-person and online' },
  { value: 'DROP_IN', label: 'Drop-In', description: 'No registration required, pay per visit' },
  { value: 'APPOINTMENT', label: 'Appointment', description: 'One-on-one scheduled sessions' },
  { value: 'CAMP_SINGLE_DAY', label: 'Camp (1 Day)', description: 'Single-day camp or workshop' },
  { value: 'CAMP_MULTI_DAY', label: 'Camp (Multi-Day)', description: 'Multi-day camp program' },
  { value: 'SEMESTER', label: 'Semester', description: 'Ongoing semester-based program' },
  { value: 'PRIVATE_PARTY', label: 'Private Party', description: 'Private event booking' },
  { value: 'FREE_TRIAL', label: 'Free Trial', description: 'Complimentary introductory session' },
]

const CATEGORIES = ['STEM', 'Art', 'Dance', 'Sports', 'Music', 'Academic', 'Cooking', 'Language', 'Other']

type FormData = {
  name: string
  description: string
  format: string
  category: string
  locationId: string
  minAgeYears: string
  minAgeMonths: string
  maxAgeYears: string
  maxAgeMonths: string
  capacity: string
  tags: string
}

export default function NewActivityPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    format: '',
    category: '',
    locationId: '',
    minAgeYears: '',
    minAgeMonths: '0',
    maxAgeYears: '',
    maxAgeMonths: '0',
    capacity: '',
    tags: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateStep1 = () => {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = 'Activity name is required'
    if (!form.format) errs.format = 'Please select a format'
    if (!form.category) errs.category = 'Please select a category'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: typeof errors = {}
    const minTotal = (parseInt(form.minAgeYears || '0') * 12) + parseInt(form.minAgeMonths || '0')
    const maxTotal = (parseInt(form.maxAgeYears || '0') * 12) + parseInt(form.maxAgeMonths || '0')
    if (form.minAgeYears && form.maxAgeYears && minTotal > maxTotal) {
      errs.maxAgeYears = 'Max age must be greater than min age'
    }
    if (form.capacity && (parseInt(form.capacity) < 1 || parseInt(form.capacity) > 10000)) {
      errs.capacity = 'Capacity must be between 1 and 10,000'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2)
    if (step === 2 && validateStep2()) setStep(3)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = () => {
    // Build the payload — in real usage this calls tRPC mutation
    const minAge = form.minAgeYears
      ? (parseInt(form.minAgeYears) * 12) + parseInt(form.minAgeMonths || '0')
      : undefined
    const maxAge = form.maxAgeYears
      ? (parseInt(form.maxAgeYears) * 12) + parseInt(form.maxAgeMonths || '0')
      : undefined

    const _payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      format: form.format,
      category: form.category,
      locationId: form.locationId || undefined,
      minAge,
      maxAge,
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    }

    // tRPC call would go here: api.activity.create.mutate(payload)
    // For now, redirect back to activities list
    router.push('/provider/activities')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-navy">Create Activity</h1>

      {/* Progress Steps */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s <= step
                  ? 'bg-navy text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            <span className="text-sm text-gray-600">
              {s === 1 ? 'Basics' : s === 2 ? 'Details' : 'Review'}
            </span>
            {s < 3 && <div className="mx-2 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Activity Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="e.g., Junior Robotics Workshop"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="Describe your activity..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Format <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateField('format', f.value)}
                  className={`rounded-lg border p-3 text-left transition ${
                    form.format === f.value
                      ? 'border-navy bg-navy/5 ring-1 ring-navy'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{f.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{f.description}</span>
                </button>
              ))}
            </div>
            {errors.format && <p className="mt-1 text-xs text-red-600">{errors.format}</p>}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Age Range</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={form.minAgeYears}
                  onChange={(e) => updateField('minAgeYears', e.target.value)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  placeholder="Min"
                />
                <span className="text-xs text-gray-500">yrs</span>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={form.minAgeMonths}
                  onChange={(e) => updateField('minAgeMonths', e.target.value)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">mos</span>
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={form.maxAgeYears}
                  onChange={(e) => updateField('maxAgeYears', e.target.value)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  placeholder="Max"
                />
                <span className="text-xs text-gray-500">yrs</span>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={form.maxAgeMonths}
                  onChange={(e) => updateField('maxAgeMonths', e.target.value)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">mos</span>
              </div>
            </div>
            {errors.maxAgeYears && <p className="mt-1 text-xs text-red-600">{errors.maxAgeYears}</p>}
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
              Capacity
            </label>
            <input
              id="capacity"
              type="number"
              min={1}
              max={10000}
              value={form.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
              className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="e.g., 20"
            />
            {errors.capacity && <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>}
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="beginner, outdoor, ages 5-8 (comma separated)"
            />
            <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-navy">Review Your Activity</h2>
          <div className="rounded-lg border bg-gray-50 p-5 space-y-3">
            <div>
              <span className="text-xs font-medium uppercase text-gray-500">Name</span>
              <p className="text-sm text-gray-900">{form.name}</p>
            </div>
            {form.description && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Description</span>
                <p className="text-sm text-gray-900">{form.description}</p>
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Format</span>
                <p className="text-sm text-gray-900">
                  {FORMATS.find((f) => f.value === form.format)?.label ?? form.format}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Category</span>
                <p className="text-sm text-gray-900">{form.category}</p>
              </div>
            </div>
            {(form.minAgeYears || form.maxAgeYears) && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Age Range</span>
                <p className="text-sm text-gray-900">
                  {form.minAgeYears ? `${form.minAgeYears}y ${form.minAgeMonths}m` : 'Any'} –{' '}
                  {form.maxAgeYears ? `${form.maxAgeYears}y ${form.maxAgeMonths}m` : 'Any'}
                </p>
              </div>
            )}
            {form.capacity && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Capacity</span>
                <p className="text-sm text-gray-900">{form.capacity} students</p>
              </div>
            )}
            {form.tags && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">Tags</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Your activity will be created as a draft. Add sessions and pricing, then publish when ready.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t pt-6">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <button
            onClick={() => router.push('/provider/activities')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={handleNext}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Create Activity
          </button>
        )}
      </div>
    </div>
  )
}
