import { describe, it, expect } from 'vitest'
import { hasFeature, requireFeature, getAvailableFeatures } from '../../apps/web/lib/tiers'

describe('Feature Gates', () => {
  describe('hasFeature', () => {
    // LAUNCH tier features
    it('LAUNCH has basicScheduling', () => {
      expect(hasFeature('LAUNCH', 'basicScheduling')).toBe(true)
    })
    it('LAUNCH has classPacks', () => {
      expect(hasFeature('LAUNCH', 'classPacks')).toBe(true)
    })
    it('LAUNCH has giftCards', () => {
      expect(hasFeature('LAUNCH', 'giftCards')).toBe(true)
    })
    it('LAUNCH has couponCodes', () => {
      expect(hasFeature('LAUNCH', 'couponCodes')).toBe(true)
    })

    // LAUNCH should NOT have GROW features
    it('LAUNCH does not have paymentPlans', () => {
      expect(hasFeature('LAUNCH', 'paymentPlans')).toBe(false)
    })
    it('LAUNCH does not have nativeAutomations', () => {
      expect(hasFeature('LAUNCH', 'nativeAutomations')).toBe(false)
    })
    it('LAUNCH does not have waitlists', () => {
      expect(hasFeature('LAUNCH', 'waitlists')).toBe(false)
    })

    // LAUNCH should NOT have SCALE features
    it('LAUNCH does not have storeCredit', () => {
      expect(hasFeature('LAUNCH', 'storeCredit')).toBe(false)
    })
    it('LAUNCH does not have aiForecasting', () => {
      expect(hasFeature('LAUNCH', 'aiForecasting')).toBe(false)
    })

    // GROW tier features
    it('GROW has all LAUNCH features', () => {
      expect(hasFeature('GROW', 'basicScheduling')).toBe(true)
      expect(hasFeature('GROW', 'classPacks')).toBe(true)
      expect(hasFeature('GROW', 'couponCodes')).toBe(true)
    })
    it('GROW has paymentPlans', () => {
      expect(hasFeature('GROW', 'paymentPlans')).toBe(true)
    })
    it('GROW has nativeAutomations', () => {
      expect(hasFeature('GROW', 'nativeAutomations')).toBe(true)
    })
    it('GROW has webhookIntegrations', () => {
      expect(hasFeature('GROW', 'webhookIntegrations')).toBe(true)
    })
    it('GROW has progressTracking', () => {
      expect(hasFeature('GROW', 'progressTracking')).toBe(true)
    })

    // GROW should NOT have SCALE features
    it('GROW does not have storeCredit', () => {
      expect(hasFeature('GROW', 'storeCredit')).toBe(false)
    })
    it('GROW does not have aiForecasting', () => {
      expect(hasFeature('GROW', 'aiForecasting')).toBe(false)
    })

    // SCALE tier features
    it('SCALE has all features', () => {
      expect(hasFeature('SCALE', 'basicScheduling')).toBe(true)
      expect(hasFeature('SCALE', 'paymentPlans')).toBe(true)
      expect(hasFeature('SCALE', 'storeCredit')).toBe(true)
      expect(hasFeature('SCALE', 'aiForecasting')).toBe(true)
      expect(hasFeature('SCALE', 'multiLocationManagement')).toBe(true)
    })
  })

  describe('requireFeature', () => {
    it('does not throw for allowed tier', () => {
      expect(() => requireFeature('SCALE', 'storeCredit')).not.toThrow()
    })

    it('throws for disallowed tier', () => {
      expect(() => requireFeature('LAUNCH', 'storeCredit')).toThrow(
        /requires the SCALE plan/
      )
    })

    it('throws with upgrade message', () => {
      expect(() => requireFeature('LAUNCH', 'paymentPlans')).toThrow(
        /requires the GROW plan/
      )
    })
  })

  describe('getAvailableFeatures', () => {
    it('LAUNCH gets fewer features than GROW', () => {
      const launchFeatures = getAvailableFeatures('LAUNCH')
      const growFeatures = getAvailableFeatures('GROW')
      expect(launchFeatures.length).toBeLessThan(growFeatures.length)
    })

    it('SCALE gets all features', () => {
      const scaleFeatures = getAvailableFeatures('SCALE')
      expect(scaleFeatures.length).toBeGreaterThan(0)
      expect(scaleFeatures).toContain('aiForecasting')
      expect(scaleFeatures).toContain('storeCredit')
      expect(scaleFeatures).toContain('basicScheduling')
    })
  })
})
