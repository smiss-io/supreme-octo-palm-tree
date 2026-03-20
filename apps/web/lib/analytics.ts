// PostHog analytics integration
// Privacy-safe: no PII (names, emails, phone) ever sent to PostHog
// Only tracks anonymous behavioral events with org-level identifiers

import posthog from 'posthog-js'

let initialized = false

/**
 * Initialize PostHog — call once in app layout
 * Only loads in browser with valid API key
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return
  if (initialized) return

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    // Privacy: disable session recording to avoid capturing PII on screen
    disable_session_recording: true,
    // Privacy: mask all text inputs by default
    mask_all_text: true,
    // Privacy: don't capture IP addresses
    ip: false,
    // Only track in production
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') {
        ph.opt_out_capturing()
      }
    },
  })

  initialized = true
}

/**
 * Identify organization (not user) for analytics grouping
 * Never send PII — only org ID and tier
 */
export function identifyOrganization(orgId: string, tier: string): void {
  if (typeof window === 'undefined') return
  posthog.group('organization', orgId, { tier })
}

/**
 * Track a page view — privacy-safe, no PII in properties
 */
export function trackPageView(pageName: string, properties?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return
  posthog.capture('$pageview', {
    page: pageName,
    ...properties,
  })
}

/**
 * Track a business event — privacy-safe
 * Never include: names, emails, phone numbers, child data
 * OK to include: counts, amounts, IDs, tier, category
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}

// Pre-defined event helpers (privacy-safe by design)

export const analytics = {
  // Booking events
  bookingStarted: (activityCategory: string) =>
    trackEvent('booking_started', { activityCategory }),

  bookingCompleted: (amountCents: number, activityCategory: string) =>
    trackEvent('booking_completed', { amountCents, activityCategory }),

  bookingCancelled: (reason: string) =>
    trackEvent('booking_cancelled', { reason }),

  // Search & discovery
  marketplaceSearch: (filters: { category?: string; ageGroup?: string; hasResults: boolean }) =>
    trackEvent('marketplace_search', filters),

  activityViewed: (activityCategory: string) =>
    trackEvent('activity_viewed', { activityCategory }),

  // Provider actions
  reportViewed: (reportType: string) =>
    trackEvent('report_viewed', { reportType }),

  reportExported: (reportType: string, format: string) =>
    trackEvent('report_exported', { reportType, format }),

  automationCreated: (trigger: string, actionCount: number) =>
    trackEvent('automation_created', { trigger, actionCount }),

  // Roster & attendance
  attendanceMarked: (method: 'manual' | 'qr', count: number) =>
    trackEvent('attendance_marked', { method, count }),

  // Forecast
  forecastViewed: (alertCount: number) =>
    trackEvent('forecast_viewed', { alertCount }),

  forecastAlertSent: (sessionCount: number) =>
    trackEvent('forecast_alert_sent', { sessionCount }),
}

/**
 * Reset analytics on logout — important for privacy
 */
export function resetAnalytics(): void {
  if (typeof window === 'undefined') return
  posthog.reset()
}
