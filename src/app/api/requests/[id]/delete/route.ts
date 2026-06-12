// src/app/api/requests/[id]/delete/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireRole, logAudit } from '@/src/lib/auth'
import { deleteRequestSchema } from '@/src/lib/validations'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['approver', 'admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid request ID')

    const body = await req.json()
    const parsed = deleteRequestSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const request = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!request) return apiError('Request not found', 404)
    if (request.status === 'deleted') return apiError('Request is already deleted')

    // Approvers can only delete pending requests
    if (session.role === 'approver' && request.status !== 'pending') {
      return apiError('Approvers can only delete pending requests')
    }

    await prisma.advanceRequest.update({
      where: { id },
      data: {
        status: 'deleted',
        deletedBy: session.id,
        deletedAt: new Date(),
        comment: parsed.data.comment || request.comment,
      }
    })

    await logAudit(session.id, 'REQUEST_DELETED', 'request', id, {
      previousStatus: request.status,
      comment: parsed.data.comment
    })

    return apiSuccess({ message: 'Request deleted' })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Delete request error:', err)
    return apiError('Something went wrong', 500)
  }
}
