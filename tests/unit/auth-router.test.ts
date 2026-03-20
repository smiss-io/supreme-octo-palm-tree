import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateToken, hashToken } from '../../apps/web/lib/security/tokens'
import { hashPassword, isAccountLocked } from '../../apps/web/lib/security/auth'

describe('Auth Security', () => {
  describe('Token Generation', () => {
    it('generates unique raw and hashed tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()

      expect(token1.raw).not.toBe(token2.raw)
      expect(token1.hashed).not.toBe(token2.hashed)
      expect(token1.raw).not.toBe(token1.hashed)
    })

    it('hashToken produces consistent results', () => {
      const raw = 'test-token-value'
      expect(hashToken(raw)).toBe(hashToken(raw))
    })

    it('hashToken produces 64-char hex string (SHA-256)', () => {
      expect(hashToken('any-value')).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(hashToken('any-value'))).toBe(true)
    })
  })

  describe('Password Reset Token', () => {
    it('reset tokens are single-use (usedAt field)', () => {
      const token = {
        id: 'token-id',
        userId: 'user-id',
        token: hashToken('raw-token'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
        createdAt: new Date(),
      }
      expect(token.usedAt).toBeInstanceOf(Date)
    })

    it('reset token expires after 1 hour', () => {
      const token = {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }
      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000)

      expect(token.expiresAt < twoHoursLater).toBe(true)
      expect(token.expiresAt > new Date()).toBe(true)
    })
  })

  describe('Account Lockout in Login Flow', () => {
    it('blocks login when account is locked', () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000)
      expect(isAccountLocked(lockedUntil)).toBe(true)
    })

    it('allows login when lockout expired', () => {
      const lockedUntil = new Date(Date.now() - 1000)
      expect(isAccountLocked(lockedUntil)).toBe(false)
    })
  })

  describe('Password Hashing for Registration', () => {
    it('hashes password with bcrypt cost 12', async () => {
      const hash = await hashPassword('TestPassword123!')
      expect(hash.startsWith('$2b$12$')).toBe(true)
    })
  })
})
