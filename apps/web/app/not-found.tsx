import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold text-navy">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-navy">
          Page not found
        </h2>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md bg-navy px-6 py-3 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
