// src/app/api/students/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { studentSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'
import { z } from 'zod'

const updateStudentSchema = studentSchema.extend({
  isActive: z.boolean().optional(),
}).partial()

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid student ID')

    const body = await req.json()
    const parsed = updateStudentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) return apiError('Student not found', 404)

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...parsed.data,
        name: parsed.data.name ? parsed.data.name.toUpperCase() : undefined,
        updatedBy: session.id,
      }
    })

    await logAudit(session.id, 'STUDENT_UPDATED', 'student', id, parsed.data)

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['admin'])
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid student ID')

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) return apiError('Student not found', 404)

    // Check for active requests
    const activeRequests = await prisma.advanceRequest.count({
      where: { studentId: id, status: { in: ['pending', 'attended', 'pending_return'] } }
    })

    if (activeRequests > 0) {
      return apiError('Cannot delete student with active advance requests')
    }

    await prisma.student.delete({ where: { id } })
    await logAudit(session.id, 'STUDENT_DELETED', 'student', id)

    return apiSuccess({ message: 'Student deleted' })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}
