// React Email template: Waitlist Spot Available (24-hour claim window)
export type WaitlistSpotAvailableProps = {
  parentName: string
  childName: string
  activityName: string
  sessionDate: string
  bookNowUrl: string
  expiresIn: string
  unsubscribeUrl: string
}

export default function WaitlistSpotAvailable({
  parentName = 'Parent',
  childName = 'Child',
  activityName = 'Activity',
  sessionDate = 'January 1, 2026',
  bookNowUrl = '#',
  expiresIn = '24 hours',
  unsubscribeUrl = '#',
}: WaitlistSpotAvailableProps) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Spot Available</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a2b4a; font-size: 24px; margin: 0;">A Spot Opened Up!</h1>
    <p style="color: #666; margin-top: 8px;">Hi ${parentName},</p>
    <p style="color: #666;">Great news! A spot has opened up in <strong>${activityName}</strong> on ${sessionDate} for ${childName}.</p>

    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">This spot expires in ${expiresIn}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #92400e;">Book now to secure your place.</p>
    </div>

    <a href="${bookNowUrl}" style="display: inline-block; background: #1a2b4a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Book Now</a>

    <p style="color: #999; font-size: 12px; margin-top: 32px;"><a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
  </div>
</body>
</html>`
}
