// src/app/api/workdays/settings/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { workdaySettingsSchema } from '@/lib/validations'

const SETTINGS_ID = 1

const DEFAULTS = { workdaysPerWeek: 6, requiredWorkdays: 0 }

async function getSettings() {
  const existing = await prisma.workdaySettings.findUnique({ where: { id: SETTINGS_ID } })
  if (existing) return existing
  return { id: SETTINGS_ID, ...DEFAULTS, updatedBy: null, updatedAt: new Date() }
}

export async function GET() {
  try {
    await requireRole(['admin'])
    const settings = await getSettings()
    return apiSuccess(settings)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Workday settings GET error:', err)
    return apiError('Something went wrong', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(['admin'])

    const body = await req.json()
    const parsed = workdaySettingsSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Invalid input')
    }

    const { workdaysPerWeek, requiredWorkdays } = parsed.data

    const settings = await prisma.workdaySettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, workdaysPerWeek, requiredWorkdays, updatedBy: session.id },
      update: { workdaysPerWeek, requiredWorkdays, updatedBy: session.id },
    })

    await logAudit(session.id, 'WORKDAY_SETTINGS_UPDATED', 'workday', SETTINGS_ID, {
      workdaysPerWeek,
      requiredWorkdays,
    })

    return apiSuccess(settings)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Workday settings PUT error:', err)
    return apiError('Something went wrong', 500)
  }
}
