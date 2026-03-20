import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { randomUUID } from 'crypto'

// QR code check-in endpoint
// Parent scans QR → this page shows child name + photo consent badge
// Staff verifies on their device
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token

  // Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  // Look up booking by QR token
  const booking = await db.booking.findFirst({
    where: {
      qrToken: token,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      child: {
        select: { id: true, firstName: true, lastName: true, photoConsent: true },
      },
      session: {
        select: {
          id: true,
          startDate: true,
          durationMin: true,
          activity: { select: { name: true } },
        },
      },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 404 })
  }

  // Check expiry: 24h after session ends
  const sessionEnd = new Date(
    booking.session.startDate.getTime() + booking.session.durationMin * 60 * 1000
  )
  const expiresAt = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000)

  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'QR code has expired' }, { status: 410 })
  }

  // Return check-in info (no sensitive PII — just first name + consent status)
  return NextResponse.json({
    childFirstName: booking.child.firstName,
    childId: booking.child.id,
    photoConsent: booking.child.photoConsent,
    activityName: booking.session.activity.name,
    sessionId: booking.session.id,
    sessionDate: booking.session.startDate.toISOString(),
  })
}

// POST: Staff confirms the check-in
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  const booking = await db.booking.findFirst({
    where: {
      qrToken: token,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      session: {
        select: { id: true, startDate: true, durationMin: true },
      },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 })
  }

  // Check expiry
  const sessionEnd = new Date(
    booking.session.startDate.getTime() + booking.session.durationMin * 60 * 1000
  )
  const expiresAt = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'QR code has expired' }, { status: 410 })
  }

  // Create attendance record
  await db.attendanceRecord.upsert({
    where: {
      sessionId_childId: {
        sessionId: booking.activitySessionId,
        childId: booking.childId,
      },
    },
    create: {
      sessionId: booking.activitySessionId,
      childId: booking.childId,
      status: 'PRESENT',
      checkedInAt: new Date(),
    },
    update: {
      status: 'PRESENT',
      checkedInAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, checkedInAt: new Date().toISOString() })
}
