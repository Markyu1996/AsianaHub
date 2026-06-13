// src/app/api/requests/[id]/approved-date/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { updateApprovedDateSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin only — lets admins correct/backdate the approval date for backlog.
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid request ID')

    const body = await req.json()
    const parsed = updateApprovedDateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const request = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!request) return apiError('Request not found', 404)
    if (request.status !== 'completed') {
      return apiError('Only completed (approved) requests have an approval date')
    }

    // Anchor to midday UTC so the calendar date is stable across time zones.
    const approvedAt = new Date(`${parsed.data.approvedDate}T12:00:00Z`)
    if (isNaN(approvedAt.getTime())) return apiError('Enter a valid date')
    if (approvedAt.getTime() > Date.now()) {
      return apiError('Approval date cannot be in the future')
    }

    const updated = await prisma.advanceRequest.update({
      where: { id },
      data: { returnedAt: approvedAt },
      include: {
        student: true,
        requester: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
      },
    })

    await logAudit(session.id, 'APPROVED_DATE_UPDATED', 'request', id, {
      previousApprovedAt: request.returnedAt,
      approvedAt,
    })

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Update approved date error:', err)
    return apiError('Something went wrong', 500)
  }
}
