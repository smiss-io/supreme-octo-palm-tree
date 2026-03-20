import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-coral" />
            <span className="font-display text-3xl font-bold text-navy">
              KidSpark
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Activities &amp; Education for Kids
          </p>
        </div>

        <div className="rounded-xl bg-white px-6 py-8 shadow-lg ring-1 ring-gray-900/5 sm:px-10">
          {children}
        </div>
      </div>
    </div>
  )
}
