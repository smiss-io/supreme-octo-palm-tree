# Contributing to KidSpark

Welcome! This guide will help you set up your development environment and contribute to KidSpark.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/smiss-io/supreme-octo-palm-tree.git
cd supreme-octo-palm-tree
cp .env.example .env
```

### 2. Get Environment Variables

Request from team lead or ops:
- `DATABASE_URL` — PostgreSQL connection string (staging)
- `ENCRYPTION_KEY` — 64 hex characters (child PII encryption)
- `NEXTAUTH_SECRET` — Random 32+ char string
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` — From Stripe dashboard
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` — Rate limiting service
- `RESEND_API_KEY` — Email delivery
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — SMS

### 3. Install & Run

```bash
npm install
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Apply pending migrations
npm run dev              # Start dev server (http://localhost:3000)
```

### 4. Verify Setup

```bash
npm run typecheck        # TypeScript check
npm run lint             # ESLint check
npm test                 # Run unit tests
npm run audit:security   # Security audit
```

All should pass ✅

---

## Development Workflow

### Before Starting Work

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Code Style

- **Type Safety**: Full TypeScript, no `any`
- **Validation**: Zod schemas on all tRPC inputs
- **Error Handling**: Use `TRPCError` with proper codes
- **Comments**: Add only if "why" is non-obvious. Good names beat comments.
- **Security**: Never log PII, hash IPs, encrypt child data

### Example: Adding a tRPC Procedure

```typescript
// apps/web/server/routers/example.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const exampleRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // AuthN: protectedProcedure enforces session exists
      // AuthZ: Check user owns resource (if needed)
      
      const result = await ctx.db.example.create({
        data: {
          name: input.name,
          userId: ctx.session.userId,
        },
      })
      
      // Audit logging happens automatically via middleware
      return { id: result.id }
    }),
})
```

### Before Committing

```bash
npm run typecheck        # TypeScript errors?
npm run lint             # Code style?
npm test                 # All tests pass?
npm run audit:security   # New CVEs?
git diff                 # Review your changes
git add <files>
git commit -m "Clear message: what & why"
git push origin feature/your-feature-name
```

### Create a Pull Request

1. Go to GitHub, open PR against `main`
2. Fill in description: what changed, why, testing done
3. Link any related issues
4. Wait for CI checks to pass (TypeScript, lint, tests)
5. Request review from team
6. After approval, squash-and-merge to main

---

## Project Structure

```
apps/web/                          # Next.js app
├── app/
│   ├── api/                        # API routes & webhooks
│   │   ├── trpc/                   # tRPC endpoint
│   │   ├── webhooks/stripe/        # Stripe webhook handler
│   │   └── checkin/                # QR code check-in
│   ├── (auth)/                     # Auth pages
│   ├── (dashboard)/                # Authenticated pages
│   └── layout.tsx
├── server/
│   ├── routers/                    # tRPC routers (auth, child, booking, etc.)
│   ├── trpc.ts                     # tRPC setup, middleware, procedures
│   ├── automation/                 # Automation engine, triggers, actions
│   ├── jobs/                       # Background job handlers
│   └── ai/                         # ML/forecasting logic
├── lib/
│   ├── security/                   # Encryption, COPPA, auth helpers
│   ├── email.ts                    # Email template rendering
│   ├── db.ts                       # Prisma client
│   └── stripe.ts                   # Stripe integration
├── components/                     # React components
├── styles/                         # TailwindCSS styles
└── middleware.ts                   # Rate limiting, logging

packages/db/
├── schema.prisma                   # Database schema
├── migrations/                     # Migration history
└── seed.ts                         # Database seed data

scripts/
├── prelaunch-check.sh              # Pre-deployment checklist
└── seed.ts                         # Seed sample data

tests/
├── unit/                           # vitest unit tests
├── integration/                    # Integration tests
└── e2e/                            # Playwright e2e tests
```

---

## Testing

### Unit Tests

```bash
npm test                 # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Coverage report
```

**What to test**: Routers, utilities, calculations, edge cases

### Integration Tests

Test real database + tRPC calls. Example:

```typescript
// tests/integration/booking.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../apps/web/lib/db'

