// src/app/api/students/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { requireSession, requireRole, logAudit } from '@/src/lib/auth'
import { studentSchema } from '@/src/lib/validations'
import { apiError, apiSuccess } from '@/src/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}

    if (!includeInactive || session.role !== 'admin') {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { icNumber: { contains: search } },
      ]
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    })

    return apiSuccess(students)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    return apiError('Something went wrong', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = studentSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { icNumber, name } = parsed.data

    const existing = await prisma.student.findUnique({
      where: { icNumber }
    })

    if (existing) {
      // Return existing student if found (for requester flow)
      if (!existing.isActive && session.role !== 'admin') {
        return apiError('This IC number is already registered but inactive.')
      }
      return apiSuccess(existing, 200)
    }

    const student = await prisma.student.create({
      data: {
        icNumber,
        name: name.toUpperCase(),
        createdBy: session.id,
      }
    })

    await logAudit(session.id, 'STUDENT_CREATED', 'student', student.id, { icNumber, name })

    return apiSuccess(student, 201)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Create student error:', err)
    return apiError('Something went wrong', 500)
  }
}
