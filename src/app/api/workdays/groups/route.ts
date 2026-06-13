// src/app/api/workdays/groups/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { employerGroupSchema } from '@/lib/validations'

// Any authenticated user may read the group list (used by the read-only view's
// filters); only admins can create/modify groups.
export async function GET() {
  try {
    await requireSession()
    const groups = await prisma.employerGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { records: true } } },
    })
    return apiSuccess(groups)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Employer groups GET error:', err)
    return apiError('Something went wrong', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['admin'])

    const body = await req.json()
    const parsed = employerGroupSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Invalid input')
    }

    const { name, cutoffDay } = parsed.data

    // Case-insensitive uniqueness check (SQLite default collation is case-
    // sensitive, so we compare in JS against existing names).
    const existing = await prisma.employerGroup.findMany({ select: { name: true } })
    if (existing.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      return apiError('An employer group with this name already exists')
    }

    const group = await prisma.employerGroup.create({ data: { name, cutoffDay } })
    await logAudit(session.id, 'EMPLOYER_GROUP_CREATED', 'workday', group.id, { name, cutoffDay })

    return apiSuccess(group, 201)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Employer groups POST error:', err)
    return apiError('Something went wrong', 500)
  }
}
