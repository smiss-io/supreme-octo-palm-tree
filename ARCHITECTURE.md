# KidSpark Architecture

## System Overview

KidSpark is a full-stack web application connecting parents seeking childcare activities with providers offering them. The system handles bookings, payments, attendance tracking, automations, and analytics.

### Core Flow

```
Parent                          Provider                      KidSpark Backend
  │                               │                                  │
  ├─ Sign up ─────────────────────────────────────────────────────> Auth/NextAuth
  │                                                                    │ Creates session
  │                                                                    │ Encrypts PII
  │
  ├─ Browse activities <────────────────────────────────────────────── Search/Meilisearch
  │                                                                    │ (Activity index)
  │
  ├─ Add to cart ────────────────────────────────────────────────────> Session (browser)
  │
  ├─ Checkout ───────────────────────────────────────────────────────> Stripe Payment
  │                                                                    │
  │                                                                    ├─ Webhook: payment_intent.succeeded
  │                                                                    │ (Update booking → CONFIRMED)
  │
  ├─ Confirmation email ◄─────────────────────────────────────────────── Resend
  │                                                                    │
  │                               ┌─ Attendance marked via QR code ──┐
  │                               │                                   │
  └─ Session day arrives ─────────┴──────────────────────────────────> Check-in token
                                  │                                   │ → Activity Session
                          Roster + attendance                        │
                                                                    ├─ BullMQ job queue
                                                                    │ (Async processing)
                                  │ ◄─────── Automated email ────────┴
                              Rating request                          │
                                                                    └─ Audit log
                                                                      (All mutations)
```

---

## Technology Stack

### Frontend
- **Next.js 14** — React framework, SSR, API routes
- **React 18** — UI components
- **TailwindCSS** — Utility-first CSS framework
- **Shadcn/UI** — Headless component library (Radix + Tailwind)
- **React Hook Form** — Form state management
- **TanStack Query (React Query)** — Server state management, caching
- **Recharts** — Data visualization for reporting dashboard
- **Framer Motion** — Animations
- **Mapbox GL** — Map display (activity locations)

### Backend
- **Next.js API Routes** — tRPC endpoint + webhooks
- **tRPC 11** — Type-safe RPC framework
- **Prisma** — ORM for type-safe database access
- **PostgreSQL 14** — Primary database (users, bookings, transactions)
- **Redis (Upstash)** — Rate limiting, session cache
- **BullMQ** — Job queue for async tasks (emails, SMS, reports)

### Authentication & Authorization
- **NextAuth 5** — Session-based authentication
- **bcrypt** — Password hashing
- **Crypto API** — HMAC/encryption

### Payments
- **Stripe API** — Payment processing
- **Stripe Connect** — Provider payouts
- **Stripe Webhooks** — Real-time payment updates

### Communication
- **Resend** — Email delivery (transactional + marketing)
- **Twilio** — SMS delivery (booking confirmations, reminders)

### Search & Analytics
- **Meilisearch** — Full-text activity search with filters
- **PostHog** — Event tracking and analytics
- **Sentry** — Error monitoring and performance tracking

### Storage
- **AWS S3** — Photos, documents, backups

### Infrastructure
- **Vercel** — Hosting (unless self-hosted)
- **GitHub** — Code repository, CI/CD

---

## Data Model (High Level)

