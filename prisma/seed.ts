// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@advancehub.com' }
  })

  if (existing) {
    console.log('✅ Admin account already exists, skipping seed.')
    return
  }

  const passwordHash = await bcrypt.hash('Admin@1234!', 12)

  await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@advancehub.com',
      passwordHash,
      role: 'admin',
      status: 'active',
      mustChangePassword: true,
    }
  })

  console.log('✅ Default admin account created.')
  console.log('   Email:    admin@advancehub.com')
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
