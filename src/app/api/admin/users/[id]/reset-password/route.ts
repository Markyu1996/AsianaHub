// src/app/api/admin/users/[id]/reset-password/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireRole, hashPassword, logAudit } from '@/src/lib/auth'
import { apiError, apiSuccess } from '@/src/lib/utils'
import { z } from 'zod'

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number')
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid user ID')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return apiError('User not found', 404)

    const passwordHash = await hashPassword(parsed.data.newPassword)
    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, lockedAt: null }
    })

    await logAudit(session.id, 'ADMIN_RESET_PASSWORD', 'user', id)
    return apiSuccess({ message: 'Password reset. User must change it on next login.' })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}
