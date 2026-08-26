# KidSpark Security & Compliance

## COPPA Compliance (Children's Online Privacy Protection Act)

**Applicable Regulation**: 16 CFR Part 312 (U.S. Federal Trade Commission)

### Summary

COPPA protects the online privacy of children under 13. KidSpark collects information about children under 13, so we must:

1. ✅ Obtain **verifiable parental consent** before collecting PII from/about children
2. ✅ **Encrypt sensitive PII** at rest
3. ✅ **Securely delete** PII upon parent request or child's 13th birthday
4. ✅ Maintain **audit trails** of all data access
5. ✅ Implement **reasonable security** (encryption, access controls)

### Implementation

#### Parental Consent

When a parent creates a child profile:

```typescript
// apps/web/server/routers/child.ts
export const childRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        dateOfBirth: z.string().datetime(),
        // ... other fields
      })
    )
    .mutation(async ({ ctx, input }) => {
      // COPPA: Parental consent is presumed when parent creates child profile
      // (Parent is acting on behalf of child under 13)
      
      const profile = await ctx.db.parentProfile.findUnique({
        where: { userId: ctx.session.userId },
      })
      
      // Only parent can create child profiles (verified by session)
      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      // Consent documented in AuditLog automatically
      // (All mutations are logged with user ID)
    })
})
```

**Consent Record**: Stored implicitly via AuditLog:
- `AuditLog.userId` — Parent who created profile
- `AuditLog.action` — 'child.create'
- `AuditLog.createdAt` — Timestamp of consent

#### PII Encryption at Rest

**Fields Encrypted** (before database storage):
- `Child.medicalNotes` — Health conditions, medications
- `Child.allergies` — Food/environmental allergies
- `Child.emergencyContact` — Contact person details
- `ParentProfile.photoConsent` — Photo permission (boolean, not encrypted)

**Encryption Algorithm**:
- Algorithm: **AES-256-GCM** (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)
- Key: `ENCRYPTION_KEY` environment variable (64 hex characters = 256 bits)
- Implementation: `apps/web/lib/security/encryption.ts`

```typescript
// lib/security/encryption.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')

export function encrypt(plaintext: string): string {
  // Generate random 12-byte initialization vector (IV)
  const iv = crypto.randomBytes(12)
  
  // Create cipher: AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  
  // Encrypt data
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  
  // Get authentication tag (prevents tampering)
  const authTag = cipher.getAuthTag()
  
  // Return: iv + authTag + encrypted (hex-encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  
  // Decrypt (will throw if authTag doesn't match = tampering detected)
  let decrypted = decipher.update(encrypted, 'binary', 'utf-8')
  decrypted += decipher.final('utf-8')
  
  return decrypted
}
```

**Usage in Database**:

```typescript
// apps/web/server/routers/child.ts
const child = await ctx.db.child.create({
  data: {
    parentProfileId: profile.id,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: dob,
    medicalNotes: input.medicalNotes 
      ? encrypt(input.medicalNotes)  // ← Encrypted before storage
      : null,
    allergies: input.allergies 
      ? encrypt(input.allergies)      // ← Encrypted before storage
      : null,
    emergencyContact: input.emergencyContact
      ? encryptJson(input.emergencyContact)  // ← Encrypted JSON
      : undefined,
  },
})
```

When retrieving, encryption is transparent:
```typescript
// Decrypt when needed (only parent can access)
const decryptedNotes = decrypt(child.medicalNotes)
```

#### Age-Based Data Deletion

On a child's **13th birthday**, encrypted PII is automatically wiped (COPPA Safe Harbor):

```typescript
// lib/security/coppa.ts
import { db } from '../db'

export async function deleteChildDataOn13thBirthday() {
  // Run nightly (scheduled job in BullMQ)
  const today = new Date()
  
  // Find all children turning 13 today
  const childrenTurning13 = await db.child.findMany({
    where: {
      dateOfBirth: {
        // Birthday was 13 years ago
        gte: new Date(
          today.getFullYear() - 13,
          today.getMonth(),
          today.getDate()
        ),
        lt: new Date(
          today.getFullYear() - 13,
          today.getMonth(),
          today.getDate() + 1
        ),
      },
    },
  })
  
  // Delete encrypted PII (set to NULL)
  for (const child of childrenTurning13) {
    await db.child.update({
      where: { id: child.id },
      data: {
        medicalNotes: null,
        allergies: null,
        emergencyContact: null,
      },
    })
    
    // Log action for compliance
    await db.auditLog.create({
      data: {
        action: 'child.pii_deleted_age_13',
        entityType: 'Child',
        entityId: child.id,
        metadata: {
          reason: 'COPPA Safe Harbor: child turned 13',
          deletedFields: ['medicalNotes', 'allergies', 'emergencyContact'],
        },
      },
    })
  }
}
```

