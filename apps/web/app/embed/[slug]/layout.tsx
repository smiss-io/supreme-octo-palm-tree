import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Activities - KidSpark',
  robots: 'noindex',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minimal layout for embeddable widget — no app chrome
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
