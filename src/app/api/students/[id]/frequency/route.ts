// src/app/api/students/[id]/frequency/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { apiError, apiSuccess, getStartOfMonth } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession()
    const id = parseInt(params.id)
    if (isNaN(id)) return apiError('Invalid student ID')

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) return apiError('Student not found', 404)

    const count = await prisma.advanceRequest.count({
      where: {
        studentId: id,
        status: { not: 'deleted' },
        createdAt: { gte: getStartOfMonth() },
      }
    })

    return apiSuccess({ nextFrequency: count + 1, totalRequests: count })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    return apiError('Something went wrong', 500)
  }
}