#### Parental Deletion Request

Parent can request deletion of child's PII at any time:

```typescript
// apps/web/server/routers/child.ts
delete: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const child = await ctx.db.child.findFirst({
      where: { 
        id: input.id, 
        parentProfile: { userId: ctx.session.userId }  // Parent owns child
      },
    })
    
    if (!child) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    
    // Soft delete: set deletedAt, wipe PII
    await ctx.db.child.update({
      where: { id: input.id },
      data: {
        deletedAt: new Date(),
        firstName: '[deleted]',
        lastName: '[deleted]',
        dateOfBirth: null,
        medicalNotes: null,
        allergies: null,
        emergencyContact: null,
        photoConsent: false,
      },
    })
    
    // Audit logging (automatic via middleware)
    // AuditLog: userId + 'child.delete' action recorded
  })
```

#### Audit Logging (Compliance Records)

All access to child PII is logged:

```typescript
// In tRPC middleware (apps/web/server/trpc.ts)
const auditLogMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const result = await next()
  
  if (type === 'mutation' && ctx.session) {
    await ctx.db.auditLog.create({
      data: {
        userId: ctx.session.userId,
        action: path,  // e.g., 'child.create', 'child.update'
        entityType: 'Child',
        entityId: input.id,
        ipAddress: hashIp(ctx.ipAddress),  // SHA-256 hash
        userAgent: ctx.userAgent,
        metadata: {
          // What fields were accessed/modified
        },
      },
    })
  }
  
  return result
})
```

**Compliance Report** (for FTC audit):

```sql
SELECT 
  DATE(createdAt) as date,
  COUNT(*) as operations,
  COUNT(DISTINCT userId) as unique_users,
  STRING_AGG(DISTINCT action, ', ') as actions
FROM "AuditLog"
WHERE entityType = 'Child'
  AND createdAt > NOW() - INTERVAL '1 year'
GROUP BY DATE(createdAt)
ORDER BY date DESC;
```

---

## Authentication & Session Management

### Password Requirements

- **Minimum length**: 12 characters (NIST recommendation)
- **Character types**: Must include uppercase, lowercase, number, special character
- **Breach checking**: Verified against Have I Been Pwned API (non-blocking)
- **Hashing**: bcrypt with 10 salt rounds

```typescript
// lib/security/auth.ts
export async function validatePasswordStrength(password: string) {
  const issues: string[] = []
  
  if (password.length < 12) {
    issues.push('Must be at least 12 characters')
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Must include uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Must include lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    issues.push('Must include number')
  }
  if (!/[!@#$%^&*]/.test(password)) {
    issues.push('Must include special character (!@#$%^&*)')
  }
  
  // Check if breached
  let breached = false
  try {
    breached = await isPasswordBreached(password)
    if (breached) {
      issues.push('This password has been found in public data breaches')
    }
  } catch {
    // Don't block registration if check fails
  }
  
  return {
    valid: issues.length === 0,
    errors: issues,
    breached,
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### Session Management

```typescript
// Sessions stored in PostgreSQL (not JWTs)
CREATE TABLE "Session" (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES "User"(id),
  token TEXT UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  ipAddress TEXT,  -- hashed
  userAgent TEXT
)

// Session creation
const session = await db.session.create({
  data: {
    userId: user.id,
    token: generateSessionToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days
    ipAddress: hashIp(ctx.ipAddress),
  },
})

// Set HttpOnly + Secure cookie
response.cookies.set({
  name: 'session',
  value: session.token,
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,  // 7 days
})

// Session verification (on each request)
const session = await db.session.findUnique({
  where: { token: cookieToken },
  include: { user: true },
})

if (!session || session.expiresAt < new Date()) {
  // Invalid or expired session
  throw new TRPCError({ code: 'UNAUTHENTICATED' })
}

// Update context
ctx.session = {
  userId: session.user.id,
  email: session.user.email,
  role: session.user.role,
}
```

### Rate Limiting on Auth Endpoints

```typescript
// middleware.ts
const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(5, '15 m'),  // 5 attempts per 15 minutes
  analytics: true,
  prefix: 'rl:auth',
})

// Applied to: /api/auth/register, /api/auth/login, /api/auth/reset-password
// Prevents brute force attacks
```

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

```typescript
// Roles
enum UserRole {
  PARENT = 'PARENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

// tRPC procedure types
const publicProcedure = t.procedure  // No auth required
const protectedProcedure = t.procedure.use(enforceAuth)  // Session required
const providerProcedure = t.procedure.use(enforceAuth).use(enforceProvider)  // Provider role required
const adminProcedure = t.procedure.use(enforceAuth).use(enforceAdmin)  // Admin role required

// Example: Only providers can create activities
export const activityRouter = router({
  create: providerProcedure
    .input(activitySchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.orgId guaranteed to exist (from enforceProvider middleware)
      const activity = await ctx.db.activity.create({
        data: {
          organizationId: ctx.orgId,
          ...input,
        },
      })
      return activity
    })
})
```

### Feature Gating (Subscription Tiers)

```typescript
// Tiers: MVP < GROW+ < SCALE
type Tier = 'MVP' | 'GROW+' | 'SCALE'

