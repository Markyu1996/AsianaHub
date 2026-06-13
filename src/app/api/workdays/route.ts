// src/app/api/workdays/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { computeMetrics } from '@/lib/workdays'

const SETTINGS_ID = 1
const DEFAULT_WORKDAYS_PER_WEEK = 6

// Read-only listing of every student that has workday data, with live
// progress estimates. Accessible to all authenticated roles (requesters get a
// read-only view; approvers/admins also upload).
export async function GET(req: NextRequest) {
  try {
    await requireSession()

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const groupId = Number(searchParams.get('groupId')) || 0
    const status = searchParams.get('status') || 'all' // all | completed | in_progress

    const settings = await prisma.workdaySettings.findUnique({ where: { id: SETTINGS_ID } })
    const workdaysPerWeek = settings?.workdaysPerWeek ?? DEFAULT_WORKDAYS_PER_WEEK
    const requiredWorkdays = settings?.requiredWorkdays ?? 0

    const records = await prisma.workdayRecord.findMany({
      where: groupId > 0 ? { employerGroupId: groupId } : undefined,
      include: {
        student: { select: { id: true, name: true, icNumber: true } },
        employerGroup: { select: { id: true, name: true, cutoffDay: true } },
      },
      orderBy: { student: { name: 'asc' } },
    })

    const now = new Date()
    let rows = records.map(r => {
      const metrics = computeMetrics({
        cumulativeWorkdays: r.cumulativeWorkdays,
        dataYear: r.dataYear,
        dataMonth: r.dataMonth,
        cutoffDay: r.employerGroup.cutoffDay,
        workdaysPerWeek,
        requiredWorkdays,
        now,
      })
      return {
        id: r.id,
        student: r.student,
        group: r.employerGroup,
        dataYear: r.dataYear,
        dataMonth: r.dataMonth,
        updatedAt: r.updatedAt,
        ...metrics,
      }
    })

    if (search) {
      rows = rows.filter(
        r =>
          r.student.name.toLowerCase().includes(search) ||
          r.student.icNumber.toLowerCase().includes(search),
      )
    }
    if (status === 'completed') rows = rows.filter(r => r.completed)
    else if (status === 'in_progress') rows = rows.filter(r => !r.completed)

    return apiSuccess({
      settings: { workdaysPerWeek, requiredWorkdays },
      records: rows,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    console.error('Workdays GET error:', err)
    return apiError('Something went wrong', 500)
  }
}
