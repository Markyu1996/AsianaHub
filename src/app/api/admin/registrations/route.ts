// src/app/api/admin/registrations/route.ts
import { requireRole } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function GET() {
  try {
    await requireRole(['admin'])

    const pending = await prisma.user.findMany({
      where: { status: 'pending_approval' },
      select: {
        id: true, name: true, email: true, createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return apiSuccess(pending)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}
