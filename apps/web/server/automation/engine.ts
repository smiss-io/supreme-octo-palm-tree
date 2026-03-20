// Native Workflow Automation Engine
// If/Then automation system — no Zapier dependency
// Runs as BullMQ worker jobs

export const AUTOMATION_TEMPLATES = [
  {
    trigger: 'CONSECUTIVE_ABSENCES' as const,
    name: 'Check-In After Missed Classes',
    description: 'Send parent an email if child misses 2+ consecutive classes',
    defaultConfig: { consecutiveMissed: 2 },
    defaultAction: { type: 'SEND_EMAIL' as const, templateKey: 'parent_checkin' },
  },
  {
    trigger: 'CAMP_ENDED' as const,
    name: 'Post-Camp Review Request',
    description: 'Request a review 2 days after camp ends',
    defaultConfig: { delayDays: 2 },
    defaultAction: { type: 'SEND_EMAIL' as const, templateKey: 'review_request' },
  },
  {
    trigger: 'ENROLLMENT_THRESHOLD' as const,
    name: 'Low Enrollment Alert',
    description: 'Alert staff when class enrollment is trending low',
    defaultConfig: { thresholdPercent: 40 },
    defaultAction: {
      type: 'NOTIFY_STAFF' as const,
      message: 'Class enrollment is trending low',
    },
  },
  {
    trigger: 'PAYMENT_FAILED' as const,
    name: 'Payment Retry Notification',
    description: 'Email parent when payment fails',
    defaultConfig: {},
    defaultAction: { type: 'SEND_EMAIL' as const, templateKey: 'payment_failed' },
  },
  {
    trigger: 'MEMBERSHIP_EXPIRING' as const,
    name: 'Membership Renewal Reminder',
    description: 'Remind parent 7 days before membership expires',
    defaultConfig: { daysBeforeExpiry: 7 },
    defaultAction: {
      type: 'SEND_EMAIL' as const,
      templateKey: 'membership_expiring',
    },
  },
  {
    trigger: 'WAITLIST_SPOT_OPENED' as const,
    name: 'Waitlist Spot Available',
    description: 'Notify next parent in line when a spot opens up',
    defaultConfig: { claimWindowHours: 24 },
    defaultAction: {
      type: 'SEND_EMAIL' as const,
      templateKey: 'waitlist_spot_available',
    },
  },
  {
    trigger: 'BOOKING_CONFIRMED' as const,
    name: 'Booking Confirmation',
    description: 'Send confirmation email when booking is confirmed',
    defaultConfig: {},
    defaultAction: {
      type: 'SEND_EMAIL' as const,
      templateKey: 'booking_confirmation',
    },
  },
  {
    trigger: 'CLASS_24H_BEFORE' as const,
    name: 'Class Reminder (24 Hours)',
    description: 'Remind parents 24 hours before class',
    defaultConfig: {},
    defaultAction: {
      type: 'SEND_EMAIL' as const,
      templateKey: 'class_reminder_24h',
    },
  },
] as const