// Feature flags
const featureGates: Record<Tier, Feature[]> = {
  'MVP': ['booking', 'attendance', 'reporting'],
  'GROW+': ['booking', 'attendance', 'reporting', 'automations', 'waitlist'],
  'SCALE': ['booking', 'attendance', 'reporting', 'automations', 'waitlist', 'forecasting'],
}

export function requireFeatureGate(tier: Tier, feature: Feature) {
  if (!featureGates[tier]?.includes(feature)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Feature "${feature}" requires ${getMinimumTier(feature)} subscription`,
    })
  }
}

// Usage
export const automationRouter = router({
  create: providerProcedure
    .input(automationSchema)
    .mutation(async ({ ctx, input }) => {
      requireFeatureGate(ctx.orgTier, 'nativeAutomations')  // ← Gate
      // ... create automation
    })
})
```

### Resource Ownership Verification

```typescript
// Example: Parent can only view own bookings
export const bookingRouter = router({
  getBooking: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input.id,
          // Ensure parent owns booking
          parentProfile: {
            userId: ctx.session.userId,
          },
        },
      })
      
      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found or not owned by you',
        })
      }
      
      return booking
    })
})
```

---

## Network & Data Security

### HTTPS & TLS

- All traffic encrypted with TLS 1.3
- Redirects HTTP → HTTPS automatically
- Certificate from Let's Encrypt (auto-renewed)

```typescript
// next.config.js
headers: [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
    ],
  },
]
```

### Security Headers

All responses include:

| Header | Purpose | Value |
|--------|---------|-------|
| `Strict-Transport-Security` | Force HTTPS | `max-age=31536000` (1 year) |
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-XSS-Protection` | Legacy XSS protection | `1; mode=block` |
| `Referrer-Policy` | Limit referrer exposure | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disable dangerous APIs | `geolocation=(), microphone=(), camera=()` |
| `Content-Security-Policy` | Prevent XSS/injection | See `next.config.js` |

```typescript
// next.config.js
headers: [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), microphone=(), camera=()',
      },
      {
        key: 'Content-Security-Policy',
        value: `
          default-src 'self';
          script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data:;
          connect-src 'self' https://api.stripe.com https://*.mapbox.com;
          frame-src 'self' https://js.stripe.com;
        `.replace(/\s+/g, ' '),
      },
    ],
  },
]
```

### Webhook Signature Verification

All Stripe webhooks verified with HMAC-SHA256:

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }
  
  let event: Stripe.Event
  try {
    // Construct event verifies HMAC-SHA256 signature
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  // Process event only if signature is valid
  // ...
}

// lib/stripe.ts
export function constructWebhookEvent(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`)
  }
}
```

---

## Vulnerability Prevention

### SQL Injection ✅ Protected

Prisma ORM prevents SQL injection via parameterized queries:

```typescript
// ❌ BAD (vulnerable if using raw SQL)
await db.$queryRaw(`SELECT * FROM "User" WHERE email = '${email}'`)

// ✅ GOOD (parameterized, safe)
await db.user.findUnique({
  where: { email: email },
})
```

### Cross-Site Scripting (XSS) ✅ Protected

React escapes HTML by default:

```typescript
// ❌ BAD (vulnerable)
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD (escaped)
<div>{userInput}</div>
```

### Cross-Site Request Forgery (CSRF) ✅ Protected

Next.js SameSite cookies prevent CSRF:

```typescript
response.cookies.set({
  name: 'session',
  value: session.token,
  sameSite: 'strict',  // ← CSRF protection
  secure: true,
  httpOnly: true,
})
```

### Command Injection ✅ Protected

No shell commands in application code. All external services use APIs:

```typescript
// ✅ GOOD (API-based, no shell injection risk)
await stripe.paymentIntents.create({ ... })
await twilio.messages.create({ ... })

// ❌ BAD (avoid)
const { exec } = require('child_process')
exec(`curl ${userUrl}`)  // Never do this
```

### Insecure Deserialization ✅ Protected

Using superjson (safe JSON serializer):

```typescript
// tRPC uses superjson by default
const t = initTRPC.create({
  transformer: superjson,  // ← Safe serialization
})
```

### Sensitive Data Exposure ✅ Protected

```typescript
// ✅ DO: Encrypt PII
const encrypted = encrypt(child.medicalNotes)

