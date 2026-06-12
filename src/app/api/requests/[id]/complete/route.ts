// src/app/api/requests/[id]/complete/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireRole, logAudit } from '@/src/lib/auth'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['approver', 'admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid request ID')

    const request = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!request) return apiError('Request not found', 404)
    if (request.status !== 'pending_return') {
      return apiError('Only requests in Pending Return status can be marked as returned')
    }

    const updated = await prisma.advanceRequest.update({
      where: { id },
      data: {
        status: 'completed',
        returnedBy: session.id,
        returnedAt: new Date(),
      },
      include: {
        student: true,
        requester: { select: { id: true, name: true } },
        attendedByUser: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
      }
    })

    await logAudit(session.id, 'MARKED_COMPLETED', 'request', id)

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Complete request error:', err)
    return apiError('Something went wrong', 500)
  }
}
