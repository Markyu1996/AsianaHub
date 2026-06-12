// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, isAccountLocked, logAudit } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'
import { cookies } from 'next/headers'

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return apiError('Invalid email or password', 401)
    }

    if (user.status === 'pending_approval') {
      return apiError('Your account is pending admin approval.', 403)
    }

    if (user.status === 'deactivated') {
      return apiError('Your account has been deactivated. Contact your administrator.', 403)
    }

    if (isAccountLocked(user.lockedAt)) {
      return apiError('Account locked due to too many failed attempts. Try again in 30 minutes.', 423)
    }

    const valid = await verifyPassword(password, user.passwordHash)

    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1
      const shouldLock = newAttempts >= MAX_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedAt: shouldLock ? new Date() : user.lockedAt,
        }
      })

      if (shouldLock) {
        return apiError('Too many failed attempts. Account locked for 30 minutes.', 423)
      }

      return apiError(`Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`, 401)
    }

    // Success — reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedAt: null }
    })

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    }

    const token = await createToken(sessionUser)

    cookies().set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    await logAudit(user.id, 'USER_LOGIN', 'user', user.id)

    return apiSuccess({ user: sessionUser })
  } catch (err) {
    console.error('Login error:', err)
    return apiError('Something went wrong', 500)
  }
}
