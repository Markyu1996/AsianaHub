// src/app/api/requests/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

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

    return apiSuccess(request)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Get request error:', err)
    return apiError('Something went wrong', 500)
  }
}
