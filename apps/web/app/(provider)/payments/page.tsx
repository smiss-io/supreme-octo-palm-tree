'use client'

import { useState } from 'react'

type Tab = 'dashboard' | 'transactions' | 'ledger' | 'gift-cards' | 'store-credits' | 'payouts'

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'gift-cards', label: 'Gift Cards' },
    { key: 'store-credits', label: 'Store Credits' },
    { key: 'payouts', label: 'Payouts' },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-navy">Payments</h1>
      <p className="mt-1 text-gray-600">Manage transactions, reconcile payouts, and issue credits.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-navy text-navy'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'gift-cards' && <GiftCardsTab />}
        {activeTab === 'store-credits' && <StoreCreditsTab />}
        {activeTab === 'payouts' && <PayoutsTab />}
      </div>
    </div>
  )
}

function DashboardTab() {
  const kpis = [
    { label: "Today's Revenue", value: '$0.00', trend: '+0%' },
    { label: 'This Week', value: '$0.00', trend: '+0%' },
    { label: 'This Month', value: '$0.00', trend: '+0%' },
    { label: 'Outstanding', value: '$0.00', trend: '' },
  ]

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy">{kpi.value}</p>
            {kpi.trend && <p className="mt-0.5 text-xs text-green-600">{kpi.trend}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900">Revenue Trend</h3>
        <div className="mt-4 flex h-48 items-center justify-center text-gray-400">
          Recharts bar chart renders here
        </div>
      </div>
    </div>
  )
}

function TransactionsTab() {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex gap-2">
          <select className="rounded-md border border-gray-300 px-2 py-1 text-sm" aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select className="rounded-md border border-gray-300 px-2 py-1 text-sm" aria-label="Filter by method">
            <option value="">All Methods</option>
            <option value="CARD">Card</option>
            <option value="ACH">ACH</option>
            <option value="CASH">Cash</option>
            <option value="CHECK">Check</option>
          </select>
        </div>
        <button className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Family</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Activity</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
              No transactions yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function LedgerTab() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-navy">Accounting Ledger</h3>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            0 unreconciled
          </span>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export CSV
          </button>
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export PDF
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Gross</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Stripe Fee</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Platform Fee</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Net</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Reconciled</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No ledger entries yet. Entries are created automatically when payments are processed.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GiftCardsTab() {
  const [showIssue, setShowIssue] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-navy">Gift Cards</h3>
        <button
          onClick={() => setShowIssue(!showIssue)}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          Issue Gift Card
        </button>
      </div>

      {showIssue && (
        <div className="mt-4 rounded-lg border bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900">Issue New Gift Card</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="gc-amount" className="block text-sm text-gray-600">Amount ($)</label>
              <input id="gc-amount" type="number" min={1} step={0.01} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="gc-expiry" className="block text-sm text-gray-600">Expiry Date (optional)</label>
              <input id="gc-expiry" type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white">Generate</button>
            <button onClick={() => setShowIssue(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700">Cancel</button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            The gift card code will be shown once and cannot be retrieved later. Copy it immediately.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-lg border bg-white p-4 text-center text-gray-400">
        No gift cards issued yet
      </div>
    </div>
  )
}

function StoreCreditsTab() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-navy">Store Credits</h3>
        <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
          SCALE tier only
        </span>
      </div>
      <div className="mt-4 rounded-lg border bg-white p-4 text-center text-gray-400">
        Issue store credits to families for returns, adjustments, or promotions
      </div>
    </div>
  )
}

function PayoutsTab() {
  return (
    <div>
      <h3 className="text-lg font-medium text-navy">Payout Settings</h3>
      <div className="mt-4 rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Payout Schedule</p>
            <p className="text-sm text-gray-500">How often you receive payouts from Stripe</p>
          </div>
          <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" aria-label="Payout frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
    </div>
  )
}
