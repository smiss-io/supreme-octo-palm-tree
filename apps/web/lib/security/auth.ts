import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'crypto'

// ─── PASSWORD POLICY ──────────────────────────────────────────────────────────
// - Minimum 12 characters
// - bcrypt with cost factor 12 (never MD5, SHA1, or unsalted)
// - Check against HaveIBeenPwned API on registration/password change
// - Account lockout: 5 failed attempts → 15 min lockout, exponential backoff

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const BASE_LOCKOUT_MINUTES = 15

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check HaveIBeenPwned Pwned Passwords API (k-anonymity model — privacy safe).
 * Only the first 5 chars of the SHA-1 hash are sent to the API.
 */
export async function isPasswordBreached(
  password: string
): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'User-Agent': 'KidSpark-Security-Check' },
  })

  if (!res.ok) {
    // Fail open — don't block registration if API is down,
    // but log for monitoring
    console.warn('HIBP API check failed, status:', res.status)
    return false
  }

  const text = await res.text()
  return text.split('\n').some((line) => line.startsWith(suffix))
}

/**
 * Validate password meets minimum policy requirements.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Generate a cryptographically random session token.
 * The raw token is sent to the client; the hashed version is stored in the DB.
 */
export function generateSessionToken(): { raw: string; hashed: string } {
  const raw = randomBytes(32).toString('hex')
  const hashed = createHash('sha256').update(raw).digest('hex')
  return { raw, hashed }
}

/**
 * Hash an IP address for storage (privacy-preserving).
 */
export function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

/**
 * Calculate lockout duration based on failed attempts (exponential backoff).
 */
export function calculateLockoutDuration(failedAttempts: number): number {
  if (failedAttempts < MAX_FAILED_ATTEMPTS) return 0
  const multiplier = Math.pow(2, failedAttempts - MAX_FAILED_ATTEMPTS)
  return BASE_LOCKOUT_MINUTES * multiplier * 60 * 1000 // ms
}

/**
 * Check if an account is currently locked out.
 */
export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false
  return new Date() < lockedUntil
}
