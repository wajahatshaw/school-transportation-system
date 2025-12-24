import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Creates a Supabase client for middleware operations
 * Handles session refresh and cookie management
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Protected routes logic
  if (!user && !isPublicRoute) {
    // No user, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access login, redirect to tenant selection
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/select-tenant'
    return NextResponse.redirect(url)
  }

  // If user is logged in and accessing dashboard, check if tenant is selected
  if (user && pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('app_session')
    if (!sessionCookie?.value) {
      // No tenant selected, redirect to tenant selection
      const url = request.nextUrl.clone()
      url.pathname = '/select-tenant'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

