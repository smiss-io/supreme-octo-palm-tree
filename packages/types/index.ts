// Shared TypeScript types used across the application

export type Tier = 'LAUNCH' | 'GROW' | 'SCALE'

export type GlobalRole = 'PARENT' | 'PROVIDER' | 'STAFF' | 'ADMIN'

export type OrgRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'INSTRUCTOR' | 'VIEWER'

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'COMPLETED'

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED'

export type ActivityFormat =
  | 'IN_PERSON'
  | 'ONLINE'
  | 'BLENDED'
  | 'DROP_IN'
  | 'APPOINTMENT'
  | 'CAMP_SINGLE_DAY'
  | 'CAMP_MULTI_DAY'
  | 'SEMESTER'
  | 'PRIVATE_PARTY'
  | 'FREE_TRIAL'

export type AutomationTrigger =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'CLASS_24H_BEFORE'
  | 'CLASS_1H_BEFORE'
  | 'CAMP_ENDED'
  | 'CONSECUTIVE_ABSENCES'
  | 'WAITLIST_SPOT_OPENED'
  | 'MEMBERSHIP_EXPIRING'
  | 'PAYMENT_FAILED'
  | 'REVIEW_REQUEST'
  | 'ENROLLMENT_THRESHOLD'

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface LedgerEntry {
  id: string
  date: Date
  familyName: string
  activityName: string
  grossAmountCents: number
  stripeFeesCents: number
  platformFeeCents: number
  netAmountCents: number
  reconciled: boolean
}
