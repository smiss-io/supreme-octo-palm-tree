import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Global rate limit: 100 requests per minute per IP
const globalRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'rl:global',
})

// Auth endpoints get stricter limits: 5 attempts per 15 minutes
const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(5, '15 m'),
  analytics: true,
  prefix: 'rl:auth',
})

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function middleware(request: NextRequest) {
  const ip = getClientIp(request)
  const pathname = request.nextUrl.pathname

  // Use stricter rate limiting for auth endpoints
  const isAuthRoute = pathname.startsWith('/api/auth')
  const limiter = isAuthRoute ? authRatelimit : globalRatelimit

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(reset))
    return response
  } catch {
    // If rate limiting fails (Redis down), allow the request through
    // but log the error for monitoring
    console.error('Rate limiting service unavailable')
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/api/:path*'],
}
