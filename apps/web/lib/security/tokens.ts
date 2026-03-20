import { createHash, randomBytes } from 'crypto'

/**
 * Generate a token pair: raw (sent to user) and hashed (stored in DB).
 */
export function generateToken(): { raw: string; hashed: string } {
  const raw = randomBytes(32).toString('hex')
  const hashed = createHash('sha256').update(raw).digest('hex')
  return { raw, hashed }
}

/**
 * Hash a raw token for DB lookup.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
