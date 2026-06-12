// src/app/api/auth/change-password/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, verifyPassword, hashPassword, logAudit } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { currentPassword, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return apiError('User not found', 404)

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return apiError('Current password is incorrect', 401)

    const passwordHash = await hashPassword(password)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false }
    })

    await logAudit(user.id, 'PASSWORD_CHANGED', 'user', user.id)
    return apiSuccess({ message: 'Password changed successfully.' })
  } catch (err) {
    console.error('Change password error:', err)
    return apiError('Something went wrong', 500)
  }
}
