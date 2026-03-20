# KidSpark Security Documentation

## Encryption Standards

### Data at Rest
- **Algorithm**: AES-256-GCM
- **Key Size**: 256-bit (32 bytes)
- **IV**: 96-bit random nonce per encryption operation
- **Auth Tag**: 128-bit GCM authentication tag
- **Storage Format**: `{iv_hex}:{auth_tag_hex}:{ciphertext_hex}`

### Encrypted Fields
All child PII fields are encrypted before database storage:
- `Child.dateOfBirth`
- `Child.medicalNotes`
- `Child.allergies`
- `Child.emergencyContact`
- `ParentProfile.phone`
- `CustomField` data where `isPii = true`
- `WebhookEndpoint.secret`

### Password Storage
- **Algorithm**: bcrypt
- **Cost Factor**: 12 (minimum)
- **Pre-check**: Passwords checked against HaveIBeenPwned k-anonymity API

### Session Tokens
- **Generation**: 32 bytes cryptographically random (crypto.randomBytes)
- **Storage**: SHA-256 hash stored in database
- **Client**: Raw token sent to client, never stored on server

## Key Rotation Procedure

1. Generate new ENCRYPTION_KEY: `openssl rand -hex 32`
2. Set `ENCRYPTION_KEY_NEW` environment variable with new key
3. Run migration script to re-encrypt all PII fields with new key
4. Swap `ENCRYPTION_KEY` to new value, remove `ENCRYPTION_KEY_NEW`
5. Verify decryption works with new key
6. Securely destroy old key after 30-day rollback window

## Authentication Security

### Account Lockout
- **Threshold**: 5 failed login attempts
- **Lockout Duration**: 15 minutes (exponential backoff on repeated lockouts)
- **Reset**: Automatic after lockout period expires

### Session Management
- Sessions stored in PostgreSQL with SHA-256 hashed tokens
- Session expiry enforced server-side
- All sessions invalidated on password change
- IP address stored as SHA-256 hash (privacy-preserving)

### Rate Limiting
- **Global**: 100 requests/minute per IP (sliding window)
- **Auth endpoints**: 5 attempts/15 minutes per IP (fixed window)
- **Password reset**: 3 requests/hour per email
- Implementation: Upstash Redis with @upstash/ratelimit

## HTTP Security Headers

All responses include:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `Content-Security-Policy` (see next.config.js for full policy)

## Incident Response

### Severity Levels
- **P0 (Critical)**: Data breach, unauthorized PII access, payment compromise
- **P1 (High)**: Authentication bypass, privilege escalation, DoS
- **P2 (Medium)**: XSS, CSRF, information disclosure
- **P3 (Low)**: Minor security misconfig, non-exploitable findings

### Response Steps
1. **Detect**: Sentry alerts, audit log anomalies, user reports
2. **Contain**: Revoke affected sessions, disable compromised endpoints
3. **Investigate**: Review audit logs, trace affected data
4. **Remediate**: Deploy fix, rotate compromised keys
5. **Notify**: Affected users within 72 hours (GDPR/COPPA requirement)
6. **Post-mortem**: Document root cause and preventive measures

## Dependency Security

- `npm audit --audit-level=critical` run before every deployment
- Zero tolerance for critical CVEs in production
- Automated weekly dependency scans via GitHub Dependabot
- Manual review of all dependency updates before merge
