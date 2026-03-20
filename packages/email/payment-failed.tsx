// React Email template: Payment Failed
export default function PaymentFailed({
  parentName = 'Parent',
  amount = '$0.00',
  activityName = 'Activity',
  updatePaymentUrl = '#',
  unsubscribeUrl = '#',
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Payment Failed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a2b4a; font-size: 24px; margin: 0;">Payment Issue</h1>
    <p style="color: #666; margin-top: 8px;">Hi ${parentName},</p>
    <p style="color: #666;">We were unable to process your payment of <strong>${amount}</strong> for <strong>${activityName}</strong>.</p>
    <p style="color: #666;">Please update your payment method to keep your booking active.</p>

    <a href="${updatePaymentUrl}" style="display: inline-block; background: #1a2b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 16px;">Update Payment Method</a>

    <p style="color: #999; font-size: 12px; margin-top: 32px;"><a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
  </div>
</body>
</html>`
}
