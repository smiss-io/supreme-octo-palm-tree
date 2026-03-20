import { describe, it, expect } from 'vitest'
import {
  calculateAgeInYears,
  calculateAgeInMonths,
  requiresParentalConsent,
} from '../../apps/web/lib/security/coppa'

describe('COPPA Compliance', () => {
  describe('calculateAgeInYears', () => {
    it('calculates age correctly for a child', () => {
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      fiveYearsAgo.setMonth(fiveYearsAgo.getMonth() - 1) // ensure birthday has passed
      expect(calculateAgeInYears(fiveYearsAgo)).toBe(5)
    })

    it('handles birthday not yet reached this year', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 10)
      dob.setMonth(dob.getMonth() + 1) // birthday is next month
      expect(calculateAgeInYears(dob)).toBe(9)
    })
  })

  describe('calculateAgeInMonths', () => {
    it('calculates months for infant', () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      expect(calculateAgeInMonths(sixMonthsAgo)).toBe(6)
    })
  })

  describe('requiresParentalConsent', () => {
    it('requires consent for child under 13', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 8)
      expect(requiresParentalConsent(dob)).toBe(true)
    })

    it('requires consent for 12-year-old', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 12)
      dob.setMonth(dob.getMonth() - 1) // ensure birthday has passed
      expect(requiresParentalConsent(dob)).toBe(true)
    })

    it('does not require consent for 13-year-old', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 13)
      dob.setMonth(dob.getMonth() - 1) // ensure birthday has passed
      expect(requiresParentalConsent(dob)).toBe(false)
    })

    it('does not require consent for 17-year-old', () => {
      const dob = new Date()
      dob.setFullYear(dob.getFullYear() - 17)
      expect(requiresParentalConsent(dob)).toBe(false)
    })
  })
})
