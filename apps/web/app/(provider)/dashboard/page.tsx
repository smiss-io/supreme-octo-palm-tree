export default function ProviderDashboard() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-navy">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back! Here&apos;s an overview of your business.
      </p>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Revenue This Month" value="$0.00" />
        <KpiCard title="Active Students" value="0" />
        <KpiCard title="Upcoming Sessions" value="0" />
        <KpiCard title="Capacity Utilization" value="0%" />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-navy">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/provider/activities/new"
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Create Activity
          </a>
          <a
            href="/provider/schedule"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Schedule
          </a>
          <a
            href="/provider/settings"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Settings
          </a>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
    </div>
  )
}
