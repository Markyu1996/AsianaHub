// src/app/api/admin/users/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, hashPassword, logAudit } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {
      status: { not: 'pending_approval' }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        status: true, createdAt: true, failedLoginAttempts: true, lockedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(users)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['admin'])
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (existing) return apiError('Email already in use')

    const passwordHash = await hashPassword(parsed.data.password)
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        status: 'active',
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    })

    await logAudit(session.id, 'USER_CREATED_BY_ADMIN', 'user', user.id)
    return apiSuccess(user, 201)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    return apiError('Something went wrong', 500)
  }
}
