// src/app/api/requests/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, logAudit } from '@/lib/auth'
import { createRequestSchema } from '@/lib/validations'
import { apiError, apiSuccess, getStartOfMonth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const requesterId = searchParams.get('requesterId')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {}

    // Role-based filtering
    if (session.role === 'requester') {
      where.requesterId = session.id
      // Requesters never see deleted
      where.status = { not: 'deleted' }
    } else if (session.role === 'approver') {
      where.status = { not: 'deleted' }
    } else if (session.role === 'admin') {
      if (!includeDeleted) {
        where.status = { not: 'deleted' }
      }
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (requesterId && session.role !== 'requester') {
      where.requesterId = parseInt(requesterId)
    }

    if (search) {
      where.student = {
        OR: [
          { name: { contains: search } },
          { icNumber: { contains: search } },
        ]
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = end
      }
    }

    const requests = await prisma.advanceRequest.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, icNumber: true } },
        requester: { select: { id: true, name: true } },
        attendedByUser: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
        deletedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(requests)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Get requests error:', err)
    return apiError('Something went wrong', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()

    if (!['requester', 'admin'].includes(session.role)) {
      return apiError('Only requesters can submit advance requests', 403)
    }

    const body = await req.json()
    const parsed = createRequestSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message)
    }

    const { studentId, amount } = parsed.data

    // Verify student exists and is active
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student || !student.isActive) {
      return apiError('Student not found or inactive')
    }

    // Calculate frequency (count of non-deleted requests for this student THIS MONTH)
    const previousCount = await prisma.advanceRequest.count({
      where: {
        studentId,
        status: { not: 'deleted' },
        createdAt: { gte: getStartOfMonth() },
      }
    })
    const frequency = previousCount + 1

    const request = await prisma.advanceRequest.create({
      data: {
        studentId,
        requesterId: session.id,
        amount,
        frequency,
        status: 'pending',
      },
      include: {
        student: { select: { id: true, name: true, icNumber: true } },
        requester: { select: { id: true, name: true } },
      }
    })

    await logAudit(session.id, 'REQUEST_CREATED', 'request', request.id, {
      studentId,
      amount,
      frequency
    })

    return apiSuccess(request, 201)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Create request error:', err)
    return apiError('Something went wrong', 500)
  }
}