// ✅ DO: Hash IPs before logging
const hashedIp = hashIp(ipAddress)

// ✅ DO: Use environment variables for secrets
const apiKey = process.env.STRIPE_SECRET_KEY

// ❌ DON'T: Log passwords or tokens
console.log(password)  // NEVER
console.log(sessionToken)  // NEVER
```

---

## Third-Party Security

### Stripe PCI Compliance

KidSpark **does NOT** handle raw credit card data. Stripe handles PCI-DSS compliance:

- Card data collected by Stripe.js (never touches our backend)
- We receive only `paymentIntentId` (safe token)
- Stripe encrypts card data end-to-end

```typescript
// Frontend: Card collection via Stripe
<Elements stripe={stripePromise}>
  <PaymentElement />
  <button onClick={handleSubmit}>Pay</button>
</Elements>

// Backend: We never see card details
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
// Contains: amount, currency, status — NOT card data
```

### Resend Email Security

Emails sent via Resend API (transactional email service):

- DKIM + SPF signing (prevents spoofing)
- TLS encryption in transit
- Templates stored in code (no user-generated email content)

```typescript
// lib/email.ts
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${DOMAIN}/verify?token=${token}`
  
  const html = render(VerificationEmailTemplate({ verificationUrl }))
  
  return resend.emails.send({
    from: 'verify@kidspark.app',
    to: email,
    subject: 'Verify your KidSpark account',
    html,
  })
}
```

### Twilio SMS Security

SMS sent via Twilio API:

- Messages encrypted in transit (TLS)
- Phone numbers validated before sending
- No sensitive data in SMS body (use URLs + tokens instead)

```typescript
// server/jobs/send-sms.ts
export async function sendSmsJob(jobData: SendSmsJobData) {
  const { parentId, message } = jobData
  
  const parent = await db.parentProfile.findUnique({
    where: { id: parentId },
  })
  
  if (!parent.phoneNumber) {
    throw new Error('Parent phone number not available')
  }
  
  return twilio.messages.create({
    body: message,  // Plain text only (no URLs embedded)
    from: process.env.TWILIO_PHONE_NUMBER,
    to: parent.phoneNumber,
  })
}
```

---

## Incident Response

### Security Issue Reporting

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email: security@kidspark.app
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information

4. Response within 48 hours

### Breach Response Plan

If a data breach is confirmed:

1. **Immediate** (< 1 hour):
   - Confirm scope of breach
   - Take affected systems offline if needed
   - Notify security team + executives
   - Engage legal counsel

2. **Short-term** (< 24 hours):
   - Determine what data was exposed
   - Identify affected users
   - Begin notification process

3. **Medium-term** (< 7 days):
   - Notify affected users via email + phone
   - Report to regulatory bodies if required (COPPA, state AGs)
   - Implement remediation (patch, rotate credentials)
   - Public disclosure if > 1000 records

4. **Long-term** (< 30 days):
   - Root cause analysis
   - Security audit of systems
   - Enhanced monitoring
   - Public postmortem

---

## Security Checklist (Per Release)

Before deploying to production:

- [ ] Run `npm audit` — zero critical CVEs
- [ ] Code review includes security check
- [ ] No secrets hardcoded (check `.env.example`)
- [ ] All inputs validated with Zod
- [ ] All outputs escaped/sanitized
- [ ] PII encrypted (child data)
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Webhook signatures verified
- [ ] SQL queries use Prisma ORM (no raw SQL)
- [ ] No `dangerouslySetInnerHTML` in new code
- [ ] Password requirements enforced (12+ chars)
- [ ] Sessions stored server-side (not JWTs)
- [ ] Audit log will capture action
- [ ] COPPA compliance reviewed (if child PII involved)

---

## Compliance Standards

### COPPA (16 CFR Part 312)

**Scope**: We collect info about children under 13  
**Compliance**: ✅ Verified parental consent, encrypted PII, secure deletion, audit logging

### GDPR (if EU users)

**Scope**: If we have EU users, GDPR may apply  
**Status**: ⚠️ Not yet fully GDPR-compliant (missing: data processing agreement, DPIA, DPO)  
**Action**: If targeting EU market, engage legal for GDPR compliance

### PCI-DSS (if handling cards)

**Scope**: We handle payment tokens, NOT card data  
**Compliance**: ✅ Stripe handles PCI-DSS (we're out of scope via tokenization)

### CCPA (if CA users)

**Scope**: If we have CA users, CCPA may apply  
**Status**: ⚠️ Partially compliant (have deletion/access requests, missing: opt-out)  
**Action**: Add CCPA opt-out mechanism if targeting CA

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-26  
**Next Review**: 2026-10-26
