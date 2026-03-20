import Link from 'next/link'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Parent Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/explore" className="font-display text-xl font-bold text-navy">
              KidSpark
            </Link>
            <div className="hidden gap-6 md:flex">
              <Link href="/parent/dashboard" className="text-sm font-medium text-gray-600 hover:text-navy">
                Dashboard
              </Link>
              <Link href="/parent/bookings" className="text-sm font-medium text-gray-600 hover:text-navy">
                Bookings
              </Link>
              <Link href="/parent/children" className="text-sm font-medium text-gray-600 hover:text-navy">
                Children
              </Link>
              <Link href="/parent/schedule" className="text-sm font-medium text-gray-600 hover:text-navy">
                Schedule
              </Link>
              <Link href="/explore" className="text-sm font-medium text-gray-600 hover:text-navy">
                Explore
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
