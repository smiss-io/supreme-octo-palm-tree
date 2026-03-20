import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// AES-256-GCM for all PII fields (child DOB, medical notes, phone numbers)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32'
    )
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt a stored encrypted string (iv:authTag:ciphertext format).
 */
export function decrypt(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, tagHex, cipherHex] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(cipherHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Encrypt a JSON-serializable value.
 */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value))
}

/**
 * Decrypt and parse a JSON value.
 */
export function decryptJson<T>(stored: string): T {
  return JSON.parse(decrypt(stored)) as T
}
