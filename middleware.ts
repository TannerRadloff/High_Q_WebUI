import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware handles authentication routing for the application
export function middleware(request: NextRequest) {
  try {
    // Get URL information
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // Only log in development to reduce noise in production
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Processing request:', {
        pathname,
        method: request.method
      })
    }

    // Check for session and auth cookie
    const sessionCookie = request.cookies.get('sb-access-token')
    const refreshCookie = request.cookies.get('sb-refresh-token')
    
    const hasAuthCookies = !!sessionCookie || !!refreshCookie
    
    // Only log auth details in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Auth check:', {
        hasSessionCookie: !!sessionCookie,
        hasRefreshCookie: !!refreshCookie
      })
    }

    // Define public routes that don't require authentication
    const publicPaths = [
      '/_next',
      '/api/auth',  // Allow auth API endpoints
      '/api/register',
      '/api/check-env', // Allow environment checking API
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/auth/callback',
      '/auth/signin',
      '/static',
      '/images',
      '/fonts'
    ]

    // Check if current path is public
    const isPublicPath = publicPaths.some(path => 
      pathname.startsWith(path) || pathname.includes('.')
    )
    
    // Check for API routes - special handling for auth vs non-auth APIs
    const isApiRoute = pathname.startsWith('/api/')
    const isAuthRelatedApi = pathname.startsWith('/api/auth/') || 
                            pathname.startsWith('/api/register')
    
    // Special handling for homepage
    const isHomePage = pathname === '/'
    
    // Special case for login page with redirects
    const isLoginPage = pathname === '/login'
    const hasRedirectParam = url.searchParams.has('redirect')
    
    // Only log path info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Route check:', {
        pathname,
        isPublicPath,
        isApiRoute,
        isAuthRelatedApi,
        matchedPublicPath: publicPaths.find(path => pathname.startsWith(path))
      })
    }

    // Always allow public routes and root path
    if (isPublicPath || isHomePage) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Allowing access to public route:', pathname)
      }
      return NextResponse.next()
    }
    
    // Special handling for API routes
    if (isApiRoute) {
      // Allow auth-related APIs regardless of auth status
      if (isAuthRelatedApi) {
        return NextResponse.next()
      }
      
      // For other APIs, check authentication
      if (!hasAuthCookies) {
        // In development mode, temporarily bypass auth for API routes to fix errors
        if (process.env.NODE_ENV === 'development') {
          console.log('[Middleware] Development mode: Bypassing API auth check for', pathname)
          return NextResponse.next()
        }
        
        // Log API auth failure and return 401
        console.log('[Middleware] API auth failed, returning 401')
        // Return proper status code instead of redirecting
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }), 
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Authenticated API request
      return NextResponse.next()
    }

    // For non-public web routes, check authentication
    if (!hasAuthCookies) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Redirecting to login - no auth cookies', {
          url: request.url,
          path: pathname,
          cookies: {
            hasSession: !!sessionCookie,
            hasRefresh: !!refreshCookie,
            cookieCount: Array.from(request.cookies.keys()).length
          }
        })
      }
      
      // Save the original URL to redirect back after login
      const redirectUrl = new URL('/login', request.url)
      // Add the current path as a redirect parameter (excluding login page)
      if (pathname !== '/login') {
        redirectUrl.searchParams.set('redirect', pathname)
      }
      
      // Debug log the redirect URL in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Redirecting to:', redirectUrl.toString())
      }
      
      return NextResponse.redirect(redirectUrl)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Allowing authenticated access to:', pathname)
    }
    return NextResponse.next()
  } catch (error) {
    console.error('[Middleware] Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    })
    
    // On error, redirect to login for safety, but don't cause a loop
    const isLoginPage = new URL(request.url).pathname === '/login'
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    } else {
      // If already on login page, just proceed
      return NextResponse.next()
    }
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 