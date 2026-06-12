// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/src/lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']
const API_PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (API_PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value
  const session = token ? await verifyToken(token) : null

  // Redirect unauthenticated users to login
  if (!session) {
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Force password change
  if (session.mustChangePassword && pathname !== '/change-password') {
    const url = req.nextUrl.clone()
    url.pathname = '/change-password'
    return NextResponse.redirect(url)
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
