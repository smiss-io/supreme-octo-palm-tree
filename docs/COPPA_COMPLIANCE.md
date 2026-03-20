# KidSpark COPPA Compliance Documentation

## Overview

The Children's Online Privacy Protection Act (COPPA) applies to children under 13
in the United States. KidSpark collects limited child data for operational purposes
and enforces strict protections.

## Data Inventory — Child PII Collected

| Field | Purpose | Encrypted | Retention |
|-------|---------|-----------|-----------|
| firstName | Identify child on rosters | Yes (AES-256-GCM) | Until parent requests deletion |
| lastName | Identify child on rosters | Yes (AES-256-GCM) | Until parent requests deletion |
| dateOfBirth | Age verification, age-appropriate activities | Yes (AES-256-GCM) | Until parent requests deletion |
| medicalNotes | Safety — instructor awareness | Yes (AES-256-GCM) | Until parent requests deletion |
| allergies | Safety — instructor awareness | Yes (AES-256-GCM) | Until parent requests deletion |
| emergencyContact | Safety — emergency situations | Yes (AES-256-GCM) | Until parent requests deletion |
| photoConsent | Permission flag for photos | No (boolean) | Until parent requests deletion |

## Data NOT Collected About Children

- No browsing behavior or analytics tied to child identity
- No behavioral advertising profiles
- No geolocation data tied to children
- No social media accounts or handles
- No biometric data

## Parental Consent

1. **Account Creation**: Parent creates account (must be 18+)
2. **Child Profile**: Parent adds child, sees COPPA consent acknowledgment
3. **Verifiable Consent**: Parent must acknowledge data collection purpose
4. **Opt-Out**: Parent can request deletion at any time

## Parental Rights

### Access
- Parents can view all data collected about their children via `/parent/children/[childId]`
- Decrypted child data shown only to the authenticated parent

### Deletion
- Parents can request deletion via child profile settings
- `deleteChildData()` function:
  - Replaces firstName and lastName with `[DELETED]`
  - Sets dateOfBirth to `1970-01-01`
  - Nullifies medicalNotes, allergies, emergencyContact
  - Sets `deletedAt` timestamp
  - Deletes all AttendanceRecord entries
  - Deletes all ProgressRecord entries
  - **Retains**: anonymized Booking records for financial compliance

### Timeline
- Deletion requests processed within 30 days
- Automated: deletion is immediate when parent triggers it in the app

## Third-Party Data Sharing

Child PII is shared ONLY with these operational processors:

| Processor | Data Shared | Purpose |
|-----------|-------------|---------|
| Resend (email) | Child first name only | Booking confirmation emails |
| Database (PostgreSQL) | All child fields (encrypted) | Operational storage |

**NOT shared with**:
- Analytics providers (PostHog) — no child PII in events
- Advertising networks — none used
- Search engines (Meilisearch) — no child PII indexed
- Maps (Mapbox) — no child data sent

## Technical Controls

1. **Encryption**: All child PII encrypted with AES-256-GCM before database storage
2. **Access Control**: Child data accessible only by authenticated parent or authorized provider staff
3. **IDOR Prevention**: Every child data request validates `parentProfileId` ownership
4. **Audit Logging**: All access to child data logged in AuditLog
5. **Soft Delete**: Child records use soft delete, PII wiped immediately
6. **No Caching**: Decrypted child PII never cached — decrypted on-the-fly per request

## Data Retention Schedule

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Active child profiles | Until parent deletes | PII wipe + soft delete |
| Deleted child profiles | PII wiped immediately | Anonymized booking records retained 7 years |
| Attendance records | Deleted with child | Hard delete |
| Progress records | Deleted with child | Hard delete |
| Booking records | 7 years (financial compliance) | Anonymized (child name = [DELETED]) |
