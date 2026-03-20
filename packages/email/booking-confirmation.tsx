// React Email template: Booking Confirmation
// Sent after successful booking — includes session details and calendar links

export type BookingConfirmationProps = {
  parentName: string
  childName: string
  activityName: string
  organizationName: string
  sessionDate: string
  sessionTime: string
  locationName: string
  totalAmount: string
  bookingId: string
  calendarUrl: string
  unsubscribeUrl: string
}

export default function BookingConfirmation({
  parentName = 'Parent',
  childName = 'Child',
  activityName = 'Activity',
  organizationName = 'Provider',
  sessionDate = 'January 1, 2026',
  sessionTime = '10:00 AM',
  locationName = 'Main Location',
  totalAmount = '$0.00',
  bookingId = 'ABC123',
  calendarUrl = '#',
  unsubscribeUrl = '#',
}: BookingConfirmationProps) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Booking Confirmed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a2b4a; font-size: 24px; margin: 0;">Booking Confirmed!</h1>
    <p style="color: #666; margin-top: 8px;">Hi ${parentName},</p>
    <p style="color: #666;">${childName} is all set for <strong>${activityName}</strong> with ${organizationName}.</p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #333;"><strong>Date:</strong> ${sessionDate}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #333;"><strong>Time:</strong> ${sessionTime}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #333;"><strong>Location:</strong> ${locationName}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #333;"><strong>Total:</strong> ${totalAmount}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #333;"><strong>Booking ID:</strong> ${bookingId}</p>
    </div>

    <a href="${calendarUrl}" style="display: inline-block; background: #1a2b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Add to Calendar</a>

    <p style="color: #999; font-size: 12px; margin-top: 32px;">
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`
}