describe('Booking router', () => {
  beforeEach(async () => {
    // Setup test data
    await db.activitySession.deleteMany({})
  })

  it('confirms booking when payment succeeds', async () => {
    // Create activity, session, booking
    // Simulate payment webhook
    // Assert booking.status === 'CONFIRMED'
  })
})
```

### E2E Tests (Playwright)

```bash
npm run test:e2e        # Run Playwright tests
```

Test user flows: login → browse → book → payment → confirmation

---

## Database

### View Current Schema

```bash
npx prisma studio     # Open Prisma Studio (visual DB browser)
```

### Make a Schema Change

```bash
# 1. Edit packages/db/schema.prisma
# 2. Create migration
npx prisma migrate dev --name "description_of_change"
# 3. Test locally
npm run db:push
# 4. Commit schema.prisma + migration files
```

### Seed Sample Data

```bash
npm run db:seed        # Populate dev database with sample provider/activities
```

---

## Common Tasks

### Add a New tRPC Router

1. Create `apps/web/server/routers/newrouter.ts`
2. Export router with procedures
3. Add to `apps/web/server/routers/_app.ts`: `newRouter: newRouter,`
4. Test via tRPC client in component

### Add a New Database Table

1. Add model to `packages/db/schema.prisma`
2. Run: `npx prisma migrate dev --name "add_table_name"`
3. Use in Prisma queries: `ctx.db.tableName.findMany()`

### Add Authentication to a Route

```typescript
// Use protectedProcedure instead of publicProcedure
export const exampleRouter = router({
  getSecret: protectedProcedure.query(async ({ ctx }) => {
    // ctx.session is guaranteed to exist
    return { userId: ctx.session.userId }
  })
})
```

### Add Rate Limiting

Rate limiting is already configured in `middleware.ts`. All API routes are rate-limited by default. For custom limits:

```typescript
// In middleware.ts, add a new limiter:
const customRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, '1 h'),
  prefix: 'rl:custom',
})
```

### Encrypt Sensitive Data

For PII (child medical notes, emergency contacts):

```typescript
import { encrypt, decrypt } from '../../lib/security/encryption'

// Store:
const encrypted = encrypt('sensitive data')

// Retrieve:
const decrypted = decrypt(encrypted)
```

---

## Debugging

### TypeScript Errors

```bash
npm run typecheck       # See all TS errors
```

### Runtime Errors

- Check console: `npm run dev` shows errors in terminal
- Check browser DevTools: F12, Console tab
- Check Sentry: Production errors logged automatically

### Database Issues

```bash
npx prisma studio     # Browse DB state
npx prisma db pull    # Sync schema from database
```

### Slow Queries

Enable query logging:

```typescript
// In lib/db.ts
const db = new PrismaClient({
  log: ['query', 'error', 'warn'],
})
```

---

## Deployment

### Staging

```bash
git push origin feature/your-feature
# CI auto-deploys to staging on PR creation
# Test at: staging.kidspark.app
```

### Production

1. PR merged to `main`
2. Verify staging environment works
3. Deploy: `./scripts/prelaunch-check.sh` passes
4. Git tag: `git tag -a v1.2.3 -m "Release 1.2.3"`
5. Push tag: `git push origin v1.2.3`
6. CI auto-deploys to production

---

## Security Guidelines

### ✅ Do

- Validate all user input with Zod
- Hash passwords with bcrypt
- Encrypt PII before storage
- Log mutations to AuditLog
- Use environment variables for secrets
- Verify webhook signatures
- Check user permissions on protected routes
- Use parameterized database queries (Prisma does this)

### ❌ Don't

- Log PII or secrets to console
- Use `eval()` or `Function()` constructor
- Trust client-side validation alone
- Commit `.env` files
- Use `dangerouslySetInnerHTML` in React
- Disable type checking
- Create database backups manually (use automated backups)

---

## Getting Help

- **Quick questions**: Slack #engineering
- **Bugs or ideas**: Open a GitHub issue
- **Code review**: Tag reviewers on PR
- **Deployment help**: Page on-call engineer

---

## License

Copyright © 2026 KidSpark. All rights reserved.
