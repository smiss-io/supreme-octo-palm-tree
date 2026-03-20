import { describe, it, expect, beforeAll } from 'vitest'

// Set encryption key before importing module
beforeAll(() => {
  // 32 bytes = 64 hex chars
  process.env.ENCRYPTION_KEY =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
})

describe('Encryption', () => {
  it('encrypts and decrypts a string correctly', async () => {
    const { encrypt, decrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const plaintext = 'Hello, World!'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
    expect(encrypted).not.toBe(plaintext)
  })

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const { encrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const plaintext = 'Same input'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it('stores in iv:tag:ciphertext format', async () => {
    const { encrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const encrypted = encrypt('test')
    const parts = encrypted.split(':')

    expect(parts).toHaveLength(3)
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24)
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32)
    // Ciphertext is non-empty
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const encrypted = encrypt('test')
    const parts = encrypted.split(':')
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:${'00'.repeat(parts[2].length / 2)}`

    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws on invalid format', async () => {
    const { decrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format')
  })

  it('encrypts and decrypts JSON correctly', async () => {
    const { encryptJson, decryptJson } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const data = { name: 'Jane', phone: '555-1234', relationship: 'parent' }
    const encrypted = encryptJson(data)
    const decrypted = decryptJson(encrypted)

    expect(decrypted).toEqual(data)
  })

  it('handles empty string', async () => {
    const { encrypt, decrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const encrypted = encrypt('')
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe('')
  })

  it('handles unicode content', async () => {
    const { encrypt, decrypt } = await import(
      '../../apps/web/lib/security/encryption'
    )

    const plaintext = 'Child name: Maria Garcia-Lopez'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })
})
