import Link from 'next/link'

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Provider Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/provider/dashboard" className="font-display text-xl font-bold text-navy">
              KidSpark
            </Link>
            <div className="hidden gap-6 md:flex">
              <Link href="/provider/dashboard" className="text-sm font-medium text-gray-600 hover:text-navy">
                Dashboard
              </Link>
              <Link href="/provider/activities" className="text-sm font-medium text-gray-600 hover:text-navy">
                Activities
              </Link>
              <Link href="/provider/schedule" className="text-sm font-medium text-gray-600 hover:text-navy">
                Schedule
              </Link>
              <Link href="/provider/payments" className="text-sm font-medium text-gray-600 hover:text-navy">
                Payments
              </Link>
              <Link href="/provider/reports" className="text-sm font-medium text-gray-600 hover:text-navy">
                Reports
              </Link>
              <Link href="/provider/automations" className="text-sm font-medium text-gray-600 hover:text-navy">
                Automations
              </Link>
              <Link href="/provider/settings" className="text-sm font-medium text-gray-600 hover:text-navy">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