```
User
├── email, passwordHash
├── role (PARENT | PROVIDER | ADMIN)
└── Sessions (auth)

ParentProfile
├── userId
├── Children[]
│   ├── firstName, lastName, dateOfBirth
│   ├── medicalNotes (encrypted)
│   ├── allergies (encrypted)
│   └── emergencyContact (encrypted)
└── Bookings[]

Organization (Provider)
├── name, slug, tier (MVP | GROW+ | SCALE)
├── stripeConnectId, stripeOnboarded
├── locations[]
├── staff[]
├── Activities[]
│   ├── name, description, ageMin, ageMax
│   ├── price (cents)
│   └── Sessions[]
│       ├── startTime, endTime, maxCapacity
│       ├── enrolledCount, waitlistCount
│       └── Bookings[]
│           ├── status (PENDING | CONFIRMED | CANCELLED)
│           ├── payment → Payment
│           └── Attendance
└── Automations[] (GROW+ feature)

Payment
├── status (SUCCEEDED | FAILED | REFUNDED | DISPUTED)
├── amount, refundedAmount
├── stripePaymentIntentId, stripeChargeId
└── booking → Booking

Automation (GROW+ feature)
├── trigger (BOOKING_CONFIRMED, CLASS_24H_BEFORE, etc.)
├── triggerConfig (JSON)
└── actions[] → AutomationAction
    ├── actionType (SEND_EMAIL, SEND_SMS, ISSUE_STORE_CREDIT, etc.)
    └── config (JSON)

AuditLog
├── userId, action (router.procedure name)
├── entityType, entityId
├── ipAddress (hashed), userAgent
└── createdAt (indexed for compliance)

Forecast (SCALE feature)
├── organizationId
├── metric (ENROLLMENT, REVENUE, CHURN)
├── value, confidence
└── predictedAt
```

---

## Request Flow

### Typical Request: Parent Creates Booking

```
1. Frontend
   ├─ User clicks "Book now"
   └─ POST /api/trpc/booking.initiate
      ├─ tRPC client serializes: { activitySessionId, childId }
      └─ SuperJSON transformer handles dates, UUIDs

2. Backend: Middleware Chain
   ├─ Rate limiter (global: 100 req/min)
   ├─ NextAuth session check (cookies)
   ├─ IP address extraction (for audit logging)
   └─ Request continues

3. tRPC Router: booking.initiate
   ├─ Validation: Zod parses input
   ├─ Auth: protectedProcedure ensures session exists
   ├─ AuthZ: Check parent owns child
   ├─ Business Logic:
   │  ├─ Check session not sold out
   │  ├─ Check child age within activity range
   │  └─ Create Booking record (status=PENDING)
   ├─ Audit Log: middleware captures mutation
   │  └─ AuditLog.create({ userId, action: 'booking.initiate', ... })
   └─ Response: { bookingId, stripeClientSecret }

4. Frontend: Stripe Payment
   ├─ Load Stripe.js
   ├─ Create PaymentElement
   └─ User enters card → Stripe.confirmPayment()

5. Stripe Webhook
   ├─ Stripe posts payment_intent.succeeded
   ├─ Signature verification: HMAC-SHA256
   ├─ AuditLog.create({ action: 'stripe.webhook.payment_intent.succeeded' })
   ├─ Update Payment: status = SUCCEEDED
   ├─ Update Booking: status = CONFIRMED
   ├─ Increment session enrolledCount
   └─ Trigger automation: BOOKING_CONFIRMED

6. Background Job (BullMQ)
   ├─ Send confirmation email (via Resend)
   ├─ Log event to PostHog (for analytics)
   └─ Create parent reminder for 24h before session

7. Response to Parent
   └─ "Booking confirmed! Check email for details"
```

### Key Characteristics

- **Type-safe**: Zod validates input, TypeScript ensures output types
- **Auditable**: Every mutation logged with user + IP hash
- **Resilient**: Failed emails logged to job queue for retry
- **Encrypted**: Child PII encrypted before storage (COPPA compliance)

---

## Security Architecture

### Authentication

```
User registers → Email verification token → Sessions table
                                           ↓
              User logs in → Bcrypt password check → Session created
                                           ↓
              Browser receives → HttpOnly Secure cookie
                          ↓
              Each request → NextAuth verifies → ctx.session populated
```

- Sessions stored in PostgreSQL (not JWT)
- HttpOnly + Secure cookies (no JavaScript access)
- SameSite=Strict (prevents CSRF)
- Session expiry: 7 days

### Authorization

