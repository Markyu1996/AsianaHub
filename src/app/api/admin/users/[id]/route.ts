// src/app/api/admin/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireRole, hashPassword, logAudit } from '@/src/lib/auth'
import { updateUserSchema } from '@/src/lib/validations'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid user ID')

    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return apiError('User not found', 404)

    // Prevent admin from deactivating themselves
    if (id === session.id && parsed.data.status === 'deactivated') {
      return apiError('You cannot deactivate your own account')
    }

    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, status: true }
    })

    await logAudit(session.id, 'USER_UPDATED', 'user', id, parsed.data)
    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid user ID')

    if (id === session.id) return apiError('You cannot delete your own account')

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return apiError('User not found', 404)

    await prisma.user.delete({ where: { id } })
    await logAudit(session.id, 'USER_DELETED', 'user', id, { email: user.email })

    return apiSuccess({ message: 'User deleted' })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}
