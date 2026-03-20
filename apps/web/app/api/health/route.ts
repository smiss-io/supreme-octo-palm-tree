import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, string> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
    node: process.version,
  }

  // Check database connectivity
  try {
    const { db } = await import('../../../lib/db')
    await db.$queryRaw`SELECT 1`
    checks.database = 'connected'
  } catch {
    checks.database = 'disconnected'
    return NextResponse.json(checks, { status: 503 })
  }

  return NextResponse.json(checks, { status: 200 })
}
