'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewChildPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    medicalNotes: '',
    allergies: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    photoConsent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required'
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required'
    const dob = new Date(form.dateOfBirth)
    if (dob > new Date()) errs.dateOfBirth = 'Date of birth cannot be in the future'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    // Check if child is under 13 for COPPA notice
    const dob = new Date(form.dateOfBirth)
    const ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    const _isUnder13 = ageYears < 13

    // tRPC call: childRouter.create would go here
    router.push('/parent/children')
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold text-navy">Add a Child</h1>
      <p className="mt-1 text-gray-600">
        Your child&apos;s information is encrypted and protected per COPPA requirements.
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="first-name"
              type="text"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="last-name"
              type="text"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            id="dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>}
        </div>

        {/* COPPA Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Privacy Notice:</strong> Your child&apos;s personal information (name, date of birth,
            medical notes, allergies, and emergency contacts) is encrypted with AES-256-GCM encryption
            at rest. We collect only what&apos;s operationally necessary per COPPA requirements.
          </p>
        </div>

        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
            Allergies
          </label>
          <input
            id="allergies"
            type="text"
            value={form.allergies}
            onChange={(e) => updateField('allergies', e.target.value)}
            placeholder="e.g., Peanuts, Latex"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>

        <div>
          <label htmlFor="medical" className="block text-sm font-medium text-gray-700">
            Medical Notes
          </label>
          <textarea
            id="medical"
            rows={3}
            value={form.medicalNotes}
            onChange={(e) => updateField('medicalNotes', e.target.value)}
            placeholder="Any conditions instructors should know about"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Emergency Contact</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={form.emergencyName}
              onChange={(e) => updateField('emergencyName', e.target.value)}
              placeholder="Contact name"
              aria-label="Emergency contact name"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <input
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => updateField('emergencyPhone', e.target.value)}
              placeholder="Phone number"
              aria-label="Emergency contact phone"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <input
              type="text"
              value={form.emergencyRelationship}
              onChange={(e) => updateField('emergencyRelationship', e.target.value)}
              placeholder="Relationship"
              aria-label="Emergency contact relationship"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </fieldset>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.photoConsent}
            onChange={(e) => updateField('photoConsent', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            I consent to my child&apos;s photo being taken during activities
          </span>
        </label>
      </div>

      <div className="mt-8 flex items-center justify-between border-t pt-6">
        <button
          onClick={() => router.push('/parent/children')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          Add Child
        </button>
      </div>
    </div>
  )
}
