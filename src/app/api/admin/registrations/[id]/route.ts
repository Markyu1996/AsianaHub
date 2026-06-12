// src/app/api/admin/registrations/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireRole, logAudit } from '@/src/lib/auth'
import { apiError, apiSuccess } from '@/src/lib/utils'
import { sendAccountApprovedEmail } from '@/src/lib/email'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  role: z.enum(['requester', 'approver', 'admin']).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid user ID')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const { action, role } = parsed.data

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return apiError('User not found', 404)
    if (user.status !== 'pending_approval') return apiError('User is not pending approval')

    if (action === 'approve') {
      if (!role) return apiError('Role is required when approving')

      await prisma.user.update({
        where: { id },
        data: { status: 'active', role }
      })

      await logAudit(session.id, 'ACCOUNT_APPROVED', 'user', id, { role })

      // Send email notification
      try {
        await sendAccountApprovedEmail(user.email, user.name)
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr)
        // Don't fail the request if email fails
      }

      return apiSuccess({ message: `Account approved with role: ${role}` })
    } else {
      // Reject = delete the pending registration
      await prisma.user.delete({ where: { id } })
      await logAudit(session.id, 'REGISTRATION_REJECTED', 'user', id)
      return apiSuccess({ message: 'Registration rejected and removed' })
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Registration action error:', err)
    return apiError('Something went wrong', 500)
  }
}
