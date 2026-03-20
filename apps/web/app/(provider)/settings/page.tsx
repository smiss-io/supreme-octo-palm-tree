'use client'

import { useState } from 'react'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-navy">Settings</h1>
      <p className="mt-2 text-gray-600">
        Manage your organization, staff, and integrations.
      </p>

      <div className="mt-8 space-y-8">
        <OrganizationSection />
        <StaffSection />
        <LocationsSection />
        <StripeSection />
        <DangerZone />
      </div>
    </div>
  )
}

function OrganizationSection() {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">Organization Profile</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            id="settings-name"
            type="text"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
        <div>
          <label htmlFor="settings-timezone" className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="settings-timezone"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/New_York">Eastern Time</option>
          </select>
        </div>
        <div>
          <label htmlFor="settings-sibling" className="block text-sm font-medium text-gray-700">
            Sibling Discount (%)
          </label>
          <input
            id="settings-sibling"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
        <button className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
          Save Changes
        </button>
      </div>
    </section>
  )
}

function StaffSection() {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('INSTRUCTOR')

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">Staff Management</h2>

      {/* Invite Form */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
            Invite by Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="staff@example.com"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <button className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
          Send Invite
        </button>
      </div>

      {/* Staff Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Last Login</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 text-gray-400" colSpan={4}>
                No staff members yet. Invite your first team member above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LocationsSection() {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Locations</h2>
        <button className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
          Add Location
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-400">
          No locations added yet. Add your first location to start scheduling activities.
        </p>
      </div>
    </section>
  )
}

function StripeSection() {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">Payment Processing</h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-900">Stripe Connect</p>
          <p className="text-sm text-gray-500">Not connected</p>
        </div>
        <button className="ml-auto rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
          Connect Stripe
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="payout-schedule" className="block text-sm font-medium text-gray-700">
          Payout Schedule
        </label>
        <select
          id="payout-schedule"
          className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </section>
  )
}

function DangerZone() {
  const [confirmName, setConfirmName] = useState('')

  return (
    <section className="rounded-lg border-2 border-red-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
      <p className="mt-2 text-sm text-gray-600">
        Once you delete your organization, all data will be permanently removed.
        This action cannot be undone.
      </p>
      <div className="mt-4 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-700">
            Type your organization name to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="Organization name"
          />
        </div>
        <button
          disabled={!confirmName}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Organization
        </button>
      </div>
    </section>
  )
}
