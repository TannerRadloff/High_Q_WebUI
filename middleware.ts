import { NextResponse, type NextRequest } from 'next/server'

// This middleware handles authentication routing for the application
export async function middleware(request: NextRequest) {
  try {
    // Log request details
    const url = new URL(request.url)
    const pathname = url.pathname
    console.log('[Middleware] Processing request:', {
      pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    })

    // Check auth status
    const sessionCookie = request.cookies.get('sb-access-token')
    console.log('[Middleware] Auth check:', {
      hasCookie: !!sessionCookie,
      cookieValue: sessionCookie ? 'present' : 'missing'
    })

    // Define public routes that don't require authentication
    const publicPaths = [
      '/_next',
      '/api',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/auth/callback'
    ]

    // Check if current path is public
    const isPublicPath = publicPaths.some(path => 
      pathname.startsWith(path) || pathname.includes('.')
    )

    console.log('[Middleware] Route check:', {
      pathname,
      isPublicPath,
      matchedPublicPath: publicPaths.find(path => pathname.startsWith(path))
    })

    // Always allow public routes and root path
    if (isPublicPath || pathname === '/') {
      console.log('[Middleware] Allowing access to public route:', pathname)
      return NextResponse.next()
    }

    // Check authentication
    if (!sessionCookie) {
      console.log('[Middleware] Redirecting to login - no session cookie')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    console.log('[Middleware] Allowing authenticated access to:', pathname)
    return NextResponse.next()
  } catch (error) {
    console.error('[Middleware] Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    })
    
    // On error, redirect to login for safety
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/', '/:path*'],
} 