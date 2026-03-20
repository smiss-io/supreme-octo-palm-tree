import type { Tier } from '@prisma/client'

// Every feature check goes through this — never hard-code tier names in components

export const FEATURE_GATES = {
  // LAUNCH ($129/mo)
  basicScheduling: ['LAUNCH', 'GROW', 'SCALE'],
  classPacks: ['LAUNCH', 'GROW', 'SCALE'],
  giftCards: ['LAUNCH', 'GROW', 'SCALE'],
  siblingDiscounts: ['LAUNCH', 'GROW', 'SCALE'],
  couponCodes: ['LAUNCH', 'GROW', 'SCALE'],
  basicEmailing: ['LAUNCH', 'GROW', 'SCALE'],
  creditCardProcessing: ['LAUNCH', 'GROW', 'SCALE'],

  // GROW ($199/mo)
  paymentPlans: ['GROW', 'SCALE'],
  campDeposits: ['GROW', 'SCALE'],
  customFormFields: ['GROW', 'SCALE'],
  memberships: ['GROW', 'SCALE'],
  waitlists: ['GROW', 'SCALE'],
  staffRoles: ['GROW', 'SCALE'],
  insightDashboards: ['GROW', 'SCALE'],
  appointmentBooking: ['GROW', 'SCALE'],
  progressTracking: ['GROW', 'SCALE'],
  nativeAutomations: ['GROW', 'SCALE'],
  webhookIntegrations: ['GROW', 'SCALE'],
  multiDaySemesters: ['GROW', 'SCALE'],

  // SCALE ($399/mo)
  storeCredit: ['SCALE'],
  customPaymentMethods: ['SCALE'],
  contactImport: ['SCALE'],
  dedicatedAccountManager: ['SCALE'],
  advancedAnalytics: ['SCALE'],
  aiForecasting: ['SCALE'],
  multiLocationManagement: ['SCALE'],
} as const

export type Feature = keyof typeof FEATURE_GATES

export function hasFeature(tier: Tier, feature: Feature): boolean {
  const allowedTiers = FEATURE_GATES[feature]
  return (allowedTiers as readonly string[]).includes(tier)
}

export function requireFeature(tier: Tier, feature: Feature): void {
  if (!hasFeature(tier, feature)) {
    const allowedTiers = FEATURE_GATES[feature]
    const lowestTier = allowedTiers[0]
    throw new Error(
      `This feature requires the ${lowestTier} plan or higher. Please upgrade to access ${feature}.`
    )
  }
}

export function getAvailableFeatures(tier: Tier): Feature[] {
  return (Object.keys(FEATURE_GATES) as Feature[]).filter((feature) =>
    hasFeature(tier, feature)
  )
}
