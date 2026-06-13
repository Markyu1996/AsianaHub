// src/app/api/auth/forgot-password/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validations'
import { apiError, apiSuccess, generateResetToken } from '@/lib/utils'
import { sendPasswordResetEmail } from '@/lib/email'
import { logAudit } from '@/lib/auth'

const EXPIRY_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '60')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { email } = parsed.data

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    console.log(`[forgot-password] lookup email=${email.toLowerCase()} found=${!!user} status=${user?.status ?? 'none'}`)

    if (user && user.status === 'active') {
      // Invalidate existing tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      })

      const token = generateResetToken()
      const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt }
      })

      await sendPasswordResetEmail(user.email, user.name, token)
      await logAudit(user.id, 'PASSWORD_RESET_REQUESTED', 'user', user.id)
    }

    return apiSuccess({
      message: 'If an account with that email exists, a reset link has been sent.'
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    return apiError('Something went wrong', 500)
  }
}
