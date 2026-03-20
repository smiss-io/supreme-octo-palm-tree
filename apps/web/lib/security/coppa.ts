// COPPA applies to children under 13 in the USA

export function calculateAgeInYears(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--
  }
  return age
}

export function calculateAgeInMonths(dateOfBirth: Date): number {
  const today = new Date()
  return (
    (today.getFullYear() - dateOfBirth.getFullYear()) * 12 +
    (today.getMonth() - dateOfBirth.getMonth())
  )
}

export function requiresParentalConsent(dateOfBirth: Date): boolean {
  return calculateAgeInYears(dateOfBirth) < 13
}

// Child PII rules:
// 1. Collect ONLY what's operationally necessary
// 2. Encrypt all child PII fields at rest (AES-256-GCM)
// 3. Provide parental access/deletion endpoints
// 4. No behavioral advertising on child data
// 5. Data retention: delete child records on parent request within 30 days
// 6. No sharing child PII with third parties except operational processors

export async function deleteChildData(childId: string): Promise<void> {
  // Lazy import to avoid eager PrismaClient initialization in pure utility contexts
  const { db } = await import('../db')

  // Hard delete child PII, keep anonymized booking records for financials
  await db.$transaction([
    db.child.update({
      where: { id: childId },
      data: {
        firstName: '[DELETED]',
        lastName: '[DELETED]',
        dateOfBirth: new Date('1970-01-01'),
        medicalNotes: null,
        allergies: null,
        emergencyContact: null,
        deletedAt: new Date(),
      },
    }),
    db.attendanceRecord.deleteMany({ where: { childId } }),
    db.progressRecord.deleteMany({ where: { childId } }),
  ])
}

// Validate that only operationally necessary child data is collected
export const ALLOWED_CHILD_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'medicalNotes',
  'allergies',
  'emergencyContact',
  'photoConsent',
] as const

// Fields that must be encrypted before storage
export const ENCRYPTED_CHILD_FIELDS = [
  'dateOfBirth',
  'medicalNotes',
  'allergies',
  'emergencyContact',
  'phone', // on ParentProfile
] as const
