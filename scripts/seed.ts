import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Little Stars Academy',
      slug: 'little-stars-academy',
      subscriptionTier: 'GROW',
    },
  })

  console.log('Created organization:', org.name)

  // Create a demo provider user
  const user = await prisma.user.create({
    data: {
      email: 'provider@example.com',
      // Password: "TestPassword123!" — bcrypt hash with cost 12
      passwordHash:
        '$2b$12$LJ3sNqCZpJBtJWkNqVFWXOzMG8m8eN9q5j3K4gN1X6v7JY3YK3C2O',
      role: 'PROVIDER',
      emailVerified: new Date(),
    },
  })

  await prisma.organizationUser.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  })

  // Create a demo parent
  const parent = await prisma.user.create({
    data: {
      email: 'parent@example.com',
      passwordHash:
        '$2b$12$LJ3sNqCZpJBtJWkNqVFWXOzMG8m8eN9q5j3K4gN1X6v7JY3YK3C2O',
      role: 'PARENT',
      emailVerified: new Date(),
      profile: {
        create: {
          firstName: 'Jane',
          lastName: 'Doe',
          timezone: 'America/Los_Angeles',
        },
      },
    },
  })

  // Create a demo location
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: 'Main Campus',
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      lat: 37.7749,
      lng: -122.4194,
    },
  })

  console.log('Created location:', location.name)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
