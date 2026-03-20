# KidSpark PCI DSS v4.0 Compliance

## Scope: SAQ A (Self-Assessment Questionnaire A)

KidSpark uses Stripe Payment Element exclusively for card data collection.
**No raw card data (PAN, CVV, expiry) ever touches our servers.**

## Compliance Checklist

### Card Data Handling
- [x] Only Stripe Payment Element used for card collection (iframe-based)
- [x] No raw card numbers stored, processed, or transmitted by our application
- [x] `stripePaymentMethodId` stored (Stripe's token, not raw card data)
- [x] `last4` stored for display purposes only (PCI-safe)
- [x] `brand` stored for display purposes only (visa, mastercard, etc.)
- [x] No CVV ever stored or logged
- [x] No full PAN ever logged in any log output

### Transport Security
- [x] TLS 1.2+ enforced on all connections
- [x] TLS 1.0 and 1.1 disabled
- [x] HSTS enabled with `max-age=63072000; includeSubDomains; preload`
- [x] All HTTP traffic redirected to HTTPS via `upgrade-insecure-requests` CSP

### Stripe Integration Security
- [x] Stripe webhook signatures verified with `stripe.webhooks.constructEvent()`
- [x] Invalid webhook signatures return HTTP 400 (never processed)
- [x] `STRIPE_SECRET_KEY` stored in environment variables only
- [x] `STRIPE_WEBHOOK_SECRET` stored in environment variables only
- [x] No Stripe keys in source code or git history
- [x] Stripe.js loaded from `https://js.stripe.com` only (CSP enforced)

### Access Control
- [x] Payment data accessible only to authorized provider roles (OWNER/ADMIN)
- [x] All payment operations logged to AuditLog
- [x] Session-based authentication required for all payment endpoints

### Logging & Monitoring
- [x] All payment events logged to AuditLog with: userId, action, timestamp
- [x] Audit logs do NOT contain: card numbers, CVV, full PAN, Stripe secret keys
- [x] Sentry configured for error monitoring (no PII in error payloads)
- [x] Failed payment attempts logged for fraud monitoring

### Vulnerability Management
- [x] `npm audit --audit-level=critical` run before every deployment
- [x] Zero critical CVEs in production dependencies
- [x] Quarterly ASV (Approved Scanning Vendor) scans scheduled
- [x] Annual penetration test scheduled

### Network Security
- [x] Content-Security-Policy restricts script sources to self + js.stripe.com
- [x] Frame-src restricted to js.stripe.com
- [x] Connect-src restricted to self + api.stripe.com
- [x] Rate limiting on all API endpoints

## Stripe Connect (Multi-Tenant Payouts)

- Stripe Connect Express accounts used for provider payouts
- Provider KYC handled by Stripe (no sensitive documents on our servers)
- Platform fee deducted before payout (configurable per tier)
- Payout schedule: daily, weekly, or monthly (provider choice)

## Annual Compliance Tasks

| Task | Frequency | Owner |
|------|-----------|-------|
| SAQ A self-assessment | Annual | Engineering Lead |
| ASV vulnerability scan | Quarterly | Security Team |
| Penetration test | Annual | External Vendor |
| Stripe key rotation | Annual | Engineering Lead |
| PCI policy review | Annual | Engineering Lead |
| Employee security training | Annual | Engineering Lead |
