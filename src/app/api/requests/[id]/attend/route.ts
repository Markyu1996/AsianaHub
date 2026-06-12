// src/app/api/requests/[id]/attend/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { attendRequestSchema } from '@/lib/validations'
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
    const parsed = attendRequestSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const request = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!request) return apiError('Request not found', 404)
    if (request.status !== 'pending') return apiError('Only pending requests can be attended')

    const updated = await prisma.advanceRequest.update({
      where: { id },
      data: {
        status: 'pending_return',
        attendedBy: session.id,
        attendedAt: new Date(),
        comment: parsed.data.comment || null,
      },
      include: {
        student: true,
        requester: { select: { id: true, name: true } },
        attendedByUser: { select: { id: true, name: true } },
      }
    })

    await logAudit(session.id, 'MARKED_ATTENDED', 'request', id, {
      comment: parsed.data.comment
    })

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Attend request error:', err)
    return apiError('Something went wrong', 500)
  }
}
