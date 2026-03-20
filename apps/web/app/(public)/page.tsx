import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-navy sm:text-6xl">
          Find the perfect activity
          <br />
          <span className="text-sky">for your child</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Discover classes, camps, and activities from top-rated providers in
          your area. Book with confidence.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/explore"
            className="rounded-md bg-navy px-8 py-3 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
          >
            Explore Activities
          </Link>
          <Link
            href="/auth/register?role=provider"
            className="rounded-md border border-navy px-8 py-3 text-sm font-medium text-navy hover:bg-navy-50 transition-colors"
          >
            List Your Business
          </Link>
        </div>
      </section>
    </main>
  )
}
