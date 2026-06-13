// src/app/api/workdays/groups/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { employerGroupSchema } from '@/lib/validations'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['admin'])

    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return apiError('Invalid group id')

    const body = await req.json()
    const parsed = employerGroupSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Invalid input')
    }
    const { name, cutoffDay } = parsed.data

    const group = await prisma.employerGroup.findUnique({ where: { id } })
    if (!group) return apiError('Employer group not found', 404)

    // Case-insensitive uniqueness, excluding the current row.
    const others = await prisma.employerGroup.findMany({
      where: { id: { not: id } },
      select: { name: true },
    })
    if (others.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      return apiError('An employer group with this name already exists')
    }

    const updated = await prisma.employerGroup.update({
      where: { id },
      data: { name, cutoffDay },
    })
    await logAudit(session.id, 'EMPLOYER_GROUP_UPDATED', 'workday', id, { name, cutoffDay })

    return apiSuccess(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Employer group PUT error:', err)
    return apiError('Something went wrong', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['admin'])

    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return apiError('Invalid group id')

    const group = await prisma.employerGroup.findUnique({
      where: { id },
      include: { _count: { select: { records: true } } },
    })
    if (!group) return apiError('Employer group not found', 404)

    // Block deletion while students are still linked to the group, so we never
    // orphan workday records.
    if (group._count.records > 0) {
      return apiError(
        `Cannot delete: ${group._count.records} student record(s) still use this group`,
      )
    }

    await prisma.employerGroup.delete({ where: { id } })
    await logAudit(session.id, 'EMPLOYER_GROUP_DELETED', 'workday', id, { name: group.name })

    return apiSuccess({ ok: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Employer group DELETE error:', err)
    return apiError('Something went wrong', 500)
  }
}
