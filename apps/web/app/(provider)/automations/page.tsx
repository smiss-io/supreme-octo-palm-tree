'use client'

import { useState } from 'react'

type Automation = {
  id: string
  name: string
  trigger: string
  isEnabled: boolean
  actions: { actionType: string; order: number }[]
  lastRun: { triggeredAt: string; status: string } | null
}

const TRIGGER_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: 'Booking Confirmed',
  BOOKING_CANCELLED: 'Booking Cancelled',
  CLASS_24H_BEFORE: 'Class Starting (24h)',
  CLASS_1H_BEFORE: 'Class Starting (1h)',
  CAMP_ENDED: 'Camp/Semester Ended',
  CONSECUTIVE_ABSENCES: 'Consecutive Absences',
  WAITLIST_SPOT_OPENED: 'Waitlist Spot Opened',
  MEMBERSHIP_EXPIRING: 'Membership Expiring',
  PAYMENT_FAILED: 'Payment Failed',
  REVIEW_REQUEST: 'Review Request',
  ENROLLMENT_THRESHOLD: 'Enrollment Threshold',
}

const ACTION_LABELS: Record<string, string> = {
  SEND_EMAIL: 'Send Email',
  SEND_SMS: 'Send SMS',
  NOTIFY_STAFF: 'Notify Staff',
  ISSUE_STORE_CREDIT: 'Issue Store Credit',
  WEBHOOK: 'Webhook',
  ADD_TO_WAITLIST: 'Add to Waitlist',
  CREATE_TASK: 'Create Task',
}

const TEMPLATES = [
  { name: 'Welcome & Confirmation', trigger: 'BOOKING_CONFIRMED', action: 'SEND_EMAIL' },
  { name: 'Class Reminder (24h)', trigger: 'CLASS_24H_BEFORE', action: 'SEND_EMAIL' },
  { name: 'Missed Class Follow-up', trigger: 'CONSECUTIVE_ABSENCES', action: 'SEND_EMAIL' },
  { name: 'Waitlist Notification', trigger: 'WAITLIST_SPOT_OPENED', action: 'SEND_EMAIL' },
  { name: 'Payment Failed Alert', trigger: 'PAYMENT_FAILED', action: 'SEND_EMAIL' },
  { name: 'Review Request (Post-Camp)', trigger: 'CAMP_ENDED', action: 'SEND_EMAIL' },
]

export default function AutomationsPage() {
  const [showCreate, setShowCreate] = useState(false)

  // Automations loaded via tRPC automationRouter.list — placeholder
  const automations: Automation[] = []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Automations</h1>
          <p className="mt-1 text-gray-600">
            Set up automated workflows for your business. No Zapier needed.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          Create Automation
        </button>
      </div>

      {/* Template Gallery */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">Quick Start Templates</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <p className="font-medium text-navy">{t.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                When: {TRIGGER_LABELS[t.trigger]} &rarr; {ACTION_LABELS[t.action]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Automation List */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-900">Your Automations</h2>

        {automations.length === 0 ? (
          <div className="mt-4 rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-400">No automations created yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Use a template above or create a custom automation.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {automations.map((a) => (
              <div key={a.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-navy">{a.name}</h3>
                    <p className="text-xs text-gray-500">
                      When: {TRIGGER_LABELS[a.trigger] ?? a.trigger}
                      {' → '}
                      {a.actions.map((act) => ACTION_LABELS[act.actionType] ?? act.actionType).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.lastRun && (
                      <span className={`text-xs ${
                        a.lastRun.status === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Last: {new Date(a.lastRun.triggeredAt).toLocaleDateString()}
                      </span>
                    )}
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={a.isEnabled}
                        onChange={() => {}}
                        aria-label={`Toggle ${a.name}`}
                      />
                      <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-green-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Drawer */}
      {showCreate && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy">Create Automation</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="auto-name" className="block text-sm font-medium text-gray-700">Name</label>
                <input id="auto-name" type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="My Automation" />
              </div>

              <div>
                <label htmlFor="auto-trigger" className="block text-sm font-medium text-gray-700">When this happens...</label>
                <select id="auto-trigger" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="auto-action" className="block text-sm font-medium text-gray-700">Then do this...</label>
                <select id="auto-action" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="auto-delay" className="block text-sm font-medium text-gray-700">Delay (optional)</label>
                <div className="mt-1 flex gap-2">
                  <input id="auto-delay" type="number" min={0} className="block w-20 rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="0" />
                  <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" aria-label="Delay unit">
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                  </select>
                </div>
              </div>

              <button className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600">
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
