// src/app/api/reports/advances/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireRole(['admin', 'approver', 'requester'])
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const studentIdsParam = searchParams.get('studentIds')

    if (!from || !to) return apiError('Select a from and to date')
    const fromDate = new Date(`${from}T00:00:00.000Z`)
    const toDate = new Date(`${to}T23:59:59.999Z`)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return apiError('Invalid date range')
    if (fromDate > toDate) return apiError('"From" date must be on or before "To" date')

    // Approved advances only, filtered by approval date (returnedAt).
    // All roles (requester/approver/admin) get the full report.
    const where: Record<string, unknown> = {
      status: 'completed',
      returnedAt: { gte: fromDate, lte: toDate },
    }

    if (studentIdsParam) {
      const ids = studentIdsParam
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n))
      if (ids.length === 0) return apiError('No valid students selected')
      where.studentId = { in: ids }
    }

    const requests = await prisma.advanceRequest.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, icNumber: true } },
        requester: { select: { id: true, name: true } },
        returnedByUser: { select: { id: true, name: true } },
      },
      orderBy: [{ returnedAt: 'asc' }],
    })

    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0)

    return apiSuccess({
      requests,
      summary: { count: requests.length, totalAmount },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Report error:', err)
    return apiError('Something went wrong', 500)
  }
}
