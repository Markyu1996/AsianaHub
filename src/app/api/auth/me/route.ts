// src/app/api/auth/me/route.ts
import { getSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Not authenticated', 401)
  return apiSuccess({ user: session })
}
