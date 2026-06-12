// src/app/api/auth/logout/route.ts
import { cookies } from 'next/headers'
import { apiSuccess } from '@/lib/utils'

export async function POST() {
  cookies().delete('session')
  return apiSuccess({ message: 'Logged out' })
}
