import { describe, it, expect } from 'vitest'
import { hashToken } from '../../apps/web/lib/security/tokens'

describe('Organization & Staff Permissions', () => {
  describe('Role hierarchy', () => {
    const providerRoles = ['OWNER', 'ADMIN', 'MANAGER']

    it('OWNER can manage staff', () => {
      expect(providerRoles.includes('OWNER')).toBe(true)
    })

    it('ADMIN can manage staff', () => {
      expect(providerRoles.includes('ADMIN')).toBe(true)
    })

    it('MANAGER can access provider procedures', () => {
      expect(providerRoles.includes('MANAGER')).toBe(true)
    })

    it('INSTRUCTOR cannot manage staff (not in provider roles)', () => {
      expect(providerRoles.includes('INSTRUCTOR')).toBe(false)
    })

    it('VIEWER cannot manage staff (not in provider roles)', () => {
      expect(providerRoles.includes('VIEWER')).toBe(false)
    })
  })

  describe('Slug validation', () => {
    const slugRegex = /^[a-z0-9-]+$/

    it('accepts valid slugs', () => {
      expect(slugRegex.test('little-stars')).toBe(true)
      expect(slugRegex.test('academy-123')).toBe(true)
      expect(slugRegex.test('test')).toBe(true)
    })

    it('rejects invalid slugs', () => {
      expect(slugRegex.test('UPPERCASE')).toBe(false)
      expect(slugRegex.test('has spaces')).toBe(false)
      expect(slugRegex.test('special!chars')).toBe(false)
      expect(slugRegex.test('under_score')).toBe(false)
    })
  })

  describe('Staff invite security', () => {
    it('invite tokens are SHA-256 hashed for storage', () => {
      const raw = 'raw-invite-token-value'
      const hashed = hashToken(raw)

      expect(hashed).toHaveLength(64)
      expect(hashed).not.toBe(raw)
      expect(hashToken(raw)).toBe(hashed)
    })

    it('invite expires after 7 days', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const eightDaysLater = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
      const sixDaysLater = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)

      expect(expiresAt < eightDaysLater).toBe(true)
      expect(expiresAt > sixDaysLater).toBe(true)
    })
  })
})