```
Request reaches tRPC procedure
        ↓
    publicProcedure? → No auth check
    protectedProcedure? → Session required
    providerProcedure? → Organization role required
    adminProcedure? → Admin role required
        ↓
    Feature gate check (if GROW+ feature)
    Example: requireFeatureGate(orgTier, 'nativeAutomations')
        ↓
    User owns resource? (additional check if needed)
    Example: Check parentProfileId matches ctx.session.userId
```

### Data Protection

```
Child PII Encryption (COPPA compliance)
├─ medicalNotes → encrypt() before storage
├─ allergies → encrypt() before storage
├─ emergencyContact → encryptJson() before storage
│
└─ On child's 13th birthday:
   └─ deleteChildData() → Wipe all encrypted fields
      (Set to NULL, keep audit trail)

Password Hashing
├─ Algorithm: bcrypt (10 rounds)
└─ Verification: await bcrypt.compare(inputPassword, hash)

IP Hashing (for audit logging)
├─ Hash: SHA-256(ipAddress)
├─ Reason: Preserve accountability without storing PII
└─ Used in: AuditLog.ipAddress, Sentry events

Webhook Signature Verification
├─ Stripe sends: body + X-Stripe-Signature header
├─ We compute: HMAC-SHA256(body, webhookSecret)
├─ We verify: computed === header value
└─ If invalid: 400 Unauthorized
```

### Rate Limiting

```
Client makes request → Middleware extracts IP
                       ↓
                  Is auth endpoint?
                  ├─ Yes: Use authRatelimit (5 attempts / 15 min)
                  └─ No: Use globalRatelimit (100 req / min)
                       ↓
                  Check Redis (Upstash)
                       ├─ Limit exceeded? → 429 Too Many Requests
                       ├─ Redis down? → Allow through, log error
                       └─ OK? → Continue, return remaining count
```

### Secrets Management

```
Environment Variables (never committed)
├─ DATABASE_URL — PostgreSQL connection
├─ ENCRYPTION_KEY — Child PII encryption (64 hex chars)
├─ NEXTAUTH_SECRET — Session signing key
├─ STRIPE_SECRET_KEY — Stripe API key
├─ STRIPE_WEBHOOK_SECRET — Webhook verification
├─ UPSTASH_REDIS_REST_URL — Rate limiting
├─ RESEND_API_KEY — Email delivery
├─ TWILIO_ACCOUNT_SID — SMS delivery
└─ (others as needed)

Rotation Policy
├─ Standard secrets: Rotate quarterly
├─ ENCRYPTION_KEY: Rotate annually (plus key versioning)
└─ Procedure: Update .env, redeploy, test staging first
```

---

## Feature Tiers

```
MVP (Minimum Viable Product)
├─ Parent/Provider accounts
├─ Activity creation & browsing
├─ Booking & payment (Stripe)
├─ Attendance tracking
└─ Basic reporting

GROW+ (Growth Features)
├─ Everything in MVP
├─ Automations engine (email/SMS triggers)
├─ Waitlist management
├─ Staff management (multiple instructors)
├─ Store credits & gift cards
└─ Advanced notifications

SCALE (Scale & Intelligence)
├─ Everything in GROW+
├─ AI forecasting (enrollment, revenue, churn)
├─ Advanced analytics dashboard
├─ Predictive insights (e.g., "enrollment declining 12% YoY")
├─ Bulk export (CSV/PDF reports)
└─ Custom integrations
```

Each procedure checks: `requireFeatureGate(ctx.orgTier, 'featureName')`

---

## Background Jobs (BullMQ + Redis)

```
Event occurs → Job created → Redis queue → Worker picks up
                                            ↓
                                        Execute job
                                        ├─ Send email
                                        ├─ Process webhook
                                        ├─ Generate report
                                        └─ Update forecasts
                                            ↓
                              Success? → Delete from queue
                                    ↓ Failure? → Retry (exponential backoff)
                                    After 3 retries → Dead letter queue
```

