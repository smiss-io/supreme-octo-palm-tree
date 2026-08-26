# KidSpark Operational Runbook

## On-Call Emergency Procedures

**On-Call Contact**: See team Slack #oncall  
**Escalation**: If unsure, page the engineering lead  
**Status Page**: status.kidspark.app

---

## Critical Alerts & Response

### 🔴 Database Connection Lost

**Symptom**: All API requests fail with 500, Sentry shows connection errors

**Immediate Actions** (< 1 min):

```bash
# 1. Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# 2. Check if database service is running
# If self-hosted: systemctl status postgresql
# If managed: Check cloud provider console

# 3. Verify DATABASE_URL environment variable
echo $DATABASE_URL
# Should show: postgresql://user:pass@host:port/dbname
```

**If Database Is Down** (5-10 min):

1. Check cloud provider status (AWS, Azure, etc.)
2. Trigger failover to replica (if available)
3. Update `DATABASE_URL` environment variable to replica
4. Redeploy application:
   ```bash
   git push origin main  # or use deployment tool
   ```
5. Monitor Sentry for recovery

**If Replica Not Available**:

1. Restore from latest backup (typically < 1 hour old)
2. Notify customers: "Brief service interruption, data restored"
3. Verify data integrity (count records in key tables)
4. Resume normal operations

**Post-Incident**:
- [ ] Root cause: Why did DB fail?
- [ ] Review backup restoration procedure (did it work?)
- [ ] Check monitoring alerts (did we detect it fast enough?)

---

### 🔴 Rate Limiter Failing (Redis Down)

**Symptom**: Requests return 429 (Too Many Requests) or error logs show "Rate limiting service unavailable"

**Behavior**: By design, rate limiting **fails open** — if Redis is down, requests are allowed through (but logged). This prevents cascading failures.

**Immediate Actions**:

```bash
# 1. Test Redis connectivity
redis-cli PING
# Should return: PONG

# 2. If using Upstash (managed Redis):
# Check status at: https://console.upstash.com/

# 3. Check error logs for rate limiting issues
# In Sentry, filter: "Rate limiting service unavailable"
```

**If Redis Down**:

1. Notify Upstash support (if managed)
2. Application will continue serving (rate limits disabled)
3. Monitor for abuse (sudden traffic spike)
4. Once Redis recovers, rate limiting automatically re-engages (no redeploy needed)

**After Recovery**:
- [ ] Verify rate limiters are working (`X-RateLimit-*` headers present)
- [ ] Check for unusual traffic during outage
- [ ] Review if any abuse occurred

---

### 🔴 Payment Processing Stuck

**Symptom**: Users report "payment failed" but Stripe shows payment succeeded. Or vice versa. Booking status doesn't update.

**Investigation** (< 5 min):

```bash
# 1. Query recent payment records
SELECT * FROM "Payment" 
WHERE status = 'PENDING' 
ORDER BY "createdAt" DESC 
LIMIT 10;

# 2. Check if webhook was received
SELECT * FROM "AuditLog" 
WHERE action LIKE 'stripe.webhook%' 
ORDER BY "createdAt" DESC 
LIMIT 20;

# 3. Check Stripe dashboard
# https://dashboard.stripe.com/events
# Look for payment_intent.succeeded events

# 4. Manual reconciliation
SELECT p.id, p.status, p."stripePaymentIntentId", b.status as booking_status
FROM "Payment" p
LEFT JOIN "Booking" b ON p.id = b."paymentId"
WHERE p."createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY p."createdAt" DESC;
```

**If Webhook Was Received But Status Not Updated**:

1. Manually fix in database:
   ```sql
   UPDATE "Payment" 
   SET status = 'SUCCEEDED', "paidAt" = NOW()
   WHERE "stripePaymentIntentId" = 'pi_xxx';
   
   UPDATE "Booking" 
   SET status = 'CONFIRMED'
   WHERE id = 'booking-id-xxx';
   ```

2. Trigger missing automations (email, SMS):
   ```bash
   # Add job to queue manually (or use admin panel)
   # POST /api/admin/jobs/reprocess-booking?bookingId=xxx
   ```

3. Log incident to Sentry (manual note)

**If Webhook Was Never Received**:

1. Replay webhook from Stripe dashboard:
   - Go to: https://dashboard.stripe.com/events
   - Find the payment_intent.succeeded event
   - Click "Resend event"
   - KidSpark webhook handler will process it

2. Verify webhook endpoint is configured:
   ```bash
   # Check: https://dashboard.stripe.com/webhooks
   # Endpoint should be: https://kidspark.app/api/webhooks/stripe
   # Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, charge.dispute.created
   ```

**After Fix**:
- [ ] Verify booking status is CONFIRMED
- [ ] Confirm user received confirmation email
- [ ] Check payment appears in provider's payouts

