# KidSpark API & Webhook Reference

## Authentication

All API requests require authentication via session token in cookie or Authorization header.

### Session Management
- Login creates a session stored in PostgreSQL
- Sessions expire after configured duration
- All mutations are logged to AuditLog

## tRPC Routers

### Public Procedures (no auth)
| Router | Procedure | Description |
|--------|-----------|-------------|
| auth | register | Create parent or provider account |
| auth | login | Authenticate and create session |
| auth | verifyEmail | Verify email token |
| auth | forgotPassword | Send reset email |
| auth | resetPassword | Reset with token |

### Protected Procedures (authenticated user)
| Router | Procedure | Description |
|--------|-----------|-------------|
| parent | getProfile | Get parent profile |
| parent | updateProfile | Update parent details |
| child | create | Create child (encrypts PII) |
| child | update | Update child |
| child | delete | Soft delete + wipe PII (COPPA) |
| booking | initiate | Start booking flow |
| booking | cancel | Cancel with refund policy |
| booking | joinWaitlist | Join session waitlist (GROW+) |

### Provider Procedures (OWNER/ADMIN/MANAGER role)
| Router | Procedure | Description |
|--------|-----------|-------------|
| organization | create | Create organization |
| organization | update | Update org details |
| organization | connectStripe | Start Stripe Connect |
| activity | create | Create activity |
| activity | publish | Publish activity |
| session | create | Create session |
| attendance | getRoster | Get session roster |
| attendance | bulkMarkAttendance | Mark attendance |
| attendance | exportAttendance | CSV export |
| payment | refund | Process refund |
| payment | issueStoreCredit | Issue credit (SCALE) |
| automation | create | Create automation (GROW+) |
| reporting | revenue | Revenue report |
| reporting | enrollment | Enrollment report |
| reporting | exportReport | Export CSV/PDF |
| forecast | list | AI forecasts (SCALE) |
| forecast | sendAlert | Send forecast alert (SCALE) |

## Webhook Events

KidSpark sends webhook POST requests to configured endpoints with HMAC-SHA256 signatures.

### Signature Verification

All webhooks include an `X-KidSpark-Signature` header containing an HMAC-SHA256 hex digest.

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
const isValid = signature === req.headers['x-kidspark-signature'];
```

### Event Payloads

#### BOOKING_CONFIRMED
```json
{
  "event": "booking.confirmed",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "bookingId": "uuid",
    "activitySessionId": "uuid",
    "activityName": "string",
    "childFirstName": "string",
    "sessionDate": "2026-04-01T10:00:00Z",
    "totalInCents": 5000
  }
}
```

#### BOOKING_CANCELLED
```json
{
  "event": "booking.cancelled",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "bookingId": "uuid",
    "activitySessionId": "uuid",
    "reason": "string",
    "refundAmountCents": 5000
  }
}
```

#### PAYMENT_FAILED
```json
{
  "event": "payment.failed",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "paymentId": "uuid",
    "bookingId": "uuid",
    "amountCents": 5000,
    "failureReason": "string"
  }
}
```

#### WAITLIST_SPOT_OPENED
```json
{
  "event": "waitlist.spot_opened",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "activitySessionId": "uuid",
    "activityName": "string",
    "availableSpots": 1,
    "waitlistDepth": 3
  }
}
```

#### CLASS_24H_BEFORE
```json
{
  "event": "class.reminder_24h",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "activitySessionId": "uuid",
    "activityName": "string",
    "sessionDate": "2026-03-21T10:00:00Z",
    "enrolledCount": 15
  }
}
```

#### CONSECUTIVE_ABSENCES
```json
{
  "event": "attendance.consecutive_absences",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "childId": "uuid",
    "activityId": "uuid",
    "consecutiveCount": 3,
    "lastAttendedDate": "2026-03-10T10:00:00Z"
  }
}
```

#### MEMBERSHIP_EXPIRING
```json
{
  "event": "membership.expiring",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "bookingId": "uuid",
    "activityName": "string",
    "expiresAt": "2026-03-27T00:00:00Z",
    "daysRemaining": 7
  }
}
```

### Webhook Configuration

- **URL**: Must be HTTPS (HTTP rejected)
- **SSRF Protection**: Private IPs blocked (localhost, 10.x, 172.16-31.x, 192.168.x)
- **Timeout**: 10 seconds
- **Retries**: 3 attempts with exponential backoff on non-2xx responses
- **Secret**: Encrypted at rest with AES-256-GCM

## Stripe Webhook Events Handled

| Event | Action |
|-------|--------|
| `account.updated` | Store Stripe Connect account ID |
| `payment_intent.succeeded` | Confirm booking, send email |
| `payment_intent.payment_failed` | Update payment, trigger automation |
| `charge.refunded` | Update payment record |
| `charge.dispute.created` | Flag booking, notify provider |
| `customer.subscription.deleted` | Update booking status |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global (all /api/*) | 100 requests | 1 minute |
| Auth endpoints | 5 attempts | 15 minutes |

429 responses include `Retry-After` header.
