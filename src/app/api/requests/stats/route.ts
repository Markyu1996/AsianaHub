// src/app/api/requests/stats/route.ts
import { requireSession } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function GET() {
  try {
    const session = await requireSession()

    const where: Record<string, unknown> = { status: { not: 'deleted' } }
    if (session.role === 'requester') where.requesterId = session.id

    const [pending, attended, pendingReturn, completed, total] = await Promise.all([
      prisma.advanceRequest.count({ where: { ...where, status: 'pending' } }),
      prisma.advanceRequest.count({ where: { ...where, status: 'attended' } }),
      prisma.advanceRequest.count({ where: { ...where, status: 'pending_return' } }),
      prisma.advanceRequest.count({ where: { ...where, status: 'completed' } }),
      prisma.advanceRequest.count({ where }),
    ])

    return apiSuccess({ pending, attended, pendingReturn, completed, total })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    return apiError('Something went wrong', 500)
  }
}
