// src/app/api/requests/[id]/approve/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { approveRequestSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['approver', 'admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid request ID')

    const body = await req.json()
    const parsed = approveRequestSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const request = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!request) return apiError('Request not found', 404)
    if (request.status !== 'pending') return apiError('Only pending requests can be approved')

    // Approval immediately completes the request — there is no separate
    // "student returns money" step. The approver is recorded as the completer.
    const updated = await prisma.advanceRequest.update({
      where: { id },
      data: {
        status: 'completed',
        returnedBy: session.id,
        returnedAt: new Date(),
        comment: parsed.data.comment || null,
      },
      include: {
        student: true,
        requester: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
      }
    })

    await logAudit(session.id, 'REQUEST_APPROVED', 'request', id, {
      comment: parsed.data.comment
    })

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Approve request error:', err)
    return apiError('Something went wrong', 500)
  }
}
