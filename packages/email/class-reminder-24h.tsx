// React Email template: Class Reminder (24 hours before)
export type ClassReminder24hProps = {
  parentName: string
  childName: string
  activityName: string
  sessionDate: string
  sessionTime: string
  locationName: string
  locationAddress?: string
  zoomLink?: string
  unsubscribeUrl: string
}

export default function ClassReminder24h({
  parentName = 'Parent',
  childName = 'Child',
  activityName = 'Activity',
  sessionDate = 'Tomorrow',
  sessionTime = '10:00 AM',
  locationName = 'Main Location',
  locationAddress,
  zoomLink,
  unsubscribeUrl = '#',
}: ClassReminder24hProps) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Class Tomorrow</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a2b4a; font-size: 24px; margin: 0;">Class Tomorrow!</h1>
    <p style="color: #666; margin-top: 8px;">Hi ${parentName},</p>
    <p style="color: #666;">Just a reminder that ${childName} has <strong>${activityName}</strong> tomorrow.</p>

    <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #0ea5e9;">
      <p style="margin: 0; font-size: 14px; color: #333;"><strong>${sessionDate}</strong> at <strong>${sessionTime}</strong></p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #333;">${locationName}</p>
      ${locationAddress ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">${locationAddress}</p>` : ''}
      ${zoomLink ? `<p style="margin: 8px 0 0;"><a href="${zoomLink}" style="color: #0ea5e9;">Join Online</a></p>` : ''}
    </div>

    <p style="color: #666; font-size: 14px;">See you there!</p>
    <p style="color: #999; font-size: 12px; margin-top: 32px;"><a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
  </div>
</body>
</html>`
}
