// src/app/api/auth/reset-password/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/lib/validations'
import { hashPassword, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { token, password } = parsed.data

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return apiError('This reset link is invalid or has expired.', 400)
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedAt: null }
    })

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    })

    await logAudit(resetToken.userId, 'PASSWORD_RESET_COMPLETED', 'user', resetToken.userId)

    return apiSuccess({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    return apiError('Something went wrong', 500)
  }
}