Jobs in KidSpark:
- `send-email` — Resend API
- `send-sms` — Twilio API
- `generate-report` — CSV/PDF export
- `reprocess-webhook` — Retry failed webhook handlers
- `absence-detection` — Mark kids as absent after check-in deadline
- `forecast-update` — Recalculate AI forecasts hourly

---

## Deployment Architecture

### Local Development

```
npm run dev
├─ Next.js dev server (localhost:3000)
├─ Hot reload on file changes
├─ Turbo for fast builds
└─ SQLite or local PostgreSQL
```

### Staging Environment

```
Staging Server (staging.kidspark.app)
├─ PostgreSQL (staging DB, read-only backups allowed)
├─ Redis (rate limiting)
├─ Stripe (test keys)
├─ Resend (test API key)
├─ BullMQ workers
└─ Accessible to team for testing
```

### Production Environment

```
Production (kidspark.app)
├─ PostgreSQL (encrypted backups, automated daily)
├─ Redis (Upstash, multi-region)
├─ Stripe (live keys, PCI-DSS compliant)
├─ Resend (production API key)
├─ Sentry (error monitoring)
├─ PostHog (analytics)
├─ Vercel (or self-hosted, 2+ zones for redundancy)
└─ CloudFlare (DDoS protection, caching)

Pre-Deployment Checklist (./scripts/prelaunch-check.sh)
├─ npm audit: zero critical CVEs
├─ .env file not in git
├─ Prisma schema valid
├─ Environment variables all set
├─ Tests passing
├─ TypeScript compiles
├─ Security headers present
└─ Rate limiter configured
```

---

## Monitoring & Observability

### Errors (Sentry)

```
tRPC error → Sentry.captureException()
              ↓
        Sentry dashboard (errors by severity)
        ├─ Critical: Alert on-call immediately
        ├─ Error: Email digest weekly
        └─ Warning: Log only
```

### Analytics (PostHog)

```
User action → PostHog.capture('event_name', properties)
              ↓
         PostHog dashboard
         ├─ User funnels (signup → booking → payment)
         ├─ Feature adoption (automations, reports)
         ├─ Revenue metrics
         └─ Retention cohorts
```

### Audit Log (PostgreSQL)

```
Every mutation → AuditLog.create()
                 ├─ action: 'booking.initiate'
                 ├─ userId, entityId
                 ├─ ipAddress (hashed), userAgent
                 └─ createdAt (indexed)

Query examples:
├─ Find user's activity: SELECT * FROM AuditLog WHERE userId = 'X'
├─ Find changes to booking: SELECT * FROM AuditLog WHERE entityId = 'booking-123'
├─ Compliance report: SELECT COUNT(*) FROM AuditLog WHERE createdAt > '2026-01-01'
```

### Performance

```
BullMQ dashboard (Bull Arena)
├─ Job queue depth
├─ Success/failure rates
├─ Job latency (p50, p95, p99)
└─ Worker count

Prisma slow queries (enable in db.ts)
├─ Query execution time
├─ N+1 queries detection
└─ Index recommendations

Sentry performance
├─ API endpoint latency
├─ Database query time
└─ Stripe API calls
```

---

## Emergency Runbook Reference

See [RUNBOOK.md](./RUNBOOK.md) for:
- Database connection lost
- Rate limiter failing
- Payment processing stuck
- High error rate response
- Regular maintenance tasks

---

## Future Improvements

1. **Database Replication** — Read replicas for analytics queries
2. **GraphQL Layer** — Alternative to tRPC for mobile app
3. **Mobile App** — React Native version (same backend)
4. **Blockchain Verification** — Attendance certificates
5. **Provider Marketplace** — Discover activities across regions
6. **Parent Community** — Reviews, recommendations, parent forums

---

## Additional Resources

- [API Documentation](./docs/API.md)
- [Security & Compliance](./SECURITY.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Operational Runbook](./RUNBOOK.md)
