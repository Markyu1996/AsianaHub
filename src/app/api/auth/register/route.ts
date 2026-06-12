// src/app/api/auth/register/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, logAudit } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existing) {
      return apiError('An account with this email already exists')
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'pending',
        status: 'pending_approval',
      }
    })

    await logAudit(user.id, 'USER_REGISTERED', 'user', user.id, { email })

    return apiSuccess({ message: 'Registration successful. Await admin approval.' }, 201)
  } catch (err) {
    console.error('Register error:', err)
    return apiError('Something went wrong', 500)
  }
}
