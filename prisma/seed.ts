// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedWorkdayDefaults() {
  // Default estimation settings (single row). Only created if absent so an
  // admin's saved values are never overwritten on re-seed.
  const settings = await prisma.workdaySettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    await prisma.workdaySettings.create({
      data: { id: 1, workdaysPerWeek: 6, requiredWorkdays: 0 },
    })
    console.log('✅ Default workday settings created (6 days/week).')
  }

  // Default employer groups, only when none exist yet.
  const groupCount = await prisma.employerGroup.count()
  if (groupCount === 0) {
    await prisma.employerGroup.createMany({
      data: [
        { name: 'Group A', cutoffDay: 12 },
        { name: 'Group B', cutoffDay: 18 },
        { name: 'Group C', cutoffDay: 30 },
      ],
    })
    console.log('✅ Default employer groups created (A/12, B/18, C/30).')
  }
}

async function main() {
  console.log('🌱 Seeding database...')

  await seedWorkdayDefaults()

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@asianahub.com' }
  })

  if (existing) {
    console.log('✅ Admin account already exists, skipping seed.')
    return
  }

  const passwordHash = await bcrypt.hash('Admin@1234!', 12)

  await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@asianahub.com',
      passwordHash,
      role: 'admin',
      status: 'active',
      mustChangePassword: true,
    }
  })

  console.log('✅ Default admin account created.')
  console.log('   Email:    admin@asianahub.com')
  console.log('   Password: Admin@1234!')
  console.log('   ⚠️  CHANGE THIS PASSWORD ON FIRST LOGIN!')

  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      entityType: 'user',
      metadata: JSON.stringify({ note: 'Initial admin account created by seed script' })
    }
  })
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
