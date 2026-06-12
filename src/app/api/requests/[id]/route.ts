// src/app/api/requests/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireSession } from '@/src/lib/auth'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession()
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid request ID')

    const request = await prisma.advanceRequest.findUnique({
      where: { id },
      include: {
        student: true,
        requester: { select: { id: true, name: true, email: true } },
        attendedByUser: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
        deletedByUser: { select: { id: true, name: true } },
      }
    })

    if (!request) return apiError('Request not found', 404)

    // Requester can only see their own
    if (session.role === 'requester' && request.requesterId !== session.id) {
      return apiError('Not found', 404)
    }

    // Check for outstanding advances for the same student
    let hasOutstanding = false
    if (session.role === 'approver' || session.role === 'admin') {
      const outstanding = await prisma.advanceRequest.count({
        where: {
          studentId: request.studentId,
          id: { not: id },
          status: { in: ['attended', 'pending_return'] }
        }
      })
      hasOutstanding = outstanding > 0
    }

    return apiSuccess({ ...request, hasOutstanding })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Get request error:', err)
    return apiError('Something went wrong', 500)
  }
}