---

### 🔴 High Error Rate Alert (> 5% of requests failing)

**Immediate Actions** (< 2 min):

1. Check Sentry dashboard: https://sentry.io/organizations/kidspark/
   - Which endpoint is failing?
   - Which error code (500, 429, etc.)?
   - Is it affecting all users or specific organizations?

2. Check infrastructure:
   ```bash
   # Are we running out of resources?
   # CPU: Should be < 80%
   # Memory: Should be < 85%
   # Disk: Should be < 90%
   
   # Check deployment provider
   # Vercel: https://vercel.com/dashboard
   # Self-hosted: df -h, top
   ```

3. Check recent deployments:
   ```bash
   # Did we deploy in last 30 minutes?
   # If yes: Rollback to previous version
   
   git log --oneline -5
   # If last commit is suspect, rollback
   git revert HEAD
   git push origin main
   ```

**Common Error Causes**:

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'userId' of null` | Session missing | Restart session middleware |
| `ECONNREFUSED` on database | PostgreSQL connection lost | See "Database Connection Lost" section |
| `Invalid Stripe API key` | KEY rotated or incorrect | Verify `STRIPE_SECRET_KEY` in env vars |
| `CORS error` | Frontend requesting wrong endpoint | Check `TRPC_CLIENT` URL in frontend env |
| `Timeout connecting to Stripe` | Stripe API slow | Check Stripe status page |

**If Error Persists**:

1. Isolate the problem:
   - Is it all users? One endpoint? One organization?
   - What changed recently? (Deployment, config change, traffic spike)

2. Escalate:
   ```
   Slack message to #oncall:
   "ERROR ALERT: [Endpoint] failing with [ErrorCode]
   Impact: [# users affected]
   Last deploy: [Time]
   Action taken: [Rollback/Scaling/Investigation]"
   ```

3. Page engineering lead if needed

---

## Regular Maintenance Tasks

### Daily (Automated)

- [ ] Database backup runs (check backup size, completeness)
- [ ] Error logs ingested to Sentry (check alert count < 100)
- [ ] Rate limiter is functioning (check middleware logs)
- [ ] BullMQ workers are processing jobs (check queue depth)

**Verification**:
```bash
# Check backup ran
ls -lh /backups/database/ | head -5
# Should show daily backup file

# Check Sentry alerts
# https://sentry.io/organizations/kidspark/

# Check job queue depth
# Via Bull Arena dashboard: bull-arena.kidspark.app
# Queue depth should be < 1000
```

---

### Weekly (Manual)

**Monday Morning**:

1. **Review error trends**
   - Sentry: Any new recurring errors?
   - PostHog: Unusual traffic pattern?
   - Slack: Any user reports of issues?

2. **Check slow queries**
   ```bash
   # Enable Prisma query logging (1 week only)
   # Redeploy with: PRISMA_LOG_LEVEL=debug
   # Check for queries taking > 1s
   ```

3. **Review rate limiter hits**
   ```bash
   # Check if any legitimate users are being rate limited
   SELECT "ipAddress", COUNT(*) as hit_count 
   FROM "AuditLog" 
   WHERE action LIKE '%429%' 
   GROUP BY "ipAddress" 
   ORDER BY hit_count DESC 
   LIMIT 10;
   # If real users: Increase limits
   ```

4. **Payment reconciliation**
   ```bash
   # Verify Stripe payouts match our records
   SELECT 
     SUM("amount") as total_revenue,
     COUNT(*) as transaction_count,
     COUNT(DISTINCT "organizationId") as providers
   FROM "Payment"
   WHERE status = 'SUCCEEDED' 
     AND "createdAt" > NOW() - INTERVAL '7 days';
   # Compare with Stripe dashboard balance
   ```

---

### Monthly (1st of month)

1. **Security audit**
   - [ ] Check for committed secrets: `git log --all --diff-filter=A --name-only | grep -i secret`
   - [ ] Review new npm dependencies: `npm audit`
   - [ ] Verify security headers: curl -I https://kidspark.app

2. **Capacity planning**
   ```bash
   # Are we approaching any limits?
   # Stripe: API request rate? Account balance?
   # Redis: Memory usage? Keys count?
   # S3: Storage size?
   # PostgreSQL: Disk usage? Row counts?
   
   # Example: Check DB size
   SELECT 
     schemaname,
     SUM(heap_blks_read) as heap_read_count,
     SUM(heap_blks_hit) as heap_hit_count
   FROM pg_statio_user_tables
   GROUP BY schemaname;
   ```

3. **Backup integrity**
   - [ ] Test restore from backup to staging
   ```bash
   # 1. Restore latest backup to staging database
   # 2. Run: npm run db:migrate (ensure schema up to date)
   # 3. Run: npm run db:seed (populate sample data)
   # 4. Smoke test: Browse staging site, verify data
   ```

4. **Certificate expiration check**
   ```bash
   # SSL certificate expiring soon?
   echo | openssl s_client -servername kidspark.app -connect kidspark.app:443 2>/dev/null | openssl x509 -noout -dates
   # Should show: Not After: [Date at least 30 days away]
   ```

---

### Quarterly (Every 90 days)

1. **Dependency updates**
   ```bash
   npm outdated           # Show outdated packages
   npm update --save      # Update to latest compatible
   npm run test           # Verify nothing breaks
   ```

2. **Performance review**
   - [ ] Sentry: P95 latency trend (improving/degrading?)
   - [ ] PostHog: Feature adoption (are GROW+/SCALE users adopting new features?)
   - [ ] Stripe: Revenue trend, churn rate
   - [ ] User feedback: Slack, GitHub issues

3. **Disaster recovery drill**
   - [ ] Can we restore full database backup? ✅ (1-2 hours)
   - [ ] Can we migrate to new server? ✅ (30 min)
   - [ ] Can we switch primary/replica? ✅ (5 min)
   - [ ] Document any issues found

4. **Security review**
   - [ ] Penetration test (hire external firm)
   - [ ] Code audit (especially recent changes)
   - [ ] COPPA compliance check (child data handling)
   - [ ] Stripe PCI-DSS compliance report

---

### Annually (Every 12 months)

1. **Encryption key rotation**
   - [ ] Current `ENCRYPTION_KEY`: How old?
   - [ ] If > 1 year: Plan key rotation
   ```bash
   # Key rotation process:
   # 1. Generate new ENCRYPTION_KEY (64 hex chars)
   # 2. Deploy new key to staging, test
   # 3. Deploy to production
   # 4. Re-encrypt child PII with new key
   #    (Code: apps/web/server/jobs/rotate-keys.ts)
   # 5. Destroy old key securely
   # 6. Document in security log
   ```

2. **Cost optimization**
   - [ ] Stripe fees: Are we missing volume discounts?
   - [ ] Compute costs: Can we downsize servers?
   - [ ] Storage costs: Can we archive old data?
   - [ ] Database: Index optimization, query efficiency

3. **Compliance review**
   - [ ] COPPA: Still compliant? Any new regulations?
   - [ ] GDPR: Do we have EU users? Compliance needed?
   - [ ] SOC 2: Should we pursue certification?
   - [ ] PCI-DSS: Stripe handles this, but verify scoping

---

## Common Operational Tasks

### Scaling Up (Before Expected Traffic Spike)

```bash
# 1. Increase database connection pool
# ENV: DATABASE_POOL_SIZE=50

# 2. Increase Redis memory limit (Upstash)
# https://console.upstash.com/ → Settings → Memory

# 3. Pre-warm caches
# Run: npm run db:cache-warm

# 4. Deploy and monitor
git push origin main
# Watch Sentry for errors
# Check PostHog for latency
```

### Deploying a Database Migration

```bash
# 1. Prepare migration on staging
git checkout -b feature/migration-xyz
npx prisma migrate dev --name "description"

# 2. Review migration file
# migrations/[timestamp]_description/migration.sql
# Check for breaking changes (e.g., ALTER TABLE DROP COLUMN)

# 3. Test on staging
git push origin feature/migration-xyz
# Wait for staging deployment
# Run smoke tests: npm run test:e2e

# 4. Merge to main
# PR → Approval → Merge to main
# Automatic deployment to production

# 5. Monitor migration
# In Sentry, watch for "database query errors"
# Migration should complete in < 5 minutes for large tables
# If taking > 30 min: Check PostgreSQL logs

# 6. Verify
SELECT version FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 1;
# Should show your new migration
```

### Adding a New Environment Variable

```bash
# 1. Update .env.example
cat >> .env.example << 'EOF'
# New variable description
NEW_VAR_NAME=example_value
EOF

# 2. Document in CONTRIBUTING.md and SECURITY.md
# Explain what it does, security implications

# 3. Update deployment scripts to inject value
# (Platform-specific: Vercel env vars, GitHub Actions secrets, etc.)

# 4. Update code to validate variable exists
# In apps/web/lib/config.ts:
if (!process.env.NEW_VAR_NAME) {
  throw new Error('NEW_VAR_NAME environment variable is required')
}

# 5. Deploy
git push origin main
# On deployment, ensure variable is set before app starts
```

### Debugging Production Issue (Without Stopping Service)

```bash
# 1. Enable debug logging (temporary)
# Redeploy with LOG_LEVEL=debug
# This will spam Sentry/CloudWatch, so only do 30 min at a time

# 2. Increase error verbosity
# In Sentry, enable: Settings → Inbound Filters → "Remove breadcrumbs"
# This shows full stack traces

# 3. Query audit logs directly
SELECT * FROM "AuditLog" 
WHERE action = 'problematic.procedure'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

# 4. Check recent code changes
git log --oneline -10

# 5. Revert if needed
git revert HEAD
git push origin main

# 6. Disable debug logging
# Redeploy without LOG_LEVEL=debug
```

---

## Contacts & Escalation

### By Severity

**Critical** (P0 - User-facing outage, payment failing):
1. Page on-call engineer immediately
2. Slack #incident channel
3. Post status update to status.kidspark.app

**High** (P1 - Degraded performance, auth issues):
1. Slack #oncall
2. Start incident investigation
3. Update status page if affecting users

**Medium** (P2 - Intermittent errors, slow queries):
1. Create GitHub issue
2. Discuss in #engineering channel
3. Plan fix for next sprint

**Low** (P3 - Documentation, nice-to-haves):
1. Create GitHub issue
2. Plan for backlog

### Team Contacts

- **Engineering Lead**: [@name in Slack](slack://user?team=T123&id=U456)
- **On-Call Rotation**: See Slack topic in #oncall
- **Stripe Support**: dashboard.stripe.com (priority support if activated)
- **Upstash Support**: console.upstash.com
- **Hosting Support**: [Platform support portal]

---

## Checklists

### Pre-Launch (Before Every Production Deploy)

- [ ] Run `./scripts/prelaunch-check.sh` — all checks pass
- [ ] Tests pass: `npm test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Staging deployment verified (2+ hours running)
- [ ] Sentry alerts reviewed (no new errors)
- [ ] PostHog metrics healthy (latency, error rate)
- [ ] Backup from night before completed
- [ ] Team notified: "Deploying v1.2.3 in 10 minutes"

### Post-Launch (After Every Production Deploy)

- [ ] Sentry errors < 5 for first hour
- [ ] Users can sign up (test account)
- [ ] Users can book activity (full flow test)
- [ ] Payment works (test card)
- [ ] Confirmation email sent
- [ ] Attendance check-in works
- [ ] Provider dashboard loads
- [ ] Reports generate without error
- [ ] Slack #incident thread resolved

### Post-Incident (After Every Production Incident)

- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Monitoring improved (so it's caught earlier next time)
- [ ] Team debriefed (what went wrong, what we learned)
- [ ] Runbook updated (if this scenario wasn't covered)
- [ ] Customers notified (postmortem, steps taken)
- [ ] GitHub issue created (prevent future regression)

---

## Useful Links

- **Sentry**: https://sentry.io/organizations/kidspark/
- **PostHog**: https://posthog.com/project/[project-id]
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Upstash Console**: https://console.upstash.com/
- **Vercel Dashboard**: https://vercel.com/dashboard (if using Vercel)
- **GitHub Repo**: https://github.com/smiss-io/supreme-octo-palm-tree
- **Status Page**: status.kidspark.app
- **Bull Arena**: bull-arena.kidspark.app (job queue dashboard)

---

## Appendix: SQL Queries

### Find Users by Email

```sql
SELECT id, email, role, "createdAt" FROM "User" WHERE email = 'user@example.com';
```

### Find All Bookings for a User

```sql
SELECT 
  b.id, b.status, b."createdAt",
  a.name as activity_name, s."startTime",
  p.status as payment_status, p.amount
FROM "Booking" b
JOIN "ActivitySession" s ON b."activitySessionId" = s.id
JOIN "Activity" a ON s."activityId" = a.id
LEFT JOIN "Payment" p ON b."paymentId" = p.id
WHERE b."parentProfileId" IN (
  SELECT id FROM "ParentProfile" WHERE "userId" = 'user-id-xxx'
)
ORDER BY b."createdAt" DESC;
```

### Revenue Report (Last 30 Days)

```sql
SELECT 
  DATE_TRUNC('day', p."createdAt") as date,
  COUNT(*) as transaction_count,
  SUM(p.amount) / 100.0 as total_revenue_usd,
  AVG(p.amount) / 100.0 as avg_transaction_usd
FROM "Payment" p
WHERE p.status = 'SUCCEEDED' 
  AND p."createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', p."createdAt")
ORDER BY date DESC;
```

### Find Active Users (Booked in Last 7 Days)

```sql
SELECT DISTINCT u.id, u.email, COUNT(b.id) as booking_count
FROM "User" u
JOIN "ParentProfile" pp ON u.id = pp."userId"
JOIN "Booking" b ON pp.id = b."parentProfileId"
WHERE b."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email
ORDER BY booking_count DESC;
```

---

**Last Updated**: 2026-08-26  
**Next Review**: 2026-09-26
