import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSessionToken,
  hashIpAddress,
  calculateLockoutDuration,
  isAccountLocked,
} from '../../apps/web/lib/security/auth'

describe('Password Hashing', () => {
  it('hashes a password with bcrypt', async () => {
    const hash = await hashPassword('MySecurePassword123!')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('MySecurePassword123!')
    // bcrypt hashes start with $2b$
    expect(hash.startsWith('$2b$')).toBe(true)
  })

  it('uses cost factor 12', async () => {
    const hash = await hashPassword('TestPassword123!')
    // $2b$12$ indicates cost factor 12
    expect(hash.startsWith('$2b$12$')).toBe(true)
  })

  it('verifies correct password', async () => {
    const password = 'MySecurePassword123!'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('CorrectPassword123!')
    const result = await verifyPassword('WrongPassword123!', hash)
    expect(result).toBe(false)
  })
})

describe('Password Strength Validation', () => {
  it('accepts strong password', () => {
    const result = validatePasswordStrength('MySecurePass123')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects short password', () => {
    const result = validatePasswordStrength('Short1A')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Password must be at least 12 characters'
    )
  })

  it('rejects password without uppercase', () => {
    const result = validatePasswordStrength('alllowercase123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Password must contain at least one uppercase letter'
    )
  })

  it('rejects password without number', () => {
    const result = validatePasswordStrength('NoNumbersHere!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Password must contain at least one number'
    )
  })
})

describe('Session Token Generation', () => {
  it('generates raw and hashed tokens', () => {
    const { raw, hashed } = generateSessionToken()
    expect(raw).toBeTruthy()
    expect(hashed).toBeTruthy()
    expect(raw).not.toBe(hashed)
  })

  it('raw token is 64 hex chars (32 bytes)', () => {
    const { raw } = generateSessionToken()
    expect(raw).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(raw)).toBe(true)
  })

  it('hashed token is 64 hex chars (SHA-256)', () => {
    const { hashed } = generateSessionToken()
    expect(hashed).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(hashed)).toBe(true)
  })

  it('generates unique tokens each time', () => {
    const token1 = generateSessionToken()
    const token2 = generateSessionToken()
    expect(token1.raw).not.toBe(token2.raw)
    expect(token1.hashed).not.toBe(token2.hashed)
  })
})

describe('IP Address Hashing', () => {
  it('hashes an IP address', () => {
    const hashed = hashIpAddress('192.168.1.1')
    expect(hashed).toBeTruthy()
    expect(hashed).not.toBe('192.168.1.1')
    expect(hashed).toHaveLength(64) // SHA-256
  })

  it('produces consistent hash for same IP', () => {
    const hash1 = hashIpAddress('10.0.0.1')
    const hash2 = hashIpAddress('10.0.0.1')
    expect(hash1).toBe(hash2)
  })
})

describe('Account Lockout', () => {
  it('returns 0 for attempts below threshold', () => {
    expect(calculateLockoutDuration(0)).toBe(0)
    expect(calculateLockoutDuration(4)).toBe(0)
  })

  it('returns 15 minutes for 5 failed attempts', () => {
    const duration = calculateLockoutDuration(5)
    expect(duration).toBe(15 * 60 * 1000)
  })

  it('doubles lockout for each additional failure', () => {
    const duration5 = calculateLockoutDuration(5)
    const duration6 = calculateLockoutDuration(6)
    expect(duration6).toBe(duration5 * 2)
  })

  it('detects locked account', () => {
    const futureDate = new Date(Date.now() + 60000)
    expect(isAccountLocked(futureDate)).toBe(true)
  })

  it('detects expired lockout', () => {
    const pastDate = new Date(Date.now() - 60000)
    expect(isAccountLocked(pastDate)).toBe(false)
  })

  it('returns false for null lockedUntil', () => {
    expect(isAccountLocked(null)).toBe(false)
  })
})
