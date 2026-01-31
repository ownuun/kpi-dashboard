import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/', '/transactions', '/categories', '/settings']
const PUBLIC_ROUTES = ['/login', '/join', '/privacy', '/terms', '/contact']
const AUTH_ONLY_ROUTES = ['/onboarding']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isApiRoute = pathname.startsWith('/api')

  if (isApiRoute) {
    return NextResponse.next()
  }

  if (isPublicRoute) {
    if (pathname.startsWith('/join')) {
      return NextResponse.next()
    }
    const userHasTeam = session?.user?.activeTeamId || session?.user?.teamId
    if (userHasTeam && pathname === '/login') {
      return NextResponse.redirect(new URL('/', nextUrl.origin))
    }
    return NextResponse.next()
  }

  if (!session) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const hasTeam = session.user.activeTeamId || session.user.teamId || (session.user.teams && session.user.teams.length > 0)

  if (!hasTeam) {
    if (isAuthOnlyRoute) {
      return NextResponse.next()
    }
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/onboarding', nextUrl.origin))
    }
  }

  if (hasTeam) {
    if (isAuthOnlyRoute) {
      return NextResponse.next()
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
